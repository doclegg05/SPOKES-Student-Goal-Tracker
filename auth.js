const SESSION_STORAGE_KEY = "spokes-goal-session-v1";
const LESSON_PATH = "/lesson";

const registerModeButton = document.getElementById("registerModeButton");
const loginModeButton = document.getElementById("loginModeButton");
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const googleOAuthButton = document.getElementById("googleOAuthButton");
const authStatus = document.getElementById("authStatus");
const continuePanel = document.getElementById("continuePanel");
const continueText = document.getElementById("continueText");
const continueButton = document.getElementById("continueButton");
const signOutButton = document.getElementById("signOutButton");

let activeMode = "register";

function setStatus(message, tone = "neutral") {
  if (!authStatus) {
    return;
  }

  authStatus.textContent = message;
  authStatus.dataset.tone = tone;
}

function switchMode(mode) {
  const resolvedMode = mode === "login" ? "login" : "register";
  activeMode = resolvedMode;

  if (registerForm) {
    registerForm.classList.toggle("hidden", resolvedMode !== "register");
  }
  if (loginForm) {
    loginForm.classList.toggle("hidden", resolvedMode !== "login");
  }
  if (registerModeButton) {
    registerModeButton.classList.toggle("active", resolvedMode === "register");
  }
  if (loginModeButton) {
    loginModeButton.classList.toggle("active", resolvedMode === "login");
  }
}

function setAuthBusy(isBusy) {
  const forms = [registerForm, loginForm];
  for (const form of forms) {
    if (!form) {
      continue;
    }
    const controls = form.querySelectorAll("input, button");
    for (const control of controls) {
      control.disabled = isBusy;
    }
  }

  if (googleOAuthButton) {
    googleOAuthButton.disabled = isBusy || googleOAuthButton.dataset.enabled === "false";
  }
}

function readSessionFromStorage() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const token = typeof parsed?.token === "string" ? parsed.token : "";
    const studentId = typeof parsed?.studentId === "string" ? parsed.studentId.trim() : "";
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
    return null;
  }
}

function clearSessionStorage() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.warn("Could not clear session storage.", error);
  }
}

function saveSession(session) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn("Could not persist session storage.", error);
  }
}

function buildSessionFromAuthPayload(payload) {
  const token = typeof payload?.token === "string" ? payload.token : "";
  const studentId = typeof payload?.student?.studentId === "string"
    ? payload.student.studentId.trim()
    : "";
  const displayName = typeof payload?.student?.displayName === "string"
    ? payload.student.displayName.trim()
    : "";

  if (!token || !studentId) {
    throw new Error("Invalid authentication payload.");
  }

  return {
    token,
    studentId,
    displayName: displayName || studentId
  };
}

function setContinueSession(session) {
  if (!continuePanel) {
    return;
  }

  continuePanel.classList.remove("hidden");
  if (continueText) {
    const name = session.displayName || session.studentId;
    continueText.textContent = `Signed in as ${name}. Continue where you left off.`;
  }
}

function hideContinueSession() {
  if (!continuePanel) {
    return;
  }

  continuePanel.classList.add("hidden");
}

async function apiFetch(path, { method = "GET", body = null, token = null } = {}) {
  const headers = {
    Accept: "application/json"
  };

  if (body !== null) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      cache: "no-store",
      body: body !== null ? JSON.stringify(body) : undefined
    });
  } catch (error) {
    throw new Error("Could not reach the authentication server.");
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
      : `Authentication request failed (${response.status}).`;
    throw new Error(message);
  }

  return payload;
}

