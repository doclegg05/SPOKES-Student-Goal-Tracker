import { debounce } from "./mission-utils.js";
import { ProgressionEngine } from "./progression-engine.js";

const PROGRESSION_RESPONSE_KEY = "progression_state";
const WORKSPACE_PREFIX = "__mc_";

export class MissionController {
  constructor({ model, view, win }) {
    this.model = model;
    this.view = view;
    this.win = win;

    this.trackMetrics = { top: 0, height: 1 };
    this.animationFrameId = null;
    this.lastDrawnFrameIndex = -1;
    this.pendingTargetFrameLoads = new Map();

    this.pendingCloudSave = false;
    this.isCloudSaveInFlight = false;
    this.cloudSaveRetryTimer = null;
    this.progression = new ProgressionEngine();
    this.flags = this.win.__SPOKES_FLAGS__ || {};
    this.progressionEnabled = this.flags.SPOKES_PROGRESS_V1 !== false;

    this.onScroll = this.handleScroll.bind(this);
    this.onVisibilityChange = this.handleVisibilityChange.bind(this);
    this.onViewportChangedDebounced = debounce(() => {
      this.handleViewportChange();
    }, 140);
    this.flushCloudSaveDebounced = debounce(() => {
      this.flushCloudSave();
    }, 900);
  }

  init() {
    if (!this.view.isReady()) {
      console.warn("Mission controller could not start because required DOM elements are missing.");
      return;
    }

    this.bindEvents();
    this.initializeAuthAndDraft();
    this.handleViewportChange();
    this.view.setLoaderVisible(true);
    this.view.updateLoader(this.model.getLoaderSnapshot());

    this.bootstrapInitialFrames();
  }

  bindEvents() {
    this.win.addEventListener("scroll", this.onScroll, { passive: true });
    this.win.addEventListener("resize", this.onViewportChangedDebounced);
    this.win.addEventListener("orientationchange", this.onViewportChangedDebounced);
    this.view.document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.view.bindGoalInput((change) => {
      this.handleGoalInput(change);
    });
    this.view.bindAuthSubmit((credentials) => {
      this.handleAuthSubmit(credentials);
    });
    this.view.bindSignOut(() => {
      this.handleSignOut();
    });
    this.view.bindLevelUpButtons(({ key }) => {
      if (this.progressionEnabled) {
        this.handleLevelUp(key);
      }
    });
  }

  async initializeAuthAndDraft() {
    const activeSession = this.model.getSessionSnapshot();
    if (!activeSession) {
      this.win.location.replace("/");
      return;
    }

    this.view.renderAuthState(activeSession);
    this.view.setAuthMessage("Signed in. Your goal entries sync to your account.", "success");
    this.view.setSyncStatus("Syncing saved draft...", "saving");
    await this.loadBestDraftFromCurrentSource();
  }

  async handleAuthSubmit(credentials) {
    this.view.setAuthBusy(true);
    this.view.setAuthMessage("Signing in...", "neutral");

    try {
      const session = await this.model.loginStudent(credentials);
      this.view.setAuthMessage(
        "Signed in. Your goal form is now synced across devices.",
        "success"
      );
      this.view.renderAuthState(session);
      await this.loadBestDraftFromCurrentSource();
    } catch (error) {
      this.view.setAuthMessage(error.message || "Sign in failed.", "error");
      this.view.setSyncStatus("Local mode. Sign in to sync across devices.", "local");
      this.view.renderAuthState(this.model.getSessionSnapshot());
    } finally {
      this.view.setAuthBusy(false);
      this.view.renderAuthState(this.model.getSessionSnapshot());
    }
  }

  handleSignOut() {
    this.model.logoutStudent();
    this.pendingCloudSave = false;

    if (this.cloudSaveRetryTimer !== null) {
      this.win.clearTimeout(this.cloudSaveRetryTimer);
      this.cloudSaveRetryTimer = null;
    }

    this.view.renderAuthState(null);
    this.view.setAuthMessage("Signed out. Returning to account page...", "neutral");
    this.view.setSyncStatus("Signed out.", "local");
    this.view.applyGoalDraftSnapshot(this.model.getGoalDraftSnapshot());
    this.win.location.assign("/?loggedOut=1");
  }

