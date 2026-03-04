import { clamp } from "./mission-utils.js";

const DEFAULT_CONFIG = {
  totalFrames: 193,
  chunkSize: 30,
  initialChunks: 1,
  chunkWorkers: 6,
  goalStorageKey: "spokes-goal-journey",
  sessionStorageKey: "spokes-goal-session-v1",
  lessonId: "spokes-goal-journey-v1",
  apiBase: "/api",
  framePrefix: "frames/frame_",
  frameSuffix: ".webp"
};

export class MissionModel {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.frames = new Array(this.config.totalFrames);
    this.framePromises = new Array(this.config.totalFrames);
    this.chunkPromises = [];

    this.loadedTotalCount = 0;
    this.loadedInitialCount = 0;

    this.session = this.readSession();
    this.activeStudentId = this.normalizeStudentId(this.session?.studentId) || null;
    this.maxScrollProgress = 1;

    const goalDraft = this.readGoalDraft(this.activeStudentId);
    this.goalResponses = goalDraft.responses;
    this.goalUpdatedAt = goalDraft.updatedAt;
  }

  get totalFrames() {
    return this.config.totalFrames;
  }

  get chunkSize() {
    return this.config.chunkSize;
  }

  get initialChunks() {
    return this.config.initialChunks;
  }

  get chunkWorkers() {
    return this.config.chunkWorkers;
  }

  get totalChunks() {
    return Math.ceil(this.totalFrames / this.chunkSize);
  }

  get initialTargetFrames() {
    return Math.min(this.totalFrames, this.initialChunks * this.chunkSize);
  }

  get lessonId() {
    return this.config.lessonId;
  }

  get goalStorageBaseKey() {
    return this.config.goalStorageKey;
  }

  get sessionStorageKey() {
    return this.config.sessionStorageKey;
  }

  get isBrowserStorageAvailable() {
    return typeof localStorage !== "undefined";
  }

  getLoaderSnapshot() {
    return {
      loaded: this.loadedInitialCount,
      target: this.initialTargetFrames,
      ratio: this.initialTargetFrames > 0 ? this.loadedInitialCount / this.initialTargetFrames : 1
    };
  }

  normalizeStudentId(value) {
    if (typeof value !== "string") {
      return "";
    }

    return value.trim().toLowerCase().replace(/\s+/g, "");
  }

  goalStorageKeyFor(studentId = this.activeStudentId) {
    const suffix = studentId ? `student-${studentId}` : "device-local";
    return `${this.goalStorageBaseKey}::${suffix}`;
  }

  sanitizeResponses(input) {
    if (!input || typeof input !== "object") {
      return {};
    }

    const clean = {};
    const entries = Object.entries(input).slice(0, 64);

    for (const [rawKey, rawValue] of entries) {
      if (typeof rawKey !== "string") {
        continue;
      }

      const key = rawKey.trim();
      if (!key) {
        continue;
      }

      const value = typeof rawValue === "string" ? rawValue : String(rawValue ?? "");
      clean[key] = value.slice(0, 4000);
    }

    return clean;
  }

  readGoalDraft(studentId = this.activeStudentId) {
    if (!this.isBrowserStorageAvailable) {
      return { responses: {}, updatedAt: null };
    }

    try {
      const raw = localStorage.getItem(this.goalStorageKeyFor(studentId));
      if (!raw) {
        return { responses: {}, updatedAt: null };
      }

      const parsed = JSON.parse(raw);
      const responses = this.sanitizeResponses(parsed?.responses);
      const updatedAt = typeof parsed?.updatedAt === "string" ? parsed.updatedAt : null;

      return { responses, updatedAt };
    } catch (error) {
      console.warn("Could not read saved goal draft:", error);
      return { responses: {}, updatedAt: null };
    }
  }

  persistGoalDraft(studentId = this.activeStudentId) {
    if (!this.isBrowserStorageAvailable) {
      return;
    }

    try {
      const payload = {
        responses: this.sanitizeResponses(this.goalResponses),
        updatedAt: this.goalUpdatedAt
      };
      localStorage.setItem(this.goalStorageKeyFor(studentId), JSON.stringify(payload));
    } catch (error) {
      console.warn("Could not save goal draft:", error);
    }
  }

  readSession() {
    if (!this.isBrowserStorageAvailable) {
      return null;
    }

    try {
      const raw = localStorage.getItem(this.sessionStorageKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      const token = typeof parsed?.token === "string" ? parsed.token : "";
      const studentId = this.normalizeStudentId(parsed?.studentId);
      const displayName = typeof parsed?.displayName === "string" ? parsed.displayName.trim() : "";

      if (!token || !studentId) {
        return null;
      }

      return {
        token,
        studentId,
        displayName: displayName || studentId
      };
    } catch (error) {
      console.warn("Could not read saved session:", error);
      return null;
    }
  }

  persistSession() {
    if (!this.isBrowserStorageAvailable || !this.session) {
      return;
    }

    try {
      localStorage.setItem(this.sessionStorageKey, JSON.stringify(this.session));
    } catch (error) {
      console.warn("Could not persist session:", error);
    }
  }

  clearSession() {
    if (!this.isBrowserStorageAvailable) {
      return;
    }

    try {
      localStorage.removeItem(this.sessionStorageKey);
    } catch (error) {
      console.warn("Could not clear session:", error);
    }
  }

  hasCloudSession() {
    return Boolean(this.session?.token && this.session?.studentId);
  }

  getSessionSnapshot() {
    if (!this.session) {
      return null;
    }

    return {
      studentId: this.session.studentId,
      displayName: this.session.displayName,
      token: this.session.token
    };
  }

  setActiveStudent(studentId) {
    this.activeStudentId = this.normalizeStudentId(studentId) || null;
    const goalDraft = this.readGoalDraft(this.activeStudentId);
    this.goalResponses = goalDraft.responses;
    this.goalUpdatedAt = goalDraft.updatedAt;
    return this.getGoalDraftSnapshot();
  }

  setGoalDraftSnapshot(snapshot, { persist = true } = {}) {
    this.goalResponses = this.sanitizeResponses(snapshot?.responses);
    this.goalUpdatedAt = typeof snapshot?.updatedAt === "string" ? snapshot.updatedAt : null;

    if (persist) {
      this.persistGoalDraft(this.activeStudentId);
    }

    return this.getGoalDraftSnapshot();
  }

  setGoalResponse(fieldKey, value) {
    if (!fieldKey) {
      return;
    }

    const mergedResponses = this.mergeWithCurrentLocalResponses(this.goalResponses);
    mergedResponses[fieldKey] = typeof value === "string" ? value : String(value ?? "");
    this.goalResponses = this.sanitizeResponses(mergedResponses);
    this.goalUpdatedAt = new Date().toISOString();
    this.persistGoalDraft(this.activeStudentId);
  }

  getGoalDraftSnapshot() {
    return {
      responses: { ...this.goalResponses },
      updatedAt: this.goalUpdatedAt
    };
  }

  hasMeaningfulResponses(responses = this.goalResponses) {
    return Object.values(responses).some((value) => {
      return typeof value === "string" && value.trim().length > 0;
    });
  }

  timestampValue(isoTimestamp) {
    if (typeof isoTimestamp !== "string") {
      return 0;
    }

    const parsed = Date.parse(isoTimestamp);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  async apiFetch(path, { method = "GET", body = null, token } = {}) {
    const headers = {
      Accept: "application/json"
    };

    if (body !== null) {
      headers["Content-Type"] = "application/json";
    }

    const authToken = token ?? this.session?.token;
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const requestInit = {
      method,
      headers,
      cache: "no-store"
    };

    if (body !== null) {
      requestInit.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(`${this.config.apiBase}${path}`, requestInit);
    } catch (error) {
      throw new Error("Could not reach sync server.");
    }

    const text = await response.text();
    let payload = {};

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (error) {
        payload = {};
      }
    }

    if (!response.ok) {
      const message = typeof payload?.error === "string"
        ? payload.error
        : `Request failed (${response.status})`;
      throw new Error(message);
    }

    return payload;
  }

  async restoreSession() {
    if (!this.session?.token) {
      return null;
    }

    try {
      const payload = await this.apiFetch("/auth/session", {
        method: "GET",
        token: this.session.token
      });

      const student = payload?.student;
      const studentId = this.normalizeStudentId(student?.studentId);

      if (!studentId) {
        throw new Error("Invalid session payload.");
      }

      this.session = {
        token: this.session.token,
        studentId,
        displayName: typeof student?.displayName === "string" && student.displayName.trim()
          ? student.displayName.trim()
          : studentId
      };
      this.persistSession();
      this.setActiveStudent(studentId);

      return this.getSessionSnapshot();
    } catch (error) {
      this.logoutStudent();
      return null;
    }
  }

  async loginStudent({ studentId, passcode, displayName }) {
    const normalizedStudentId = this.normalizeStudentId(studentId);
    const normalizedPasscode = typeof passcode === "string" ? passcode.trim() : "";
    const cleanDisplayName = typeof displayName === "string" ? displayName.trim() : "";

    if (normalizedStudentId.length < 3) {
      throw new Error("Student ID must be at least 3 characters.");
    }

    if (normalizedPasscode.length < 6) {
      throw new Error("Passcode must be at least 6 characters.");
    }

    const payload = await this.apiFetch("/auth/login", {
      method: "POST",
      token: null,
      body: {
        studentId: normalizedStudentId,
        passcode: normalizedPasscode,
        displayName: cleanDisplayName
      }
    });

    const token = typeof payload?.token === "string" ? payload.token : "";
    const returnedStudentId = this.normalizeStudentId(payload?.student?.studentId);
    const returnedDisplayName = typeof payload?.student?.displayName === "string"
      ? payload.student.displayName.trim()
      : "";

    if (!token || !returnedStudentId) {
      throw new Error("Sign in failed: invalid server response.");
    }

    this.session = {
      token,
      studentId: returnedStudentId,
      displayName: returnedDisplayName || returnedStudentId
    };
    this.persistSession();
    this.setActiveStudent(returnedStudentId);

    return this.getSessionSnapshot();
  }

  logoutStudent() {
    this.clearSession();
    this.session = null;
    this.setActiveStudent(null);
  }

  async fetchRemoteDraft() {
    if (!this.hasCloudSession()) {
      throw new Error("No active cloud session.");
    }

    const lessonPath = encodeURIComponent(this.lessonId);
    const payload = await this.apiFetch(`/drafts/${lessonPath}`, { method: "GET" });

    return {
      responses: this.sanitizeResponses(payload?.draft?.responses),
      updatedAt: typeof payload?.draft?.updatedAt === "string" ? payload.draft.updatedAt : null
    };
  }

  async pushRemoteDraft(snapshot = this.getGoalDraftSnapshot()) {
    if (!this.hasCloudSession()) {
      throw new Error("No active cloud session.");
    }

    const mergedResponses = this.mergeWithCurrentLocalResponses(snapshot?.responses);

    const lessonPath = encodeURIComponent(this.lessonId);
    const payload = await this.apiFetch(`/drafts/${lessonPath}`, {
      method: "PUT",
      body: {
        responses: this.sanitizeResponses(mergedResponses),
        updatedAt: typeof snapshot?.updatedAt === "string" ? snapshot.updatedAt : null
      }
    });

    return {
      responses: this.sanitizeResponses(payload?.draft?.responses),
      updatedAt: typeof payload?.draft?.updatedAt === "string" ? payload.draft.updatedAt : null
    };
  }

  async loadBestDraftForActiveStudent() {
    const localDraft = this.readGoalDraft(this.activeStudentId);
    this.setGoalDraftSnapshot(localDraft, { persist: false });

    if (!this.hasCloudSession()) {
      return { ...localDraft, source: "local" };
    }

    let remoteDraft;
    try {
      remoteDraft = await this.fetchRemoteDraft();
    } catch (error) {
      return { ...localDraft, source: "local" };
    }

    const localTimestamp = this.timestampValue(localDraft.updatedAt);
    const remoteTimestamp = this.timestampValue(remoteDraft.updatedAt);

    if (remoteTimestamp > localTimestamp) {
      this.setGoalDraftSnapshot(remoteDraft, { persist: true });
      return { ...remoteDraft, source: "cloud" };
    }

    if (this.hasMeaningfulResponses(localDraft.responses)) {
      try {
        const pushedDraft = await this.pushRemoteDraft(localDraft);
        this.setGoalDraftSnapshot(pushedDraft, { persist: true });
        return { ...pushedDraft, source: "merged" };
      } catch (error) {
        this.setGoalDraftSnapshot(localDraft, { persist: true });
        return { ...localDraft, source: "local" };
      }
    }

    this.setGoalDraftSnapshot(remoteDraft, { persist: true });
    return { ...remoteDraft, source: "cloud" };
  }

  async saveActiveDraftToCloud() {
    const snapshot = this.getGoalDraftSnapshot();
    snapshot.responses = this.mergeWithCurrentLocalResponses(snapshot.responses);
    const savedDraft = await this.pushRemoteDraft(snapshot);
    this.setGoalDraftSnapshot(savedDraft, { persist: true });
    return savedDraft;
  }

  mergeWithCurrentLocalResponses(sourceResponses = {}) {
    const currentLocalDraft = this.readGoalDraft(this.activeStudentId);
    return this.sanitizeResponses({
      ...(currentLocalDraft?.responses || {}),
      ...(sourceResponses || {})
    });
  }

  framePath(frameNumber) {
    const padded = String(frameNumber).padStart(4, "0");
    return `${this.config.framePrefix}${padded}${this.config.frameSuffix}`;
  }

  chunkBounds(chunkIndex) {
    const start = chunkIndex * this.chunkSize + 1;
    const end = Math.min(this.totalFrames, (chunkIndex + 1) * this.chunkSize);
    return { start, end };
  }

  frameToChunk(frameIndex) {
    return Math.floor(frameIndex / this.chunkSize);
  }

  async loadImage(sourcePath) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.loading = "eager";
      image.src = sourcePath;
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load ${sourcePath}`));
    });
  }

  async ensureFrame(frameNumber, onProgress) {
    const frameIndex = frameNumber - 1;

    if (frameIndex < 0 || frameIndex >= this.totalFrames) {
      return null;
    }

    if (this.frames[frameIndex]) {
      return this.frames[frameIndex];
    }

    if (this.framePromises[frameIndex]) {
      return this.framePromises[frameIndex];
    }

    const promise = this.loadImage(this.framePath(frameNumber))
      .then((image) => {
        if (!this.frames[frameIndex]) {
          this.frames[frameIndex] = image;
          this.loadedTotalCount += 1;

          if (frameNumber <= this.initialTargetFrames) {
            this.loadedInitialCount += 1;
          }

          if (typeof onProgress === "function") {
            onProgress(this.getLoaderSnapshot());
          }
        }
        return image;
      })
      .catch((error) => {
        console.warn(error);
        return null;
      })
      .finally(() => {
        this.framePromises[frameIndex] = null;
      });

    this.framePromises[frameIndex] = promise;
    return promise;
  }

  async loadChunk(chunkIndex, onProgress) {
    if (chunkIndex < 0 || chunkIndex >= this.totalChunks) {
      return;
    }

    if (this.chunkPromises[chunkIndex]) {
      return this.chunkPromises[chunkIndex];
    }

    const { start, end } = this.chunkBounds(chunkIndex);
    const pendingFrameNumbers = [];

    for (let frameNumber = start; frameNumber <= end; frameNumber += 1) {
      if (!this.frames[frameNumber - 1]) {
        pendingFrameNumbers.push(frameNumber);
      }
    }

    if (pendingFrameNumbers.length === 0) {
      this.chunkPromises[chunkIndex] = Promise.resolve();
      return this.chunkPromises[chunkIndex];
    }

    let pointer = 0;
    const workerCount = Math.min(this.chunkWorkers, pendingFrameNumbers.length);
    const workers = [];

    for (let i = 0; i < workerCount; i += 1) {
      workers.push((async () => {
        while (pointer < pendingFrameNumbers.length) {
          const frameNumber = pendingFrameNumbers[pointer];
          pointer += 1;
          await this.ensureFrame(frameNumber, onProgress);
        }
      })());
    }

    this.chunkPromises[chunkIndex] = Promise.all(workers).then(() => null);
    return this.chunkPromises[chunkIndex];
  }

  async loadInitialChunks(onProgress) {
    const initialChunkLoads = [];
    for (let chunkIndex = 0; chunkIndex < this.initialChunks; chunkIndex += 1) {
      initialChunkLoads.push(this.loadChunk(chunkIndex, onProgress));
    }
    await Promise.all(initialChunkLoads);
  }

  prefetchAroundFrame(frameIndex, onProgress) {
    const chunkIndex = this.frameToChunk(frameIndex);
    const chunkOffset = frameIndex % this.chunkSize;

    this.loadChunk(chunkIndex, onProgress);

    if (chunkOffset >= Math.floor(this.chunkSize * 0.62)) {
      this.loadChunk(chunkIndex + 1, onProgress);
    }

    if (chunkOffset <= Math.floor(this.chunkSize * 0.38)) {
      this.loadChunk(chunkIndex - 1, onProgress);
    }
  }

  getFrame(frameIndex) {
    if (frameIndex < 0 || frameIndex >= this.totalFrames) {
      return null;
    }
    return this.frames[frameIndex] || null;
  }

  findNearestLoadedFrameIndex(targetFrameIndex) {
    if (targetFrameIndex < 0 || targetFrameIndex >= this.totalFrames) {
      return -1;
    }

    if (this.frames[targetFrameIndex]) {
      return targetFrameIndex;
    }

    for (let offset = 1; offset < this.totalFrames; offset += 1) {
      const left = targetFrameIndex - offset;
      if (left >= 0 && this.frames[left]) {
        return left;
      }

      const right = targetFrameIndex + offset;
      if (right < this.totalFrames && this.frames[right]) {
        return right;
      }
    }

    return -1;
  }

  computeScrollProgress({ scrollY, trackTop, trackHeight, viewportHeight }) {
    const range = trackHeight - viewportHeight;
    if (range <= 0) {
      return 0;
    }
    return clamp((scrollY - trackTop) / range, 0, 1);
  }

  setMaxScrollProgress(value) {
    this.maxScrollProgress = clamp(value, 0.05, 1);
  }

  getMaxScrollProgress() {
    return this.maxScrollProgress;
  }

  mapTimelineToFrameProgress(scrollProgress, { respectCap = true } = {}) {
    const ceiling = respectCap ? this.maxScrollProgress : 1;
    return clamp(scrollProgress, 0, ceiling);
  }

  frameIndexFromScrollProgress(scrollProgress, options = undefined) {
    const frameProgress = this.mapTimelineToFrameProgress(scrollProgress, options);
    return Math.round(frameProgress * (this.totalFrames - 1));
  }

  scrollLabelForProgress(scrollProgress) {
    if (scrollProgress < 0.54) {
      return "Act I • Plan and Prepare";
    }
    if (scrollProgress < 0.84) {
      return "Act II • Move Into Action";
    }
    return "Act III • Pack and Launch";
  }

  scrollNarrationForProgress(scrollProgress) {
    if (scrollProgress < 0.54) {
      return "Act I: Plan and Prepare.";
    }
    if (scrollProgress < 0.84) {
      return "Act II: Move Into Action.";
    }
    return "Act III: Pack and Launch.";
  }

  cardOpacityForProgress(scrollProgress, start, end) {
    if (scrollProgress <= start || scrollProgress >= end) {
      return 0;
    }

    const span = end - start;
    const edge = Math.min(0.12, span * 0.38);

    if (scrollProgress < start + edge) {
      return clamp((scrollProgress - start) / edge, 0, 1);
    }

    if (scrollProgress > end - edge) {
      return clamp((end - scrollProgress) / edge, 0, 1);
    }

    return 1;
  }
}
