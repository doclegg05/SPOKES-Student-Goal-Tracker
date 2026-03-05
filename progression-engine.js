import {
  CORE_PROMPT_KEYS,
  GROWTH_PROMPT_KEYS,
  readCorePromptResponses
} from "./goal-response-adapter.js";

const CORE_LEVELS = [
  { level: 1, name: "BHAG", key: "bhag", scrollCap: 0.24, trackVh: 400 },
  { level: 2, name: "Monthly", key: "monthly", scrollCap: 0.44, trackVh: 580 },
  { level: 3, name: "Weekly", key: "weekly", scrollCap: 0.64, trackVh: 760 },
  { level: 4, name: "Daily", key: "daily", scrollCap: 0.84, trackVh: 940 },
  { level: 5, name: "Tasks", key: "tasks", scrollCap: 0.98, trackVh: 1100 }
];

const PHASE2_UNLOCK_LEVEL = {
  why_matters: 3,
  barrier_id: 3,
  if_then_plan: 4,
  evidence: 5,
  support: 5,
  deadline: 5
};

const XP_NEXT_LEVEL = {
  1: 200,
  2: 450,
  3: 750,
  4: 1100,
  5: 1500
};

const STREAK_BONUS = {
  3: 25,
  7: 75,
  14: 150,
  30: 300
};

const ACHIEVEMENT_DEFS = {
  "xp:prompt_lockin":    { label: "Locked In",        desc: "Locked in a prompt response" },
  "xp:daily_checkin":    { label: "Daily Warrior",     desc: "Completed a daily check-in" },
  "xp:task_complete":    { label: "Task Crusher",      desc: "Completed a task" },
  "xp:phase2_prompt":    { label: "Deep Thinker",      desc: "Answered a growth prompt" },
  "xp:weekly_review":    { label: "Weekly Reflector",   desc: "Completed a weekly review" },
  "xp:monthly_review":   { label: "Monthly Strategist", desc: "Completed a monthly review" },
  "xp:smart_ready":      { label: "SMART Ready",       desc: "Got a SMART goal to 5/5" },
  "xp:vision_note":      { label: "Visionary",         desc: "Added a vision board note" },
  "streak:3":            { label: "3-Day Streak",      desc: "Checked in 3 days in a row" },
  "streak:7":            { label: "Week Warrior",      desc: "7-day check-in streak" },
  "streak:14":           { label: "Fortnight Focus",   desc: "14-day check-in streak" },
  "streak:30":           { label: "Monthly Machine",   desc: "30-day check-in streak" },
  "level:2":             { label: "Horizon Set",       desc: "Reached Level 2" },
  "level:3":             { label: "Strategist",        desc: "Reached Level 3" },
  "level:4":             { label: "Executor",          desc: "Reached Level 4" },
  "level:5":             { label: "Mission Complete",   desc: "Reached Level 5" }
};

function isoNow() {
  return new Date().toISOString();
}

