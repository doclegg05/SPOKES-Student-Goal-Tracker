import {
  CORE_PROMPT_KEYS,
  getCorePromptCompletion,
  readCorePromptResponses
} from "./goal-response-adapter.js";

export class MissionView {
  constructor(doc) {
    this.document = doc;

    this.scrollTrack = this.document.getElementById("scrollTrack");
    this.canvas = this.document.getElementById("sequenceCanvas");
    this.cardsLayer = this.document.getElementById("cardsLayer");
    this.cards = this.cardsLayer ? Array.from(this.cardsLayer.querySelectorAll(".feature-card")) : [];

    this.loader = this.document.getElementById("loader");
    this.loaderProgress = this.document.getElementById("loaderProgress");
    this.loaderFill = this.document.getElementById("loaderFill");
    this.loaderCount = this.document.getElementById("loaderCount");
    this.scrollNote = this.document.querySelector(".scroll-note");
    this.scrollActNarration = this.document.getElementById("scrollActNarration");

    this.goalPanel = this.document.getElementById("goalPanel");
    this.goalSummaryList = this.document.getElementById("goalSummaryList");
    this.goalSavedAt = this.document.getElementById("goalSavedAt");
    this.goalCompletionText = this.document.getElementById("goalCompletionText");
    this.goalCompletionPercent = this.document.getElementById("goalCompletionPercent");
    this.goalCompletionTrack = this.document.getElementById("goalCompletionTrack");
    this.goalCompletionBar = this.document.getElementById("goalCompletionBar");
    this.goalCheckpointList = this.document.getElementById("goalCheckpointList");
    this.goalCertificateButton = this.document.getElementById("goalCertificateButton");
    this.goalLevelBadge = this.document.getElementById("goalLevelBadge");
    this.goalXpText = this.document.getElementById("goalXpText");
    this.goalXpTrack = this.document.getElementById("goalXpTrack");
    this.goalXpBar = this.document.getElementById("goalXpBar");
    this.goalInputs = Array.from(this.document.querySelectorAll(".goal-input[data-goal-key]"));
    this.levelUpButtons = Array.from(this.document.querySelectorAll(".level-up-btn[data-target]"));
    this.levelUpOverlay = this.document.getElementById("levelUpOverlay");
    this.levelUpTitle = this.document.getElementById("levelUpTitle");
    this.levelUpText = this.document.getElementById("levelUpText");
    this.levelUpXp = this.document.getElementById("levelUpXp");
    this.levelUpUnlocks = this.document.getElementById("levelUpUnlocks");
    this.levelUpOverlayTimer = 0;
    this.goalFields = this.buildGoalFieldMeta();
    this.requiredGoalKeys = [...CORE_PROMPT_KEYS];

    this.studentLoginForm = this.document.getElementById("studentLoginForm");
    this.studentIdInput = this.document.getElementById("studentIdInput");
    this.studentPasscodeInput = this.document.getElementById("studentPasscodeInput");
    this.studentDisplayNameInput = this.document.getElementById("studentDisplayNameInput");
    this.studentSignInButton = this.document.getElementById("studentSignInButton");
    this.studentSignOutButton = this.document.getElementById("studentSignOutButton");
    this.studentAuthBanner = this.document.getElementById("studentAuthBanner");
    this.authMessage = this.document.getElementById("authMessage");
    this.syncStatus = this.document.getElementById("syncStatus");

    this.context = this.canvas ? this.canvas.getContext("2d", { alpha: false }) : null;
    this.canvasState = { width: 0, height: 0, dpr: 1 };
    this.lastNarration = "";
  }

  isReady() {
    return Boolean(this.scrollTrack && this.canvas && this.context);
  }

  resizeCanvas(viewportWidth, viewportHeight, devicePixelRatio = 1) {
    if (!this.canvas || !this.context) {
      return;
    }

    const width = Math.max(1, Math.floor(viewportWidth));
    const height = Math.max(1, Math.floor(viewportHeight));
    const dpr = Math.max(1, Math.min(devicePixelRatio, 2));

    if (
      width === this.canvasState.width &&
      height === this.canvasState.height &&
      dpr === this.canvasState.dpr
    ) {
      return;
    }

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);

    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = "high";

