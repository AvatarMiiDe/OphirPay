import { test, expect } from "@playwright/test";

test.describe("Multisig Approvals Page", () => {
  test("renders multisig page with header", async ({ page }) => {
    await page.goto("/multisig");
    await expect(page.locator("h1")).toContainText("Multisig");
  });

  test("shows Configure button", async ({ page }) => {
    await page.goto("/multisig");
    const configBtn = page.locator("button").filter({ hasText: /Configure/i });
    await expect(configBtn).toBeVisible();
  });

  test("shows Propose Payment button", async ({ page }) => {
    await page.goto("/multisig");
    const proposeBtn = page.locator("button").filter({ hasText: "Propose Payment" });
    await expect(proposeBtn).toBeVisible();
  });

  test("opens config modal when Configure is clicked", async ({ page }) => {
    await page.goto("/multisig");
    await page.locator("button").filter({ hasText: /Configure/i }).click();
    await expect(page.locator("text=Configure Multisig")).toBeVisible();
    await expect(page.locator("text=Threshold")).toBeVisible();
  });

  test("opens propose modal when Propose Payment is clicked", async ({ page }) => {
    await page.goto("/multisig");
    await page.locator("button").filter({ hasText: "Propose Payment" }).click();
    await expect(page.locator("text=Propose Payment")).toBeVisible();
    await expect(page.locator("text=Recipient Address")).toBeVisible();
  });
});
