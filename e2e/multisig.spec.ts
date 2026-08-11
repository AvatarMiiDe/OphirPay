import { test, expect } from "@playwright/test";

test.describe("Multisig Approvals Page", () => {
  test("renders multisig page with header", async ({ page }) => {
    await page.goto("/multisig");
    // Sidebar brand is also an h1 — target the page heading inside <main>.
    // h1 renders after client-side hydration — allow time in production.
    await expect(page.locator("main h1")).toContainText("Multisig", {
      timeout: 15000,
    });
  });

  test("shows Configure button", async ({ page }) => {
    await page.goto("/multisig");
    const configBtn = page.locator("button").filter({ hasText: /Configure/i });
    await expect(configBtn).toBeVisible({ timeout: 15000 });
  });

  test("shows Propose Payment button", async ({ page }) => {
    await page.goto("/multisig");
    const proposeBtn = page.locator("button").filter({ hasText: "Propose Payment" });
    await expect(proposeBtn).toBeVisible({ timeout: 15000 });
  });

  test("opens config modal when Configure is clicked", async ({ page }) => {
    await page.goto("/multisig");
    await page.locator("button").filter({ hasText: /Configure/i }).click();
    await expect(page.getByText("Configure Multisig")).toBeVisible({
      timeout: 15000,
    });
    // Unique label inside the config modal (page intro also mentions threshold)
    await expect(page.getByText("Threshold (N of M)")).toBeVisible({
      timeout: 15000,
    });
  });

  test("Propose Payment is disabled until multisig is configured", async ({
    page,
  }) => {
    await page.goto("/multisig");
    // By design, payments can only be proposed after multisig is configured
    // (N-of-M threshold) — without it the button is disabled.
    await expect(
      page.locator("button").filter({ hasText: "Propose Payment" })
    ).toBeDisabled({ timeout: 15000 });
  });
});
