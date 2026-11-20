import { expect, test, type Page } from "@playwright/test";

// Main flow: sign in → Dashboard → Plan my day → add and tick a task → calendar → Generate report.
//
// Local:      npm run db:reset && npm run test:e2e
//             (reads the magic link from the local Mailpit inbox)
// Production: sign in once and save the session, then point the test at it:
//             npx playwright codegen --save-storage=e2e/.auth/prod.json https://YOUR-APP
//             E2E_BASE_URL=https://YOUR-APP E2E_STORAGE_STATE=e2e/.auth/prod.json npm run test:e2e

const EMAIL = process.env.E2E_EMAIL ?? "mariqa@local.test";
const MAILPIT = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:54324";

async function signInWithMagicLink(page: Page) {
  const since = Date.now();
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByRole("button", { name: /sign-in link/i }).click();
  await expect(page.getByText(/check your email/i)).toBeVisible();

  // Poll Mailpit for the newest message to this address.
  let link: string | null = null;
  for (let i = 0; i < 30 && !link; i++) {
    const res = await page.request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${EMAIL}"`)}`);
    const { messages = [] } = await res.json();
    const fresh = messages.find((m: { Created: string }) => new Date(m.Created).getTime() >= since - 2000);
    if (fresh) {
      const msg = await (await page.request.get(`${MAILPIT}/api/v1/message/${fresh.ID}`)).json();
      link = (msg.HTML as string).match(/href="([^"]*\/auth\/confirm[^"]*)"/)?.[1]?.replace(/&amp;/g, "&") ?? null;
    }
    if (!link) await page.waitForTimeout(500);
  }
  expect(link, "magic link email").toBeTruthy();
  await page.goto(link!);
}

test("sign in, plan the day, tick a task, open the calendar, generate the report", async ({ page }, info) => {
  if (!process.env.E2E_STORAGE_STATE) await signInWithMagicLink(page);
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
