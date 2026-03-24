import { test, expect } from "@playwright/test";

test.describe("Apple-style Layout Acceptance", () => {
  test("verify glassmorphism styling and fonts on dashboard", async ({
    page,
  }) => {
    await page.goto("/");

    // Verify main components are using Apple system fonts (we can check computed styles if needed)
    // Wait for the page to load
    await page.waitForSelector("nav");

    // Take screenshot of the complete page for visual inspection
    await expect(page).toHaveScreenshot("dashboard-full-view.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.1, // Adjust as necessary
    });
  });

  test("verify workbench 3-column glassmorphism layout", async ({ page }) => {
    // We navigate to /workbench to test the multi-column glass layout
    await page.goto("/workbench");

    // Wait for main layout columns
    const columns = page.locator('div[class*="backdrop-blur"]');
    await columns.first().waitFor({ state: "visible" });

    // Assert that the glass styling is visible via screenshot
    await expect(page).toHaveScreenshot("workbench-columns.png", {
      maxDiffPixelRatio: 0.1,
    });
  });
});
