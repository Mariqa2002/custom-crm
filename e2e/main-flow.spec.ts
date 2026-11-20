import { expect, test, type Page } from "@playwright/test";

// Main flow: sign in → Dashboard → Plan my day → add and tick a task → calendar → Generate report.
//
// Local:      npm run db:reset && npm run test:e2e
//             (signs in as the local seed user)
// Production: sign in once and save the session, then point the test at it:
//             npx playwright codegen --save-storage=e2e/.auth/prod.json https://YOUR-APP
//             E2E_BASE_URL=https://YOUR-APP E2E_STORAGE_STATE=e2e/.auth/prod.json npm run test:e2e

const EMAIL = process.env.E2E_EMAIL ?? "mariqa@local.test";
// Local seed password (supabase/seed.sql). Never put a real password here; pass E2E_PASSWORD instead.
const PASSWORD = process.env.E2E_PASSWORD ?? "local-dev-only-123";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test("sign in, plan the day, tick a task, open the calendar, generate the report", async ({ page }, info) => {
  if (!process.env.E2E_STORAGE_STATE) await signIn(page);
  else await page.goto("/");

  // Dashboard
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Good (morning|afternoon|evening)/);
  await expect(page.getByText("Transition progress")).toBeVisible();

  // Plan my day → Today
  await page.getByRole("link", { name: "Plan my day" }).click();
  await expect(page).toHaveURL(/\/today$/, { timeout: 30_000 }); // dev server compiles on first visit

  // Today only lists that day's tasks, so add one for today
  const title = `E2E check ${Date.now()}`;
  await page.getByLabel("Add a task for today").fill(title);
  await page.getByRole("button", { name: "Add task" }).click();
  const box = page.getByRole("checkbox", { name: `Mark "${title}" done`, exact: true });
  await expect(box).toBeVisible();

  // The sidebar's Today count updates without a reload (optimistic cache)
  if (info.project.name === "desktop") {
    await expect(page.getByRole("link", { name: /^Today, \d+ open tasks$/ })).toBeVisible();
  }

  // Tick it, then untick (the label flips, so click and assert on the new label)
  await box.click();
  await expect(page.getByRole("checkbox", { name: `Mark "${title}" not done` })).toBeChecked();
  await page.getByRole("checkbox", { name: `Mark "${title}" not done` }).click();
  await expect(page.getByRole("checkbox", { name: `Mark "${title}" done` })).not.toBeChecked();
  await page.waitForLoadState("networkidle"); // let the save finish before moving on

  // The Today button opens the calendar; picking a day goes back to that day's list
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Calendar");
  await page.getByRole("button", { name: /, today, \d+ items?$/ }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Today");

  // Generate report (from the Dashboard button)
  await page.goto("/");
  await page.getByRole("link", { name: "Generate report" }).click();
  await expect(page).toHaveURL(/\/reports/, { timeout: 30_000 });
  await expect(page.getByRole("article", { name: "Report preview" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("article", { name: "Report preview" })).toContainText("Weekly Progress Report — Web Developer");
});
