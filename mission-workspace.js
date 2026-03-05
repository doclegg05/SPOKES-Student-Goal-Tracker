import { CORE_PROMPT_KEYS, readPromptResponses } from "./goal-response-adapter.js";
import { ProgressionEngine } from "./progression-engine.js";

const LEGACY_KEY = "spokesMissionControlV2";
const GOAL_STORAGE_BASE_KEY = "spokes-goal-journey";
const SESSION_KEY = "spokes-goal-session-v1";
const LESSON_ID = "spokes-goal-journey-v1";
const API_BASE = "/api";
const WORKSPACE_PREFIX = "__mc_";
const LESSON_PROMPT_KEYS = [...CORE_PROMPT_KEYS];
const PROGRESSION_RESPONSE_KEY = "progression_state";
const JSPDF_LOCAL_SRC = "/node_modules/jspdf/dist/jspdf.umd.min.js";
const JSPDF_CDN_SRC = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
const JSPDF_AUTOTABLE_LOCAL_SRC = "/node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js";
const JSPDF_AUTOTABLE_CDN_SRC = "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js";
const SPOKES_LOGO_PATH = "/NCSPOKES.Logo.jpg";
const GROWTH_PROMPTS = [
  { key: "why_matters", label: "Why does this goal matter?", unlockLevel: 3 },
  { key: "barrier_id", label: "Most likely barrier?", unlockLevel: 3 },
  { key: "if_then_plan", label: "If / Then contingency plan", unlockLevel: 4 },
  { key: "evidence", label: "Evidence of progress", unlockLevel: 5 },
  { key: "support", label: "Support network", unlockLevel: 5 },
  { key: "deadline", label: "Deadline commitment", unlockLevel: 5 }
];

function readFeatureFlag(name, fallback = true) {
  if (typeof window === "undefined") {
    return fallback;
  }
  const source = window.__SPOKES_FLAGS__ || {};
  if (!Object.prototype.hasOwnProperty.call(source, name)) {
    return fallback;
  }
  return source[name] !== false;
}

