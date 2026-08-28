// SPDX-License-Identifier: MIT

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Payment accessibility", () => {
  test("send page has no accessibility violations", async ({ page }) => {
    await page.goto("/send");
    await expect(page.locator("main")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