    this.canvasState = { width, height, dpr };
  }

  getTrackMetrics(win) {
    if (!this.scrollTrack) {
      return { top: 0, height: 1 };
    }

    const bounds = this.scrollTrack.getBoundingClientRect();
    return {
      top: bounds.top + win.scrollY,
      height: this.scrollTrack.offsetHeight || bounds.height
    };
  }

  drawFrame(image) {
    if (!this.context) {
      return;
    }

    const { width, height, dpr } = this.canvasState;
    if (width <= 0 || height <= 0) {
      return;
    }

    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.context.clearRect(0, 0, width, height);

    if (!image) {
      return;
    }

    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;

    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return;
    }

    const coverScale = Math.max(width / sourceWidth, height / sourceHeight);
    const drawWidth = sourceWidth * coverScale;
    const drawHeight = sourceHeight * coverScale;
    const drawX = (width - drawWidth) / 2;
    const drawY = (height - drawHeight) / 2;

    this.context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }

  updateCards(scrollProgress, opacityResolver) {
    for (const card of this.cards) {
      const start = Number.parseFloat(card.dataset.start ?? "");
      const end = Number.parseFloat(card.dataset.end ?? "");

      if (Number.isNaN(start) || Number.isNaN(end)) {
        continue;
      }

      const opacity = opacityResolver(scrollProgress, start, end);
      this.applyCardOpacity(card, opacity);
    }
  }

  applyCardOpacity(card, opacity) {
    const boundedOpacity = Math.max(0, Math.min(1, opacity));
    const isLocked = card.classList.contains("locked");
    const effectiveOpacity = isLocked ? boundedOpacity * 0.42 : boundedOpacity;
    const translateY = (1 - boundedOpacity) * 22;
    const scale = 0.99 + (boundedOpacity * 0.01);
    const isVisible = boundedOpacity > 0.05;

    card.style.opacity = String(effectiveOpacity);
    card.style.transform = `translateY(${translateY}px) scale(${scale})`;
    card.style.pointerEvents = isVisible && !isLocked ? "auto" : "none";
    card.setAttribute("aria-hidden", isVisible ? "false" : "true");

    const interactiveNodes = card.querySelectorAll("input, textarea, select, button, a[href]");
    for (const node of interactiveNodes) {
      if (!("baseTabindex" in node.dataset)) {
        node.dataset.baseTabindex = node.getAttribute("tabindex") ?? "";
      }

      if (isVisible) {
        if (node.dataset.baseTabindex === "") {
          node.removeAttribute("tabindex");
        } else {
          node.setAttribute("tabindex", node.dataset.baseTabindex);
        }
      } else {
        node.setAttribute("tabindex", "-1");
      }
    }
  }

  updateLoader(snapshot) {
    if (!snapshot) {
      return;
    }

    const target = Math.max(0, Number(snapshot.target) || 0);
    const loaded = Math.max(0, Number(snapshot.loaded) || 0);
    const ratio = target > 0 ? Math.max(0, Math.min(1, loaded / target)) : 1;
    const percent = ratio * 100;

    if (this.loaderProgress) {
      this.loaderProgress.setAttribute("aria-valuenow", percent.toFixed(1));
      this.loaderProgress.setAttribute("aria-valuetext", `${Math.round(percent)} percent loaded`);
    }

    if (this.loaderFill) {
      this.loaderFill.style.width = `${percent.toFixed(1)}%`;
    }

    if (this.loaderCount) {
      this.loaderCount.textContent = `${loaded} / ${target}`;
    }
  }

  setLoaderVisible(isVisible) {
    if (!this.loader) {
      return;
    }

    this.loader.classList.toggle("hidden", !isVisible);
  }

  setScrollLabel(label) {
    if (!this.scrollNote || !label) {
      return;
    }
    this.scrollNote.textContent = label;
  }

  announceScrollAct(narration) {
    if (!this.scrollActNarration || !narration || narration === this.lastNarration) {
      return;
    }

    this.scrollActNarration.textContent = narration;
    this.lastNarration = narration;
  }

  buildGoalFieldMeta() {
    const fields = [];
    const seen = new Set();

    for (const input of this.goalInputs) {
      const key = input.dataset.goalKey || "";
      if (!key || seen.has(key)) {
        continue;
      }

      const label = input.dataset.goalLabel || input.getAttribute("aria-label") || key;
      fields.push({ key, label });
      seen.add(key);
    }

    return fields;
  }

  bindGoalInput(onInput) {
    for (const input of this.goalInputs) {
      input.addEventListener("input", () => {
        const key = input.dataset.goalKey || "";
        onInput({ key, value: input.value });
      });
    }
  }

  bindAuthSubmit(onSubmit) {
    if (!this.studentLoginForm) {
      return;
    }

    this.studentLoginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      onSubmit({
        studentId: this.studentIdInput?.value || "",
        passcode: this.studentPasscodeInput?.value || "",
        displayName: this.studentDisplayNameInput?.value || ""
      });
    });
  }

  bindSignOut(onSignOut) {
    if (!this.studentSignOutButton) {
      return;
    }

    this.studentSignOutButton.addEventListener("click", (event) => {
      event.preventDefault();
      onSignOut();
    });
  }

  bindCertificateExport(onExport) {
    if (!this.goalCertificateButton) {
      return;
    }

    this.goalCertificateButton.addEventListener("click", (event) => {
      event.preventDefault();
      onExport();
    });
  }

  bindLevelUpButtons(onClick) {
    for (const button of this.levelUpButtons) {
      button.addEventListener("click", () => {
        onClick({
          key: button.dataset.target || ""
        });
      });
    }
  }

  setAuthBusy(isBusy) {
    const disabled = Boolean(isBusy);

    if (this.studentIdInput) {
      this.studentIdInput.disabled = disabled;
    }
    if (this.studentPasscodeInput) {
      this.studentPasscodeInput.disabled = disabled;
    }
    if (this.studentDisplayNameInput) {
      this.studentDisplayNameInput.disabled = disabled;
    }
    if (this.studentSignInButton) {
      this.studentSignInButton.disabled = disabled;
    }
    if (this.studentSignOutButton) {
      this.studentSignOutButton.disabled = disabled;
    }
  }

  setAuthMessage(message, tone = "neutral") {
    if (!this.authMessage) {
      return;
    }

    this.authMessage.textContent = message;
    this.authMessage.dataset.tone = tone;
  }

  setSyncStatus(message, tone = "local") {
    if (!this.syncStatus) {
      return;
    }

    this.syncStatus.textContent = message;
    this.syncStatus.dataset.tone = tone;
  }

  renderAuthState(session) {
    const signedIn = Boolean(session?.studentId);

    if (this.goalPanel) {
      this.goalPanel.classList.toggle("is-authenticated", signedIn);
    }

    if (this.studentAuthBanner) {
      if (signedIn) {
        const display = session.displayName || session.studentId;
        this.studentAuthBanner.textContent = `Synced as ${display}`;
      } else {
        this.studentAuthBanner.textContent = "Sign in to sync across devices";
      }
    }

    if (this.studentSignInButton) {
      this.studentSignInButton.hidden = signedIn;
    }
    if (this.studentSignOutButton) {
      this.studentSignOutButton.hidden = !signedIn;
    }

    if (this.studentIdInput) {
      this.studentIdInput.disabled = signedIn;
      if (signedIn) {
        this.studentIdInput.value = session.studentId || "";
      }
    }

    if (this.studentDisplayNameInput) {
      this.studentDisplayNameInput.disabled = signedIn;
      if (signedIn) {
        this.studentDisplayNameInput.value = session.displayName || "";
      }
    }

    if (this.studentPasscodeInput) {
      this.studentPasscodeInput.disabled = signedIn;
      this.studentPasscodeInput.value = "";
    }
  }

  applyGoalDraftSnapshot(snapshot) {
    const responses = snapshot?.responses || {};
    const canonicalResponses = readCorePromptResponses(responses);

    for (const input of this.goalInputs) {
      const key = input.dataset.goalKey || "";
      input.value = key ? (canonicalResponses[key] || responses[key] || "") : "";
    }

    this.renderGoalSummary(snapshot);
  }

  renderGoalSummary(snapshot) {
    if (!this.goalSummaryList) {
      return;
    }

    const responses = {
      ...(snapshot?.responses || {}),
      ...readCorePromptResponses(snapshot?.responses || {})
    };
    const summaryItems = this.goalFields.map(({ key, label }) => {
      const raw = typeof responses[key] === "string" ? responses[key].trim() : "";
      const content = raw
        ? this.escapeHtml(raw).replace(/\n/g, "<br>")
        : "<span class=\"goal-empty\">No response yet.</span>";

      return `<article class="goal-summary-item"><h4>${this.escapeHtml(label)}</h4><p>${content}</p></article>`;
    });

    this.goalSummaryList.innerHTML = summaryItems.join("");

    if (this.goalSavedAt) {
      if (snapshot?.updatedAt) {
        this.goalSavedAt.textContent = `Last saved: ${this.formatTimestamp(snapshot.updatedAt)}`;
      } else {
        this.goalSavedAt.textContent = "No saved responses yet.";
      }
    }

    this.renderGoalCompletion(snapshot);
  }

  renderGoalCompletion(snapshot) {
    const status = this.getCompletionStatus(snapshot);

    if (this.goalCompletionText) {
      this.goalCompletionText.textContent = `${status.completedPrompts}/${status.totalPrompts} core prompts complete`;
    }
    if (this.goalCompletionPercent) {
      this.goalCompletionPercent.textContent = `${Math.round(status.promptRatio * 100)}%`;
    }
    if (this.goalCompletionBar) {
      this.goalCompletionBar.style.width = `${(status.promptRatio * 100).toFixed(1)}%`;
    }
    if (this.goalCompletionTrack) {
      this.goalCompletionTrack.setAttribute("aria-valuenow", String(Math.round(status.promptRatio * 100)));
    }

    if (this.goalCheckpointList) {
      this.goalCheckpointList.innerHTML = status.checkpoints.map((checkpoint) => {
        const cssClass = checkpoint.done ? "done" : "pending";
        const marker = checkpoint.done ? "Complete" : "Pending";
        return `<li class="${cssClass}">${this.escapeHtml(checkpoint.label)}: ${marker}</li>`;
      }).join("");
    }

    if (this.goalCertificateButton) {
      this.goalCertificateButton.disabled = !status.certificateEligible;
      this.goalCertificateButton.textContent = status.certificateEligible
        ? "Export Completion Certificate"
        : "Complete Checkpoints to Unlock Certificate";
    }
  }

  setCardLocks(unlockedKeys = [], completedKeys = []) {
    const unlocked = new Set(unlockedKeys);
    const completed = new Set(completedKeys);

    for (const card of this.cards) {
      const key = this.promptKeyForCard(card);
      if (!key) {
        continue;
      }

      const isUnlocked = unlocked.has(key);
      const isCompleted = completed.has(key);

      card.classList.toggle("locked", !isUnlocked);
      card.classList.toggle("completed", isCompleted);
      card.classList.toggle("hidden", false);

      const button = card.querySelector(".level-up-btn[data-target]");
      if (button) {
        button.disabled = !isUnlocked || isCompleted;
      }
    }
  }

  promptKeyForCard(card) {
    const explicit = String(card?.dataset?.promptKey || "").trim();
    if (explicit) {
      return explicit;
    }

    const id = String(card?.id || "").trim();
    if (!id.startsWith("prompt-")) {
      return "";
    }
    return id.slice("prompt-".length);
  }

  renderLevelProgress({ level = 1, levelName = "BHAG", xp = 0, xpRatio = 0, nextTarget = 0 } = {}) {
    if (this.goalLevelBadge) {
      this.goalLevelBadge.textContent = `Level ${Math.max(1, Number(level) || 1)} - ${levelName}`;
    }

    if (this.goalXpText) {
      this.goalXpText.textContent = `${Math.max(0, Number(xp) || 0)} XP / ${Math.max(0, Number(nextTarget) || 0)}`;
    }

    if (this.goalXpBar) {
      const bounded = Math.max(0, Math.min(1, Number(xpRatio) || 0));
      this.goalXpBar.style.width = `${(bounded * 100).toFixed(1)}%`;
    }

    if (this.goalXpTrack) {
      this.goalXpTrack.setAttribute("aria-valuenow", String(Math.round((Math.max(0, Math.min(1, Number(xpRatio) || 0))) * 100)));
    }
  }

  setScrollTrackHeight(heightVh) {
    if (!this.scrollTrack) {
      return;
    }
    const safe = Math.max(280, Math.min(1300, Number(heightVh) || 300));
    this.scrollTrack.style.height = `${safe}vh`;
    this.scrollTrack.style.minHeight = `${safe}vh`;
  }

  showLevelUpOverlay({ level = 1, levelName = "BHAG", xpGained = 0, newUnlocks = [] } = {}) {
    if (!this.levelUpOverlay) {
      return;
    }

    if (this.levelUpTitle) {
      this.levelUpTitle.textContent = `Level ${Math.max(1, Number(level) || 1)} Unlocked`;
    }

    if (this.levelUpText) {
      this.levelUpText.textContent = `Now entering ${levelName}.`;
    }

    if (this.levelUpXp) {
      this.levelUpXp.textContent = `+${Math.max(0, Number(xpGained) || 0)} XP`;
    }

    if (this.levelUpUnlocks) {
      this.levelUpUnlocks.textContent = newUnlocks.length
        ? `New prompt: ${newUnlocks.join(", ")}`
        : "";
    }

    this.levelUpOverlay.classList.remove("hidden");
    this.levelUpOverlay.classList.add("show");

    if (this.levelUpOverlayTimer) {
      window.clearTimeout(this.levelUpOverlayTimer);
    }

    this.levelUpOverlayTimer = window.setTimeout(() => {
      this.levelUpOverlay.classList.remove("show");
      this.levelUpOverlay.classList.add("hidden");
      this.levelUpOverlayTimer = 0;
    }, 2300);
  }

  getCompletionStatus(snapshot) {
    const responses = snapshot?.responses || {};
    const completion = getCorePromptCompletion(responses);
    const completedPrompts = completion.completed;
    const totalPrompts = completion.total;
    const promptRatio = completion.ratio;
    const coreResponses = completion.core;

    const workspaceState = this.decodeMissionWorkspaceFromResponses(responses);
    const progression = this.decodeProgressionFromResponses(responses, workspaceState);
    const smartReadyCount = Array.isArray(workspaceState?.monthly)
      ? workspaceState.monthly.filter((goal) => Number(goal?.score) === 5).length
      : 0;
    const dailyDoneCount = Array.isArray(workspaceState?.daily)
      ? workspaceState.daily.filter((entry) => {
        const statusText = String(entry?.status || "").toLowerCase().trim();
        return statusText === "done" || statusText === "complete" || statusText === "completed";
      }).length
      : 0;

    const checkpoints = [
      {
        label: "Core Interview (BHAG to Tasks)",
        done: this.areKeysComplete(coreResponses, CORE_PROMPT_KEYS)
      },
      {
        label: "Direction Set (BHAG + Monthly)",
        done: this.areKeysComplete(coreResponses, ["bhag", "monthly"])
      },
      {
        label: "Execution Started (SMART + Daily)",
        done: smartReadyCount > 0 && dailyDoneCount > 0
      }
    ];

    return {
      completedPrompts,
      totalPrompts,
      promptRatio,
      checkpoints,
      smartReadyCount,
      dailyDoneCount,
      level: progression.level,
      xp: progression.xp,
      currentStreak: progression.currentStreak,
      certificateEligible: promptRatio === 1 && smartReadyCount > 0 && dailyDoneCount > 0 && progression.level >= 5
    };
  }

  areKeysComplete(responses, keys) {
    return keys.every((key) => {
      const value = typeof responses[key] === "string" ? responses[key].trim() : "";
      return value.length > 0;
    });
  }

  decodeMissionWorkspaceFromResponses(responses) {
    if (!responses || typeof responses !== "object") {
      return null;
    }

    let prefix = "__mc_";
    let count = Number.parseInt(String(responses.__mc_chunkCount || ""), 10);
    if (!Number.isFinite(count) || count <= 0) {
      prefix = "__";
      count = Number.parseInt(String(responses.__chunkCount || ""), 10);
    }

    if (!Number.isFinite(count) || count <= 0 || count > 64) {
      return null;
    }

    let raw = "";
    for (let index = 0; index < count; index += 1) {
      const key = `${prefix}chunk_${index}`;
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

  decodeProgressionFromResponses(responses, workspaceState) {
    const fallback = { level: 1, xp: 0, currentStreak: 0 };

    const fromWorkspace = workspaceState?.progression;
    if (fromWorkspace && typeof fromWorkspace === "object") {
      return {
        level: Math.max(1, Number(fromWorkspace.level) || 1),
        xp: Math.max(0, Number(fromWorkspace.xp) || 0),
        currentStreak: Math.max(0, Number(fromWorkspace.currentStreak) || 0)
      };
    }

    const raw = responses?.progression_state;
    if (typeof raw !== "string") {
      return fallback;
    }

    try {
      const parsed = JSON.parse(raw);
      return {
        level: Math.max(1, Number(parsed?.level) || 1),
        xp: Math.max(0, Number(parsed?.xp) || 0),
        currentStreak: Math.max(0, Number(parsed?.currentStreak) || 0)
      };
    } catch (_error) {
      return fallback;
    }
  }

  exportCompletionCertificate({ session, snapshot }) {
    const status = this.getCompletionStatus(snapshot);
    if (!status.certificateEligible) {
      return {
        ok: false,
        message: "Reach Level 5, finish core prompts, and complete SMART + daily evidence before exporting."
      };
    }

    const responses = {
      ...(snapshot?.responses || {}),
      ...readCorePromptResponses(snapshot?.responses || {})
    };
    const name = session?.displayName || session?.studentId || "Student";
    const studentId = session?.studentId || "unknown";
    const issueDate = new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
    const goal = typeof responses.monthly === "string" && responses.monthly.trim()
      ? responses.monthly.trim()
      : "Completed SMART goal journey";

    const certificateHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SPOKES Completion Certificate</title>
  <style>
    body { margin: 0; background: #f8fafc; font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; }
    .sheet { width: min(920px, calc(100% - 2rem)); margin: 2rem auto; background: #fff; border: 8px solid #0f4c81; border-radius: 20px; padding: 2.2rem; box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2); }
    h1 { margin: 0; font-size: 2rem; text-align: center; letter-spacing: 0.06em; text-transform: uppercase; }
    h2 { margin: 0.9rem 0 0; text-align: center; font-size: 1.25rem; color: #1d4ed8; }
    p { line-height: 1.55; }
    .name { margin-top: 1.2rem; text-align: center; font-size: 1.55rem; font-weight: 700; color: #14532d; }
    .goal { margin-top: 1rem; padding: 0.9rem; border-radius: 12px; border: 1px solid rgba(15, 23, 42, 0.15); background: #f1f5f9; }
    .meta { margin-top: 1.4rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; font-size: 0.95rem; }
    .label { display: block; font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; font-weight: 700; }
    .value { margin-top: 0.2rem; font-weight: 700; }
    .footer { margin-top: 1.5rem; text-align: center; color: #334155; font-size: 0.9rem; }
  </style>
</head>
<body>
  <article class="sheet">
    <h1>Certificate of Completion</h1>
    <h2>SPOKES Goal Setting Lesson</h2>
    <p class="name">${this.escapeHtml(name)}</p>
    <p style="text-align:center">completed all required checkpoints in the integrated goal journey and mission control experience.</p>
    <section class="goal">
      <span class="label">Final SMART Goal</span>
      <p>${this.escapeHtml(goal)}</p>
    </section>
    <section class="meta">
      <div><span class="label">Issue Date</span><div class="value">${this.escapeHtml(issueDate)}</div></div>
      <div><span class="label">Student ID</span><div class="value">${this.escapeHtml(studentId)}</div></div>
      <div><span class="label">SMART-Ready Goals</span><div class="value">${status.smartReadyCount}</div></div>
      <div><span class="label">Completed Daily Entries</span><div class="value">${status.dailyDoneCount}</div></div>
      <div><span class="label">Level / XP</span><div class="value">L${status.level} / ${status.xp}</div></div>
      <div><span class="label">Current Streak</span><div class="value">${status.currentStreak} days</div></div>
    </section>
    <p class="footer">Use browser Print to save as PDF.</p>
  </article>
</body>
</html>`;

    const popup = window.open("", "_blank", "noopener,noreferrer,width=980,height=760");
    if (!popup) {
      return {
        ok: false,
        message: "Popup blocked. Allow popups to export the certificate."
      };
    }

    popup.document.open();
    popup.document.write(certificateHtml);
    popup.document.close();

    return { ok: true };
  }

  formatTimestamp(isoTimestamp) {
    const parsed = new Date(isoTimestamp);
    if (Number.isNaN(parsed.getTime())) {
      return "just now";
    }

    return parsed.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  }
}
