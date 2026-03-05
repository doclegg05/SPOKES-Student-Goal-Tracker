import { initMissionControl } from "./mission-control.js";
import { initMissionWorkspace } from "./mission-workspace.js";
import { ProgressionEngine } from "./progression-engine.js";

const SESSION_KEY = "spokes-goal-session-v1";
const GOAL_STORAGE_BASE_KEY = "spokes-goal-journey";

function bootstrap() {
  initMissionControl();
  initMissionWorkspace();
  handleRouteIntent();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}

function handleRouteIntent() {
  const params = new URLSearchParams(window.location.search);
  const panel = String(params.get("panel") || "").trim().toLowerCase();
  const flags = window.__SPOKES_FLAGS__ || {};

  if (panel === "mission") {
    scrollToMissionControl();
    return;
  }

  if (flags.SPOKES_PROGRESS_V1 === false) {
    return;
  }

  const draft = readActiveDraft();
  const responses = draft?.responses || {};
  const progressionSeed = ProgressionEngine.parse(responses.progression_state) || null;
  const engine = new ProgressionEngine(progressionSeed, responses);

  // Students click the Mission Control nav link to scroll down manually.
}

function scrollToMissionControl() {
  const target = document.getElementById("missionControl");
  if (target) {
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

function readActiveDraft() {
  const suffix = getDraftSuffix();
  const key = `${GOAL_STORAGE_BASE_KEY}::${suffix}`;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return { responses: {}, updatedAt: null };
    }

    const parsed = JSON.parse(raw);
    return {
      responses: sanitizeResponses(parsed?.responses),
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch (_error) {
    return { responses: {}, updatedAt: null };
  }
}

function getDraftSuffix() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return "device-local";
    }

    const parsed = JSON.parse(raw);
    const studentId = normalizeStudentId(parsed?.studentId);
    return studentId ? `student-${studentId}` : "device-local";
  } catch (_error) {
    return "device-local";
  }
}

function normalizeStudentId(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function sanitizeResponses(input) {
  if (!input || typeof input !== "object") {
    return {};
  }

  const clean = {};
  for (const [rawKey, rawValue] of Object.entries(input).slice(0, 64)) {
    const key = String(rawKey || "").trim();
    if (!key) {
      continue;
    }
    const value = typeof rawValue === "string" ? rawValue : String(rawValue ?? "");
    clean[key] = value.slice(0, 4000);
  }
  return clean;
}