async function validateSession(session) {
  if (!session?.token) {
    return null;
  }

  try {
    const payload = await apiFetch("/api/auth/session", {
      method: "GET",
      token: session.token
    });

    const studentId = typeof payload?.student?.studentId === "string"
      ? payload.student.studentId.trim()
      : "";
    if (!studentId) {
      return null;
    }

    return {
      token: session.token,
      studentId,
      displayName: typeof payload?.student?.displayName === "string" && payload.student.displayName.trim()
        ? payload.student.displayName.trim()
        : studentId
    };
  } catch (error) {
    return null;
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  if (!registerForm) {
    return;
  }

  const studentId = registerForm.querySelector("#registerStudentId")?.value || "";
  const displayName = registerForm.querySelector("#registerDisplayName")?.value || "";
  const passcode = registerForm.querySelector("#registerPasscode")?.value || "";
  const confirm = registerForm.querySelector("#registerPasscodeConfirm")?.value || "";

  if (passcode !== confirm) {
    setStatus("Passcode and confirmation do not match.", "error");
    return;
  }

  setAuthBusy(true);
  setStatus("Creating account...", "neutral");

  try {
    const payload = await apiFetch("/api/auth/register", {
      method: "POST",
      body: {
        studentId,
        displayName,
        passcode
      }
    });

    const session = buildSessionFromAuthPayload(payload);
    saveSession(session);
    setStatus("Account created. Entering lesson...", "success");
    window.location.assign(LESSON_PATH);
  } catch (error) {
    setStatus(error.message || "Could not create account.", "error");
  } finally {
    setAuthBusy(false);
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  if (!loginForm) {
    return;
  }

  const studentId = loginForm.querySelector("#loginStudentId")?.value || "";
  const passcode = loginForm.querySelector("#loginPasscode")?.value || "";

  setAuthBusy(true);
  setStatus("Signing in...", "neutral");

  try {
    const payload = await apiFetch("/api/auth/login", {
      method: "POST",
      body: {
        studentId,
        passcode
      }
    });

    const session = buildSessionFromAuthPayload(payload);
    saveSession(session);
    setStatus("Signed in. Entering lesson...", "success");
    window.location.assign(LESSON_PATH);
  } catch (error) {
    setStatus(error.message || "Could not sign in.", "error");
  } finally {
    setAuthBusy(false);
  }
}

async function initializeOAuthButton() {
  if (!googleOAuthButton) {
    return;
  }

  try {
    const payload = await apiFetch("/api/auth/providers", { method: "GET" });
    const googleEnabled = Boolean(payload?.providers?.google?.enabled);
    googleOAuthButton.dataset.enabled = googleEnabled ? "true" : "false";
    googleOAuthButton.disabled = !googleEnabled;

    if (!googleEnabled) {
      googleOAuthButton.textContent = "Google OAuth Not Configured";
    }
  } catch (error) {
    googleOAuthButton.dataset.enabled = "false";
    googleOAuthButton.disabled = true;
    googleOAuthButton.textContent = "OAuth Status Unavailable";
  }
}

function handleGoogleOAuth() {
  if (!googleOAuthButton || googleOAuthButton.dataset.enabled !== "true") {
    setStatus("Google OAuth is not configured yet on this server.", "error");
    return;
  }

  window.location.assign(`/api/auth/oauth/google/start?returnTo=${encodeURIComponent(LESSON_PATH)}`);
}

async function restoreExistingSession() {
  const existingSession = readSessionFromStorage();
  if (!existingSession) {
    hideContinueSession();
    return null;
  }

  const validatedSession = await validateSession(existingSession);
  if (!validatedSession) {
    clearSessionStorage();
    hideContinueSession();
    return null;
  }

  saveSession(validatedSession);
  setContinueSession(validatedSession);
  return validatedSession;
}

function bindEvents() {
  registerModeButton?.addEventListener("click", () => {
    switchMode("register");
    setStatus("Create a new student account to begin.", "neutral");
  });

  loginModeButton?.addEventListener("click", () => {
    switchMode("login");
    setStatus("Sign in to continue your saved work.", "neutral");
  });

  registerForm?.addEventListener("submit", handleRegisterSubmit);
  loginForm?.addEventListener("submit", handleLoginSubmit);
  googleOAuthButton?.addEventListener("click", handleGoogleOAuth);

  continueButton?.addEventListener("click", () => {
    window.location.assign(LESSON_PATH);
  });

  signOutButton?.addEventListener("click", () => {
    clearSessionStorage();
    hideContinueSession();
    setStatus("Signed out. You can register a new user or sign back in.", "neutral");
  });
}

async function initAuthPage() {
  bindEvents();
  switchMode(activeMode);
  setAuthBusy(false);

  const params = new URLSearchParams(window.location.search);
  if (params.get("loggedOut") === "1") {
    setStatus("Signed out successfully.", "neutral");
  }

  await initializeOAuthButton();

  const session = await restoreExistingSession();
  if (session) {
    setStatus("Session restored. Continue to resume your goal draft.", "success");
  } else {
    setStatus("Register or sign in to access your saved goal journey.", "neutral");
  }
}

initAuthPage();
