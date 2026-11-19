import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const isLocal = /localhost|127\.0\.0\.1/.test(baseURL);

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  // One account, one inbox: run serially so sign-in emails don't collide.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: "retain-on-failure",
    timezoneId: "America/St_Kitts",
    storageState: process.env.E2E_STORAGE_STATE || undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: isLocal
    ? { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 }
    : undefined,
});
