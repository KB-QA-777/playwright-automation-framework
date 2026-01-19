import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { TABLE_SELECTORS, PATHS } from '../constants/selectors';
import type { CourseRow, Level, Language, SortCriteria } from '../types';
import { ALL_LEVELS } from '../types';
import { WaitHelpers } from '../utils/WaitHelpers';

/**
 * Page Object Model for the Practice Test Table page
 * Encapsulates all interactions with the courses table
 *
 * @extends BasePage
 */
export class TablePage extends BasePage {
  // Locators - only declare what we actually use
  readonly table: Locator;
  readonly rows: Locator;
  readonly minEnrollmentsDropdown: Locator;
  readonly sortSelect: Locator;
  readonly resetButton: Locator;
  readonly noResultsMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize locators using centralized selectors
    this.table = page.locator(TABLE_SELECTORS.table);
    this.rows = this.table.locator(TABLE_SELECTORS.rows);
    this.noResultsMessage = page.locator(TABLE_SELECTORS.noDataMessage);
    this.resetButton = page.locator(TABLE_SELECTORS.resetButton);
    this.sortSelect = page.locator(TABLE_SELECTORS.sortSelect);
    this.minEnrollmentsDropdown = page.locator(TABLE_SELECTORS.minEnrollmentsDropdown);
  }

  /**
   * Navigate to the practice test table page
   */
  async goto(): Promise<void> {
    await this.navigateTo(PATHS.practiceTable);
    await this.waitForVisible(this.table);
  }

  /**
   * Filter courses by programming language
   * Uses role-based locator for better accessibility support
   * @param language - The language to filter by
   */
  async filterByLanguage(language: Language): Promise<void> {
    // Use role-based locator - more resilient to DOM changes
    const radio = this.page.getByRole('radio', { name: language });
    await radio.click({ force: true });
    // Wait for filter to apply by checking first visible row
    await expect(this.rows.first().locator(TABLE_SELECTORS.cells.language)).toHaveText(language);
  }

  /**
   * Set the level filter checkboxes
   * Uses role-based locators for better accessibility support
   * @param targetLevels - Array of levels to enable (all others will be disabled)
   */
  async setLevel(targetLevels: Level[]): Promise<void> {
    for (const level of ALL_LEVELS) {
      // Use role-based locator - more resilient to DOM changes
      const checkbox = this.page.getByRole('checkbox', { name: level });
      const isChecked = await checkbox.isChecked();
      const shouldBeChecked = targetLevels.includes(level);

      if (isChecked !== shouldBeChecked) {
        await checkbox.click({ force: true });
        // Wait for table to update after each checkbox change
        await this.waitForTableUpdate();
      }
    }
  }

  /**
   * Select minimum enrollments from the custom dropdown
   * @param value - The enrollment threshold value (e.g., "10,000+")
   */
  async selectMinEnrollments(value: string): Promise<void> {
    await this.minEnrollmentsDropdown.click();
    await this.page.locator(TABLE_SELECTORS.dropdownOption).filter({ hasText: value }).click();
    await this.waitForTableUpdate();
  }

  /**
   * Click the reset button to clear all filters
   */
  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }

  /**
   * Sort the table by the specified criteria
   * @param criteria - The column to sort by
   */
  async sortBy(criteria: SortCriteria): Promise<void> {
    await this.sortSelect.selectOption({ label: criteria });
  }

  /**
   * Get all visible table data as typed CourseRow objects
   * Only returns rows that are currently visible (not filtered out)
   *
   * @returns Array of CourseRow objects
   */
  async getTableData(): Promise<CourseRow[]> {
    const data: CourseRow[] = [];
    const count = await this.rows.count();

    for (let i = 0; i < count; i++) {
      const row = this.rows.nth(i);

      // Skip hidden rows (filtered out via display:none)
      if (!(await row.isVisible())) {
        continue;
      }

      const name = await row.locator(TABLE_SELECTORS.cells.course).innerText();
      const language = (await row.locator(TABLE_SELECTORS.cells.language).innerText()) as Language;
      const level = (await row.locator(TABLE_SELECTORS.cells.level).innerText()) as Level;
      const enrollmentsRaw = await row.locator(TABLE_SELECTORS.cells.enrollments).innerText();
      const enrollments = parseInt(enrollmentsRaw.replace(/,/g, ''), 10);
      const href = await row.locator(TABLE_SELECTORS.cells.link).first().getAttribute('href');

      data.push({
        name,
        language,
        level,
        enrollments,
        href,
      });
    }

    return data;
  }

  /**
   * Get all table headers
   * @returns Array of header text values
   */
  async getHeaders(): Promise<string[]> {
    const headers = await this.table.locator(TABLE_SELECTORS.headers).allInnerTexts();
    return headers.map((h) => h.trim());
  }

  /**
   * Wait for the table to update after a filter action
   * Uses DOM stability detection instead of hardcoded timeout
   * @private
   */
  private async waitForTableUpdate(): Promise<void> {
    await WaitHelpers.waitForTableStability(this.table, {
      stabilityThreshold: 100,
      timeout: 3000,
    });
  }
}
