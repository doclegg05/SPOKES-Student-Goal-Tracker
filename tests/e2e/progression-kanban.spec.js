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

/**
 * Scroll an input into view and enable it for testing.
 * The app uses a RAF-based scroll-to-opacity system that sets `disabled`
 * on inputs in cards below the opacity threshold. In headless Playwright,
 * scrollProgress stays at 0 (no scroll range available), so we enable
 * the element directly via the DOM to allow interaction while still
 * testing the progression/lock logic correctly.
 */
async function scrollAndFill(page, selector, text) {
  const locator = page.locator(selector);
  await locator.scrollIntoViewIfNeeded();
  // Set value directly in DOM and register it with the controller's model.
  // The app uses a scroll-based opacity system that disables inputs in headless
  // Playwright (no real scroll range). We bypass this for input only, while still
  // testing the progression/lock logic via the controller.
  await locator.evaluate(async (el, value) => {
    el.disabled = false;
    el.value = value;
    // Directly call the controller's handleGoalInput to update the model
    const key = el.dataset.goalKey || "";
    if (window._spokesController && key) {
      window._spokesController.handleGoalInput({ key, value });
    }
  }, text);
}

test.describe("Progression Gates + Kanban", () => {
  test("new student unlocks weekly directly after monthly", async ({ page, request }) => {
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

    await scrollAndFill(page, "#bhag", "Secure a full-time entry-level job in software support this year.");
    await page.evaluate(() => window._spokesController?.handleLevelUp("bhag"));
    await expect(monthlyCard).not.toHaveClass(/locked/);

    await scrollAndFill(page, "#monthly", "Submit 10 targeted applications and complete 2 mock interviews.");
    await page.evaluate(() => window._spokesController?.handleLevelUp("monthly"));
    
    await expect(weeklyCard).not.toHaveClass(/locked/);

    await scrollAndFill(page, "#weekly", "Complete 2 mock interviews and review my resume this week.");
    await page.evaluate(() => window._spokesController?.handleLevelUp("weekly"));

    const dailyCard = page.locator("#prompt-daily");
    await expect(dailyCard).not.toHaveClass(/locked/);

    await expect(page.locator("#mcDTop")).toBeVisible();
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