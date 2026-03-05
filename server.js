const http = require("http");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const crypto = require("crypto");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8787);
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const DATA_FILE = process.env.SPOKES_DATA_FILE
  ? path.resolve(process.env.SPOKES_DATA_FILE)
  : path.join(DATA_DIR, "student-goals.json");

const TOKEN_SECRET = process.env.SPOKES_TOKEN_SECRET || "spokes-dev-secret-change-me";
const TEACHER_KEY = process.env.SPOKES_TEACHER_KEY || "spokes-teacher-demo";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const SESSION_STORAGE_KEY = "spokes-goal-session-v1";
const SHARED_LESSON_ID = "spokes-goal-journey-v1";
const WORKSPACE_PREFIX = "__mc_";
const REQUIRED_PROMPT_KEYS = [
  "bhag",
  "monthly",
  "weekly",
  "daily",
  "tasks"
];
const GROWTH_PROMPT_KEYS = [
  "why_matters",
  "barrier_id",
  "if_then_plan",
  "evidence",
  "support",
  "deadline"
];

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";
const GOOGLE_ALLOWED_DOMAIN = String(process.env.GOOGLE_ALLOWED_DOMAIN || "").trim().toLowerCase();
const IS_PROD = String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

const EMPTY_STORE = {
  students: {},
  drafts: {}
};

let store = { ...EMPTY_STORE };
let persistChain = Promise.resolve();
const oauthStateStore = new Map();

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

function sendTextHtml(res, statusCode, html) {
  setCorsHeaders(res);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeStudentId(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9@._-]/g, "");
}

function normalizeLessonId(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

function normalizeDisplayName(value, fallback) {
  const cleaned = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return fallback;
  }
  return cleaned.slice(0, 80);
}

function sanitizeReturnTo(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "/lesson";
  }
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return "/lesson";
  }
  return raw;
}

function hashPasscode(passcode, salt) {
  return crypto.pbkdf2Sync(passcode, salt, 120000, 32, "sha256").toString("hex");
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function parseBase64Url(input) {
  const padded = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function signToken(studentId) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    sub: studentId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  }));
  const content = `${header}.${payload}`;
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(content)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `${content}.${signature}`;
}

function verifyToken(token) {
  if (typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [header, payload, signature] = parts;
  const content = `${header}.${payload}`;
  const expectedSignature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(content)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  const safeExpected = Buffer.from(expectedSignature);
  const safeSignature = Buffer.from(signature);
  if (safeExpected.length !== safeSignature.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(safeExpected, safeSignature)) {
    return null;
  }

  let payloadObject;
  try {
    payloadObject = JSON.parse(parseBase64Url(payload));
  } catch (error) {
    return null;
  }

  const expiresAt = Number(payloadObject?.exp);
  const studentId = normalizeStudentId(payloadObject?.sub);

  if (!studentId || !Number.isFinite(expiresAt)) {
    return null;
  }

  if (Math.floor(Date.now() / 1000) >= expiresAt) {
    return null;
  }

  return { studentId };
}

function parseBearerToken(req) {
  const authHeader = String(req.headers.authorization || "");
  if (!authHeader.startsWith("Bearer ")) {
    return "";
  }
  return authHeader.slice("Bearer ".length).trim();
}

function sanitizeResponses(rawResponses) {
  if (!rawResponses || typeof rawResponses !== "object") {
    return {};
  }

  const responses = {};
  const entries = Object.entries(rawResponses).slice(0, 64);

  for (const [rawKey, rawValue] of entries) {
    if (typeof rawKey !== "string") {
      continue;
    }

    const key = rawKey.trim();
    if (!key) {
      continue;
    }

    const value = typeof rawValue === "string" ? rawValue : String(rawValue ?? "");
    responses[key] = value.slice(0, 4000);
  }

  return responses;
}

function ensureStoreShape(candidate) {
  const safeStore = {
    students: {},
    drafts: {}
  };

  if (!candidate || typeof candidate !== "object") {
    return safeStore;
  }

  if (candidate.students && typeof candidate.students === "object") {
    safeStore.students = candidate.students;
  }
  if (candidate.drafts && typeof candidate.drafts === "object") {
    safeStore.drafts = candidate.drafts;
  }

  return safeStore;
}

async function loadStore() {
  await fsp.mkdir(DATA_DIR, { recursive: true });

  try {
    const raw = await fsp.readFile(DATA_FILE, "utf8");
    store = ensureStoreShape(JSON.parse(raw));
  } catch (error) {
    if (error.code === "ENOENT") {
      store = { ...EMPTY_STORE };
      await persistStore();
      return;
    }
    throw error;
  }
}

function persistStore() {
  persistChain = persistChain.then(async () => {
    const tempFile = `${DATA_FILE}.tmp`;
    const payload = JSON.stringify(store, null, 2);
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.writeFile(tempFile, payload, "utf8");
    await fsp.rename(tempFile, DATA_FILE);
  }).catch((error) => {
    console.error("Persist error:", error);
  });

  return persistChain;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let received = 0;
    const maxBytes = 1_000_000;

    req.on("data", (chunk) => {
      received += chunk.length;
      if (received > maxBytes) {
        reject(new Error("Request too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON payload."));
      }
    });

    req.on("error", () => {
      reject(new Error("Request body read failed."));
    });
  });
}

