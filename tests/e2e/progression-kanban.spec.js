const { test, expect } = require("@playwright/test");

const SESSION_KEY = "spokes-goal-session-v1";
const LESSON_ID = "spokes-goal-journey-v1";
const TEACHER_KEY = "spokes-teacher-demo";

function uniqueStudentId(prefix) {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${stamp}-${random}`;
}

async function registerStudent(request, prefix) {
  const studentId = uniqueStudentId(prefix);
  const displayName = `E2E ${studentId}`;
  const passcode = "abc12345";

  const response = await request.post("/api/auth/register", {
    data: { studentId, displayName, passcode }
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();

  return {
    studentId,
    displayName,
    token: payload.token
  };
}

async function putDraft(request, token, responses) {
  const response = await request.put(`/api/drafts/${LESSON_ID}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      responses
    }
  });
  expect(response.ok()).toBeTruthy();
}

async function setSession(page, session) {
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: SESSION_KEY, value: session });
}

test.describe("Progression Gates + Kanban", () => {
  test("new student unlocks weekly after BHAG/monthly and 5 check-ins", async ({ page, request }) => {
    test.setTimeout(90_000);

    const account = await registerStudent(request, "gate");
    await setSession(page, {
      token: account.token,
      studentId: account.studentId,
      displayName: account.displayName
    });

    await page.goto("/lesson");

    const bhagCard = page.locator("#prompt-bhag");
    const monthlyCard = page.locator("#prompt-monthly");
    const weeklyCard = page.locator("#prompt-weekly");

    await expect(bhagCard).not.toHaveClass(/locked/);
    await expect(monthlyCard).toHaveClass(/locked/);
    await expect(weeklyCard).toHaveClass(/locked/);

    await page.fill("#bhag", "Secure a full-time entry-level job in software support.");
    await page.click(".level-up-btn[data-target='bhag']");
    await expect(monthlyCard).not.toHaveClass(/locked/);

    await page.evaluate(() => {
      window.scrollTo(0, Math.floor(document.body.scrollHeight * 0.26));
    });
    await expect(monthlyCard).toHaveAttribute("aria-hidden", "false");
    await page.fill("#monthly", "Submit 10 targeted applications and complete 2 mock interviews.");
    await page.click(".level-up-btn[data-target='monthly']");
    await expect(weeklyCard).toHaveClass(/locked/);

    await page.goto("/lesson?panel=mission");
    await expect(page.locator("#mcDTop")).toBeVisible();

    for (let i = 1; i <= 5; i += 1) {
      await dismissReviewModalIfOpen(page);
      await page.fill("#mcDTop", `Gate test task ${i}`);
      await page.selectOption("#mcDStatus", "Done");
      await page.fill("#mcDMin", "25");
      await page.fill("#mcDComment", `check-in-${i}`);
      await submitDailyEntryWithModalGuard(page);
      await expect(page.locator("#mcDailyList")).toContainText(`Gate test task ${i}`);
    }

    await page.reload();
    await expect(page.locator("#prompt-weekly")).not.toHaveClass(/locked/);
  });

  test("level-4 student can edit/drag tasks and archive on Done drop", async ({ page, request }) => {
    const account = await registerStudent(request, "kanban");
    await putDraft(request, account.token, {
      bhag: "Become employed in IT support.",
      monthly: "Finish interview prep and submit applications.",
      weekly: "Complete interview practice sessions this week."
    });

    const overrideResponse = await request.post(`/api/teacher/students/${encodeURIComponent(account.studentId)}/override`, {
      headers: { "x-teacher-key": TEACHER_KEY },
      data: {
        action: "unlock_level",
        target: "4",
        reason: "E2E Kanban access"
      }
    });
    expect(overrideResponse.ok()).toBeTruthy();

    await setSession(page, {
      token: account.token,
      studentId: account.studentId,
      displayName: account.displayName
    });

    await page.goto("/lesson?panel=mission");
    await expect(page.locator("#mcTodo .mc-task-add[data-status='Blocked']")).toBeVisible();
    await expect(page.locator("#mcTodo .mc-task-add[data-status='Blocked']")).toBeEnabled({ timeout: 20_000 });

    await page.click("#mcTodo .mc-task-add[data-status='Blocked']");
    const editor = page.locator("#mcTodo .mc-task.editing").first();
    await expect(editor).toBeVisible();

    await editor.locator("[data-task-field='top']").fill("Complete interview prep packet");
    await editor.locator("[data-task-field='minutes']").fill("40");
    await editor.locator("[data-task-field='goalRef']").fill("Weekly: Complete interview practice sessions this week.");
    await editor.locator("[data-task-field='comment']").fill("Prepared STAR examples.");
    await editor.locator("[data-task-action='save']").click();

    const todoCard = page.locator("#mcTodo .mc-task", { hasText: "Complete interview prep packet" }).first();
    await expect(todoCard).toBeVisible();
    await expect(todoCard.locator(".mc-goal-ref")).toContainText("Weekly:");

    await todoCard.dragTo(page.locator("#mcProgress"));
    const progressCard = page.locator("#mcProgress .mc-task", { hasText: "Complete interview prep packet" }).first();
    await expect(progressCard).toBeVisible();

    await progressCard.dragTo(page.locator("#mcTodo"));
    const backToTodo = page.locator("#mcTodo .mc-task", { hasText: "Complete interview prep packet" }).first();
    await expect(backToTodo).toBeVisible();

    await backToTodo.dragTo(page.locator("#mcDone"));
    await expect(page.locator("#mcTodo .mc-task", { hasText: "Complete interview prep packet" }).first()).toHaveCount(0);
    await page.click(".mc-tab[data-tab='archive']");
    const archivedCard = page.locator("#mcArchiveList .mc-task", { hasText: "Complete interview prep packet" }).first();
    await expect(archivedCard).toBeVisible();

    await archivedCard.locator(".mc-task-close").click();
    await expect(page.locator("#mcDeleteModal")).toHaveAttribute("open", "");
    await page.click("#mcDeleteNo");
    await expect(archivedCard).toBeVisible();

    await archivedCard.locator(".mc-task-close").click();
    await page.click("#mcDeleteYes");
    await expect(page.locator("#mcArchiveList .mc-task", { hasText: "Complete interview prep packet" }).first()).toHaveCount(0);
  });

  test("export snapshot downloads PDF report", async ({ page, request }) => {
    const account = await registerStudent(request, "export");
    await setSession(page, {
      token: account.token,
      studentId: account.studentId,
      displayName: account.displayName
    });

    await page.goto("/lesson?panel=mission");
    const downloadPromise = page.waitForEvent("download");
    await page.click("#mcExport");
    const download = await downloadPromise;
    expect(download.suggestedFilename().toLowerCase()).toContain(".pdf");
  });
});

async function dismissReviewModalIfOpen(page) {
  const modal = page.locator("#mcReviewModal");
  const isOpen = await modal.evaluate((el) => el.hasAttribute("open")).catch(() => false);
  if (!isOpen) {
    return;
  }

  const dismiss = page.locator("#mcReviewDismiss");
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
    return;
  }

  await page.keyboard.press("Escape").catch(() => {});
}

async function submitDailyEntryWithModalGuard(page) {
  const submit = page.locator("#mcDailyForm button[type='submit']");
  await dismissReviewModalIfOpen(page);
  try {
    await submit.click({ timeout: 10_000 });
  } catch (error) {
    const message = String(error?.message || "");
    if (!message.includes("intercepts pointer events")) {
      throw error;
    }
    await dismissReviewModalIfOpen(page);
    await submit.click({ timeout: 10_000 });
  }
}