function normalizeDay(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function timestamp(value) {
  const parsed = Date.parse(String(value || ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function uniqueSortedDays(days) {
  const uniq = [...new Set(days.map((day) => normalizeDay(day)).filter(Boolean))];
  return uniq.sort((a, b) => timestamp(a) - timestamp(b));
}

function computeCurrentStreak(days) {
  if (!days.length) {
    return 0;
  }

  const sorted = [...days].sort((a, b) => timestamp(b) - timestamp(a));
  let streak = 1;
  let cursor = new Date(`${sorted[0]}T00:00:00`);
  cursor.setDate(cursor.getDate() - 1);

  for (let i = 1; i < sorted.length; i += 1) {
    const candidate = new Date(`${sorted[i]}T00:00:00`);
    if (candidate.getTime() === cursor.getTime()) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (candidate.getTime() < cursor.getTime()) {
      continue;
    }
    break;
  }

  return streak;
}

function coreOrderIndex(key) {
  const index = CORE_PROMPT_KEYS.indexOf(key);
  return index < 0 ? 999 : index;
}

function levelForPrompt(key) {
  const row = CORE_LEVELS.find((item) => item.key === key);
  return row ? row.level : 1;
}

export class ProgressionEngine {
  static createInitialState() {
    return {
      level: 1,
      xp: 0,
      unlockedPrompts: ["bhag"],
      completedPrompts: [],
      dailyCheckinsCount: 0,
      currentStreak: 0,
      longestStreak: 0,
      streakDays: [],
      weeklyReviewsDone: 0,
      monthlyReviewsDone: 0,
      lastWeeklyReviewAt: null,
      lastMonthlyReviewAt: null,
      phase2Prompts: {},
      achievements: [],
      levelUpHistory: [],
      overrideAudit: []
    };
  }

  static parse(value) {
    if (!value) {
      return null;
    }
    if (typeof value === "object") {
      return value;
    }
    if (typeof value !== "string") {
      return null;
    }
    try {
      return JSON.parse(value);
    } catch (_error) {
      return null;
    }
  }

  static inferFromResponses(responses = {}) {
    const state = ProgressionEngine.createInitialState();
    const core = readCorePromptResponses(responses);

    for (const key of CORE_PROMPT_KEYS) {
      if (String(core[key] || "").trim()) {
        state.completedPrompts.push(key);
      }
    }

    state.unlockedPrompts = ["bhag"];
    if (state.completedPrompts.includes("bhag")) {
      state.unlockedPrompts.push("monthly");
      state.level = 2;
    }
    if (state.completedPrompts.includes("weekly")) {
      state.unlockedPrompts.push("weekly");
      state.level = Math.max(state.level, 3);
    }
    if (state.completedPrompts.includes("daily")) {
      state.unlockedPrompts.push("daily");
      state.level = Math.max(state.level, 4);
    }
    if (state.completedPrompts.includes("tasks")) {
      state.unlockedPrompts.push("tasks");
      state.level = 5;
    }

    state.unlockedPrompts = [...new Set(state.unlockedPrompts)].sort(
      (a, b) => coreOrderIndex(a) - coreOrderIndex(b)
    );

    return state;
  }

  constructor(seedState = null, responses = null) {
    const parsed = ProgressionEngine.parse(seedState);
    const inferred = ProgressionEngine.inferFromResponses(responses || {});
    this.state = this.normalizeState({ ...inferred, ...(parsed || {}) });
    this.ensureUnlocks("init");
  }

  normalizeState(candidate) {
    const base = ProgressionEngine.createInitialState();
    const input = candidate && typeof candidate === "object" ? candidate : {};

    base.level = Math.max(1, Math.min(5, Number.parseInt(String(input.level || 1), 10) || 1));
    base.xp = Math.max(0, Number.parseInt(String(input.xp || 0), 10) || 0);

    base.unlockedPrompts = Array.isArray(input.unlockedPrompts)
      ? [...new Set(input.unlockedPrompts.map((key) => String(key || "").trim()).filter((key) => CORE_PROMPT_KEYS.includes(key) || GROWTH_PROMPT_KEYS.includes(key)))]
      : ["bhag"];
    if (!base.unlockedPrompts.includes("bhag")) {
      base.unlockedPrompts.unshift("bhag");
    }

    base.completedPrompts = Array.isArray(input.completedPrompts)
      ? [...new Set(input.completedPrompts.map((key) => String(key || "").trim()).filter((key) => CORE_PROMPT_KEYS.includes(key)))]
      : [];

    base.dailyCheckinsCount = Math.max(0, Number.parseInt(String(input.dailyCheckinsCount || 0), 10) || 0);
    base.currentStreak = Math.max(0, Number.parseInt(String(input.currentStreak || 0), 10) || 0);
    base.longestStreak = Math.max(0, Number.parseInt(String(input.longestStreak || 0), 10) || 0);
    base.streakDays = uniqueSortedDays(Array.isArray(input.streakDays) ? input.streakDays : []);

    base.weeklyReviewsDone = Math.max(0, Number.parseInt(String(input.weeklyReviewsDone || 0), 10) || 0);
    base.monthlyReviewsDone = Math.max(0, Number.parseInt(String(input.monthlyReviewsDone || 0), 10) || 0);
    base.lastWeeklyReviewAt = typeof input.lastWeeklyReviewAt === "string" ? input.lastWeeklyReviewAt : null;
    base.lastMonthlyReviewAt = typeof input.lastMonthlyReviewAt === "string" ? input.lastMonthlyReviewAt : null;

    if (input.phase2Prompts && typeof input.phase2Prompts === "object") {
      for (const key of GROWTH_PROMPT_KEYS) {
        const value = String(input.phase2Prompts[key] || "").trim();
        if (value) {
          base.phase2Prompts[key] = value.slice(0, 3000);
        }
      }
    }

    base.achievements = Array.isArray(input.achievements)
      ? [...new Set(input.achievements.map((item) => String(item || "").trim()).filter(Boolean))]
      : [];

    base.levelUpHistory = Array.isArray(input.levelUpHistory)
      ? input.levelUpHistory
          .filter((row) => row && typeof row === "object")
          .map((row) => ({
            level: Math.max(1, Math.min(5, Number(row.level) || 1)),
            at: String(row.at || isoNow()),
            reason: String(row.reason || "progress")
          }))
      : [];

    base.overrideAudit = Array.isArray(input.overrideAudit)
      ? input.overrideAudit
          .filter((row) => row && typeof row === "object")
          .map((row) => ({
            by: String(row.by || "teacher"),
            at: String(row.at || isoNow()),
            action: String(row.action || ""),
            reason: String(row.reason || "")
          }))
      : [];

    return base;
  }

  setState(nextState = null) {
    const parsed = ProgressionEngine.parse(nextState);
    this.state = this.normalizeState(parsed || {});
    this.ensureUnlocks("set_state");
    return this.getState();
  }

  getState() {
    return clone(this.state);
  }

  serialize() {
    return JSON.stringify(this.state);
  }

  getUnlockedCorePrompts() {
    return this.state.unlockedPrompts.filter((key) => CORE_PROMPT_KEYS.includes(key));
  }

  getCompletedCorePrompts() {
    return [...this.state.completedPrompts];
  }

  isPromptUnlocked(key) {
    return this.state.unlockedPrompts.includes(key);
  }

  isPromptCompleted(key) {
    return this.state.completedPrompts.includes(key);
  }

  getMaxScrollProgress() {
    const row = CORE_LEVELS.find((item) => item.level === this.state.level) || CORE_LEVELS[0];
    return row.scrollCap;
  }

  getScrollTrackHeightVh() {
    const row = CORE_LEVELS.find((item) => item.level === this.state.level) || CORE_LEVELS[0];
    return row.trackVh;
  }

  getLevelName() {
    const row = CORE_LEVELS.find((item) => item.level === this.state.level) || CORE_LEVELS[0];
    return row.name;
  }

  getXpForNext() {
    const nextTarget = XP_NEXT_LEVEL[this.state.level] || XP_NEXT_LEVEL[5];
    const prevTarget = XP_NEXT_LEVEL[this.state.level - 1] || 0;
    const span = Math.max(1, nextTarget - prevTarget);
    const clamped = Math.max(0, Math.min(span, this.state.xp - prevTarget));

    return {
      current: this.state.xp,
      previousTarget: prevTarget,
      nextTarget,
      ratio: clamped / span
    };
  }

  getUnlockedPhase2Prompts() {
    return GROWTH_PROMPT_KEYS.filter((key) => {
      const minLevel = PHASE2_UNLOCK_LEVEL[key] || 999;
      return this.state.level >= minLevel;
    });
  }

  getDashboardFeatures() {
    return {
      smartTab: this.state.level >= 3,
      growthTab: this.state.level >= 3,
      visionTab: this.state.level >= 5,
      kanbanEdit: this.state.level >= 4,
      planGeneration: this.state.level >= 3
    };
  }

  shouldShowLessonScroll() {
    return this.pendingUnlockedCorePrompts().length > 0;
  }

  pendingUnlockedCorePrompts() {
    return this.getUnlockedCorePrompts().filter((key) => !this.state.completedPrompts.includes(key));
  }

  awardXP(amount, reason = "xp_award") {
    const points = Math.max(0, Number.parseInt(String(amount || 0), 10) || 0);
    if (!points) {
      return 0;
    }
    this.state.xp += points;
    if (reason) {
      this.addAchievementIfMissing(`xp:${reason}`);
    }
    return points;
  }

  lockInPrompt(key, text, at = isoNow()) {
    const promptKey = String(key || "").trim();
    if (!CORE_PROMPT_KEYS.includes(promptKey)) {
      return { ok: false, reason: "unknown_prompt" };
    }
    if (!String(text || "").trim()) {
      return { ok: false, reason: "empty_response" };
    }
    if (!this.isPromptUnlocked(promptKey)) {
      return { ok: false, reason: "prompt_locked" };
    }

    const wasCompleted = this.isPromptCompleted(promptKey);
    const prevLevel = this.state.level;
    const prevUnlocked = new Set(this.getUnlockedCorePrompts());
    let xpGained = 0;

    if (!wasCompleted) {
      this.state.completedPrompts.push(promptKey);
      this.state.completedPrompts = [...new Set(this.state.completedPrompts)].sort(
        (a, b) => coreOrderIndex(a) - coreOrderIndex(b)
      );
      xpGained += this.awardXP(50, "prompt_lockin");
    }

    this.ensureUnlocks(`lock_in:${promptKey}`, at);

    const unlockedNow = this.getUnlockedCorePrompts();
    const newUnlocks = unlockedNow.filter((item) => !prevUnlocked.has(item));
    return {
      ok: true,
      promptKey,
      xpGained,
      level: this.state.level,
      levelChanged: this.state.level > prevLevel,
      newUnlocks
    };
  }

  recordDailyCheckIn(dateIso = isoNow()) {
    const day = normalizeDay(dateIso);
    if (!day) {
      return { ok: false, reason: "invalid_date" };
    }

    const prevLevel = this.state.level;
    const prevUnlocked = new Set(this.getUnlockedCorePrompts());
    let xpGained = this.awardXP(15, "daily_checkin");

    this.state.dailyCheckinsCount += 1;

    const streakResult = this.updateStreak(day);
    xpGained += streakResult.bonusXp;

    this.ensureUnlocks("daily_checkin", isoNow());

    const unlockedNow = this.getUnlockedCorePrompts();
    const newUnlocks = unlockedNow.filter((item) => !prevUnlocked.has(item));

    return {
      ok: true,
      xpGained,
      level: this.state.level,
      levelChanged: this.state.level > prevLevel,
      newUnlocks,
      streakMilestone: streakResult.milestone,
      currentStreak: this.state.currentStreak,
      longestStreak: this.state.longestStreak
    };
  }

  recordTaskCompletion() {
    const xpGained = this.awardXP(10, "task_complete");
    return {
      ok: true,
      xpGained,
      level: this.state.level
    };
  }

  recordWeeklyReview(at = isoNow()) {
    const prevLevel = this.state.level;
    const prevUnlocked = new Set(this.getUnlockedCorePrompts());
    const xpGained = this.awardXP(40, "weekly_review");

    this.state.weeklyReviewsDone += 1;
    this.state.lastWeeklyReviewAt = at;
    this.ensureUnlocks("weekly_review", at);

    const unlockedNow = this.getUnlockedCorePrompts();
    const newUnlocks = unlockedNow.filter((item) => !prevUnlocked.has(item));
    return {
      ok: true,
      xpGained,
      level: this.state.level,
      levelChanged: this.state.level > prevLevel,
      newUnlocks
    };
  }

  recordMonthlyReview(at = isoNow()) {
    const xpGained = this.awardXP(60, "monthly_review");
    this.state.monthlyReviewsDone += 1;
    this.state.lastMonthlyReviewAt = at;
    return {
      ok: true,
      xpGained,
      level: this.state.level
    };
  }

  recordPhase2Response(key, textValue) {
    const promptKey = String(key || "").trim();
    if (!GROWTH_PROMPT_KEYS.includes(promptKey)) {
      return { ok: false, reason: "unknown_growth_prompt" };
    }
    if (!this.getUnlockedPhase2Prompts().includes(promptKey)) {
      return { ok: false, reason: "growth_prompt_locked" };
    }

    const content = String(textValue || "").trim();
    if (!content) {
      return { ok: false, reason: "empty_response" };
    }

    const firstResponse = !String(this.state.phase2Prompts[promptKey] || "").trim();
    this.state.phase2Prompts[promptKey] = content.slice(0, 3000);
    if (!this.state.unlockedPrompts.includes(promptKey)) {
      this.state.unlockedPrompts.push(promptKey);
    }

    let xpGained = 0;
    if (firstResponse) {
      xpGained += this.awardXP(30, "phase2_prompt");
    }

    return {
      ok: true,
      xpGained,
      firstResponse
    };
  }

  awardSmartReady() {
    return this.awardXP(20, "smart_ready");
  }

  awardVisionNote() {
    return this.awardXP(5, "vision_note");
  }

  applyOverride({ by = "teacher", action = "", target = "", reason = "" } = {}) {
    const at = isoNow();

    if (action === "unlock_level") {
      const forcedLevel = Math.max(1, Math.min(5, Number.parseInt(String(target || "1"), 10) || 1));
      for (const row of CORE_LEVELS) {
        if (row.level <= forcedLevel && !this.state.unlockedPrompts.includes(row.key)) {
          this.state.unlockedPrompts.push(row.key);
        }
      }
      this.state.level = Math.max(this.state.level, forcedLevel);
    }

    if (action === "force_complete_prompt") {
      const key = String(target || "").trim();
      if (CORE_PROMPT_KEYS.includes(key) && !this.state.completedPrompts.includes(key)) {
        this.state.completedPrompts.push(key);
      }
      this.ensureUnlocks(`override:${key}`, at);
    }

    this.state.overrideAudit.push({
      by: String(by || "teacher"),
      at,
      action: String(action || ""),
      reason: String(reason || "")
    });
    this.state.overrideAudit = this.state.overrideAudit.slice(-120);
    return this.getState();
  }

  updateStreak(day) {
    this.state.streakDays = uniqueSortedDays([...this.state.streakDays, day]).slice(-90);
    this.state.currentStreak = computeCurrentStreak(this.state.streakDays);
    this.state.longestStreak = Math.max(this.state.longestStreak, this.state.currentStreak);

    const milestone = [30, 14, 7, 3].find((value) => value === this.state.currentStreak) || 0;
    let bonusXp = 0;

    if (milestone) {
      const achievementKey = `streak:${milestone}`;
      if (!this.state.achievements.includes(achievementKey)) {
        this.state.achievements.push(achievementKey);
        bonusXp = this.awardXP(STREAK_BONUS[milestone] || 0, `streak_${milestone}`);
      }
    }

    return { milestone: milestone || null, bonusXp };
  }

  addAchievementIfMissing(key) {
    if (!key || this.state.achievements.includes(key)) {
      return;
    }
    this.state.achievements.push(key);
    this.state.achievements = this.state.achievements.slice(-260);
  }

  ensureUnlocks(reason = "progress", at = isoNow()) {
    if (!this.state.unlockedPrompts.includes("bhag")) {
      this.state.unlockedPrompts.unshift("bhag");
    }

    if (this.state.completedPrompts.includes("bhag")) {
      this.unlockPrompt("monthly");
    }

    if (
      this.state.completedPrompts.includes("monthly") &&
      this.state.dailyCheckinsCount >= 5
    ) {
      this.unlockPrompt("weekly");
    }

    if (
      this.state.completedPrompts.includes("weekly") &&
      this.state.weeklyReviewsDone >= 1
    ) {
      this.unlockPrompt("daily");
    }

    if (this.state.completedPrompts.includes("daily")) {
      this.unlockPrompt("tasks");
    }

    const unlockedLevel = this.getUnlockedCorePrompts().reduce((max, key) => {
      return Math.max(max, levelForPrompt(key));
    }, 1);

    if (unlockedLevel > this.state.level) {
      this.state.levelUpHistory.push({
        level: unlockedLevel,
        at,
        reason
      });
      this.state.levelUpHistory = this.state.levelUpHistory.slice(-80);
    }
    this.state.level = Math.max(1, Math.min(5, unlockedLevel));

    if (this.state.level >= 2) { this.addAchievementIfMissing("level:2"); }
    if (this.state.level >= 3) { this.addAchievementIfMissing("level:3"); }
    if (this.state.level >= 4) { this.addAchievementIfMissing("level:4"); }
    if (this.state.level >= 5) { this.addAchievementIfMissing("level:5"); }

    this.state.unlockedPrompts = [...new Set(this.state.unlockedPrompts)].sort((a, b) => {
      const aIdx = coreOrderIndex(a);
      const bIdx = coreOrderIndex(b);
      if (aIdx !== bIdx) {
        return aIdx - bIdx;
      }
      return a.localeCompare(b);
    });
    this.state.completedPrompts = [...new Set(this.state.completedPrompts)].sort(
      (a, b) => coreOrderIndex(a) - coreOrderIndex(b)
    );
  }

  unlockPrompt(key) {
    if (!key || this.state.unlockedPrompts.includes(key)) {
      return;
    }
    this.state.unlockedPrompts.push(key);
  }

  getAchievementsWithDefs() {
    return this.state.achievements.map((key) => ({
      key,
      ...(ACHIEVEMENT_DEFS[key] || { label: key, desc: "" })
    }));
  }
}

export { ACHIEVEMENT_DEFS };