function requireAuth(req, res) {
  const token = parseBearerToken(req);
  const claims = verifyToken(token);
  if (!claims) {
    sendError(res, 401, "Authentication required.");
    return null;
  }

  if (!store.students[claims.studentId]) {
    sendError(res, 401, "Session no longer valid.");
    return null;
  }

  return claims;
}

function parseTeacherKey(req, searchParams) {
  const headerKey = String(req.headers["x-teacher-key"] || "").trim();
  if (headerKey) {
    return { value: headerKey, source: "header" };
  }
  const queryKey = String(searchParams.get("teacherKey") || "").trim();
  return { value: queryKey, source: queryKey ? "query" : "" };
}

function requireTeacherAccess(req, res, searchParams) {
  const keyInfo = parseTeacherKey(req, searchParams);
  const provided = keyInfo.value;
  if (!provided || provided !== TEACHER_KEY) {
    sendError(res, 401, "Instructor access denied.");
    return false;
  }
  if (keyInfo.source === "query") {
    res.setHeader("Warning", "299 - Query-string teacher keys are deprecated. Send x-teacher-key header.");
  }
  return true;
}

function decodeMissionWorkspaceState(responses) {
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
    const key = prefix === "__" ? `__chunk_${index}` : `__mc_chunk_${index}`;
    const part = responses[key];
    if (typeof part !== "string") {
      return null;
    }
    raw += part;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function defaultProgressionState() {
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

function parseProgressionState(responses, workspace) {
  const fromWorkspace = workspace && typeof workspace.progression === "object"
    ? workspace.progression
    : null;

  let fromResponses = null;
  if (typeof responses?.progression_state === "string") {
    try {
      fromResponses = JSON.parse(responses.progression_state);
    } catch (_error) {
      fromResponses = null;
    }
  }

  const input = fromWorkspace || fromResponses || {};
  const base = defaultProgressionState();
  base.level = Math.max(1, Math.min(5, Number.parseInt(String(input.level || 1), 10) || 1));
  base.xp = Math.max(0, Number.parseInt(String(input.xp || 0), 10) || 0);
  base.currentStreak = Math.max(0, Number.parseInt(String(input.currentStreak || 0), 10) || 0);
  base.longestStreak = Math.max(base.currentStreak, Number.parseInt(String(input.longestStreak || 0), 10) || 0);
  base.completedPrompts = Array.isArray(input.completedPrompts)
    ? [...new Set(input.completedPrompts.map((key) => String(key || "").trim()))]
    : [];

  if (input.phase2Prompts && typeof input.phase2Prompts === "object") {
    for (const key of GROWTH_PROMPT_KEYS) {
      const value = String(input.phase2Prompts[key] || "").trim();
      if (value) {
        base.phase2Prompts[key] = value;
      }
    }
  }

  if (Array.isArray(input.overrideAudit)) {
    base.overrideAudit = input.overrideAudit.slice(-120);
  }

  return base;
}

function computePromptCompletion(responses) {
  if (!responses || typeof responses !== "object") {
    return { completed: 0, total: REQUIRED_PROMPT_KEYS.length, ratio: 0 };
  }

  const text = (value) => (typeof value === "string" ? value.trim() : "");
  const first = (keys) => {
    for (const key of keys) {
      const value = text(responses[key]);
      if (value) {
        return value;
      }
    }
    return "";
  };

  const splitLegacyItems = (value) => {
    return String(value || "")
      .replace(/\r/g, "\n")
      .replaceAll("•", "\n")
      .split(/\n|;|,(?=\s*[A-Za-z])/g)
      .map((item) => item.replace(/^\s*[-*\d.)]+\s*/, "").trim())
      .filter(Boolean);
  };

  const legacyTaskSeed = () => {
    const parts = [
      ...splitLegacyItems(responses.monthly_actions),
      ...splitLegacyItems(responses.weekly_actions),
      ...splitLegacyItems(responses.daily_habit)
    ];
    return parts.length ? parts.join("\n") : "";
  };

  const canonicalValue = (key) => {
    const direct = text(responses[key]);
    if (direct) {
      return direct;
    }

    if (key === "bhag") {
      return first(["vision_goal"]);
    }
    if (key === "monthly") {
      return first(["smart_goal", "monthly_actions"]);
    }
    if (key === "weekly") {
      return first(["weekly_actions"]);
    }
    if (key === "daily") {
      return first(["daily_habit"]);
    }
    if (key === "tasks") {
      return first(["tasks"]) || legacyTaskSeed();
    }
    return "";
  };

  const completed = REQUIRED_PROMPT_KEYS.filter((key) => {
    const value = canonicalValue(key);
    return value.length > 0;
  }).length;

  const total = REQUIRED_PROMPT_KEYS.length;
  const ratio = total > 0 ? completed / total : 0;

  return { completed, total, ratio };
}

function buildTeacherRows() {
  const rows = [];

  for (const draft of Object.values(store.drafts || {})) {
    if (!draft || draft.lessonId !== SHARED_LESSON_ID) {
      continue;
    }

    const studentId = normalizeStudentId(draft.studentId);
    if (!studentId) {
      continue;
    }

    const student = store.students[studentId];
    const responses = draft.responses && typeof draft.responses === "object" ? draft.responses : {};
    const prompt = computePromptCompletion(responses);
    const workspace = decodeMissionWorkspaceState(responses);
    const progression = parseProgressionState(responses, workspace);

    const dailyEntries = Array.isArray(workspace?.daily) ? workspace.daily : [];
    const monthlyGoals = Array.isArray(workspace?.monthly) ? workspace.monthly : [];
    const visionItems = Array.isArray(workspace?.vision?.items) ? workspace.vision.items : [];

    const dailyDone = dailyEntries.filter((entry) => {
      const status = String(entry?.status || "").toLowerCase().trim();
      return status === "done" || status === "complete" || status === "completed";
    }).length;

    const smartReady = monthlyGoals.filter((goal) => Number(goal?.score) === 5).length;
    const checkpointsComplete = prompt.completed === prompt.total && smartReady > 0 && dailyDone > 0;
    const growthPromptsCompleted = Object.values(progression.phase2Prompts || {})
      .filter((value) => String(value || "").trim().length > 0)
      .length;

    rows.push({
      studentId,
      displayName: student?.displayName || studentId,
      authProvider: student?.authProvider || "unknown",
      updatedAt: draft.updatedAt || null,
      promptCompleted: prompt.completed,
      promptTotal: prompt.total,
      promptPercent: Math.round(prompt.ratio * 100),
      smartReady,
      smartTotal: monthlyGoals.length,
      dailyDone,
      dailyTotal: dailyEntries.length,
      visionItems: visionItems.length,
      level: progression.level,
      xp: progression.xp,
      currentStreak: progression.currentStreak,
      longestStreak: progression.longestStreak,
      corePromptsCompleted: prompt.completed,
      growthPromptsCompleted,
      checkpointsComplete
    });
  }

  rows.sort((left, right) => {
    const a = Date.parse(left.updatedAt || "");
    const b = Date.parse(right.updatedAt || "");
    const safeA = Number.isNaN(a) ? 0 : a;
    const safeB = Number.isNaN(b) ? 0 : b;
    return safeB - safeA;
  });

  return rows;
}

function stripWorkspaceResponseKeys(responses) {
  const out = {};
  for (const [key, value] of Object.entries(responses || {})) {
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
    out[key] = typeof value === "string" ? value : String(value ?? "");
  }
  return out;
}

function encodeMissionWorkspaceState(baseResponses, workspaceState) {
  const preserved = stripWorkspaceResponseKeys(baseResponses);
  const raw = JSON.stringify(workspaceState || {});
  const chunkSize = 3300;
  const chunks = [];
  for (let i = 0; i < raw.length; i += chunkSize) {
    chunks.push(raw.slice(i, i + chunkSize));
  }

  const reservedKeys = 4;
  const availableForChunks = 64 - Object.keys(preserved).length - reservedKeys;
  if (chunks.length > Math.max(0, availableForChunks)) {
    throw new Error("Workspace payload too large for sync key limits.");
  }

  const encoded = {
    ...preserved,
    [`${WORKSPACE_PREFIX}schema`]: "spokesMissionControlV2",
    [`${WORKSPACE_PREFIX}encoding`]: "chunked-json-v1",
    [`${WORKSPACE_PREFIX}chunkCount`]: String(chunks.length),
    [`${WORKSPACE_PREFIX}updatedAt`]: nowIso()
  };

  chunks.forEach((chunk, index) => {
    encoded[`${WORKSPACE_PREFIX}chunk_${index}`] = chunk;
  });

  return encoded;
}

function applyTeacherOverrideToProgression(progression, { action, target, reason, by }) {
  const next = {
    ...defaultProgressionState(),
    ...(progression || {})
  };

  next.unlockedPrompts = Array.isArray(next.unlockedPrompts)
    ? [...new Set(next.unlockedPrompts.map((key) => String(key || "").trim()))]
    : ["bhag"];
  next.completedPrompts = Array.isArray(next.completedPrompts)
    ? [...new Set(next.completedPrompts.map((key) => String(key || "").trim()))]
    : [];

  if (action === "unlock_level") {
    const forcedLevel = Math.max(1, Math.min(5, Number.parseInt(String(target || "1"), 10) || 1));
    for (const key of REQUIRED_PROMPT_KEYS.slice(0, forcedLevel)) {
      if (!next.unlockedPrompts.includes(key)) {
        next.unlockedPrompts.push(key);
      }
    }
    next.level = Math.max(Number(next.level) || 1, forcedLevel);
  } else if (action === "force_complete_prompt") {
    const promptKey = String(target || "").trim();
    if (!REQUIRED_PROMPT_KEYS.includes(promptKey)) {
      throw new Error("Invalid prompt target for force_complete_prompt.");
    }
    if (!next.completedPrompts.includes(promptKey)) {
      next.completedPrompts.push(promptKey);
    }
    const promptLevel = REQUIRED_PROMPT_KEYS.indexOf(promptKey) + 1;
    for (const key of REQUIRED_PROMPT_KEYS.slice(0, promptLevel)) {
      if (!next.unlockedPrompts.includes(key)) {
        next.unlockedPrompts.push(key);
      }
    }
    next.level = Math.max(Number(next.level) || 1, promptLevel);
  } else {
    throw new Error("Unsupported override action.");
  }

  if (!Array.isArray(next.overrideAudit)) {
    next.overrideAudit = [];
  }

  next.overrideAudit.push({
    by: String(by || "teacher"),
    at: nowIso(),
    action: String(action || ""),
    reason: String(reason || "")
  });
  next.overrideAudit = next.overrideAudit.slice(-120);

  return next;
}

function csvEscape(value) {
  const raw = String(value ?? "");
  if (!/[",\n]/.test(raw)) {
    return raw;
  }
  return `"${raw.replace(/"/g, "\"\"")}"`;
}

function isGoogleOAuthEnabled() {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

function validateSecurityConfig() {
  if (!IS_PROD) {
    return;
  }

  const insecure = [];
  if (TOKEN_SECRET === "spokes-dev-secret-change-me") {
    insecure.push("SPOKES_TOKEN_SECRET");
  }
  if (TEACHER_KEY === "spokes-teacher-demo") {
    insecure.push("SPOKES_TEACHER_KEY");
  }

  if (insecure.length) {
    throw new Error(`Refusing to start in production with insecure defaults: ${insecure.join(", ")}`);
  }
}

function resolveRequestOrigin(req) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const protocol = forwardedProto || "http";
  const host = req.headers.host || `localhost:${PORT}`;
  return `${protocol}://${host}`;
}

function resolveGoogleRedirectUri(req) {
  if (GOOGLE_REDIRECT_URI) {
    return GOOGLE_REDIRECT_URI;
  }
  return `${resolveRequestOrigin(req)}/api/auth/oauth/google/callback`;
}

function createOauthState(returnTo) {
  const state = crypto.randomBytes(18).toString("hex");
  oauthStateStore.set(state, {
    returnTo,
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS
  });
  return state;
}

function consumeOauthState(state) {
  const payload = oauthStateStore.get(state);
  if (!payload) {
    return null;
  }
  oauthStateStore.delete(state);

  if (Date.now() > payload.expiresAt) {
    return null;
  }

  return payload;
}

function cleanupExpiredOauthStates() {
  const now = Date.now();
  for (const [state, payload] of oauthStateStore.entries()) {
    if (now > payload.expiresAt) {
      oauthStateStore.delete(state);
    }
  }
}

async function exchangeGoogleAuthCode({ code, redirectUri }) {
  const body = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = typeof payload?.error_description === "string"
      ? payload.error_description
      : "OAuth token exchange failed.";
    throw new Error(message);
  }

  return payload;
}

async function fetchGoogleTokenInfo(idToken) {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    { method: "GET" }
  );
  const payload = await response.json();
  if (!response.ok) {
    const message = typeof payload?.error_description === "string"
      ? payload.error_description
      : "Could not verify Google identity token.";
    throw new Error(message);
  }
  return payload;
}