  async loadBestDraftFromCurrentSource() {
    if (!this.model.hasCloudSession()) {
      const snapshot = this.model.getGoalDraftSnapshot();
      this.view.applyGoalDraftSnapshot(snapshot);
      this.initializeProgressionFromSnapshot(snapshot);
      this.view.setSyncStatus("Local mode. Sign in to sync across devices.", "local");
      return;
    }

    this.view.setSyncStatus("Syncing saved draft...", "saving");

    try {
      const snapshot = await this.model.loadBestDraftForActiveStudent();
      this.view.applyGoalDraftSnapshot(snapshot);
      this.initializeProgressionFromSnapshot(snapshot);
      this.view.setSyncStatus(this.syncMessageForSource(snapshot.source), "synced");
    } catch (error) {
      const snapshot = this.model.getGoalDraftSnapshot();
      this.view.applyGoalDraftSnapshot(snapshot);
      this.initializeProgressionFromSnapshot(snapshot);
      this.view.setSyncStatus("Cloud unavailable. Working from local cache.", "error");
    }
  }

  syncMessageForSource(source) {
    if (source === "cloud") {
      return "Cloud draft loaded.";
    }
    if (source === "merged") {
      return "Local edits synced to cloud.";
    }
    return "Local draft loaded.";
  }

  handleGoalInput({ key, value }) {
    if (!key) {
      return;
    }

    this.model.setGoalResponse(key, value);
    this.view.renderGoalSummary(this.model.getGoalDraftSnapshot());

    if (this.model.hasCloudSession()) {
      this.pendingCloudSave = true;
      this.view.setSyncStatus("Saving to cloud...", "saving");
      this.flushCloudSaveDebounced();
    } else {
      this.view.setSyncStatus("Saved on this computer only.", "local");
    }
  }

  handleLevelUp(promptKey) {
    const key = String(promptKey || "").trim();
    if (!key) {
      return;
    }

    const snapshot = this.model.getGoalDraftSnapshot();
    const value = typeof snapshot?.responses?.[key] === "string"
      ? snapshot.responses[key]
      : "";

    const result = this.progression.lockInPrompt(key, value);
    if (!result.ok) {
      if (result.reason === "empty_response") {
        this.view.setAuthMessage("Type a response before locking in.", "error");
      } else if (result.reason === "prompt_locked") {
        this.view.setAuthMessage("This prompt is still locked. Complete earlier steps first.", "error");
      }
      return;
    }

    this.persistProgressionState();
    this.applyProgressionToView();
    if (result.xpGained > 0) {
      this.view.showFloatingXp(result.xpGained);
    }
    this.view.renderGoalSummary(this.model.getGoalDraftSnapshot());

    if (result.levelChanged || result.newUnlocks.length) {
      this.view.showLevelUpOverlay({
        level: result.level,
        levelName: this.progression.getLevelName(),
        xpGained: result.xpGained,
        newUnlocks: result.newUnlocks
      });
    }

    if (this.model.hasCloudSession()) {
      this.pendingCloudSave = true;
      this.view.setSyncStatus("Saving to cloud...", "saving");
      this.flushCloudSaveDebounced();
    }
  }

  async flushCloudSave() {
    if (!this.model.hasCloudSession()) {
      this.pendingCloudSave = false;
      return;
    }

    if (!this.pendingCloudSave) {
      return;
    }

    if (this.isCloudSaveInFlight) {
      this.pendingCloudSave = true;
      return;
    }

    this.pendingCloudSave = false;
    this.isCloudSaveInFlight = true;

    try {
      await this.model.saveActiveDraftToCloud();
      this.view.renderGoalSummary(this.model.getGoalDraftSnapshot());
      this.view.setSyncStatus("Synced to cloud.", "synced");
    } catch (error) {
      this.pendingCloudSave = true;
      this.view.setSyncStatus("Sync failed. Retrying...", "error");

      if (this.cloudSaveRetryTimer !== null) {
        this.win.clearTimeout(this.cloudSaveRetryTimer);
      }

      this.cloudSaveRetryTimer = this.win.setTimeout(() => {
        this.cloudSaveRetryTimer = null;
        this.flushCloudSaveDebounced();
      }, 1800);
    } finally {
      this.isCloudSaveInFlight = false;

      if (this.pendingCloudSave) {
        this.flushCloudSaveDebounced();
      }
    }
  }

  async bootstrapInitialFrames() {
    try {
      await this.model.loadInitialChunks((snapshot) => {
        this.view.updateLoader(snapshot);
      });
    } catch (error) {
      console.error("Initial frame loading failed:", error);
    }

    this.renderFrame({ forceRedraw: true });
    this.view.setLoaderVisible(false);
    this.requestRender();
  }

