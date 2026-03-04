export const CORE_PROMPT_KEYS = [
  "bhag",
  "monthly",
  "weekly",
  "daily",
  "tasks"
];

export const GROWTH_PROMPT_KEYS = [
  "why_matters",
  "barrier_id",
  "if_then_plan",
  "evidence",
  "support",
  "deadline"
];

const LEGACY_CORE_FALLBACKS = {
  bhag: ["vision_goal"],
  monthly: ["smart_goal", "monthly_actions"],
  weekly: ["weekly_actions"],
  daily: ["daily_habit"],
  tasks: ["tasks"]
};

const LEGACY_GROWTH_FALLBACKS = {
  why_matters: ["why_goal"],
  barrier_id: ["likely_barrier"],
  if_then_plan: ["if_then_plan"],
  evidence: ["evidence_of_progress"],
  support: ["support_person"],
  deadline: ["deadline_commitment"]
};

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstNonEmpty(responses, keys) {
  for (const key of keys) {
    const value = text(responses?.[key]);
    if (value) {
      return value;
    }
  }
  return "";
}

function splitLegacyItems(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .replaceAll("•", "\n")
    .split(/\n|;|,(?=\s*[A-Za-z])/g)
    .map((item) => item.replace(/^\s*[-*\d.)]+\s*/, "").trim())
    .filter(Boolean);
}

function buildLegacyTasksSeed(responses) {
  const parts = [
    ...splitLegacyItems(responses?.monthly_actions),
    ...splitLegacyItems(responses?.weekly_actions),
    ...splitLegacyItems(responses?.daily_habit)
  ];

  const deduped = [];
  const seen = new Set();

  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(part);
    if (deduped.length >= 8) {
      break;
    }
  }

  if (!deduped.length) {
    return "";
  }

  return deduped.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

export function readCorePromptResponses(responses = {}) {
  const out = {};

  for (const key of CORE_PROMPT_KEYS) {
    const direct = text(responses[key]);
    if (direct) {
      out[key] = direct;
      continue;
    }

    const fallbackKeys = LEGACY_CORE_FALLBACKS[key] || [];
    out[key] = firstNonEmpty(responses, fallbackKeys);
  }

  if (!out.tasks) {
    out.tasks = buildLegacyTasksSeed(responses);
  }

  return out;
}

export function readGrowthPromptResponses(responses = {}) {
  const out = {};

  for (const key of GROWTH_PROMPT_KEYS) {
    const direct = text(responses[key]);
    if (direct) {
      out[key] = direct;
      continue;
    }

    const fallbackKeys = LEGACY_GROWTH_FALLBACKS[key] || [];
    out[key] = firstNonEmpty(responses, fallbackKeys);
  }

  return out;
}

export function readPromptResponses(responses = {}) {
  return {
    ...readCorePromptResponses(responses),
    ...readGrowthPromptResponses(responses)
  };
}

export function getCorePromptCompletion(responses = {}) {
  const core = readCorePromptResponses(responses);
  const completed = CORE_PROMPT_KEYS.filter((key) => text(core[key]).length > 0).length;
  const total = CORE_PROMPT_KEYS.length;
  const ratio = total > 0 ? completed / total : 0;

  return { completed, total, ratio, core };
}

export function withCanonicalCoreResponses(responses = {}) {
  const merged = { ...(responses || {}) };
  const mapped = readCorePromptResponses(responses);

  for (const key of CORE_PROMPT_KEYS) {
    const existing = text(merged[key]);
    if (!existing && mapped[key]) {
      merged[key] = mapped[key];
    }
  }

  return merged;
}