function ensureLocalStudentRecord({ studentId, displayName, passcode }) {
  if (studentId.length < 3) {
    throw new Error("Student ID must be at least 3 characters.");
  }
  if (passcode.length < 6) {
    throw new Error("Passcode must be at least 6 characters.");
  }
  if (store.students[studentId]) {
    throw new Error("Student ID already exists. Please sign in instead.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const record = {
    studentId,
    displayName: normalizeDisplayName(displayName, studentId),
    authProvider: "local",
    salt,
    passHash: hashPasscode(passcode, salt),
    createdAt: nowIso(),
    lastLoginAt: nowIso()
  };

  store.students[studentId] = record;
  return record;
}

function validateLocalStudentLogin({ studentId, passcode }) {
  const student = store.students[studentId];
  if (!student) {
    throw new Error("No account found for that Student ID.");
  }

  if (!student.passHash || !student.salt) {
    throw new Error("This account uses Google sign-in. Use OAuth instead.");
  }

  const expectedHash = hashPasscode(passcode, student.salt);
  if (expectedHash !== student.passHash) {
    throw new Error("Invalid Student ID or passcode.");
  }

  student.lastLoginAt = nowIso();
  store.students[studentId] = student;
  return student;
}

function upsertGoogleStudent({ email, displayName }) {
  const studentId = normalizeStudentId(email);
  if (!studentId) {
    throw new Error("Google account email is missing.");
  }

  const existing = store.students[studentId];
  if (existing) {
    existing.displayName = normalizeDisplayName(displayName, existing.displayName || studentId);
    existing.authProvider = existing.authProvider === "local" ? "hybrid" : "google";
    existing.lastLoginAt = nowIso();
    existing.email = email;
    store.students[studentId] = existing;
    return existing;
  }

  const record = {
    studentId,
    displayName: normalizeDisplayName(displayName, studentId),
    authProvider: "google",
    email,
    createdAt: nowIso(),
    lastLoginAt: nowIso()
  };

  store.students[studentId] = record;
  return record;
}

function buildOAuthSuccessPage({ token, studentId, displayName, returnTo }) {
  const sessionJson = JSON.stringify({
    token,
    studentId,
    displayName
  }).replace(/</g, "\\u003c");

  const safeReturnTo = JSON.stringify(sanitizeReturnTo(returnTo));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SPOKES OAuth Complete</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f1f5f9; color: #0f172a; }
    .card { background: #fff; border: 1px solid #dbeafe; border-radius: 14px; padding: 1rem 1.2rem; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12); width: min(420px, calc(100% - 2rem)); text-align: center; }
    h1 { margin: 0; font-size: 1.1rem; }
    p { margin: 0.5rem 0 0; color: #334155; font-size: 0.92rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Authentication Complete</h1>
    <p>Transferring you to the lesson...</p>
  </div>
  <script>
    try {
      localStorage.setItem("${SESSION_STORAGE_KEY}", JSON.stringify(${sessionJson}));
    } catch (error) {}
    window.location.replace(${safeReturnTo});
  </script>
</body>
</html>`;
}

function buildOAuthErrorPage(message) {
  const safeMessage = String(message || "OAuth sign-in failed.").replace(/</g, "&lt;");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SPOKES OAuth Error</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #fef2f2; color: #7f1d1d; }
    .card { background: #fff; border: 1px solid #fecaca; border-radius: 14px; padding: 1rem 1.2rem; box-shadow: 0 18px 40px rgba(127, 29, 29, 0.1); width: min(440px, calc(100% - 2rem)); }
    h1 { margin: 0; font-size: 1.1rem; }
    p { margin: 0.5rem 0 0; color: #7f1d1d; font-size: 0.92rem; line-height: 1.45; }
    a { color: #991b1b; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <h1>OAuth Sign-In Error</h1>
    <p>${safeMessage}</p>
    <p><a href="/">Return to sign in page</a></p>
  </div>
</body>
</html>`;
}

async function handleApi(req, res, pathname, searchParams) {
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, { ok: true, now: nowIso() });
    return;
  }

  if (req.method === "GET" && pathname === "/api/teacher/overview") {
    if (!requireTeacherAccess(req, res, searchParams)) {
      return;
    }

    const rows = buildTeacherRows();
    sendJson(res, 200, {
      generatedAt: nowIso(),
      lessonId: SHARED_LESSON_ID,
      count: rows.length,
      rows
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/teacher/export.csv") {
    if (!requireTeacherAccess(req, res, searchParams)) {
      return;
    }

    const rows = buildTeacherRows();
    const headers = [
      "student_id",
      "display_name",
      "auth_provider",
      "updated_at",
      "level",
      "xp",
      "current_streak",
      "longest_streak",
      "core_prompts_completed",
      "growth_prompts_completed",
      "prompt_completed",
      "prompt_total",
      "prompt_percent",
      "smart_ready",
      "smart_total",
      "daily_done",
      "daily_total",
      "vision_items",
      "checkpoints_complete"
    ];

    const lines = [headers.join(",")];
    for (const row of rows) {
      lines.push([
        csvEscape(row.studentId),
        csvEscape(row.displayName),
        csvEscape(row.authProvider),
        csvEscape(row.updatedAt || ""),
        csvEscape(row.level),
        csvEscape(row.xp),
        csvEscape(row.currentStreak),
        csvEscape(row.longestStreak),
        csvEscape(row.corePromptsCompleted),
        csvEscape(row.growthPromptsCompleted),
        csvEscape(row.promptCompleted),
        csvEscape(row.promptTotal),
        csvEscape(row.promptPercent),
        csvEscape(row.smartReady),
        csvEscape(row.smartTotal),
        csvEscape(row.dailyDone),
        csvEscape(row.dailyTotal),
        csvEscape(row.visionItems),
        csvEscape(row.checkpointsComplete ? "yes" : "no")
      ].join(","));
    }

    setCorsHeaders(res);
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=\"spokes-teacher-report-${new Date().toISOString().slice(0, 10)}.csv\"`);
    res.end(lines.join("\n"));
    return;
  }

  const teacherOverrideMatch = pathname.match(/^\/api\/teacher\/students\/([^/]+)\/override$/);
  if (req.method === "POST" && teacherOverrideMatch) {
    if (!requireTeacherAccess(req, res, searchParams)) {
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendError(res, 400, error.message);
      return;
    }

    const action = String(body?.action || "").trim();
    const target = String(body?.target || "").trim();
    const reason = String(body?.reason || "").trim();
    const allowedActions = new Set(["unlock_level", "force_complete_prompt"]);

    if (!allowedActions.has(action)) {
      sendError(res, 400, "Invalid override action.");
      return;
    }
    if (!target) {
      sendError(res, 400, "Override target is required.");
      return;
    }
    if (!reason) {
      sendError(res, 400, "Override reason is required.");
      return;
    }

    const studentId = normalizeStudentId(decodeURIComponent(teacherOverrideMatch[1] || ""));
    if (!studentId) {
      sendError(res, 400, "Invalid student identifier.");
      return;
    }

    const draftKey = `${studentId}::${SHARED_LESSON_ID}`;
    const existingDraft = store.drafts[draftKey] || {
      studentId,
      lessonId: SHARED_LESSON_ID,
      responses: {},
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    const responses = sanitizeResponses(existingDraft.responses);
    const workspace = decodeMissionWorkspaceState(responses) || {
      monthly: [],
      daily: [],
      barriers: [],
      portfolio: [],
      vision: { items: [], nextId: 1, maxZ: 0 },
      progression: defaultProgressionState(),
      meta: { updatedAt: nowIso() }
    };
    const progression = parseProgressionState(responses, workspace);

    let updatedProgression;
    try {
      updatedProgression = applyTeacherOverrideToProgression(progression, {
        action,
        target,
        reason,
        by: "teacher"
      });
    } catch (error) {
      sendError(res, 400, error.message || "Override could not be applied.");
      return;
    }

    const updatedWorkspace = {
      ...workspace,
      progression: updatedProgression,
      meta: {
        ...(workspace.meta || {}),
        updatedAt: nowIso()
      }
    };

    let encodedResponses;
    try {
      encodedResponses = encodeMissionWorkspaceState({
        ...responses,
        progression_state: JSON.stringify(updatedProgression)
      }, updatedWorkspace);
    } catch (error) {
      sendError(res, 400, error.message || "Override payload exceeds sync limits.");
      return;
    }

    store.drafts[draftKey] = {
      ...existingDraft,
      studentId,
      lessonId: SHARED_LESSON_ID,
      responses: sanitizeResponses(encodedResponses),
      updatedAt: nowIso()
    };

    await persistStore();
    sendJson(res, 200, {
      ok: true,
      studentId,
      action,
      target,
      reason,
      progression: updatedProgression
    });
    return;
  }

  const teacherResetMatch = pathname.match(/^\/api\/teacher\/students\/([^/]+)\/reset-password$/);
  if (req.method === "POST" && teacherResetMatch) {
    if (!requireTeacherAccess(req, res, searchParams)) {
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendError(res, 400, error.message);
      return;
    }

    const studentId = normalizeStudentId(decodeURIComponent(teacherResetMatch[1] || ""));
    if (!studentId) {
      sendError(res, 400, "Invalid student identifier.");
      return;
    }

    const student = store.students[studentId];
    if (!student) {
      sendError(res, 404, "Student not found.");
      return;
    }

    if (!student.passHash || !student.salt) {
      sendError(res, 400, "This account uses Google sign-in and cannot have its passcode reset.");
      return;
    }

    const newPasscode = String(body?.newPasscode ?? "").trim();
    if (newPasscode.length < 6) {
      sendError(res, 400, "New passcode must be at least 6 characters.");
      return;
    }

    const salt = crypto.randomBytes(16).toString("hex");
    student.salt = salt;
    student.passHash = hashPasscode(newPasscode, salt);
    store.students[studentId] = student;
    await persistStore();

    sendJson(res, 200, {
      ok: true,
      studentId,
      displayName: student.displayName
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/auth/providers") {
    sendJson(res, 200, {
      providers: {
        google: {
          enabled: isGoogleOAuthEnabled()
        }
      }
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/register") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendError(res, 400, error.message);
      return;
    }

    const studentId = normalizeStudentId(body?.studentId);
    const passcode = String(body?.passcode ?? "").trim();
    const displayName = body?.displayName;

    try {
      const student = ensureLocalStudentRecord({ studentId, displayName, passcode });
      await persistStore();

      sendJson(res, 200, {
        token: signToken(student.studentId),
        student: {
          studentId: student.studentId,
          displayName: student.displayName
        }
      });
      return;
    } catch (error) {
      sendError(res, 400, error.message || "Could not register account.");
      return;
    }
  }

  if (req.method === "POST" && pathname === "/api/auth/login") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendError(res, 400, error.message);
      return;
    }

    const studentId = normalizeStudentId(body?.studentId);
    const passcode = String(body?.passcode ?? "").trim();

    if (studentId.length < 3 || passcode.length < 6) {
      sendError(res, 400, "Student ID and passcode are required.");
      return;
    }

    try {
      const student = validateLocalStudentLogin({ studentId, passcode });
      await persistStore();

      sendJson(res, 200, {
        token: signToken(student.studentId),
        student: {
          studentId: student.studentId,
          displayName: student.displayName
        }
      });
      return;
    } catch (error) {
      sendError(res, 401, error.message || "Could not sign in.");
      return;
    }
  }

  if (req.method === "GET" && pathname === "/api/auth/session") {
    const claims = requireAuth(req, res);
    if (!claims) {
      return;
    }

    const student = store.students[claims.studentId];
    sendJson(res, 200, {
      student: {
        studentId: student.studentId,
        displayName: student.displayName
      }
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/auth/oauth/google/start") {
    if (!isGoogleOAuthEnabled()) {
      sendError(res, 503, "Google OAuth is not configured on this server.");
      return;
    }

    cleanupExpiredOauthStates();

    const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));
    const redirectUri = resolveGoogleRedirectUri(req);
    const state = createOauthState(returnTo);

    const authParams = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account"
    });

    setCorsHeaders(res);
    res.statusCode = 302;
    res.setHeader("Location", `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`);
    res.end();
    return;
  }

  if (req.method === "GET" && pathname === "/api/auth/oauth/google/callback") {
    const state = String(searchParams.get("state") || "");
    const code = String(searchParams.get("code") || "");
    const oauthError = String(searchParams.get("error") || "");

    if (oauthError) {
      sendTextHtml(res, 400, buildOAuthErrorPage(`Google returned: ${oauthError}`));
      return;
    }

    const statePayload = consumeOauthState(state);
    if (!statePayload) {
      sendTextHtml(res, 400, buildOAuthErrorPage("OAuth state is invalid or expired. Please try again."));
      return;
    }

    if (!code) {
      sendTextHtml(res, 400, buildOAuthErrorPage("Missing authorization code from Google."));
      return;
    }

    try {
      const redirectUri = resolveGoogleRedirectUri(req);
      const tokenPayload = await exchangeGoogleAuthCode({ code, redirectUri });
      const idToken = typeof tokenPayload?.id_token === "string" ? tokenPayload.id_token : "";

      if (!idToken) {
        throw new Error("Google did not return an id_token.");
      }

      const tokenInfo = await fetchGoogleTokenInfo(idToken);
      const email = String(tokenInfo?.email || "").trim().toLowerCase();
      const emailVerified = String(tokenInfo?.email_verified || "").toLowerCase() === "true";
      const audience = String(tokenInfo?.aud || "");

      if (!email || !emailVerified) {
        throw new Error("Google account email is missing or not verified.");
      }
      if (audience !== GOOGLE_CLIENT_ID) {
        throw new Error("Google token audience mismatch.");
      }

      if (GOOGLE_ALLOWED_DOMAIN) {
        const suffix = `@${GOOGLE_ALLOWED_DOMAIN}`;
        if (!email.endsWith(suffix)) {
          throw new Error(`Only ${GOOGLE_ALLOWED_DOMAIN} accounts are allowed.`);
        }
      }

      const displayName = normalizeDisplayName(tokenInfo?.name, email);
      const student = upsertGoogleStudent({ email, displayName });
      await persistStore();

      const token = signToken(student.studentId);
      sendTextHtml(res, 200, buildOAuthSuccessPage({
        token,
        studentId: student.studentId,
        displayName: student.displayName,
        returnTo: statePayload.returnTo
      }));
      return;
    } catch (error) {
      sendTextHtml(res, 400, buildOAuthErrorPage(error.message || "OAuth callback failed."));
      return;
    }
  }

  if (pathname.startsWith("/api/drafts/")) {
    const claims = requireAuth(req, res);
    if (!claims) {
      return;
    }

    const rawLessonId = decodeURIComponent(pathname.slice("/api/drafts/".length));
    const lessonId = normalizeLessonId(rawLessonId);
    if (!lessonId) {
      sendError(res, 400, "Invalid lesson identifier.");
      return;
    }

    const draftKey = `${claims.studentId}::${lessonId}`;
    const existingDraft = store.drafts[draftKey];

    if (req.method === "GET") {
      sendJson(res, 200, {
        draft: existingDraft || {
          studentId: claims.studentId,
          lessonId,
          responses: {},
          updatedAt: null
        }
      });
      return;
    }

    if (req.method === "PUT") {
      let body;
      try {
        body = await readJsonBody(req);
      } catch (error) {
        sendError(res, 400, error.message);
        return;
      }

      const draft = {
        studentId: claims.studentId,
        lessonId,
        responses: sanitizeResponses(body?.responses),
        createdAt: existingDraft?.createdAt || nowIso(),
        updatedAt: nowIso()
      };

      store.drafts[draftKey] = draft;
      await persistStore();
      sendJson(res, 200, { draft });
      return;
    }
  }

  sendError(res, 404, "API route not found.");
}

function mapRouteToStaticFile(pathname) {
  if (pathname === "/") {
    return "index.html";
  }

  if (pathname === "/lesson" || pathname === "/lesson/") {
    return "lesson.html";
  }

  if (pathname === "/teacher" || pathname === "/teacher/") {
    return "teacher.html";
  }

  return pathname.replace(/^\/+/, "");
}

function safeResolveStaticPath(pathname) {
  const requested = mapRouteToStaticFile(pathname);
  const normalized = path.normalize(requested);
  const absolutePath = path.resolve(ROOT_DIR, normalized);
  const relativeToRoot = path.relative(ROOT_DIR, absolutePath);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  const relativeToData = path.relative(DATA_DIR, absolutePath);
  if (!relativeToData.startsWith("..") && !path.isAbsolute(relativeToData)) {
    return null;
  }

  return absolutePath;
}

async function serveStatic(req, res, pathname) {
  const filePath = safeResolveStaticPath(pathname);
  if (!filePath) {
    sendError(res, 403, "Forbidden.");
    return;
  }

  let stat;
  try {
    stat = await fsp.stat(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendError(res, 404, "Not found.");
      return;
    }
    sendError(res, 500, "Failed to read file.");
    return;
  }

  let resolvedPath = filePath;
  if (stat.isDirectory()) {
    resolvedPath = path.join(filePath, "index.html");
    try {
      stat = await fsp.stat(resolvedPath);
    } catch (error) {
      if (error.code === "ENOENT") {
        sendError(res, 404, "Not found.");
        return;
      }
      sendError(res, 500, "Failed to read file.");
      return;
    }
  }

  const extension = path.extname(resolvedPath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";

  setCorsHeaders(res);
  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);

  const stream = fs.createReadStream(resolvedPath);
  stream.on("error", () => {
    if (!res.headersSent) {
      sendError(res, 500, "Failed to stream file.");
      return;
    }
    res.destroy();
  });
  stream.pipe(res);
}

async function requestHandler(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = requestUrl.pathname;

  if (pathname.startsWith("/api/")) {
    await handleApi(req, res, pathname, requestUrl.searchParams);
    return;
  }

  if (pathname === "/spokes-mission-control.html" || pathname === "/spokes-mission-control") {
    setCorsHeaders(res);
    res.statusCode = 302;
    res.setHeader("Location", "/lesson?panel=mission");
    res.end();
    return;
  }

  await serveStatic(req, res, pathname);
}

async function startServer({ host = HOST, port = PORT } = {}) {
  validateSecurityConfig();
  await loadStore();

  const server = http.createServer((req, res) => {
    requestHandler(req, res).catch((error) => {
      console.error("Unhandled request error:", error);
      sendError(res, 500, "Internal server error.");
    });
  });

  await new Promise((resolve) => {
    server.listen(port, host, resolve);
  });

  console.log(`SPOKES server running at http://${host}:${port}`);
  console.log(`Data file: ${DATA_FILE}`);
  console.log(`Google OAuth enabled: ${isGoogleOAuthEnabled() ? "yes" : "no"}`);

  return server;
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Could not start server:", error);
    process.exitCode = 1;
  });
}

module.exports = {
  startServer
};