  handleScroll() {
    this.requestRender();
  }

  handleVisibilityChange() {
    if (this.view.document.hidden) {
      return;
    }

    this.handleViewportChange();
  }

  handleViewportChange() {
    this.view.resizeCanvas(
      this.win.innerWidth,
      this.win.innerHeight,
      this.win.devicePixelRatio || 1
    );
    this.trackMetrics = this.view.getTrackMetrics(this.win);
    this.requestRender();
  }

  requestRender() {
    if (this.animationFrameId !== null) {
      return;
    }

    this.animationFrameId = this.win.requestAnimationFrame(() => {
      this.animationFrameId = null;
      this.renderFrame();
    });
  }

  renderFrame({ forceRedraw = false } = {}) {
    const scrollProgress = this.computeScrollProgress();
    const scrollCap = this.model.getMaxScrollProgress();
    const cappedProgress = Math.min(scrollProgress, scrollCap);
    const frameProgress = scrollCap > 0 ? Math.min(cappedProgress / scrollCap, 1) : 0;
    const targetFrameIndex = Math.round(frameProgress * (this.model.totalFrames - 1));

    this.view.setScrollLabel(this.model.scrollLabelForProgress(scrollProgress));
    this.view.announceScrollAct(this.model.scrollNarrationForProgress(scrollProgress));
    this.view.updateCards(cappedProgress, (progress, start, end) => {
      return this.model.cardOpacityForProgress(progress, start, end);
    });

    this.prefetchNearbyFrames(targetFrameIndex);

    const { image, frameIndex } = this.resolveDrawableFrame(targetFrameIndex);
    if (!image) {
      return;
    }

    if (forceRedraw || frameIndex !== this.lastDrawnFrameIndex) {
      this.view.drawFrame(image);
      this.lastDrawnFrameIndex = frameIndex;
    }
  }

  prefetchNearbyFrames(frameIndex) {
    this.model.prefetchAroundFrame(frameIndex, (snapshot) => {
      this.view.updateLoader(snapshot);
    });
  }

  resolveDrawableFrame(targetFrameIndex) {
    const directFrame = this.model.getFrame(targetFrameIndex);
    if (directFrame) {
      return { image: directFrame, frameIndex: targetFrameIndex };
    }

    this.ensureTargetFrame(targetFrameIndex);

    const nearestLoadedFrameIndex = this.model.findNearestLoadedFrameIndex(targetFrameIndex);
    if (nearestLoadedFrameIndex >= 0) {
      return {
        image: this.model.getFrame(nearestLoadedFrameIndex),
        frameIndex: nearestLoadedFrameIndex
      };
    }

    return { image: null, frameIndex: -1 };
  }

  ensureTargetFrame(targetFrameIndex) {
    if (this.pendingTargetFrameLoads.has(targetFrameIndex)) {
      return;
    }

    const loadPromise = this.model
      .ensureFrame(targetFrameIndex + 1, (snapshot) => {
        this.view.updateLoader(snapshot);
      })
      .then(() => {
        this.pendingTargetFrameLoads.delete(targetFrameIndex);
        this.requestRender();
      })
      .catch(() => {
        this.pendingTargetFrameLoads.delete(targetFrameIndex);
      });

    this.pendingTargetFrameLoads.set(targetFrameIndex, loadPromise);
  }

  computeScrollProgress() {
    return this.model.computeScrollProgress({
      scrollY: this.win.scrollY,
      trackTop: this.trackMetrics.top,
      trackHeight: this.trackMetrics.height,
      viewportHeight: this.win.innerHeight
    });
  }

  initializeProgressionFromSnapshot(snapshot) {
    if (!this.progressionEnabled) {
      this.model.setMaxScrollProgress(1);
      this.view.setCardLocks(["bhag", "monthly", "weekly", "daily", "tasks"], []);
      this.view.setScrollTrackHeight(1100);
      this.trackMetrics = this.view.getTrackMetrics(this.win);
      this.requestRender();
      return;
    }

    const responses = snapshot?.responses || {};
    const workspaceState = this.decodeWorkspaceStateFromResponses(responses);
    const seed = ProgressionEngine.parse(responses[PROGRESSION_RESPONSE_KEY])
      || workspaceState?.progression
      || null;

    this.progression = new ProgressionEngine(seed, responses);
    this.applyProgressionToView();
    this.persistProgressionState({ silentCloudQueue: true });
  }

