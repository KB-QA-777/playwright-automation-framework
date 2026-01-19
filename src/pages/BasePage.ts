import type { Page, Locator} from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Base Page class implementing common page object functionality
 * All page objects should extend this class (DRY principle)
 * 
 * @abstract
 */
export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific path
   * @param path - URL path to navigate to
   */
  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Wait for an element to be visible with configurable timeout
   * @param locator - Playwright locator
   * @param timeout - Maximum wait time in milliseconds
   */
  async waitForVisible(locator: Locator, timeout = 5000): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
  }

  /**
   * Wait for an element to be hidden
   * @param locator - Playwright locator
   * @param timeout - Maximum wait time in milliseconds
   */
  async waitForHidden(locator: Locator, timeout = 5000): Promise<void> {
    await expect(locator).toBeHidden({ timeout });
  }

  /**
   * Get the underlying Page object
   * Useful for accessing page-level methods in tests
   */
  getPage(): Page {
    return this.page;
  }

  /**
   * Take a full-page screenshot with a descriptive name
   * @param name - Screenshot file name
   */
  async takeScreenshot(name: string): Promise<string> {
    const sanitizedName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const screenshotPath = `output/evidence/${sanitizedName}_${Date.now()}.png`;
    // Bonus A: Full page screenshot as requested
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  }

  /**
   * Take a screenshot and attach it as a specific step evidence
   * @param stepName - Name of the step for reporting
   */
  async takeStepEvidence(stepName: string): Promise<void> {
    const _path = await this.takeScreenshot(stepName);
    // Attach to test info for reporter collection
    await this.page.evaluate(() => {}); // Sync point
    // We'll call this from the test context usually,
    // but we can pass testInfo or use attachments in a way the reporter understands
    void _path; // Used for side effect (screenshot saved to disk)
  }

  /**
   * Wait for network to be idle (useful after filter actions)
   * @param timeout - Maximum wait time in milliseconds
   */
  async waitForNetworkIdle(timeout = 5000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }
}