export function initMissionWorkspace(doc = document) {
  const root = doc.getElementById("missionControl");
  if (!root) {
    return;
  }

  const ui = {
    syncState: doc.getElementById("mcSyncState"),
    completion: doc.getElementById("mcLevel") || doc.getElementById("mcCompletion"),
    points: doc.getElementById("mcXP") || doc.getElementById("mcPoints"),
    streak: doc.getElementById("mcStreak"),
    smartReady: doc.getElementById("mcSmartReady"),
    generatePlanBtn: doc.getElementById("mcGeneratePlan"),
    planHint: doc.getElementById("mcPlanHint"),
    dailyList: doc.getElementById("mcDailyList"),
    archiveList: doc.getElementById("mcArchiveList"),
    smartList: doc.getElementById("mcSmartList"),
    todo: doc.getElementById("mcTodo"),
    progress: doc.getElementById("mcProgress"),
    done: doc.getElementById("mcDone"),
    toast: doc.getElementById("mcToast"),
    tabs: Array.from(root.querySelectorAll(".mc-tab[data-tab]")),
    panels: Array.from(root.querySelectorAll(".mc-panel[data-panel]")),
    visionGoalSelect: doc.getElementById("mcVisionGoalSelect"),
    addGoalNote: doc.getElementById("mcAddGoalNote"),
    addImageNote: doc.getElementById("mcAddImageNote"),
    visionImageInput: doc.getElementById("mcVisionImageInput"),
    visionBoard: doc.getElementById("mcVisionBoard"),
    growthPrompts: doc.getElementById("mcGrowthPrompts"),
    reviewModal: doc.getElementById("mcReviewModal"),
    reviewTitle: doc.getElementById("mcReviewTitle"),
    reviewPrompt: doc.getElementById("mcReviewPrompt"),
    reviewAnswer: doc.getElementById("mcReviewAnswer"),
    reviewDismiss: doc.getElementById("mcReviewDismiss"),
    reviewComplete: doc.getElementById("mcReviewComplete"),
    deleteModal: doc.getElementById("mcDeleteModal"),
    deletePrompt: doc.getElementById("mcDeletePrompt"),
    deleteNo: doc.getElementById("mcDeleteNo"),
    deleteYes: doc.getElementById("mcDeleteYes"),
    goalNoteModal: doc.getElementById("mcGoalNoteModal"),
    goalNoteTitleInput: doc.getElementById("mcGoalNoteTitle"),
    goalNoteTextInput: doc.getElementById("mcGoalNoteText"),
    goalNoteCancel: doc.getElementById("mcGoalNoteCancel"),
    goalNotePost: doc.getElementById("mcGoalNotePost"),
    howToPlayModal: doc.getElementById("howToPlayModal"),
    howToPlayClose: doc.getElementById("howToPlayClose"),
    howToPlayBtn: doc.getElementById("howToPlayBtn"),
    howToPlayBtnSidebar: doc.getElementById("howToPlayBtnSidebar"),
    badgeCount: doc.getElementById("mcBadgeCount"),
    badges: doc.getElementById("mcBadges"),
    mcXpFloatAnchor: doc.getElementById("mcXpFloatAnchor")
  };

  const forms = {
    daily: doc.getElementById("mcDailyForm"),
    smart: doc.getElementById("mcSmartForm"),
    demoBtn: doc.getElementById("mcDemo"),
    exportBtn: doc.getElementById("mcExport"),
    resetBtn: doc.getElementById("mcReset")
  };

  if (!ui.syncState || !ui.visionBoard) {
    return;
  }

  const st = {
    monthly: [],
    daily: [],
    archive: [],
    barriers: [],
    portfolio: [],
    vision: { items: [], nextId: 1, maxZ: 0 },
    visionMonthBoards: {},
    visionSelectedMonth: "",
    progression: ProgressionEngine.createInitialState(),
    meta: { updatedAt: null }
  };

  const progression = new ProgressionEngine(st.progression);
  const flags = {
    progress: readFeatureFlag("SPOKES_PROGRESS_V1", true),
    growth: readFeatureFlag("SPOKES_GROWTH_PROMPTS_V1", true),
    kanban: readFeatureFlag("SPOKES_KANBAN_ENHANCED_V1", true)
  };

  const sync = { enabled: false, token: "", studentId: "", remoteResponses: {}, pending: false, inFlight: false, timer: null };
  const drag = { id: "", mode: "", pointerId: null, sx: 0, sy: 0, ox: 0, oy: 0, ow: 0, oh: 0 };
  const kanban = { dragId: "", editingId: "" };
  const review = { mode: "", open: false };
  const deleteState = { id: "", source: "" };
  const goalNote = { goalId: "" };

  let toastTimer = 0;
  let jsPdfLoadPromise = null;
  let autoTableLoadPromise = null;
  let logoDataUrlPromise = null;

  init();

  function init() {
    bindTabs();
    bindForms();
    bindVisionBoardEvents();
    bindKanbanEvents();
    bindArchiveEvents();
    bindUtilityButtons();
    bindReviewEvents();
    bindDeleteModalEvents();
    bindGoalNoteEvents();
    bindHowToPlayEvents();
    setDefaultDate();
    configureSyncFromSession();
    migrateLegacyLocalState();
    hydrateFromLocal();
    activateVisionMonth(currentMonthKey(), { saveCurrent: true, persist: false, quiet: true });
    renderAll();
    loadBestDraft();
    window.setTimeout(() => {
      checkForPendingReviews();
    }, 3000);

    const onViewportChanged = debounce(() => {
      st.vision.items.forEach((item) => clampVisionItem(item));
      renderVisionBoard();
    }, 140);

    window.addEventListener("resize", onViewportChanged);
    window.addEventListener("orientationchange", onViewportChanged);
  }

  function bindTabs() {
    ui.tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.classList.contains("locked-tab") || btn.disabled) {
          toast("This section unlocks at a higher level.");
          return;
        }
        setActiveTab(btn.dataset.tab || "daily");
      });
    });
  }

  function setActiveTab(tabName) {
    const targetButton = ui.tabs.find((btn) => (btn.dataset.tab || "") === tabName);
    if (targetButton && (targetButton.disabled || targetButton.classList.contains("locked-tab"))) {
      tabName = "daily";
    }

    ui.tabs.forEach((btn) => {
      const active = (btn.dataset.tab || "") === tabName;
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });

    ui.panels.forEach((panel) => {
      const active = (panel.dataset.panel || "") === tabName;
      panel.classList.toggle("active", active);
    });
  }

  function bindForms() {
    if (forms.daily) {
      forms.daily.addEventListener("submit", handleDailySubmit);
    }

    if (forms.smart) {
      forms.smart.addEventListener("submit", handleSmartSubmit);
    }

    if (ui.addGoalNote) {
      ui.addGoalNote.addEventListener("click", addGoalNoteFromSelection);
    }

    if (ui.visionGoalSelect) {
      ui.visionGoalSelect.addEventListener("change", handleVisionMonthSelectionChange);
    }

    if (ui.addImageNote) {
      ui.addImageNote.addEventListener("click", () => ui.visionImageInput && ui.visionImageInput.click());
    }

    if (ui.visionImageInput) {
      ui.visionImageInput.addEventListener("change", handleVisionImagePicked);
    }
  }

  function bindReviewEvents() {
    if (ui.reviewDismiss) {
      ui.reviewDismiss.addEventListener("click", () => closeReviewModal());
    }
    if (ui.reviewComplete) {
      ui.reviewComplete.addEventListener("click", completeReviewModal);
    }
  }

  function bindArchiveEvents() {
    if (!ui.archiveList) {
      return;
    }
    ui.archiveList.addEventListener("click", handleArchiveClick);
  }

  function bindDeleteModalEvents() {
    if (ui.deleteNo) {
      ui.deleteNo.addEventListener("click", closeDeleteModal);
    }
    if (ui.deleteYes) {
      ui.deleteYes.addEventListener("click", confirmDeleteModal);
    }
    if (ui.deleteModal) {
      ui.deleteModal.addEventListener("cancel", () => {
        clearDeleteState();
      });
      ui.deleteModal.addEventListener("close", () => {
        clearDeleteState();
      });
    }
  }

  function bindGoalNoteEvents() {
    if (ui.goalNoteCancel) {
      ui.goalNoteCancel.addEventListener("click", closeGoalNoteModal);
    }
    if (ui.goalNotePost) {
      ui.goalNotePost.addEventListener("click", submitGoalNoteModal);
    }
    if (ui.goalNoteModal) {
      ui.goalNoteModal.addEventListener("cancel", () => {
        clearGoalNoteDraft();
      });
      ui.goalNoteModal.addEventListener("close", () => {
        clearGoalNoteDraft();
      });
    }
  }

  function bindHowToPlayEvents() {
    function openHelp() {
      if (ui.howToPlayModal && typeof ui.howToPlayModal.showModal === "function") {
        ui.howToPlayModal.showModal();
      }
    }
    if (ui.howToPlayBtn) {
      ui.howToPlayBtn.addEventListener("click", openHelp);
    }
    if (ui.howToPlayBtnSidebar) {
      ui.howToPlayBtnSidebar.addEventListener("click", openHelp);
    }
    if (ui.howToPlayClose) {
      ui.howToPlayClose.addEventListener("click", () => {
        if (ui.howToPlayModal) { ui.howToPlayModal.close(); }
      });
    }
  }

  function showMcFloatingXp(amount) {
    if (!ui.mcXpFloatAnchor || !amount) { return; }
    const el = doc.createElement("span");
    el.className = "xp-float";
    el.textContent = `+${amount} XP`;
    ui.mcXpFloatAnchor.appendChild(el);
    el.addEventListener("animationend", () => { el.remove(); }, { once: true });
  }

  function bindKanbanEvents() {
    if (!flags.kanban) {
      return;
    }
    const lanes = getKanbanLaneRoots();
    const dropZones = getKanbanDropZones();

    lanes.forEach((laneEl) => {
      laneEl.addEventListener("click", handleKanbanClick);
      laneEl.addEventListener("dragstart", handleKanbanDragStart);
      laneEl.addEventListener("dragend", handleKanbanDragEnd);
    });

    dropZones.forEach((zoneEl) => {
      zoneEl.addEventListener("dragover", handleKanbanDragOver);
      zoneEl.addEventListener("dragleave", handleKanbanDragLeave);
      zoneEl.addEventListener("drop", handleKanbanDrop);
    });
  }

  function getKanbanLaneRoots() {
    return [ui.todo, ui.progress, ui.done].filter(Boolean);
  }

  function getKanbanDropZones() {
    const zones = [];
    getKanbanLaneRoots().forEach((laneEl) => {
      zones.push(laneEl);
      const wrapper = laneEl.closest(".mc-lane");
      if (wrapper) {
        zones.push(wrapper);
      }
    });
    return Array.from(new Set(zones));
  }

  function readLaneStatusFromZone(zoneEl) {
    if (!(zoneEl instanceof Element)) {
      return "";
    }
    const own = String(zoneEl.dataset?.laneStatus || "").trim();
    if (own) {
      return own;
    }
    const child = zoneEl.querySelector("[data-lane-status]");
    return String(child?.dataset?.laneStatus || "").trim();
  }

  function handleKanbanClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
      return;
    }

    const actionButton = target.closest("[data-task-action]");
    const taskEl = target.closest(".mc-task[data-task-id]");
    const taskId = taskEl ? String(taskEl.dataset.taskId || "") : "";

    if (!actionButton && taskId && !target.closest("input, textarea, select, button")) {
      kanban.editingId = taskId;
      renderDailyLanes();
      return;
    }

    if (!actionButton) {
      return;
    }

    const action = String(actionButton.dataset.taskAction || "");
    if (action === "add") {
      const status = String(actionButton.dataset.status || "Blocked");
      addQuickTask(status);
      return;
    }

    if (!taskId) {
      return;
    }

    if (action === "edit") {
      kanban.editingId = taskId;
      renderDailyLanes();
      return;
    }

    if (action === "cancel") {
      kanban.editingId = "";
      renderDailyLanes();
      return;
    }

    if (action === "delete") {
      requestDeleteTask(taskId, "daily");
      return;
    }

    if (action === "save") {
      saveTaskInline(taskEl);
    }
  }

  function handleArchiveClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
      return;
    }

    const actionButton = target.closest("[data-archive-action]");
    if (!actionButton) {
      return;
    }

    const action = String(actionButton.dataset.archiveAction || "");
    if (action !== "delete") {
      return;
    }

    const card = actionButton.closest(".mc-task[data-archive-id]");
    const archiveId = String(card?.dataset.archiveId || "");
    if (!archiveId) {
      return;
    }

    requestDeleteTask(archiveId, "archive");
  }

  function handleKanbanDragStart(event) {
    if (!canUseKanbanEditing()) {
      return;
    }

    const task = event.target.closest(".mc-task[data-task-id]");
    if (!task) {
      return;
    }

    const id = String(task.dataset.taskId || "");
    if (!id) {
      return;
    }

    kanban.dragId = id;
    task.classList.add("dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", id);
    }
  }

  function handleKanbanDragOver(event) {
    if (!canUseKanbanEditing()) {
      return;
    }
    event.preventDefault();
    const lane = event.currentTarget;
    if (lane instanceof Element) {
      lane.classList.add("mc-lane-drop");
    }
  }

  function handleKanbanDragLeave(event) {
    const lane = event.currentTarget;
    if (lane instanceof Element) {
      lane.classList.remove("mc-lane-drop");
    }
  }

  function handleKanbanDrop(event) {
    if (!canUseKanbanEditing()) {
      return;
    }
    event.preventDefault();

    const zone = event.currentTarget instanceof Element ? event.currentTarget : null;
    if (zone) {
      zone.classList.remove("mc-lane-drop");
    }

    const targetStatus = readLaneStatusFromZone(zone);
    const transferId = event.dataTransfer?.getData("text/plain") || "";
    const taskId = String(transferId || kanban.dragId || "");

    if (!taskId || !targetStatus) {
      return;
    }

    moveTaskToStatus(taskId, targetStatus);
  }

  function handleKanbanDragEnd(event) {
    kanban.dragId = "";
    const task = event.target.closest(".mc-task[data-task-id]");
    if (task) {
      task.classList.remove("dragging");
    }
    getKanbanDropZones().forEach((zone) => zone.classList.remove("mc-lane-drop"));
  }

  function bindUtilityButtons() {
    if (forms.demoBtn) {
      forms.demoBtn.addEventListener("click", loadDemoState);
    }

    if (forms.exportBtn) {
      forms.exportBtn.addEventListener("click", exportSnapshot);
    }

    if (forms.resetBtn) {
      forms.resetBtn.addEventListener("click", resetState);
    }

    if (ui.generatePlanBtn) {
      ui.generatePlanBtn.addEventListener("click", generatePlanFromLessonAnswers);
    }
  }

  function setDefaultDate() {
    const input = doc.getElementById("mcDDate");
    if (!input || input.value) {
      return;
    }
    input.value = todayLocalIso();
  }

  function todayLocalIso() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function currentMonthKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  function normalizeMonthKey(value) {
    const text = String(value || "").trim();
    if (/^\d{4}-\d{2}$/.test(text)) {
      return text;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text.slice(0, 7);
    }
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  function monthLabelFromKey(key) {
    const match = String(key || "").match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      return String(key || "Unknown Month");
    }
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const labelDate = new Date(year, month, 1);
    return labelDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  function handleDailySubmit(event) {
    event.preventDefault();
    refreshProgressionFromSharedDraft();

    const date = (doc.getElementById("mcDDate")?.value || "").trim();
    const top = (doc.getElementById("mcDTop")?.value || "").trim();
    const status = (doc.getElementById("mcDStatus")?.value || "Done").trim();
    const minutes = toInt(doc.getElementById("mcDMin")?.value, 0);
    const comment = (doc.getElementById("mcDComment")?.value || "").trim();

    if (!date || !top) {
      toast("Add both date and top priority first.");
      return;
    }

    const entry = {
      id: uid("d"),
      date,
      top,
      status,
      minutes: Math.max(0, minutes),
      comment,
      goalRef: inferCurrentGoalRef(),
      createdAt: new Date().toISOString()
    };

    st.daily.unshift(entry);
    st.daily = st.daily.slice(0, 200);

    let progressionUpdate = { levelChanged: false, newUnlocks: [], streakMilestone: null, xpGained: 0 };
    let taskXp = 0;
    if (flags.progress) {
      progressionUpdate = progression.recordDailyCheckIn(date);
      if (normalizeStatus(status) === "Done") {
        taskXp = progression.recordTaskCompletion().xpGained;
      }
      syncProgressionState();
      const totalXp = (progressionUpdate.xpGained || 0) + taskXp;
      if (totalXp > 0) {
        showMcFloatingXp(totalXp);
      }
    }

    if (doc.getElementById("mcDTop")) { doc.getElementById("mcDTop").value = ""; }
    if (doc.getElementById("mcDComment")) { doc.getElementById("mcDComment").value = ""; }
    if (doc.getElementById("mcDMin")) { doc.getElementById("mcDMin").value = "0"; }

    markDirtyAndPersist();
    renderDaily();
    renderStats();

    const notices = [];
    if (progressionUpdate.levelChanged && progressionUpdate.newUnlocks.includes("weekly")) {
      notices.push("Weekly goal unlocked.");
    }
    if (progressionUpdate.streakMilestone) {
      notices.push(`${progressionUpdate.streakMilestone}-day streak bonus.`);
    }
    if (taskXp > 0) {
      notices.push(`+${taskXp} XP task credit.`);
    }
    toast(notices.length ? `Daily entry saved. ${notices.join(" ")}` : "Daily entry saved.");
  }

  function handleSmartSubmit(event) {
    event.preventDefault();
    refreshProgressionFromSharedDraft();

    const month = (doc.getElementById("mcSMonth")?.value || "").trim();
    const goal = (doc.getElementById("mcSGoal")?.value || "").trim();
    const why = (doc.getElementById("mcSWhy")?.value || "").trim();
    const proof = (doc.getElementById("mcSProof")?.value || "").trim();
    const s = (doc.getElementById("mcSS")?.value || "Needs Work").trim();
    const m = (doc.getElementById("mcSM")?.value || "Needs Work").trim();
    const a = (doc.getElementById("mcSA")?.value || "Needs Work").trim();
    const r = (doc.getElementById("mcSR")?.value || "Needs Work").trim();
    const t = (doc.getElementById("mcST")?.value || "Needs Work").trim();

    if (!month || !goal || !why) {
      toast("Month, main goal, and why are required.");
      return;
    }

    const checks = { s, m, a, r, t };
    const score = Object.values(checks).filter((v) => v.toLowerCase() === "yes").length;

    const item = {
      id: uid("g"),
      month,
      goal,
      why,
      proof,
      checks,
      score,
      createdAt: new Date().toISOString()
    };

    st.monthly.unshift(item);
    st.monthly = st.monthly.slice(0, 160);

    if (flags.progress && score === 5) {
      progression.awardSmartReady();
      syncProgressionState();
    }

    if (forms.smart) {
      forms.smart.reset();
    }
    if (doc.getElementById("mcSS")) { doc.getElementById("mcSS").value = "Yes"; }
    if (doc.getElementById("mcSM")) { doc.getElementById("mcSM").value = "Yes"; }
    if (doc.getElementById("mcSA")) { doc.getElementById("mcSA").value = "Yes"; }
    if (doc.getElementById("mcSR")) { doc.getElementById("mcSR").value = "Yes"; }
    if (doc.getElementById("mcST")) { doc.getElementById("mcST").value = "Yes"; }

    markDirtyAndPersist();
    renderSmart();
    renderVisionGoalOptions();
    renderStats();
    toast("SMART goal added.");
  }

  function renderAll() {
    renderStats();
    renderDaily();
    renderArchive();
    renderSmart();
    renderVisionGoalOptions();
    renderVisionBoard();
    applyDashboardGating();
  }

  function renderStats() {
    const p = progression.getState();
    const smartReady = st.monthly.filter((m) => Number(m.score) === 5).length;
    ui.completion.textContent = String(p.level || 1);
    ui.points.textContent = String(p.xp || 0);
    ui.smartReady.textContent = String(smartReady);
    ui.streak.textContent = String(p.currentStreak || 0);
    if (ui.badgeCount) {
      ui.badgeCount.textContent = String((p.achievements || []).length);
    }
    if (ui.badges) {
      const earned = p.achievements || [];
      if (earned.length === 0) {
        ui.badges.innerHTML = '<span class="mc-badge-empty">No badges yet</span>';
      } else {
        ui.badges.innerHTML = earned.map((key) => {
          const label = key.replace(/^(xp:|streak:|level:)/, "").replace(/_/g, " ");
          const cat = key.startsWith("streak:") ? "badge-streak" : key.startsWith("level:") ? "badge-level" : "badge-xp";
          return '<span class="mc-badge ' + cat + '">' + escapeHtml(label) + '</span>';
        }).join("");
      }
    }
    applyDashboardGating();
    renderGrowthPrompts();
  }

  function renderDaily() {
    if (!ui.dailyList) {
      return;
    }

    if (!st.daily.length) {
      ui.dailyList.innerHTML = "<li><small>No daily entries yet.</small></li>";
    } else {
      ui.dailyList.innerHTML = st.daily.slice(0, 10).map((entry) => {
        const tone = statusTone(entry.status);
        return `<li><strong>${escapeHtml(entry.top || "")}</strong><small>${escapeHtml(formatDate(entry.date))} • ${escapeHtml(normalizeStatus(entry.status))} • ${Math.max(0, Number(entry.minutes) || 0)} min</small>${entry.goalRef ? `<small>${escapeHtml(entry.goalRef)}</small>` : ""}${entry.comment ? `<small>${escapeHtml(entry.comment)}</small>` : ""}<span class=\"mc-tag ${tone}\">${escapeHtml(normalizeStatus(entry.status))}</span></li>`;
      }).join("");
    }

    renderDailyLanes();
  }

  function renderArchive() {
    if (!ui.archiveList) {
      return;
    }

    if (!st.archive.length) {
      ui.archiveList.innerHTML = "<p class=\"mc-empty\">No archived wins yet. Drop a task in Done to archive it.</p>";
      return;
    }

    ui.archiveList.innerHTML = st.archive.slice(0, 120).map((entry) => {
      const date = escapeHtml(formatDate(entry.date));
      const archivedAt = escapeHtml(formatDate(String(entry.archivedAt || entry.createdAt || "")));
      const minutes = Math.max(0, Number(entry.minutes) || 0);
      const goalRef = String(entry.goalRef || "").trim();
      return `<article class="mc-task mc-archive-task" data-archive-id="${escapeAttr(entry.id)}">
        <button type="button" class="mc-task-close" data-archive-action="delete" aria-label="Delete archived task">×</button>
        <strong>${escapeHtml(entry.top || "")}</strong>
        <span>${date} • ${minutes} min • Archived ${archivedAt}</span>
        ${goalRef ? `<span class="mc-goal-ref">${escapeHtml(goalRef)}</span>` : ""}
        ${entry.comment ? `<small>${escapeHtml(entry.comment)}</small>` : ""}
      </article>`;
    }).join("");
  }

  function renderDailyLanes() {
    if (!ui.todo || !ui.progress || !ui.done) {
      return;
    }

    const groups = { todo: [], progress: [], done: [] };

    st.daily.forEach((entry) => {
      const state = normalizeStatus(entry.status);
      if (state === "Done") {
        groups.done.push(entry);
      } else if (state === "Partial") {
        groups.progress.push(entry);
      } else {
        groups.todo.push(entry);
      }
    });

    setKanbanLaneStatus(ui.todo, "Blocked");
    setKanbanLaneStatus(ui.progress, "Partial");
    setKanbanLaneStatus(ui.done, "Done");

    ui.todo.innerHTML = renderLaneTasks(groups.todo, {
      status: "Blocked",
      emptyLabel: "No blocked tasks."
    });
    ui.progress.innerHTML = renderLaneTasks(groups.progress, {
      status: "Partial",
      emptyLabel: "No partial tasks."
    });
    ui.done.innerHTML = renderLaneTasks(groups.done, {
      status: "Done",
      emptyLabel: "No completed tasks yet."
    });
  }

  function setKanbanLaneStatus(laneRoot, status) {
    if (!(laneRoot instanceof Element)) {
      return;
    }
    laneRoot.dataset.laneStatus = status;
    const wrapper = laneRoot.closest(".mc-lane");
    if (wrapper) {
      wrapper.dataset.laneStatus = status;
    }
  }

  function renderLaneTasks(items, { status, emptyLabel }) {
    const canEdit = canUseKanbanEditing();
    const header = `<button type="button" class="mc-task-add" data-task-action="add" data-status="${escapeAttr(status)}"${canEdit ? "" : " disabled"}>Add Task</button>`;

    if (!items.length) {
      return `${header}<p class=\"mc-empty\">${escapeHtml(emptyLabel)}</p>`;
    }

    const cards = items.slice(0, 40).map((entry) => {
      const editing = canEdit && kanban.editingId === entry.id;
      const date = escapeHtml(formatDate(entry.date));
      const statusText = escapeHtml(normalizeStatus(entry.status));
      const minutes = Math.max(0, Number(entry.minutes) || 0);
      const goalRef = String(entry.goalRef || "").trim();

      if (editing) {
        return `<article class="mc-task editing" data-task-id="${escapeAttr(entry.id)}">
          <button type="button" class="mc-task-close" data-task-action="delete" aria-label="Delete task">×</button>
          <div class="mc-task-editor">
            <input data-task-field="top" value="${escapeAttr(entry.top || "")}" placeholder="Task title">
            <div class="mc-row2">
              <div>
                <label>Status</label>
                <select data-task-field="status">
                  <option${normalizeStatus(entry.status) === "Blocked" ? " selected" : ""}>Blocked</option>
                  <option${normalizeStatus(entry.status) === "Partial" ? " selected" : ""}>Partial</option>
                  <option${normalizeStatus(entry.status) === "Done" ? " selected" : ""}>Done</option>
                </select>
              </div>
              <div>
                <label>Minutes</label>
                <input data-task-field="minutes" type="number" min="0" value="${minutes}">
              </div>
            </div>
            <input data-task-field="goalRef" value="${escapeAttr(goalRef)}" placeholder="Goal tag">
            <input data-task-field="comment" value="${escapeAttr(entry.comment || "")}" placeholder="Comment">
            <div class="mc-task-actions">
              <button type="button" data-task-action="save">Save</button>
              <button type="button" data-task-action="cancel">Cancel</button>
            </div>
          </div>
        </article>`;
      }

      return `<article class="mc-task" data-task-id="${escapeAttr(entry.id)}" draggable="${canEdit ? "true" : "false"}">
        <button type="button" class="mc-task-close" data-task-action="delete" aria-label="Delete task">×</button>
        <strong>${escapeHtml(entry.top || "")}</strong>
        <span>${date} • ${statusText} • ${minutes} min</span>
        ${goalRef ? `<span class="mc-goal-ref">${escapeHtml(goalRef)}</span>` : ""}
        ${entry.comment ? `<small>${escapeHtml(entry.comment)}</small>` : ""}
        ${canEdit ? `<div class="mc-task-actions"><button type="button" data-task-action="edit">Edit</button></div>` : ""}
      </article>`;
    }).join("");

    return `${header}${cards}`;
  }

  function findDailyEntry(id) {
    return st.daily.find((entry) => entry.id === id) || null;
  }

  function addQuickTask(status = "Blocked") {
    if (!canUseKanbanEditing()) {
      toast("Kanban editing unlocks at Level 4.");
      return;
    }

    const entry = {
      id: uid("d"),
      date: todayLocalIso(),
      top: "New task",
      status: normalizeStatus(status),
      minutes: 0,
      comment: "",
      goalRef: inferCurrentGoalRef(),
      createdAt: new Date().toISOString()
    };

    st.daily.unshift(entry);
    st.daily = st.daily.slice(0, 200);
    kanban.editingId = entry.id;
    markDirtyAndPersist();
    renderDaily();
    renderStats();
  }

  function deleteTask(id) {
    const before = st.daily.length;
    st.daily = st.daily.filter((entry) => entry.id !== id);
    if (st.daily.length === before) {
      return;
    }

    if (kanban.editingId === id) {
      kanban.editingId = "";
    }
    markDirtyAndPersist();
    renderDaily();
    renderStats();
    toast("Task removed.");
  }

  function deleteArchivedTask(id) {
    const before = st.archive.length;
    st.archive = st.archive.filter((entry) => entry.id !== id);
    if (st.archive.length === before) {
      return;
    }

    markDirtyAndPersist();
    renderArchive();
    toast("Archived task removed.");
  }

  function requestDeleteTask(id, source) {
    const targetId = String(id || "");
    const targetSource = source === "archive" ? "archive" : "daily";
    if (!targetId) {
      return;
    }

    if (!ui.deleteModal) {
      if (targetSource === "archive") {
        deleteArchivedTask(targetId);
      } else {
        deleteTask(targetId);
      }
      return;
    }

    deleteState.id = targetId;
    deleteState.source = targetSource;
    if (ui.deletePrompt) {
      ui.deletePrompt.textContent = targetSource === "archive"
        ? "This archived tile will be deleted permanently. Continue?"
        : "This tile will be deleted permanently. Continue?";
    }
    ui.deleteModal.showModal();
  }

  function confirmDeleteModal() {
    const id = deleteState.id;
    const source = deleteState.source;
    closeDeleteModal();
    if (!id) {
      return;
    }

    if (source === "archive") {
      deleteArchivedTask(id);
      return;
    }
    deleteTask(id);
  }

  function closeDeleteModal() {
    if (ui.deleteModal?.open) {
      ui.deleteModal.close();
      return;
    }
    clearDeleteState();
  }

  function clearDeleteState() {
    deleteState.id = "";
    deleteState.source = "";
  }

  function saveTaskInline(taskEl) {
    const id = String(taskEl?.dataset?.taskId || "");
    const entry = findDailyEntry(id);
    if (!entry) {
      return;
    }

    const top = String(taskEl.querySelector("[data-task-field='top']")?.value || "").trim();
    if (!top) {
      toast("Task title is required.");
      return;
    }

    entry.top = top;
    entry.status = normalizeStatus(taskEl.querySelector("[data-task-field='status']")?.value || entry.status);
    entry.minutes = Math.max(0, toInt(taskEl.querySelector("[data-task-field='minutes']")?.value, entry.minutes || 0));
    entry.goalRef = String(taskEl.querySelector("[data-task-field='goalRef']")?.value || "").trim().slice(0, 240);
    entry.comment = String(taskEl.querySelector("[data-task-field='comment']")?.value || "").trim();

    kanban.editingId = "";
    markDirtyAndPersist();
    renderDaily();
    renderStats();
    toast("Task updated.");
  }

  function moveTaskToStatus(id, status) {
    const entry = findDailyEntry(id);
    if (!entry) {
      return;
    }

    const nextStatus = normalizeStatus(status);
    if (nextStatus === normalizeStatus(entry.status)) {
      return;
    }

    if (nextStatus === "Done") {
      archiveTask(entry);
      return;
    }

    entry.status = nextStatus;
    markDirtyAndPersist();
    renderDaily();
    renderStats();
    toast(`Task moved to ${nextStatus}.`);
  }

  function archiveTask(entry) {
    if (!entry) {
      return;
    }

    st.daily = st.daily.filter((item) => item.id !== entry.id);

    const archived = {
      ...entry,
      status: "Done",
      archivedAt: new Date().toISOString()
    };
    st.archive.unshift(archived);
    st.archive = st.archive.slice(0, 300);

    let taskXp = 0;
    if (flags.progress) {
      taskXp = progression.recordTaskCompletion().xpGained;
      syncProgressionState();
    }

    if (kanban.editingId === entry.id) {
      kanban.editingId = "";
    }

    markDirtyAndPersist();
    renderDaily();
    renderArchive();
    renderStats();
    toast(taskXp > 0 ? `Task archived in Success Archive. +${taskXp} XP.` : "Task archived in Success Archive.");
  }

  function renderSmart() {
    if (!ui.smartList) {
      return;
    }

    if (!st.monthly.length) {
      ui.smartList.innerHTML = "<li><small>No SMART goals added yet.</small></li>";
      return;
    }

    ui.smartList.innerHTML = st.monthly.slice(0, 14).map((goal) => {
      const tone = goal.score >= 5 ? "good" : goal.score >= 3 ? "warn" : "bad";
      return `<li><strong>${escapeHtml(goal.goal || "")}</strong><small>${escapeHtml(goal.month || "")} • Score ${Number(goal.score || 0)}/5</small><small>${escapeHtml(goal.why || "")}</small>${goal.proof ? `<small>Proof: ${escapeHtml(goal.proof)}</small>` : ""}<span class=\"mc-tag ${tone}\">${goal.score >= 5 ? "Ready" : goal.score >= 3 ? "Almost" : "Revise"}</span></li>`;
    }).join("");
  }

  function renderGrowthPrompts() {
    if (!ui.growthPrompts) {
      return;
    }

    if (!flags.growth) {
      ui.growthPrompts.innerHTML = '<article class="mc-growth-card locked"><h4>Growth prompts disabled</h4><p>Enable SPOKES_GROWTH_PROMPTS_V1 to use this section.</p></article>';
      return;
    }

    const unlocked = new Set(progression.getUnlockedPhase2Prompts());
    const state = progression.getState();

    ui.growthPrompts.innerHTML = GROWTH_PROMPTS.map((prompt) => {
      const isUnlocked = unlocked.has(prompt.key);
      const value = String(state.phase2Prompts?.[prompt.key] || "");

      if (!isUnlocked) {
        return `<article class="mc-growth-card locked"><h4>${escapeHtml(prompt.label)}</h4><p>Unlocks at Level ${prompt.unlockLevel}.</p></article>`;
      }

      return `<article class="mc-growth-card"><h4>${escapeHtml(prompt.label)}</h4><textarea data-growth-key="${escapeAttr(prompt.key)}" placeholder="Write your response...">${escapeHtml(value)}</textarea></article>`;
    }).join("");

    const timers = new Map();
    ui.growthPrompts.querySelectorAll("textarea[data-growth-key]").forEach((input) => {
      input.addEventListener("input", () => {
        const key = String(input.dataset.growthKey || "").trim();
        if (!key) {
          return;
        }

        if (timers.has(key)) {
          clearTimeout(timers.get(key));
        }

        const timer = setTimeout(() => {
          if (!flags.progress) {
            return;
          }
          const result = progression.recordPhase2Response(key, input.value);
          if (!result.ok) {
            return;
          }
          syncProgressionState();
          markDirtyAndPersist();
          renderStats();
          if (result.firstResponse) {
            toast("Growth prompt saved. +30 XP.");
          }
          timers.delete(key);
        }, 320);

        timers.set(key, timer);
      });
    });
  }

  function applyDashboardGating() {
    const features = flags.progress
      ? progression.getDashboardFeatures()
      : {
          smartTab: true,
          growthTab: flags.growth,
          visionTab: true,
          kanbanEdit: flags.kanban,
          planGeneration: true
        };
    const unlocks = {
      daily: true,
      archive: true,
      smart: features.smartTab,
      growth: features.growthTab && flags.growth,
      vision: features.visionTab
    };

    ui.tabs.forEach((button) => {
      const tab = String(button.dataset.tab || "");
      const unlocked = unlocks[tab] !== false;
      button.classList.toggle("locked-tab", !unlocked);
      button.disabled = !unlocked;
      button.setAttribute("title", unlocked ? "" : "Unlock this section by leveling up.");
    });

    if (ui.generatePlanBtn) {
      ui.generatePlanBtn.disabled = !features.planGeneration;
    }

    [ui.todo, ui.progress, ui.done].forEach((lane) => {
      if (!lane) {
        return;
      }
      lane.classList.toggle("locked-lane", !features.kanbanEdit || !flags.kanban);
      const wrapper = lane.closest(".mc-lane");
      if (wrapper) {
        wrapper.classList.toggle("locked-lane", !features.kanbanEdit || !flags.kanban);
      }
    });

    const active = ui.tabs.find((button) => button.getAttribute("aria-selected") === "true");
    if (active && active.classList.contains("locked-tab")) {
      setActiveTab("daily");
    }
  }

  function canUseKanbanEditing() {
    if (!flags.kanban) {
      return false;
    }
    if (!flags.progress) {
      return true;
    }
    return progression.getDashboardFeatures().kanbanEdit;
  }

  function checkForPendingReviews() {
    if (!ui.reviewModal || !flags.progress || !flags.growth) {
      return;
    }

    const p = progression.getState();
    const now = Date.now();

    if (
      progression.isPromptCompleted("weekly") &&
      (!p.lastWeeklyReviewAt || daysSince(p.lastWeeklyReviewAt, now) >= 7)
    ) {
      openReviewModal("weekly");
      return;
    }

    if (
      progression.isPromptCompleted("monthly") &&
      (!p.lastMonthlyReviewAt || daysSince(p.lastMonthlyReviewAt, now) >= 26)
    ) {
      openReviewModal("monthly");
    }
  }

  function openReviewModal(mode) {
    if (!ui.reviewModal || review.open) {
      return;
    }

    review.mode = mode;
    review.open = true;

    if (ui.reviewTitle) {
      ui.reviewTitle.textContent = mode === "weekly" ? "Weekly Review" : "Monthly Review";
    }
    if (ui.reviewPrompt) {
      ui.reviewPrompt.textContent = mode === "weekly"
        ? "What worked this week, what blocked progress, and what should change next week?"
        : "What progress did you make this month, and what should your next monthly target be?";
    }
    if (ui.reviewAnswer) {
      ui.reviewAnswer.value = "";
    }

    if (typeof ui.reviewModal.showModal === "function") {
      ui.reviewModal.showModal();
    } else {
      ui.reviewModal.setAttribute("open", "open");
    }
  }

  function closeReviewModal() {
    if (!ui.reviewModal) {
      return;
    }

    review.mode = "";
    review.open = false;
    if (typeof ui.reviewModal.close === "function") {
      ui.reviewModal.close();
    } else {
      ui.reviewModal.removeAttribute("open");
    }
  }

  function completeReviewModal() {
    const answer = String(ui.reviewAnswer?.value || "").trim();
    if (!answer) {
      toast("Add a short reflection before completing review.");
      return;
    }

    let result = null;
    if (flags.progress) {
      if (review.mode === "weekly") {
        result = progression.recordWeeklyReview();
      } else if (review.mode === "monthly") {
        result = progression.recordMonthlyReview();
      }
    }

    if (result?.ok) {
      appendUniqueText(st.portfolio, answer);
      syncProgressionState();
      markDirtyAndPersist();
      renderStats();
      applyDashboardGating();
      toast("Review complete. XP awarded.");
    }

    closeReviewModal();
  }

  function renderVisionGoalOptions() {
    if (!ui.visionGoalSelect) {
      return;
    }

    ensureVisionMonthState();
    const currentKey = currentMonthKey();
    const keys = Object.keys(st.visionMonthBoards || {})
      .filter((key) => /^\d{4}-\d{2}$/.test(key))
      .sort((a, b) => b.localeCompare(a));

    if (!keys.length) {
      ui.visionGoalSelect.innerHTML = "<option value=''>No board months yet</option>";
      ui.visionGoalSelect.value = "";
      return;
    }

    ui.visionGoalSelect.innerHTML = keys.map((key) => {
      const label = `${monthLabelFromKey(key)}${key === currentKey ? " (Current)" : ""}`;
      return `<option value="${escapeAttr(key)}">${escapeHtml(label)}</option>`;
    }).join("");

    const selectedKey = normalizeMonthKey(st.visionSelectedMonth) || currentKey;
    ui.visionGoalSelect.value = keys.includes(selectedKey) ? selectedKey : keys[0];
  }
  function bindVisionBoardEvents() {
    if (!ui.visionBoard) {
      return;
    }

    ui.visionBoard.addEventListener("pointerdown", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) {
        return;
      }

      const removeButton = target.closest(".mc-v-remove");
      if (!removeButton) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const itemEl = removeButton.closest(".mc-v-item");
      if (!itemEl) {
        return;
      }
      removeVisionItem(itemEl.dataset.id || "");
    });

    ui.visionBoard.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) {
        return;
      }

      const removeButton = target.closest(".mc-v-remove");
      if (!removeButton) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const itemEl = removeButton.closest(".mc-v-item");
      if (!itemEl) {
        return;
      }
      removeVisionItem(itemEl.dataset.id || "");
    });

    ui.visionBoard.addEventListener("pointerdown", onVisionPointerDown);
    window.addEventListener("pointermove", onVisionPointerMove, { passive: true });
    window.addEventListener("pointerup", onVisionPointerUp, { passive: true });
    window.addEventListener("pointercancel", onVisionPointerUp, { passive: true });
  }

  function addGoalNoteFromSelection() {
    const selectedGoal = findSelectedVisionGoal();
    if (!selectedGoal) {
      toast("Add a SMART goal first.");
      return;
    }

    const defaultTitle = String(selectedGoal.goal || "Goal Note").trim().slice(0, 120);
    const defaultText = String(selectedGoal.why || selectedGoal.proof || selectedGoal.goal || "SMART goal note")
      .trim()
      .slice(0, 600);

    if (!ui.goalNoteModal || !ui.goalNoteTitleInput || !ui.goalNoteTextInput) {
      addGoalNoteToBoard({
        goalId: selectedGoal.id,
        title: defaultTitle,
        text: defaultText
      });
      return;
    }

    goalNote.goalId = String(selectedGoal.id || "");
    ui.goalNoteTitleInput.value = defaultTitle;
    ui.goalNoteTextInput.value = defaultText;
    openGoalNoteModal();
  }

  function handleVisionMonthSelectionChange(event) {
    const key = normalizeMonthKey(event?.target?.value || "");
    if (!key) {
      return;
    }
    activateVisionMonth(key, { saveCurrent: true, persist: true, quiet: false });
  }

  function findSelectedVisionGoal() {
    const selectedMonthKey = normalizeMonthKey(st.visionSelectedMonth) || currentMonthKey();
    const sameMonthGoal = st.monthly.find((goal) => normalizeMonthKey(goal.month) === selectedMonthKey);
    return sameMonthGoal || st.monthly[0] || null;
  }

  function addGoalNoteToBoard({ goalId = "", title = "", text = "" } = {}) {
    const noteTitle = String(title || "").trim().slice(0, 120);
    const noteText = String(text || "").trim().slice(0, 600);
    if (!noteTitle) {
      toast("Add a title before posting the note.");
      return false;
    }

    const placement = nextPlacement(260, 170);
    const item = {
      id: uid("v"),
      type: "goal",
      x: placement.x,
      y: placement.y,
      width: 260,
      height: 170,
      z: nextZ(),
      goalId: String(goalId || ""),
      title: noteTitle,
      text: noteText || "SMART goal note"
    };

    st.vision.items.push(item);
    if (flags.progress) {
      progression.awardVisionNote();
      syncProgressionState();
    }
    markDirtyAndPersist();
    renderVisionBoard();
    renderStats();
    toast("Goal note added to Vision Board.");
    return true;
  }

  function openGoalNoteModal() {
    if (!ui.goalNoteModal) {
      return;
    }
    if (typeof ui.goalNoteModal.showModal === "function") {
      ui.goalNoteModal.showModal();
    } else {
      ui.goalNoteModal.setAttribute("open", "open");
    }
  }

  function closeGoalNoteModal() {
    if (!ui.goalNoteModal) {
      clearGoalNoteDraft();
      return;
    }
    if (typeof ui.goalNoteModal.close === "function") {
      ui.goalNoteModal.close();
    } else {
      ui.goalNoteModal.removeAttribute("open");
      clearGoalNoteDraft();
    }
  }

  function clearGoalNoteDraft() {
    goalNote.goalId = "";
  }

  function submitGoalNoteModal() {
    const title = String(ui.goalNoteTitleInput?.value || "").trim();
    const text = String(ui.goalNoteTextInput?.value || "").trim();
    const selectedGoal = st.monthly.find((goal) => goal.id === goalNote.goalId) || findSelectedVisionGoal();
    const didAdd = addGoalNoteToBoard({
      goalId: selectedGoal?.id || "",
      title,
      text
    });
    if (didAdd) {
      closeGoalNoteModal();
    }
  }

  async function handleVisionImagePicked(event) {
    const file = event.target?.files?.[0];
    if (event.target) {
      event.target.value = "";
    }

    if (!file) {
      return;
    }

    if (!/^image\//i.test(file.type || "")) {
      toast("Please choose an image file.");
      return;
    }

    try {
      const prepared = await prepareImageNote(file);
      const placement = nextPlacement(prepared.width, prepared.height);
      const item = {
        id: uid("v"),
        type: "image",
        x: placement.x,
        y: placement.y,
        width: prepared.width,
        height: prepared.height,
        z: nextZ(),
        src: prepared.dataUrl,
        alt: file.name || "Vision image"
      };

      st.vision.items.push(item);
      if (flags.progress) {
        progression.awardVisionNote();
        syncProgressionState();
      }
      markDirtyAndPersist();
      renderVisionBoard();
      renderStats();
      toast("Image note added.");
    } catch (error) {
      console.error(error);
      toast("Image note could not be processed.");
    }
  }

  function onVisionPointerDown(event) {
    const itemEl = event.target.closest(".mc-v-item");
    if (!itemEl || !ui.visionBoard.contains(itemEl)) {
      return;
    }

    if (event.target.closest(".mc-v-remove")) {
      return;
    }

    const item = findVisionItem(itemEl.dataset.id || "");
    if (!item) {
      return;
    }

    const mode = event.target.closest(".mc-v-handle") ? "resize" : "move";

    drag.id = item.id;
    drag.mode = mode;
    drag.pointerId = event.pointerId;
    drag.sx = event.clientX;
    drag.sy = event.clientY;
    drag.ox = Number(item.x) || 0;
    drag.oy = Number(item.y) || 0;
    drag.ow = Math.max(120, Number(item.width) || 120);
    drag.oh = Math.max(90, Number(item.height) || 90);

    bringItemToFront(item);
    setActiveVisionItem(item.id);

    if (typeof itemEl.setPointerCapture === "function") {
      itemEl.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
  }

  function onVisionPointerMove(event) {
    if (!drag.id || drag.pointerId !== event.pointerId) {
      return;
    }

    const item = findVisionItem(drag.id);
    if (!item) {
      return;
    }

    const boardWidth = Math.max(320, ui.visionBoard?.clientWidth || 320);
    const boardHeight = Math.max(240, ui.visionBoard?.clientHeight || 240);

    const dx = event.clientX - drag.sx;
    const dy = event.clientY - drag.sy;

    if (drag.mode === "resize") {
      item.width = clamp(drag.ow + dx, 120, Math.max(120, boardWidth - item.x));
      item.height = clamp(drag.oh + dy, 90, Math.max(90, boardHeight - item.y));
    } else {
      item.x = clamp(drag.ox + dx, 0, Math.max(0, boardWidth - item.width));
      item.y = clamp(drag.oy + dy, 0, Math.max(0, boardHeight - item.height));
    }

    applyVisionItemStyle(item);
  }

  function onVisionPointerUp(event) {
    if (!drag.id || drag.pointerId !== event.pointerId) {
      return;
    }

    const changedId = drag.id;
    drag.id = "";
    drag.mode = "";
    drag.pointerId = null;

    const item = findVisionItem(changedId);
    if (!item) {
      return;
    }

    clampVisionItem(item);
    markDirtyAndPersist();
    renderVisionBoard();
  }

  function removeVisionItem(id) {
    if (!id) {
      return;
    }

    const before = st.vision.items.length;
    st.vision.items = st.vision.items.filter((item) => item.id !== id);
    if (st.vision.items.length === before) {
      return;
    }

    markDirtyAndPersist();
    renderVisionBoard();
    toast("Item removed.");
  }

  function renderVisionBoard() {
    if (!ui.visionBoard) {
      return;
    }

    const items = [...st.vision.items].sort((a, b) => (Number(a.z) || 0) - (Number(b.z) || 0));

    if (!items.length) {
      ui.visionBoard.innerHTML = '<div class="mc-vision-empty"><h4 style="margin:.1rem 0 .35rem">Vision Board is empty</h4><p style="margin:0">Use Add Goal Note and Add Image Note to build your collage.</p></div>';
      return;
    }

    ui.visionBoard.innerHTML = items.map((item) => renderVisionItemMarkup(item)).join("");
    items.forEach((item) => applyVisionItemStyle(item));
  }

  function renderVisionItemMarkup(item) {
    if (item.type === "image") {
      return `<article class=\"mc-v-item mc-v-image\" data-id=\"${escapeAttr(item.id)}\"><button class=\"mc-v-remove\" type=\"button\" aria-label=\"Remove item\">×</button><img src=\"${escapeAttr(item.src || "")}\" alt=\"${escapeAttr(item.alt || "Vision image")}\"><button class=\"mc-v-handle\" type=\"button\" aria-label=\"Resize item\"></button></article>`;
    }

    return `<article class=\"mc-v-item mc-v-goal\" data-id=\"${escapeAttr(item.id)}\"><button class=\"mc-v-remove\" type=\"button\" aria-label=\"Remove item\">×</button><div class=\"mc-v-goal-content\"><h5>${escapeHtml(item.title || "Goal")}</h5><p>${escapeHtml(item.text || "")}</p></div><button class=\"mc-v-handle\" type=\"button\" aria-label=\"Resize item\"></button></article>`;
  }

  function applyVisionItemStyle(item) {
    if (!ui.visionBoard) {
      return;
    }

    const el = ui.visionBoard.querySelector(`.mc-v-item[data-id="${cssEscape(item.id)}"]`);
    if (!el) {
      return;
    }

    el.style.left = `${Math.round(Number(item.x) || 0)}px`;
    el.style.top = `${Math.round(Number(item.y) || 0)}px`;
    el.style.width = `${Math.round(Number(item.width) || 120)}px`;
    el.style.height = `${Math.round(Number(item.height) || 90)}px`;
    el.style.zIndex = String(Math.round(Number(item.z) || 1));
  }

  function setActiveVisionItem(id) {
    if (!ui.visionBoard) {
      return;
    }

    ui.visionBoard.querySelectorAll(".mc-v-item").forEach((el) => {
      el.classList.toggle("active", (el.dataset.id || "") === id);
    });
  }

  function nextPlacement(width, height) {
    const boardWidth = Math.max(360, ui.visionBoard?.clientWidth || 900);
    const boardHeight = Math.max(280, ui.visionBoard?.clientHeight || 530);
    const i = st.vision.items.length;
    const x = clamp(28 + ((i * 38) % Math.max(60, boardWidth - width - 20)), 0, Math.max(0, boardWidth - width));
    const y = clamp(24 + ((i * 30) % Math.max(60, boardHeight - height - 20)), 0, Math.max(0, boardHeight - height));
    return { x, y };
  }

  function bringItemToFront(item) {
    item.z = nextZ();
    applyVisionItemStyle(item);
  }

  function nextZ() {
    st.vision.maxZ = Math.max(0, Number(st.vision.maxZ) || 0) + 1;
    return st.vision.maxZ;
  }

  function clampVisionItem(item) {
    const boardWidth = Math.max(320, ui.visionBoard?.clientWidth || 900);
    const boardHeight = Math.max(240, ui.visionBoard?.clientHeight || 530);

    item.width = clamp(Number(item.width) || 200, 120, boardWidth);
    item.height = clamp(Number(item.height) || 120, 90, boardHeight);
    item.x = clamp(Number(item.x) || 0, 0, Math.max(0, boardWidth - item.width));
    item.y = clamp(Number(item.y) || 0, 0, Math.max(0, boardHeight - item.height));
    item.z = Math.max(1, Number(item.z) || 1);
  }

  function findVisionItem(id) {
    return st.vision.items.find((item) => item.id === id) || null;
  }

  async function prepareImageNote(file) {
    const dataUrl = await readFileAsDataUrl(file);
    const img = await loadImageElement(dataUrl);

    let width = img.naturalWidth || img.width || 1;
    let height = img.naturalHeight || img.height || 1;
    const maxSide = 980;
    const scale = Math.min(1, maxSide / Math.max(width, height));

    width = Math.max(120, Math.round(width * scale));
    height = Math.max(90, Math.round(height * scale));

    const canvas = doc.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw new Error("Canvas not available.");
    }

    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const prefersWebp = canvas.toDataURL("image/webp", 0.8).startsWith("data:image/webp");
    const mime = prefersWebp ? "image/webp" : "image/jpeg";

    let quality = 0.86;
    let output = canvas.toDataURL(mime, quality);
    const maxChars = 150000;

    while (output.length > maxChars && quality > 0.5) {
      quality -= 0.07;
      output = canvas.toDataURL(mime, quality);
    }

    return {
      dataUrl: output,
      width: clamp(Math.round(width * 0.44), 180, 420),
      height: clamp(Math.round(height * 0.44), 120, 340)
    };
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("File read failed."));
      reader.readAsDataURL(file);
    });
  }

  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image decode failed."));
      img.src = src;
    });
  }
  function yesNoFrom(value) {
    const text = String(value || "").toLowerCase();
    if (text === "yes" || text === "y" || text === "true" || text === "1" || text === "done") {
      return "Yes";
    }
    return "Needs Work";
  }

  async function exportSnapshot() {
    try {
      const JsPdf = await ensureJsPdfConstructor();
      await ensureAutoTablePlugin();
      const pdf = await buildStudentGoalPdf(JsPdf);
      if (pdf) {
        pdf.save(`spokes-goal-report-${todayLocalIso()}.pdf`);
        toast("PDF report exported.");
        return;
      }
    } catch (error) {
      console.warn("PDF export failed.", error);
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      lessonId: LESSON_ID,
      state: st
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = doc.createElement("a");
    link.href = url;
    link.download = `spokes-mission-control-${todayLocalIso()}.json`;
    doc.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("PDF unavailable. JSON snapshot exported.");
  }

  async function ensureJsPdfConstructor() {
    const existing = getJsPdfConstructor();
    if (existing) {
      return existing;
    }

    if (!jsPdfLoadPromise) {
      jsPdfLoadPromise = (async () => {
        await loadExternalScript(JSPDF_LOCAL_SRC).catch(() => null);
        const localCtor = getJsPdfConstructor();
        if (localCtor) {
          return localCtor;
        }

        await loadExternalScript(JSPDF_CDN_SRC).catch(() => null);
        return getJsPdfConstructor();
      })();
    }

    const loaded = await jsPdfLoadPromise;
    if (typeof loaded !== "function") {
      jsPdfLoadPromise = null;
    }
    return typeof loaded === "function" ? loaded : null;
  }

  async function ensureAutoTablePlugin() {
    if (hasAutoTableSupport()) {
      return true;
    }

    if (!autoTableLoadPromise) {
      autoTableLoadPromise = (async () => {
        await loadExternalScript(JSPDF_AUTOTABLE_LOCAL_SRC).catch(() => null);
        if (hasAutoTableSupport()) {
          return true;
        }
        await loadExternalScript(JSPDF_AUTOTABLE_CDN_SRC).catch(() => null);
        return hasAutoTableSupport();
      })();
    }

    const loaded = await autoTableLoadPromise;
    if (!loaded) {
      autoTableLoadPromise = null;
    }
    return Boolean(loaded);
  }

  function hasAutoTableSupport(pdfDoc = null) {
    if (pdfDoc && typeof pdfDoc.autoTable === "function") {
      return true;
    }
    if (typeof window.jspdf?.jsPDF?.API?.autoTable === "function") {
      return true;
    }
    if (typeof window.jsPDF?.API?.autoTable === "function") {
      return true;
    }
    return false;
  }

  function getJsPdfConstructor() {
    const fromNamespace = window.jspdf?.jsPDF;
    if (typeof fromNamespace === "function") {
      return fromNamespace;
    }
    const fromGlobal = window.jsPDF;
    if (typeof fromGlobal === "function") {
      return fromGlobal;
    }
    return null;
  }

  function loadExternalScript(src) {
    return new Promise((resolve, reject) => {
      const existing = doc.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Could not load script: ${src}`)), { once: true });
        return;
      }

      const script = doc.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = () => reject(new Error(`Could not load script: ${src}`));
      doc.head.appendChild(script);
    });
  }

  async function getLogoDataUrl() {
    if (!logoDataUrlPromise) {
      logoDataUrlPromise = (async () => {
        const response = await fetch(SPOKES_LOGO_PATH, { cache: "force-cache" });
        if (!response.ok) {
          return "";
        }
        const blob = await response.blob();
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Logo read failed."));
          reader.readAsDataURL(blob);
        });
      })().catch(() => "");
    }

    const dataUrl = await logoDataUrlPromise;
    if (!dataUrl) {
      logoDataUrlPromise = null;
    }
    return dataUrl;
  }

  async function buildStudentGoalPdf(JsPdf) {
    if (typeof JsPdf !== "function") {
      return null;
    }

    const session = readSessionSummary();
    const draft = readSharedLocalDraft();
    const answers = readLessonAnswers(draft.responses || {});
    const p = progression.getState();

    const pdf = new JsPdf({
      orientation: "landscape",
      unit: "pt",
      format: "letter"
    });

    if (!hasAutoTableSupport(pdf)) {
      return buildStudentGoalPdfLegacy(JsPdf, { session, answers, progressionState: p });
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 28;
    const brandDark = [20, 50, 71];

    pdf.setFillColor(...brandDark);
    pdf.rect(0, 0, pageWidth, 94, "F");

    const logoData = await getLogoDataUrl();
    if (logoData) {
      try {
        pdf.addImage(logoData, "JPEG", margin, 18, 115, 58, undefined, "FAST");
      } catch (_error) {
        // Keep export running if logo rendering fails.
      }
    }

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("SPOKES Student Goal Report", margin + 130, 46);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Generated ${new Date().toLocaleString()}`, margin + 130, 66);

    const baseStyles = {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 4,
      overflow: "linebreak",
      textColor: [22, 32, 44],
      lineColor: [220, 228, 236],
      lineWidth: 0.5
    };
    const headStyles = {
      fillColor: brandDark,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left"
    };
    const altRowStyles = {
      fillColor: [247, 250, 252]
    };

    let y = 108;
    const maxY = pdf.internal.pageSize.getHeight() - 48;
    const sectionTitle = (text) => {
      if (y > maxY - 32) {
        pdf.addPage();
        y = margin;
      }
      pdf.setTextColor(...brandDark);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(String(text || ""), margin, y);
      y += 8;
    };
    const advanceY = () => {
      y = (pdf.lastAutoTable?.finalY || y) + 16;
    };
    const smartCell = (value) => {
      const text = yesNoFrom(value);
      return text === "Yes" ? "Y" : "NW";
    };

    sectionTitle("Student Overview");
    pdf.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Field", "Value"]],
      body: [
        ["Student ID", session.studentId || sync.studentId || "Unknown"],
        ["Display Name", session.displayName || "Student"],
        ["Level", String(Number(p.level || 1))],
        ["XP", String(Number(p.xp || 0))],
        ["Current Streak", String(Number(p.currentStreak || 0))],
        ["Longest Streak", String(Number(p.longestStreak || 0))]
      ],
      styles: baseStyles,
      headStyles,
      alternateRowStyles: altRowStyles,
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 170 },
        1: { cellWidth: "auto" }
      }
    });
    advanceY();

    sectionTitle("Goal Hierarchy");
    pdf.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Tier", "Current Goal"]],
      body: [
        ["BHAG", answers.bhag || "(not provided)"],
        ["Monthly", answers.monthly || "(not provided)"],
        ["Weekly", answers.weekly || "(not provided)"],
        ["Daily", answers.daily || "(not provided)"],
        ["Tasks", answers.tasks || "(not provided)"]
      ],
      styles: baseStyles,
      headStyles,
      alternateRowStyles: altRowStyles,
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 120 },
        1: { cellWidth: "auto" }
      }
    });
    advanceY();

    sectionTitle("SMART Goals");
    const smartRows = st.monthly.length
      ? st.monthly.slice(0, 60).map((goal, idx) => {
          const checks = goal.checks || {};
          return [
            String(idx + 1),
            goal.month || "",
            goal.goal || "",
            goal.why || "",
            goal.proof || "",
            smartCell(checks.s),
            smartCell(checks.m),
            smartCell(checks.a),
            smartCell(checks.r),
            smartCell(checks.t),
            `${Number(goal.score || 0)}/5`
          ];
        })
      : [["-", "-", "No SMART goals saved yet.", "-", "-", "-", "-", "-", "-", "-", "-"]];

    pdf.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["#", "Month", "Goal", "Why", "Evidence", "S", "M", "A", "R", "T", "Score"]],
      body: smartRows,
      styles: baseStyles,
      headStyles,
      alternateRowStyles: altRowStyles,
      columnStyles: {
        0: { cellWidth: 24, halign: "center" },
        1: { cellWidth: 66 },
        2: { cellWidth: 160 },
        3: { cellWidth: 138 },
        4: { cellWidth: 116 },
        5: { cellWidth: 26, halign: "center" },
        6: { cellWidth: 26, halign: "center" },
        7: { cellWidth: 26, halign: "center" },
        8: { cellWidth: 26, halign: "center" },
        9: { cellWidth: 26, halign: "center" },
        10: { cellWidth: 42, halign: "center", fontStyle: "bold" }
      }
    });
    advanceY();

    sectionTitle("Growth Prompt Responses");
    const growthMap = p.phase2Prompts || {};
    const growthRows = GROWTH_PROMPTS
      .map((prompt) => [prompt.label, String(growthMap[prompt.key] || "").trim()])
      .filter((row) => row[1]);
    pdf.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Prompt", "Response"]],
      body: growthRows.length ? growthRows : [["Growth prompts", "No growth prompt responses yet."]],
      styles: baseStyles,
      headStyles,
      alternateRowStyles: altRowStyles,
      columnStyles: {
        0: { cellWidth: 220, fontStyle: "bold" },
        1: { cellWidth: "auto" }
      }
    });
    advanceY();

    sectionTitle("Execution Summary");
    const doneCount = st.daily.filter((entry) => normalizeStatus(entry.status) === "Done").length;
    pdf.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Metric", "Value"]],
      body: [
        ["Daily Entries", String(st.daily.length)],
        ["Done Entries", String(doneCount)],
        ["Archived Wins", String(st.archive.length)],
        ["Weekly Reviews Completed", String(Number(p.weeklyReviewsDone || 0))],
        ["Monthly Reviews Completed", String(Number(p.monthlyReviewsDone || 0))]
      ],
      styles: baseStyles,
      headStyles,
      alternateRowStyles: altRowStyles,
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 220 },
        1: { cellWidth: 120 }
      }
    });
    advanceY();

    sectionTitle("Recent Daily Activity");
    const dailyRows = st.daily.length
      ? st.daily.slice(0, 20).map((entry, idx) => [
          String(idx + 1),
          formatDate(entry.date),
          normalizeStatus(entry.status),
          String(Math.max(0, Number(entry.minutes) || 0)),
          entry.top || "",
          entry.goalRef || ""
        ])
      : [["-", "-", "-", "-", "No daily activity recorded yet.", "-"]];
    pdf.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["#", "Date", "Status", "Min", "Task", "Goal Link"]],
      body: dailyRows,
      styles: baseStyles,
      headStyles,
      alternateRowStyles: altRowStyles,
      columnStyles: {
        0: { cellWidth: 24, halign: "center" },
        1: { cellWidth: 74 },
        2: { cellWidth: 66 },
        3: { cellWidth: 44, halign: "center" },
        4: { cellWidth: 240 },
        5: { cellWidth: "auto" }
      }
    });

    return pdf;
  }

  function buildStudentGoalPdfLegacy(JsPdf, context = {}) {
    const { session = {}, answers = {}, progressionState = {} } = context;
    const p = progressionState;
    const pdf = new JsPdf({
      orientation: "portrait",
      unit: "pt",
      format: "letter"
    });

    const writer = createPdfWriter(pdf);

    writer.heading("SPOKES Student Goal Report");
    writer.line(`Generated: ${new Date().toLocaleString()}`);
    writer.line(`Student ID: ${session.studentId || sync.studentId || "Unknown"}`);
    writer.line(`Display Name: ${session.displayName || "Student"}`);
    writer.line(`Level: ${Number(p.level || 1)}   XP: ${Number(p.xp || 0)}   Current Streak: ${Number(p.currentStreak || 0)}`);
    writer.gap();

    writer.section("Goal Hierarchy");
    writer.paragraph(`BHAG: ${answers.bhag || "(not provided)"}`);
    writer.paragraph(`Monthly Goal: ${answers.monthly || "(not provided)"}`);
    writer.paragraph(`Weekly Goal: ${answers.weekly || "(not provided)"}`);
    writer.paragraph(`Daily Goal: ${answers.daily || "(not provided)"}`);
    writer.paragraph(`Tasks: ${answers.tasks || "(not provided)"}`);
    writer.gap();

    writer.section("SMART Goals");
    if (!st.monthly.length) {
      writer.paragraph("No SMART goals saved yet.");
    } else {
      st.monthly.slice(0, 40).forEach((goal, index) => {
        const checks = goal.checks || {};
        writer.subsection(`SMART Goal ${index + 1}`);
        writer.paragraph(`Goal: ${goal.goal || "(untitled)"}`);
        writer.line(`Month: ${goal.month || "N/A"}`);
        writer.paragraph(`Why: ${goal.why || "N/A"}`);
        writer.paragraph(`Evidence / Proof: ${goal.proof || "N/A"}`);
        writer.line(`Specific: ${yesNoFrom(checks.s)}   Measurable: ${yesNoFrom(checks.m)}   Achievable: ${yesNoFrom(checks.a)}`);
        writer.line(`Relevant: ${yesNoFrom(checks.r)}   Time-Bound: ${yesNoFrom(checks.t)}   Score: ${Number(goal.score || 0)}/5`);
        writer.gap();
      });
    }

    writer.section("Growth Prompt Responses");
    const growthMap = p.phase2Prompts || {};
    const answeredGrowth = GROWTH_PROMPTS.filter((prompt) => String(growthMap[prompt.key] || "").trim().length > 0);
    if (!answeredGrowth.length) {
      writer.paragraph("No growth prompt responses yet.");
    } else {
      answeredGrowth.forEach((prompt) => {
        writer.subsection(prompt.label);
        writer.paragraph(String(growthMap[prompt.key] || "").trim());
      });
    }
    writer.gap();

    writer.section("Execution Overview");
    const doneCount = st.daily.filter((entry) => normalizeStatus(entry.status) === "Done").length;
    writer.line(`Daily Entries: ${st.daily.length}`);
    writer.line(`Done Entries: ${doneCount}`);
    writer.line(`Archived Wins: ${st.archive.length}`);
    writer.line(`Weekly Reviews Completed: ${Number(p.weeklyReviewsDone || 0)}`);
    writer.line(`Monthly Reviews Completed: ${Number(p.monthlyReviewsDone || 0)}`);
    writer.gap();

    writer.section("Recent Daily Activity");
    if (!st.daily.length) {
      writer.paragraph("No daily activity recorded yet.");
    } else {
      st.daily.slice(0, 15).forEach((entry, idx) => {
        const line = `${idx + 1}. ${formatDate(entry.date)} | ${normalizeStatus(entry.status)} | ${Math.max(0, Number(entry.minutes) || 0)} min | ${entry.top || ""}`;
        writer.paragraph(line);
      });
    }

    return pdf;
  }

  function createPdfWriter(pdf) {
    const margin = 46;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    function ensureSpace(heightNeeded) {
      if (y + heightNeeded <= pageHeight - margin) {
        return;
      }
      pdf.addPage();
      y = margin;
    }

    function heading(text) {
      ensureSpace(28);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text(String(text || ""), margin, y);
      y += 24;
    }

    function section(text) {
      ensureSpace(22);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text(String(text || ""), margin, y);
      y += 18;
    }

    function subsection(text) {
      ensureSpace(18);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text(String(text || ""), margin, y);
      y += 14;
    }

    function line(text) {
      ensureSpace(14);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(String(text || ""), margin, y);
      y += 13;
    }

    function paragraph(text) {
      const content = String(text || "").trim() || "-";
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const lines = pdf.splitTextToSize(content, maxWidth);
      const blockHeight = Math.max(1, lines.length) * 13;
      ensureSpace(blockHeight + 2);
      lines.forEach((entry) => {
        pdf.text(entry, margin, y);
        y += 13;
      });
      y += 1;
    }

    function gap(size = 6) {
      ensureSpace(size);
      y += size;
    }

    return {
      heading,
      section,
      subsection,
      line,
      paragraph,
      gap
    };
  }

  function readSessionSummary() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) {
        return { studentId: sync.studentId || "", displayName: "" };
      }
      const parsed = JSON.parse(raw);
      return {
        studentId: normalizeStudentId(parsed?.studentId) || sync.studentId || "",
        displayName: String(parsed?.displayName || "").trim().slice(0, 120)
      };
    } catch (_error) {
      return { studentId: sync.studentId || "", displayName: "" };
    }
  }

  function loadDemoState() {
    const now = new Date();
    const monthKey = currentMonthKey();

    st.daily = [
      { id: uid("d"), date: todayLocalIso(), top: "Finish resume bullet points", status: "Done", minutes: 35, comment: "Added measurable outcomes.", goalRef: "Weekly: Resume and interview prep", createdAt: now.toISOString() },
      { id: uid("d"), date: todayLocalIso(), top: "Practice interview story", status: "Partial", minutes: 20, comment: "Need stronger opening line.", goalRef: "Weekly: Resume and interview prep", createdAt: now.toISOString() },
      { id: uid("d"), date: todayLocalIso(), top: "Ask mentor for feedback", status: "Blocked", minutes: 0, comment: "Mentor unavailable until Thursday.", goalRef: "Monthly: Build confidence pipeline", createdAt: now.toISOString() }
    ];
    st.archive = [
      { id: uid("a"), date: todayLocalIso(), top: "Completed resume draft", status: "Done", minutes: 45, comment: "Reviewed with instructor.", goalRef: "Weekly: Resume and interview prep", createdAt: now.toISOString(), archivedAt: now.toISOString() }
    ];

    st.monthly = [
      {
        id: uid("g"),
        month: "March 2026",
        goal: "Submit three job applications each week",
        why: "Build consistency and interview opportunities.",
        proof: "Application tracker + interview invitations",
        checks: { s: "Yes", m: "Yes", a: "Yes", r: "Yes", t: "Yes" },
        score: 5,
        createdAt: now.toISOString()
      },
      {
        id: uid("g"),
        month: "March 2026",
        goal: "Improve interview confidence by rehearsing twice weekly",
        why: "Reduce anxiety and answer clearly.",
        proof: "Recorded mock sessions",
        checks: { s: "Yes", m: "Yes", a: "Yes", r: "Yes", t: "Needs Work" },
        score: 4,
        createdAt: now.toISOString()
      }
    ];

    st.vision.items = [];
    st.vision.maxZ = 0;
    st.vision.nextId = 1;
    st.visionMonthBoards = {
      [monthKey]: createEmptyVisionBoard()
    };
    st.visionSelectedMonth = monthKey;
    progression.setState({
      level: 5,
      xp: 1280,
      unlockedPrompts: ["bhag", "monthly", "weekly", "daily", "tasks"],
      completedPrompts: ["bhag", "monthly", "weekly", "daily", "tasks"],
      dailyCheckinsCount: 6,
      weeklyReviewsDone: 1,
      currentStreak: 3,
      longestStreak: 5
    });
    syncProgressionState();

    const firstGoal = st.monthly[0];
    st.vision.items.push({
      id: uid("v"),
      type: "goal",
      x: 46,
      y: 40,
      width: 280,
      height: 180,
      z: nextZ(),
      goalId: firstGoal.id,
      title: firstGoal.goal,
      text: firstGoal.why
    });
    syncVisionBoardSnapshot();

    markDirtyAndPersist();
    renderAll();
    setActiveTab("daily");
    toast("Demo data loaded. Vision Board unlocked.");
  }

  function resetState() {
    if (!window.confirm("Reset all daily, SMART, and vision board data for this profile?")) {
      return;
    }

    st.monthly = [];
    st.daily = [];
    st.archive = [];
    st.barriers = [];
    st.portfolio = [];
    st.vision = { items: [], nextId: 1, maxZ: 0 };
    st.visionMonthBoards = {
      [currentMonthKey()]: createEmptyVisionBoard()
    };
    st.visionSelectedMonth = currentMonthKey();
    progression.setState(ProgressionEngine.createInitialState());
    st.progression = progression.getState();
    st.meta = { updatedAt: new Date().toISOString() };

    saveLocal();
    queueCloudSave();
    renderAll();
    toast("Workspace reset.");
  }

  function hydrateFromLocal() {
    try {
      const draft = readSharedLocalDraft();
      const decoded = decodeResponsesToState(draft.responses);
      const standaloneProgression = ProgressionEngine.parse(draft.responses?.[PROGRESSION_RESPONSE_KEY]);

      if (decoded) {
        applyState(decoded);
      } else if (standaloneProgression) {
        progression.setState(standaloneProgression);
        syncProgressionState();
      }

      if (!hasStoredProgression(draft.responses, decoded) && hasAnyLessonSignal(draft.responses)) {
        migrateProgressionFromLessonResponses(draft.responses || {});
      }
    } catch (error) {
      console.warn("Could not restore local state.", error);
    }
  }

  function applyState(candidate) {
    const normalized = normalizeState(candidate);

    st.monthly = normalized.monthly;
    st.daily = normalized.daily;
    st.archive = normalized.archive;
    st.barriers = normalized.barriers;
    st.portfolio = normalized.portfolio;
    st.vision = normalized.vision;
    st.visionMonthBoards = normalized.visionMonthBoards;
    st.visionSelectedMonth = normalized.visionSelectedMonth;
    st.progression = normalized.progression;
    st.meta = normalized.meta;
    progression.setState(st.progression);
    ensureVisionMonthState();
  }

  function normalizeState(candidate) {
    const safe = {
      monthly: [],
      daily: [],
      archive: [],
      barriers: [],
      portfolio: [],
      vision: { items: [], nextId: 1, maxZ: 0 },
      visionMonthBoards: {},
      visionSelectedMonth: "",
      progression: ProgressionEngine.createInitialState(),
      meta: { updatedAt: null }
    };

    if (!candidate || typeof candidate !== "object") {
      return safe;
    }

    if (Array.isArray(candidate.monthly)) {
      safe.monthly = candidate.monthly.map(normalizeGoal).filter(Boolean).slice(0, 160);
    }

    if (Array.isArray(candidate.daily)) {
      safe.daily = candidate.daily.map(normalizeDaily).filter(Boolean).slice(0, 200);
    }

    if (Array.isArray(candidate.archive)) {
      safe.archive = candidate.archive.map(normalizeArchiveTask).filter(Boolean).slice(0, 300);
    }

    if (Array.isArray(candidate.barriers)) {
      safe.barriers = candidate.barriers.slice(0, 120);
    }

    if (Array.isArray(candidate.portfolio)) {
      safe.portfolio = candidate.portfolio.slice(0, 120);
    }

    const visionRaw = (candidate.vision && typeof candidate.vision === "object") ? candidate.vision : {};
    const visionItems = Array.isArray(visionRaw.items) ? visionRaw.items : [];
    const normalizedVision = createEmptyVisionBoard();
    normalizedVision.items = visionItems.map(normalizeVisionItem).filter(Boolean).slice(0, 80);
    normalizedVision.maxZ = normalizedVision.items.reduce((max, item) => Math.max(max, Number(item.z) || 0), 0);
    normalizedVision.nextId = Math.max(1, toInt(visionRaw.nextId, normalizedVision.items.length + 1));
    safe.vision = normalizedVision;

    const boardsRaw = (candidate.visionMonthBoards && typeof candidate.visionMonthBoards === "object")
      ? candidate.visionMonthBoards
      : null;

    if (boardsRaw) {
      for (const [monthKey, board] of Object.entries(boardsRaw)) {
        const normalizedMonth = normalizeMonthKey(monthKey);
        if (!normalizedMonth) {
          continue;
        }
        safe.visionMonthBoards[normalizedMonth] = cloneVisionBoard(board);
      }
    }

    if (!Object.keys(safe.visionMonthBoards).length) {
      const seedMonth = normalizeMonthKey(candidate.visionSelectedMonth)
        || normalizeMonthKey(candidate.meta?.updatedAt)
        || currentMonthKey();
      safe.visionMonthBoards[seedMonth] = cloneVisionBoard(safe.vision);
    }

    const preferred = normalizeMonthKey(candidate.visionSelectedMonth);
    safe.visionSelectedMonth = preferred && safe.visionMonthBoards[preferred]
      ? preferred
      : currentMonthKey();

    if (!safe.visionMonthBoards[safe.visionSelectedMonth]) {
      const fallback = Object.keys(safe.visionMonthBoards).sort().pop() || currentMonthKey();
      safe.visionSelectedMonth = fallback;
    }

    safe.vision = cloneVisionBoard(safe.visionMonthBoards[safe.visionSelectedMonth]);

    safe.progression = new ProgressionEngine(candidate.progression || null).getState();

    if (typeof candidate.meta?.updatedAt === "string") {
      safe.meta.updatedAt = candidate.meta.updatedAt;
    }

    return safe;
  }

  function normalizeGoal(input) {
    if (!input || typeof input !== "object") {
      return null;
    }

    const checks = {
      s: yesNoFrom(input.checks?.s ?? input.s),
      m: yesNoFrom(input.checks?.m ?? input.m),
      a: yesNoFrom(input.checks?.a ?? input.a),
      r: yesNoFrom(input.checks?.r ?? input.r),
      t: yesNoFrom(input.checks?.t ?? input.t)
    };

    const score = Object.values(checks).filter((v) => v === "Yes").length;

    return {
      id: String(input.id || uid("g")),
      month: String(input.month || "").trim() || "Month",
      goal: String(input.goal || "").trim(),
      why: String(input.why || "").trim(),
      proof: String(input.proof || "").trim(),
      checks,
      score,
      createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString()
    };
  }

  function normalizeDaily(input) {
    if (!input || typeof input !== "object") {
      return null;
    }

    const top = String(input.top || "").trim();
    if (!top) {
      return null;
    }

    return {
      id: String(input.id || uid("d")),
      date: String(input.date || todayLocalIso()).slice(0, 10),
      top,
      status: normalizeStatus(input.status),
      minutes: Math.max(0, toInt(input.minutes, 0)),
      comment: String(input.comment || "").trim(),
      goalRef: String(input.goalRef || "").trim().slice(0, 240),
      createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString()
    };
  }

  function normalizeArchiveTask(input) {
    const base = normalizeDaily(input);
    if (!base) {
      return null;
    }

    return {
      ...base,
      status: "Done",
      archivedAt: typeof input.archivedAt === "string" ? input.archivedAt : base.createdAt
    };
  }

  function createEmptyVisionBoard() {
    return { items: [], nextId: 1, maxZ: 0 };
  }

  function cloneVisionBoard(board) {
    const source = (board && typeof board === "object") ? board : createEmptyVisionBoard();
    const items = Array.isArray(source.items)
      ? source.items.map((item) => ({ ...item }))
      : [];
    const maxZ = items.reduce((max, item) => Math.max(max, Number(item.z) || 0), 0);
    return {
      items,
      nextId: Math.max(1, toInt(source.nextId, items.length + 1)),
      maxZ
    };
  }

  function ensureVisionMonthState() {
    if (!st.visionMonthBoards || typeof st.visionMonthBoards !== "object") {
      st.visionMonthBoards = {};
    }

    if (!Object.keys(st.visionMonthBoards).length) {
      const seedKey = normalizeMonthKey(st.visionSelectedMonth) || currentMonthKey();
      st.visionMonthBoards[seedKey] = cloneVisionBoard(st.vision);
      st.visionSelectedMonth = seedKey;
    }

    const currentKey = currentMonthKey();
    if (!st.visionMonthBoards[currentKey]) {
      st.visionMonthBoards[currentKey] = createEmptyVisionBoard();
    }

    const selected = normalizeMonthKey(st.visionSelectedMonth);
    if (!selected || !st.visionMonthBoards[selected]) {
      st.visionSelectedMonth = currentKey;
    }
  }

  function syncVisionBoardSnapshot() {
    ensureVisionMonthState();
    const monthKey = normalizeMonthKey(st.visionSelectedMonth) || currentMonthKey();
    st.visionSelectedMonth = monthKey;
    st.visionMonthBoards[monthKey] = cloneVisionBoard(st.vision);
  }

  function activateVisionMonth(monthKey, { saveCurrent = true, persist = false, quiet = false } = {}) {
    const targetKey = normalizeMonthKey(monthKey) || currentMonthKey();
    ensureVisionMonthState();

    if (saveCurrent) {
      syncVisionBoardSnapshot();
    }

    if (!st.visionMonthBoards[targetKey]) {
      st.visionMonthBoards[targetKey] = createEmptyVisionBoard();
    }

    st.visionSelectedMonth = targetKey;
    st.vision = cloneVisionBoard(st.visionMonthBoards[targetKey]);

    renderVisionGoalOptions();
    renderVisionBoard();
    if (persist) {
      markDirtyAndPersist();
    }
    if (!quiet) {
      toast(`Showing vision board for ${monthLabelFromKey(targetKey)}.`);
    }
  }

  function normalizeVisionItem(input) {
    if (!input || typeof input !== "object") {
      return null;
    }

    const type = (input.type === "image") ? "image" : "goal";
    const item = {
      id: String(input.id || uid("v")),
      type,
      x: Number(input.x) || 0,
      y: Number(input.y) || 0,
      width: Math.max(120, Number(input.width) || (type === "image" ? 240 : 260)),
      height: Math.max(90, Number(input.height) || (type === "image" ? 180 : 170)),
      z: Math.max(1, Number(input.z) || 1)
    };

    if (type === "image") {
      item.src = String(input.src || "");
      if (!item.src.startsWith("data:image/")) {
        return null;
      }
      item.alt = String(input.alt || "Vision image").slice(0, 120);
    } else {
      item.goalId = String(input.goalId || "");
      item.title = String(input.title || "Goal").slice(0, 120);
      item.text = String(input.text || "").slice(0, 600);
    }

    clampVisionItem(item);
    return item;
  }

  function syncProgressionState() {
    st.progression = progression.getState();
  }

  function markDirtyAndPersist() {
    syncVisionBoardSnapshot();
    refreshProgressionFromSharedDraft();
    syncProgressionState();
    st.meta.updatedAt = new Date().toISOString();
    saveLocal();
    queueCloudSave();
  }

  function generatePlanFromLessonAnswers() {
    const draft = readSharedLocalDraft();
    const answers = readLessonAnswers(draft.responses);

    const hasAnyAnswer = LESSON_PROMPT_KEYS.some((key) => {
      const value = String(answers[key] || "").trim();
      return value.length > 0;
    });

    if (!hasAnyAnswer) {
      setPlanHint("No lesson answers detected yet. Complete prompts first.", "warn");
      toast("Complete lesson prompts first, then generate plan.");
      return;
    }

    const smartResult = upsertSmartGoalFromAnswers(answers);
    const dailyResult = upsertDailyPlanFromAnswers(answers);
    const visionResult = addVisionNotesFromAnswers(answers);

    if (answers.barrier_id) {
      appendUniqueText(st.barriers, `${answers.barrier_id}`);
    }
    if (answers.if_then_plan) {
      appendUniqueText(st.barriers, `Plan: ${answers.if_then_plan}`);
    }

    const evidenceItems = splitPlanItems(answers.evidence).slice(0, 5);
    evidenceItems.forEach((item) => appendUniqueText(st.portfolio, item));

    markDirtyAndPersist();
    renderAll();

    const summary = [
      smartResult.created ? "SMART goal created" : smartResult.updated ? "SMART goal updated" : "SMART goal unchanged",
      dailyResult.added > 0 ? `${dailyResult.added} plan tasks added` : "No new plan tasks needed",
      visionResult.added > 0 ? `${visionResult.added} vision notes added` : "Vision notes already current"
    ].join(" • ");

    setPlanHint(summary, "ok");
    toast("Mission plan generated from lesson answers.");
  }

  function readLessonAnswers(responses) {
    return readPromptResponses(responses || {});
  }

  function inferCurrentGoalRef() {
    const draft = readSharedLocalDraft();
    const answers = readLessonAnswers(draft.responses || {});
    return inferGoalRefFromAnswers(answers);
  }

  function inferGoalRefFromAnswers(answers) {
    if (answers.weekly) {
      return `Weekly: ${answers.weekly}`;
    }
    if (answers.monthly) {
      return `Monthly: ${answers.monthly}`;
    }
    if (answers.daily) {
      return `Daily: ${answers.daily}`;
    }
    return "";
  }

  function migrateProgressionFromLessonResponses(responses) {
    const inferred = new ProgressionEngine(null, responses).getState();
    const streakDays = [...new Set(st.daily.map((entry) => String(entry.date || "").slice(0, 10)).filter(Boolean))];

    inferred.dailyCheckinsCount = Math.max(Number(inferred.dailyCheckinsCount || 0), st.daily.length);
    if (streakDays.length) {
      inferred.streakDays = streakDays.sort();
      inferred.currentStreak = Math.max(Number(inferred.currentStreak || 0), 1);
      inferred.longestStreak = Math.max(Number(inferred.longestStreak || 0), inferred.currentStreak);
    }

    progression.setState({
      ...progression.getState(),
      ...inferred
    });
    syncProgressionState();
    st.meta.updatedAt = new Date().toISOString();
    saveLocal();
    queueCloudSave();
  }

  function hasStoredProgression(responses, stateCandidate) {
    const standalone = ProgressionEngine.parse(responses?.[PROGRESSION_RESPONSE_KEY]);
    if (standalone) {
      return true;
    }

    const candidate = stateCandidate?.progression;
    if (!candidate || typeof candidate !== "object") {
      return false;
    }

    return (
      Number(candidate.level || 1) > 1 ||
      Number(candidate.xp || 0) > 0 ||
      (Array.isArray(candidate.completedPrompts) && candidate.completedPrompts.length > 0)
    );
  }

  function hasAnyLessonSignal(responses) {
    const answers = readLessonAnswers(responses || {});
    return LESSON_PROMPT_KEYS.some((key) => String(answers[key] || "").trim().length > 0);
  }

  function refreshProgressionFromSharedDraft() {
    if (!flags.progress) {
      return;
    }

    const draft = readSharedLocalDraft();
    const standalone = ProgressionEngine.parse(draft.responses?.[PROGRESSION_RESPONSE_KEY]);
    const decoded = decodeResponsesToState(draft.responses || {});
    const workspaceProgression = decoded?.progression;
    const incoming = workspaceProgression || standalone;

    if (!incoming) {
      return;
    }

    const merged = mergeProgressionState(progression.getState(), incoming);
    progression.setState(merged);
    syncProgressionState();
  }

  function mergeProgressionState(current, incoming) {
    const a = new ProgressionEngine(current || null).getState();
    const b = new ProgressionEngine(incoming || null).getState();

    const merged = {
      ...a,
      level: Math.max(Number(a.level || 1), Number(b.level || 1)),
      xp: Math.max(Number(a.xp || 0), Number(b.xp || 0)),
      unlockedPrompts: [...new Set([...(a.unlockedPrompts || []), ...(b.unlockedPrompts || [])])],
      completedPrompts: [...new Set([...(a.completedPrompts || []), ...(b.completedPrompts || [])])],
      dailyCheckinsCount: Math.max(Number(a.dailyCheckinsCount || 0), Number(b.dailyCheckinsCount || 0)),
      currentStreak: Math.max(Number(a.currentStreak || 0), Number(b.currentStreak || 0)),
      longestStreak: Math.max(Number(a.longestStreak || 0), Number(b.longestStreak || 0)),
      streakDays: [...new Set([...(a.streakDays || []), ...(b.streakDays || [])])].sort(),
      weeklyReviewsDone: Math.max(Number(a.weeklyReviewsDone || 0), Number(b.weeklyReviewsDone || 0)),
      monthlyReviewsDone: Math.max(Number(a.monthlyReviewsDone || 0), Number(b.monthlyReviewsDone || 0)),
      lastWeeklyReviewAt: newerIso(a.lastWeeklyReviewAt, b.lastWeeklyReviewAt),
      lastMonthlyReviewAt: newerIso(a.lastMonthlyReviewAt, b.lastMonthlyReviewAt),
      phase2Prompts: {
        ...(a.phase2Prompts || {}),
        ...(b.phase2Prompts || {})
      },
      achievements: [...new Set([...(a.achievements || []), ...(b.achievements || [])])],
      levelUpHistory: [...(a.levelUpHistory || []), ...(b.levelUpHistory || [])].slice(-120),
      overrideAudit: [...(a.overrideAudit || []), ...(b.overrideAudit || [])].slice(-120)
    };

    return merged;
  }

  function upsertSmartGoalFromAnswers(answers) {
    const goalText = answers.monthly || answers.bhag;
    if (!goalText) {
      return { created: false, updated: false };
    }

    const month = currentMonthLabel();
    const checks = deriveSmartChecks(answers);
    const score = Object.values(checks).filter((value) => value === "Yes").length;
    const normalizedGoal = normalizeText(goalText);

    const existing = st.monthly.find((goal) => normalizeText(goal.goal) === normalizedGoal)
      || st.monthly.find((goal) => goal.source === "lesson-plan");

    if (existing) {
      existing.month = month;
      existing.goal = goalText;
      existing.why = answers.why_matters || existing.why || "";
      existing.proof = answers.evidence || existing.proof || "";
      existing.checks = checks;
      existing.score = score;
      existing.source = "lesson-plan";
      return { created: false, updated: true };
    }

    st.monthly.unshift({
      id: uid("g"),
      month,
      goal: goalText,
      why: answers.why_matters || "",
      proof: answers.evidence || "",
      checks,
      score,
      source: "lesson-plan",
      createdAt: new Date().toISOString()
    });
    st.monthly = st.monthly.slice(0, 160);

    return { created: true, updated: false };
  }

  function deriveSmartChecks(answers) {
    const smartText = answers.monthly || "";
    const hasNumber = /\d/.test(smartText) || /\b(weekly|daily|each|per|times|applications?|hours?|minutes?|percent)\b/i.test(smartText);
    const hasTime = /\b(by|before|after|within|week|month|quarter|year|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2})\b/i.test(answers.deadline || smartText);
    const hasActions = Boolean((answers.weekly || "").trim() || (answers.daily || "").trim() || (answers.tasks || "").trim());
    const hasWhy = (answers.why_matters || "").trim().length >= 8;

    return {
      s: smartText.trim().length >= 12 ? "Yes" : "Needs Work",
      m: hasNumber ? "Yes" : "Needs Work",
      a: hasActions ? "Yes" : "Needs Work",
      r: hasWhy ? "Yes" : "Needs Work",
      t: hasTime ? "Yes" : "Needs Work"
    };
  }

  function upsertDailyPlanFromAnswers(answers) {
    const tasks = [];
    tasks.push(...splitPlanItems(answers.tasks));
    tasks.push(...splitPlanItems(answers.weekly));
    tasks.push(...splitPlanItems(answers.monthly));
    if (answers.daily) {
      tasks.push(answers.daily.trim());
    }

    const deduped = [];
    const seen = new Set();
    for (const task of tasks) {
      const norm = normalizeText(task);
      if (!norm || seen.has(norm)) {
        continue;
      }
      seen.add(norm);
      deduped.push(task.trim());
      if (deduped.length >= 8) {
        break;
      }
    }

    if (!deduped.length) {
      return { added: 0 };
    }

    const existing = new Set(st.daily.map((entry) => normalizeText(entry.top)));
    let added = 0;
    for (const task of deduped) {
      const norm = normalizeText(task);
      if (existing.has(norm)) {
        continue;
      }

      st.daily.unshift({
        id: uid("d"),
        date: todayLocalIso(),
        top: task,
        status: "Blocked",
        minutes: 0,
        comment: answers.if_then_plan || "",
        goalRef: inferGoalRefFromAnswers(answers),
        source: "lesson-plan",
        createdAt: new Date().toISOString()
      });
      existing.add(norm);
      added += 1;
    }

    st.daily = st.daily.slice(0, 200);
    return { added };
  }

  function addVisionNotesFromAnswers(answers) {
    let added = 0;

    const goalNoteText = answers.bhag || answers.monthly;
    if (goalNoteText && !hasVisionGoalWithText(goalNoteText)) {
      const placement = nextPlacement(280, 176);
      st.vision.items.push({
        id: uid("v"),
        type: "goal",
        x: placement.x,
        y: placement.y,
        width: 280,
        height: 176,
        z: nextZ(),
        goalId: "",
        title: "Lesson Goal",
        text: goalNoteText
      });
      added += 1;
    }

    if (answers.if_then_plan && !hasVisionGoalWithText(answers.if_then_plan)) {
      const placement = nextPlacement(268, 162);
      st.vision.items.push({
        id: uid("v"),
        type: "goal",
        x: placement.x,
        y: placement.y,
        width: 268,
        height: 162,
        z: nextZ(),
        goalId: "",
        title: "If / Then Plan",
        text: answers.if_then_plan
      });
      added += 1;
    }

    st.vision.items = st.vision.items.slice(0, 80);
    return { added };
  }

  function hasVisionGoalWithText(text) {
    const needle = normalizeText(text);
    return st.vision.items.some((item) => item.type === "goal" && normalizeText(item.text || "") === needle);
  }

  function splitPlanItems(input) {
    const raw = String(input || "").replace(/\r/g, "\n");
    if (!raw.trim()) {
      return [];
    }

    const pieces = raw
      .replaceAll("•", "\n")
      .split(/\n|;|,(?=\s*[A-Za-z])/g)
      .map((part) => part.replace(/^\s*[-*\d.)]+\s*/, "").trim())
      .filter(Boolean);

    return pieces;
  }

  function currentMonthLabel() {
    const now = new Date();
    return now.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function appendUniqueText(targetArray, value) {
    if (!Array.isArray(targetArray)) {
      return;
    }
    const text = String(value || "").trim();
    if (!text) {
      return;
    }

    const exists = targetArray.some((item) => normalizeText(item) === normalizeText(text));
    if (!exists) {
      targetArray.push(text);
    }
  }

  function setPlanHint(message, tone = "ok") {
    if (!ui.planHint) {
      return;
    }
    ui.planHint.textContent = message;
    ui.planHint.dataset.tone = tone;
  }

  function saveLocal() {
    try {
      const baseDraft = readSharedLocalDraft();
      const mergedResponses = encodeStateToResponses(baseDraft.responses, st);
      persistSharedLocalDraft({
        responses: mergedResponses,
        updatedAt: st.meta.updatedAt || baseDraft.updatedAt || new Date().toISOString()
      });
    } catch (error) {
      console.warn("Could not persist local draft.", error);
      toast("Local save failed: browser storage is full.");
    }
  }

  function configureSyncFromSession() {
    sync.enabled = false;
    sync.token = "";
    sync.studentId = "";
    sync.remoteResponses = {};

    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) {
        setSyncState("Local mode", "local");
        return;
      }

      const parsed = JSON.parse(raw);
      const token = typeof parsed?.token === "string" ? parsed.token.trim() : "";
      const studentId = normalizeStudentId(parsed?.studentId);

      if (!token) {
        setSyncState("Local mode", "local");
        return;
      }

      sync.enabled = true;
      sync.token = token;
      sync.studentId = studentId;
      setSyncState("Cloud sync ready", "synced");
    } catch (error) {
      console.warn("Could not restore session token.", error);
      setSyncState("Local mode", "local");
    }
  }

  async function loadBestDraft() {
    if (!sync.enabled) {
      return;
    }

    setSyncState("Syncing saved draft...", "saving");

    try {
      const draft = await fetchDraft();
      sync.remoteResponses = draft.responses && typeof draft.responses === "object"
        ? { ...draft.responses }
        : {};
      const remoteState = decodeResponsesToState(draft.responses);

      if (!remoteState) {
        if (hasMeaningfulData(st)) {
          await pushDraft();
          setSyncState("Local draft synced.", "synced");
        } else {
          setSyncState("Cloud draft empty.", "local");
        }
        return;
      }

      const localTs = timestamp(st.meta.updatedAt);
      const remoteTs = Math.max(
        timestamp(remoteState.meta?.updatedAt),
        timestamp(draft.responses?.[`${WORKSPACE_PREFIX}updatedAt`]),
        timestamp(draft.updatedAt)
      );

      if (remoteTs > localTs) {
        applyState(remoteState);
        activateVisionMonth(currentMonthKey(), { saveCurrent: true, persist: false, quiet: true });
        if (!hasStoredProgression(draft.responses, remoteState) && hasAnyLessonSignal(draft.responses)) {
          migrateProgressionFromLessonResponses(draft.responses || {});
        }
        saveLocal();
        renderAll();
        setSyncState("Cloud draft loaded.", "synced");
        return;
      }

      if (localTs >= remoteTs && hasMeaningfulData(st)) {
        const localDraft = readSharedLocalDraft();
        if (!hasStoredProgression(localDraft.responses, st) && hasAnyLessonSignal(localDraft.responses)) {
          migrateProgressionFromLessonResponses(localDraft.responses || {});
        }
        await pushDraft();
        setSyncState("Local draft synced.", "synced");
        return;
      }

      setSyncState("Synced.", "synced");
    } catch (error) {
      console.warn("Cloud load failed.", error);
      setSyncState("Cloud unavailable.", "error");
    }
  }

  function hasMeaningfulData(state) {
    const hasVisionHistory = Object.values(state.visionMonthBoards || {}).some((board) => {
      return Array.isArray(board?.items) && board.items.length > 0;
    });
    return Boolean(
      (state.monthly && state.monthly.length) ||
      (state.daily && state.daily.length) ||
      (state.vision && state.vision.items && state.vision.items.length) ||
      hasVisionHistory
    );
  }

  function queueCloudSave() {
    if (!sync.enabled) {
      return;
    }

    sync.pending = true;
    setSyncState("Saving to cloud...", "saving");

    if (sync.timer) {
      clearTimeout(sync.timer);
    }

    sync.timer = setTimeout(() => {
      sync.timer = null;
      flushCloudSave();
    }, 850);
  }

  async function flushCloudSave() {
    if (!sync.enabled || !sync.pending) {
      return;
    }

    if (sync.inFlight) {
      return;
    }

    sync.pending = false;
    sync.inFlight = true;

    try {
      await pushDraft();
      setSyncState("Synced to cloud.", "synced");
    } catch (error) {
      console.warn("Cloud save failed.", error);
      const message = String(error?.message || "");
      const isSizeLimit = message.toLowerCase().includes("too large");

      if (isSizeLimit) {
        sync.pending = false;
        setSyncState("Cloud limit reached. Export snapshot.", "error");
        toast("Cloud sync limit reached. Remove image notes or export snapshot.");
        if (sync.timer) {
          clearTimeout(sync.timer);
          sync.timer = null;
        }
      } else {
        sync.pending = true;
        setSyncState("Sync failed. Retrying...", "error");

        if (sync.timer) {
          clearTimeout(sync.timer);
        }

        sync.timer = setTimeout(() => {
          sync.timer = null;
          flushCloudSave();
        }, 1800);
      }
    } finally {
      sync.inFlight = false;
    }
  }

  function setSyncState(message, tone) {
    ui.syncState.textContent = message;
    ui.syncState.setAttribute("data-tone", tone || "local");
  }

  async function fetchDraft() {
    const payload = await apiFetch(`/drafts/${encodeURIComponent(LESSON_ID)}`, { method: "GET" });
    return payload?.draft || { responses: {}, updatedAt: null };
  }

  async function pushDraft() {
    const baseDraft = readSharedLocalDraft();
    const mergedBaseResponses = {
      ...(sync.remoteResponses || {}),
      ...(baseDraft.responses || {})
    };
    const responses = encodeStateToResponses(mergedBaseResponses, st);
    const payload = await apiFetch(`/drafts/${encodeURIComponent(LESSON_ID)}`, {
      method: "PUT",
      body: { responses, updatedAt: st.meta.updatedAt }
    });
    sync.remoteResponses = { ...responses };
    persistSharedLocalDraft({
      responses,
      updatedAt: payload?.draft?.updatedAt || st.meta.updatedAt || new Date().toISOString()
    });
    return payload?.draft || null;
  }

  function encodeStateToResponses(baseResponses = {}, state) {
    const preserved = stripWorkspaceResponseKeys(baseResponses);
    const raw = JSON.stringify(state);
    const chunkSize = 3300;
    const chunks = [];

    for (let i = 0; i < raw.length; i += chunkSize) {
      chunks.push(raw.slice(i, i + chunkSize));
    }

    const reservedKeys = 4;
    const availableForChunks = 64 - Object.keys(preserved).length - reservedKeys;
    const maxChunks = Math.max(0, availableForChunks);
    if (chunks.length > maxChunks) {
      throw new Error("Snapshot too large for cloud sync. Remove some image notes.");
    }

    const responses = {
      ...preserved,
      [PROGRESSION_RESPONSE_KEY]: JSON.stringify(state.progression || progression.getState()),
      [`${WORKSPACE_PREFIX}schema`]: "spokesMissionControlV2",
      [`${WORKSPACE_PREFIX}encoding`]: "chunked-json-v1",
      [`${WORKSPACE_PREFIX}chunkCount`]: String(chunks.length),
      [`${WORKSPACE_PREFIX}updatedAt`]: state.meta?.updatedAt || ""
    };

    chunks.forEach((chunk, index) => {
      responses[`${WORKSPACE_PREFIX}chunk_${index}`] = chunk;
    });

    if (Object.keys(responses).length > 64) {
      throw new Error("Cloud key limit reached. Remove image notes before syncing.");
    }

    return responses;
  }

  function decodeResponsesToState(responses) {
    if (!responses || typeof responses !== "object") {
      return null;
    }

    if (typeof responses[`${WORKSPACE_PREFIX}snapshot`] === "string") {
      try {
        const parsed = JSON.parse(responses[`${WORKSPACE_PREFIX}snapshot`]);
        if (!parsed.progression) {
          parsed.progression = ProgressionEngine.parse(responses[PROGRESSION_RESPONSE_KEY]) || undefined;
        }
        return normalizeState(parsed);
      } catch (_error) {
        return null;
      }
    }

    let prefix = WORKSPACE_PREFIX;
    let count = toInt(responses[`${WORKSPACE_PREFIX}chunkCount`], 0);
    if (count <= 0 && typeof responses.__chunkCount === "string") {
      prefix = "__";
      count = toInt(responses.__chunkCount, 0);
    }

    if (count <= 0 || count > 64) {
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
      const parsed = JSON.parse(raw);
      if (!parsed.progression) {
        parsed.progression = ProgressionEngine.parse(responses[PROGRESSION_RESPONSE_KEY]) || undefined;
      }
      return normalizeState(parsed);
    } catch (error) {
      console.warn("Could not parse cloud draft payload.", error);
      return null;
    }
  }

  function migrateLegacyLocalState() {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      const legacyState = normalizeState(parsed);
      const hasCurrentState = hasMeaningfulData(st);

      if (!hasCurrentState && hasMeaningfulData(legacyState)) {
        applyState(legacyState);
        saveLocal();
      }

      localStorage.removeItem(LEGACY_KEY);
    } catch (error) {
      console.warn("Could not migrate legacy mission workspace draft.", error);
    }
  }

  function normalizeStudentId(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }

  function sharedDraftLocalKey() {
    const suffix = sync.studentId ? `student-${sync.studentId}` : "device-local";
    return `${GOAL_STORAGE_BASE_KEY}::${suffix}`;
  }

  function readSharedLocalDraft() {
    try {
      const raw = localStorage.getItem(sharedDraftLocalKey());
      if (!raw) {
        return { responses: {}, updatedAt: null };
      }

      const parsed = JSON.parse(raw);
      return {
        responses: sanitizeResponsesMap(parsed?.responses || {}),
        updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : null
      };
    } catch (error) {
      return { responses: {}, updatedAt: null };
    }
  }

  function persistSharedLocalDraft(draft) {
    const payload = {
      responses: sanitizeResponsesMap(draft?.responses || {}),
      updatedAt: typeof draft?.updatedAt === "string" ? draft.updatedAt : new Date().toISOString()
    };
    localStorage.setItem(sharedDraftLocalKey(), JSON.stringify(payload));
  }

  function stripWorkspaceResponseKeys(input) {
    const out = {};
    for (const [key, value] of Object.entries(input || {})) {
      if (isWorkspaceResponseKey(key)) {
        continue;
      }
      out[key] = typeof value === "string" ? value : String(value ?? "");
    }
    return out;
  }

  function isWorkspaceResponseKey(key) {
    return key.startsWith(WORKSPACE_PREFIX) ||
      key === "__schema" ||
      key === "__encoding" ||
      key === "__chunkCount" ||
      key === "__updatedAt" ||
      key.startsWith("__chunk_");
  }

  function sanitizeResponsesMap(input) {
    const clean = {};
    for (const [rawKey, rawValue] of Object.entries(input || {})) {
      if (Object.keys(clean).length >= 64) {
        break;
      }
      const key = String(rawKey || "").trim();
      if (!key) {
        continue;
      }
      const value = typeof rawValue === "string" ? rawValue : String(rawValue ?? "");
      clean[key] = value.slice(0, 4000);
    }
    return clean;
  }

  async function apiFetch(path, { method = "GET", body = null } = {}) {
    const headers = { Accept: "application/json" };
    if (body !== null) {
      headers["Content-Type"] = "application/json";
    }
    if (sync.token) {
      headers.Authorization = `Bearer ${sync.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      cache: "no-store",
      body: body === null ? undefined : JSON.stringify(body)
    });

    const text = await res.text();
    let payload = {};

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (_error) {
        payload = {};
      }
    }

    if (!res.ok) {
      const msg = typeof payload?.error === "string" ? payload.error : `Request failed (${res.status})`;
      throw new Error(msg);
    }

    return payload;
  }

  function normalizeStatus(value) {
    const text = String(value || "").toLowerCase().trim();
    if (text === "done" || text === "complete" || text === "completed") {
      return "Done";
    }
    if (text === "partial" || text === "in-progress" || text === "progress") {
      return "Partial";
    }
    return "Blocked";
  }

  function statusTone(value) {
    const state = normalizeStatus(value);
    if (state === "Done") { return "good"; }
    if (state === "Partial") { return "warn"; }
    return "bad";
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value || "");
    }
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function timestamp(value) {
    if (typeof value !== "string" || !value) {
      return 0;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function daysSince(isoDate, nowMs = Date.now()) {
    const parsed = Date.parse(String(isoDate || ""));
    if (Number.isNaN(parsed)) {
      return Number.POSITIVE_INFINITY;
    }
    const ms = Math.max(0, nowMs - parsed);
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  function newerIso(left, right) {
    const a = timestamp(left);
    const b = timestamp(right);
    if (a >= b) {
      return left || right || null;
    }
    return right || left || null;
  }

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
  }

  function toInt(value, fallback) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return min;
    }
    return Math.min(max, Math.max(min, numeric));
  }

  function toast(message) {
    if (!ui.toast) {
      return;
    }

    ui.toast.textContent = message;
    ui.toast.classList.add("show");

    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(() => {
      ui.toast.classList.remove("show");
    }, 2100);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#96;");
  }

  function cssEscape(value) {
    const raw = String(value ?? "");
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(raw);
    }
    return raw.replace(/(["'\\#.:\[\]\(\) ])/g, "\\$1");
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => fn(...args), delay);
    };
  }
}
