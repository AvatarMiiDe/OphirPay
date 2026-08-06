import { test, expect } from "@playwright/test";

test.describe("Governance Page", () => {
  test("renders governance page with header", async ({ page }) => {
    await page.goto("/governance");
    await expect(page.locator("h1")).toContainText("Governance");
  });

  test("shows New Proposal button", async ({ page }) => {
    await page.goto("/governance");
    const btn = page.locator("button").filter({ hasText: "New Proposal" });
    await expect(btn).toBeVisible();
  });

  test("opens create proposal modal", async ({ page }) => {
    await page.goto("/governance");
    await page.locator("button").filter({ hasText: "New Proposal" }).click();
    await expect(page.locator("text=Create Governance Proposal")).toBeVisible();
  });

  test("create proposal form has required fields", async ({ page }) => {
    await page.goto("/governance");
    await page.locator("button").filter({ hasText: "New Proposal" }).click();
    await expect(page.locator("input[placeholder*='Upgrade']")).toBeVisible();
    await expect(page.locator("textarea[placeholder*='upgrades']")).toBeVisible();
  });
});
