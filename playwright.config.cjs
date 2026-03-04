const path = require("path");
const { defineConfig, devices } = require("@playwright/test");

const PORT = 8788;
const HOST = "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;
const E2E_DATA_FILE = path.join(__dirname, "data", "student-goals.e2e.json");

module.exports = defineConfig({
  testDir: path.join(__dirname, "tests", "e2e"),
  timeout: 45_000,
  expect: {
    timeout: 10_000
  },
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: "node server.js",
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      HOST,
      PORT: String(PORT),
      SPOKES_DATA_FILE: E2E_DATA_FILE,
      SPOKES_TOKEN_SECRET: "spokes-e2e-secret",
      SPOKES_TEACHER_KEY: "spokes-teacher-demo"
    }
  },
  globalSetup: require.resolve("./tests/global-setup.cjs"),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});