  applyProgressionToView() {
    const state = this.progression.getState();
    const xpMeta = this.progression.getXpForNext();

    this.model.setMaxScrollProgress(this.progression.getMaxScrollProgress());
    this.view.setCardLocks(
      this.progression.getUnlockedCorePrompts(),
      this.progression.getCompletedCorePrompts()
    );
    this.view.setScrollTrackHeight(this.progression.getScrollTrackHeightVh());
    this.view.renderLevelProgress({
      level: state.level,
      levelName: this.progression.getLevelName(),
      xp: state.xp,
      xpRatio: xpMeta.ratio,
      nextTarget: xpMeta.nextTarget,
      streak: state.currentStreak
    });

    this.trackMetrics = this.view.getTrackMetrics(this.win);
    this.requestRender();
  }

  persistProgressionState({ silentCloudQueue = false } = {}) {
    const snapshot = this.model.getGoalDraftSnapshot();
    const responses = {
      ...(snapshot?.responses || {}),
      [PROGRESSION_RESPONSE_KEY]: this.progression.serialize()
    };

    const workspaceState = this.decodeWorkspaceStateFromResponses(responses);
    const nextResponses = workspaceState
      ? this.encodeWorkspaceStateToResponses(responses, {
          ...workspaceState,
          progression: this.progression.getState()
        })
      : responses;

    this.model.setGoalDraftSnapshot({
      responses: nextResponses,
      updatedAt: new Date().toISOString()
    });

    if (!silentCloudQueue && this.model.hasCloudSession()) {
      this.pendingCloudSave = true;
      this.flushCloudSaveDebounced();
    }
  }

  decodeWorkspaceStateFromResponses(responses) {
    if (!responses || typeof responses !== "object") {
      return null;
    }

    let prefix = WORKSPACE_PREFIX;
    let count = Number.parseInt(String(responses[`${WORKSPACE_PREFIX}chunkCount`] || ""), 10);
    if (!Number.isFinite(count) || count <= 0) {
      prefix = "__";
      count = Number.parseInt(String(responses.__chunkCount || ""), 10);
    }

    if (!Number.isFinite(count) || count <= 0 || count > 64) {
      return null;
    }

    let raw = "";
    for (let i = 0; i < count; i += 1) {
      const key = prefix === "__" ? `__chunk_${i}` : `${WORKSPACE_PREFIX}chunk_${i}`;
      const part = responses[key];
      if (typeof part !== "string") {
        return null;
      }
      raw += part;
    }

    try {
      return JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  }

  encodeWorkspaceStateToResponses(baseResponses, workspaceState) {
    const preserved = {};
    for (const [key, value] of Object.entries(baseResponses || {})) {
      if (
        key.startsWith(WORKSPACE_PREFIX) ||
        key === "__schema" ||
        key === "__encoding" ||
        key === "__chunkCount" ||
        key === "__updatedAt" ||
        key.startsWith("__chunk_")
      ) {
        continue;
      }
      preserved[key] = typeof value === "string" ? value : String(value ?? "");
    }

    const raw = JSON.stringify(workspaceState || {});
    const chunkSize = 3300;
    const chunks = [];
    for (let i = 0; i < raw.length; i += chunkSize) {
      chunks.push(raw.slice(i, i + chunkSize));
    }

    const reservedKeys = 4;
    const availableForChunks = 64 - Object.keys(preserved).length - reservedKeys;
    if (chunks.length > Math.max(0, availableForChunks)) {
      return {
        ...(baseResponses || {}),
        [PROGRESSION_RESPONSE_KEY]: preserved[PROGRESSION_RESPONSE_KEY] || ""
      };
    }

    const encoded = {
      ...preserved,
      [`${WORKSPACE_PREFIX}schema`]: "spokesMissionControlV2",
      [`${WORKSPACE_PREFIX}encoding`]: "chunked-json-v1",
      [`${WORKSPACE_PREFIX}chunkCount`]: String(chunks.length),
      [`${WORKSPACE_PREFIX}updatedAt`]: new Date().toISOString()
    };

    chunks.forEach((chunk, index) => {
      encoded[`${WORKSPACE_PREFIX}chunk_${index}`] = chunk;
    });

    return encoded;
  }
}
