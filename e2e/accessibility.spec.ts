import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const KEY_PAGES = [
  { name: "Dashboard", path: "/" },
  { name: "Send", path: "/send" },
  { name: "Batches", path: "/batches" },
  { name: "Payments", path: "/payments" },
  { name: "Webhooks", path: "/webhooks" },
];

test.describe("Axe Accessibility Scans (WCAG 2.1 AA)", () => {
  for (const pageInfo of KEY_PAGES) {
    test(`[Light Mode] ${pageInfo.name} (${pageInfo.path}) has zero critical/serious accessibility violations`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
      });
      await page.waitForLoadState("domcontentloaded");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const criticalOrSeriousViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(criticalOrSeriousViolations).toEqual([]);
    });

    test(`[Dark Mode] ${pageInfo.name} (${pageInfo.path}) has zero critical/serious accessibility violations`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
      });
      await page.waitForLoadState("domcontentloaded");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const criticalOrSeriousViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(criticalOrSeriousViolations).toEqual([]);
    });

    test(`[Unauthenticated] ${pageInfo.name} (${pageInfo.path}) maintains accessibility when wallet is disconnected`, async ({ page }) => {
      // PR #271 - Mock unauthenticated wallet state to ensure empty states remain accessible
      await page.addInitScript(() => {
        window.localStorage.setItem('wagmi.store', JSON.stringify({ state: { connections: { value: [] } } }));
      });
      
      await page.goto(pageInfo.path);
      await page.waitForLoadState("domcontentloaded");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const criticalOrSeriousViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(criticalOrSeriousViolations).toEqual([]);
    });
  }
});
