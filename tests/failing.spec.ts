import { test, expect } from '@playwright/test';
import { TablePage } from '../src/pages/TablePage';

/**
 * Intentionally Failing Test Cases
 * These tests are designed to fail to demonstrate failure reporting in the dashboard
 */
test.describe('Failing Test Scenarios', () => {
  let tablePage: TablePage;

  test.beforeEach(async ({ page }) => {
    tablePage = new TablePage(page);
    await tablePage.goto();
  });

  test('TC11: Intentional Failure - Expecting wrong course count', async ({}, testInfo) => {
    await test.step('Navigate to page and count courses', async () => {
      const screenshot = await tablePage.takeScreenshot('TC11-step1-initial-state');
      await testInfo.attach('Initial State', { path: screenshot, contentType: 'image/png' });
    });

    await test.step('Assert incorrect expected count (will fail)', async () => {
      const rows = await tablePage.getTableData();
      const screenshot = await tablePage.takeScreenshot('TC11-step2-before-assertion');
      await testInfo.attach('Before Assertion', { path: screenshot, contentType: 'image/png' });
      // This will fail - expecting 999 courses when there are fewer
      expect(rows.length, 'Expected 999 courses but found fewer').toBe(999);
    });
  });

  // eslint-disable-next-line playwright/expect-expect -- This test intentionally fails on timeout, not assertion
  test('TC12: Intentional Failure - Invalid element selector', async ({}, testInfo) => {
    await test.step('Try to find non-existent element', async () => {
      const screenshot = await tablePage.takeScreenshot('TC12-step1-page-state');
      await testInfo.attach('Page State', { path: screenshot, contentType: 'image/png' });
    });

    await test.step('Click on element that does not exist (will timeout)', async () => {
      // Capture state before attempting the failing action
      const screenshot = await tablePage.takeScreenshot('TC12-step2-before-click');
      await testInfo.attach('Before Click Attempt', { path: screenshot, contentType: 'image/png' });
      // This will fail - element doesn't exist
      await tablePage.getPage().locator('#non-existent-element-12345').click({ timeout: 3000 });
    });
  });

  test('TC13: Intentional Failure - Wrong text assertion', async ({}, testInfo) => {
    await test.step('Check page heading', async () => {
      const screenshot = await tablePage.takeScreenshot('TC13-step1-heading-check');
      await testInfo.attach('Heading Check', { path: screenshot, contentType: 'image/png' });
    });

    await test.step('Assert wrong heading text (will fail)', async () => {
      // Capture state before attempting the failing assertion
      const screenshot = await tablePage.takeScreenshot('TC13-step2-before-assertion');
      await testInfo.attach('Before Text Assertion', { path: screenshot, contentType: 'image/png' });
      // This will fail - wrong expected text
      await expect(tablePage.getPage().locator('h1')).toHaveText('This Is Wrong Text That Does Not Exist', {
        timeout: 3000,
      });
    });
  });

  test('TC14: Intentional Failure - Filter produces unexpected results', async ({}, testInfo) => {
    await test.step('Apply Java filter', async () => {
      await tablePage.filterByLanguage('Java');
      const screenshot = await tablePage.takeScreenshot('TC14-step1-java-filter');
      await testInfo.attach('Java Filter Applied', { path: screenshot, contentType: 'image/png' });
    });

    await test.step('Assert all courses are Python (will fail)', async () => {
      const rows = await tablePage.getTableData();
      const screenshot = await tablePage.takeScreenshot('TC14-step2-assertion');
      await testInfo.attach('Before Assertion', { path: screenshot, contentType: 'image/png' });
      // This will fail - we filtered by Java but asserting Python
      for (const row of rows) {
        expect(row.language, `Expected Python but found ${row.language}`).toBe('Python');
      }
    });
  });
});
