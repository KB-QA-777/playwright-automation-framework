import { test, expect } from '@playwright/test';
import { TablePage } from '../src/pages/TablePage';
import { EXPECTED_HEADERS, PATHS, TABLE_SELECTORS } from '../src/constants/selectors';
import {
  LanguageFilterData,
  LevelFilterData,
  EnrollmentFilterData,
  SortTestData,
  ValidationPatterns,
  TableStructure,
  Timeouts,
  getScreenshotName,
} from '../src/data';

/**
 * Test Suite: Practice Test Table - Comprehensive Automation Tests
 *
 * This test suite validates the functionality of the Practice Test Table application
 * including filtering, sorting, and UI state management features.
 *
 * Test Coverage:
 * - TC1-TC4: Filter functionality (Language, Level, Enrollments, Combined)
 * - TC5-TC6: UI state management (No Results, Reset functionality)
 * - TC7-TC8: Sorting functionality (Numeric and Alphabetical)
 * - TC9-TC10: Data integrity (Link validation, Column structure)
 */
test.describe('Practice Test Table - Comprehensive Automation Tests', () => {
  let tablePage: TablePage;

  test.beforeEach(async ({ page }) => {
    tablePage = new TablePage(page);
    await tablePage.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Bonus A: Automatic Evidence Collection - Capture final state screenshot
    const sanitizedTitle = testInfo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const screenshotPath = `output/evidence/${sanitizedTitle}_${Date.now()}.png`;

    await page.screenshot({ path: screenshotPath, fullPage: true });
    await testInfo.attach('evidence', { path: screenshotPath, contentType: 'image/png' });
  });

  // ============================================================================
  // FILTER TESTS (TC1-TC4)
  // These tests verify that filter controls correctly filter the table data
  // ============================================================================

  test('TC1: Filter by Programming Language - Verify that selecting Java language filter displays only Java courses', async ({}, testInfo) => {
    const testLanguage = LanguageFilterData.java;

    await test.step('Navigate to page and verify initial table visibility', async () => {
      // Navigate to the practice test table page
      await tablePage.navigateTo(PATHS.practiceTable);

      // Verify the URL is correct after navigation
      await expect(tablePage.getPage()).toHaveURL(ValidationPatterns.practiceTableUrl);

      // Confirm the courses table is visible and ready for interaction
      await expect(tablePage.table).toBeVisible();

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC1', 1, 'page_loaded'));
      await testInfo.attach('Page Navigation Complete', { path: screenshot, contentType: 'image/png' });
    });

    await test.step('Apply Java language filter using the radio button selector', async () => {
      // Click on the language radio button to filter courses by programming language
      await tablePage.filterByLanguage(testLanguage);

      // Verify the radio button is now in checked state
      const languageRadioButton = tablePage.getPage().locator(TABLE_SELECTORS.languageRadio(testLanguage));
      await expect(languageRadioButton).toBeChecked();

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC1', 2, 'filter_applied'));
      await testInfo.attach('Java Filter Applied', { path: screenshot, contentType: 'image/png' });
    });

    await test.step('Validate that all visible table rows contain only Java courses', async () => {
      // Extract all visible rows from the filtered table
      const tableRows = await tablePage.getTableData();

      // Ensure we have at least one row to validate
      expect(tableRows.length).toBeGreaterThan(0);

      // Iterate through each row and verify the language column matches expected value
      for (const row of tableRows) {
        expect(row.language).toBe(testLanguage);
      }

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC1', 3, 'validation_complete'));
      await testInfo.attach('All Rows Verified as Java Courses', { path: screenshot, contentType: 'image/png' });
    });
  });

  test('TC2: Filter by Difficulty Level - Verify that selecting Beginner level displays only beginner courses', async ({}, testInfo) => {
    const testLevel = LevelFilterData.beginner;

    await test.step('Navigate to the practice test table and verify page load', async () => {
      // Navigate to the target page
      await tablePage.navigateTo(PATHS.practiceTable);

      // Confirm URL matches the expected pattern
      await expect(tablePage.getPage()).toHaveURL(ValidationPatterns.practiceTableUrl);

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC2', 1, 'page_loaded'));
      await testInfo.attach('Page Navigation Successful', { path: screenshot, contentType: 'image/png' });
    });

    await test.step('Select Beginner level filter and verify checkbox state', async () => {
      // Apply the level filter (this will uncheck other levels)
      await tablePage.setLevel([testLevel]);

      // Verify the checkbox is now checked
      const levelCheckbox = tablePage.getPage().locator(TABLE_SELECTORS.levelCheckbox(testLevel));
      await expect(levelCheckbox).toBeChecked();

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC2', 2, 'filter_applied'));
      await testInfo.attach('Beginner Level Filter Applied', { path: screenshot, contentType: 'image/png' });
    });

    await test.step('Verify all displayed courses are at Beginner difficulty level', async () => {
      // Get all visible table rows after filtering
      const tableRows = await tablePage.getTableData();

      // Confirm there are courses matching the filter criteria
      expect(tableRows.length).toBeGreaterThan(0);

      // Validate each row has the expected level value
      for (const row of tableRows) {
        expect(row.level).toBe(testLevel);
      }

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC2', 3, 'validation_complete'));
      await testInfo.attach('All Rows Verified as Beginner Level', { path: screenshot, contentType: 'image/png' });
    });
  });

  test('TC3: Filter by Minimum Enrollments - Verify that 10,000+ filter shows only courses with high enrollment', async ({}, testInfo) => {
    const enrollmentData = EnrollmentFilterData.tenThousandPlus;

    await test.step('Navigate to page and apply minimum enrollment filter of 10,000+', async () => {
      // Navigate to the practice test table
      await tablePage.navigateTo(PATHS.practiceTable);

      // Verify successful navigation
      await expect(tablePage.getPage()).toHaveURL(ValidationPatterns.practiceTableUrl);

      // Select the enrollment option from the minimum enrollments dropdown
      await tablePage.selectMinEnrollments(enrollmentData.displayValue);

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC3', 1, 'enrollment_filter_applied'));
      await testInfo.attach('10,000+ Enrollment Filter Applied', { path: screenshot, contentType: 'image/png' });
    });

    await test.step('Validate all courses have at least 10,000 enrollments', async () => {
      // Extract table data after filter application
      const tableRows = await tablePage.getTableData();

      // Ensure filtered results are not empty
      expect(tableRows.length).toBeGreaterThan(0);

      // Verify each course meets the minimum enrollment threshold
      for (const row of tableRows) {
        expect(row.enrollments).toBeGreaterThanOrEqual(enrollmentData.threshold);
      }

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC3', 2, 'enrollment_validation_complete'));
      await testInfo.attach('All Courses Meet 10,000+ Enrollment Threshold', { path: screenshot, contentType: 'image/png' });
    });
  });

  test('TC4: Combined Filters - Verify multiple filters work together (Python + Beginner + 10,000+ enrollments)', async ({}, testInfo) => {
    const testLanguage = LanguageFilterData.python;
    const testLevel = LevelFilterData.beginner;
    const enrollmentData = EnrollmentFilterData.tenThousandPlus;

    await test.step('Apply all three filters sequentially - Language, Level, and Enrollment', async () => {
      // Navigate to the page first
      await tablePage.navigateTo(PATHS.practiceTable);
      await expect(tablePage.getPage()).toHaveURL(ValidationPatterns.practiceTableUrl);

      // Apply language filter
      await tablePage.filterByLanguage(testLanguage);

      // Apply level filter
      await tablePage.setLevel([testLevel]);

      // Apply minimum enrollment filter
      await tablePage.selectMinEnrollments(enrollmentData.displayValue);

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC4', 1, 'all_filters_applied'));
      await testInfo.attach('All Three Filters Applied Successfully', { path: screenshot, contentType: 'image/png' });
    });

    await test.step('Validate all rows satisfy all three filter conditions simultaneously', async () => {
      // Get the filtered table data
      const tableRows = await tablePage.getTableData();

      // Ensure there are matching courses
      expect(tableRows.length).toBeGreaterThan(0);

      // Each row must satisfy ALL three conditions
      for (const row of tableRows) {
        // Verify language matches
        expect(row.language).toBe(testLanguage);

        // Verify level matches
        expect(row.level).toBe(testLevel);

        // Verify enrollments meet threshold
        expect(row.enrollments).toBeGreaterThanOrEqual(enrollmentData.threshold);
      }

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC4', 2, 'combined_validation_complete'));
      await testInfo.attach('All Rows Meet Combined Filter Criteria', { path: screenshot, contentType: 'image/png' });
    });
  });

  // ============================================================================
  // UI STATE TESTS (TC5-TC6)
  // These tests verify UI behavior for edge cases and state management
  // ============================================================================

  test('TC5: Empty State - Verify "No courses found" message appears when filters return zero results', async ({}, testInfo) => {
    const emptyLevels = LevelFilterData.none;

    await test.step('Navigate to page and uncheck all level filters to create empty state', async () => {
      // Navigate to the practice test table
      await tablePage.navigateTo(PATHS.practiceTable);
      await expect(tablePage.getPage()).toHaveURL(ValidationPatterns.practiceTableUrl);

      // Uncheck all level checkboxes to trigger the "no results" state
      await tablePage.setLevel(emptyLevels);

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC5', 1, 'filters_cleared'));
      await testInfo.attach('All Level Filters Unchecked', { path: screenshot, contentType: 'image/png' });
    });

    await test.step('Verify the "No courses match" message is displayed to the user', async () => {
      // Wait for and verify the no results message is visible
      await expect(tablePage.noResultsMessage).toBeVisible({ timeout: Timeouts.visibility });

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC5', 2, 'no_results_message_visible'));
      await testInfo.attach('No Results Message Displayed', { path: screenshot, contentType: 'image/png' });
    });
  });

  test('TC6: Reset Functionality - Verify Reset button clears all filters and restores default state', async ({}, testInfo) => {
    const testLanguage = LanguageFilterData.python;

    await test.step('Apply a filter and verify the Reset button becomes visible', async () => {
      // Navigate to the page
      await tablePage.navigateTo(PATHS.practiceTable);
      await expect(tablePage.getPage()).toHaveURL(ValidationPatterns.practiceTableUrl);

      // Apply a filter to make the Reset button appear
      await tablePage.filterByLanguage(testLanguage);

      // Verify the Reset button is now visible
      await expect(tablePage.resetButton).toBeVisible();

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC6', 1, 'filter_applied_reset_visible'));
      await testInfo.attach('Filter Applied - Reset Button Visible', { path: screenshot, contentType: 'image/png' });
    });

    await test.step('Click Reset button and verify filters are cleared and button is hidden', async () => {
      // Click the Reset button to clear all filters
      await tablePage.clickReset();

      // Verify the Reset button is now hidden (indicates default state)
      await expect(tablePage.resetButton).toBeHidden();

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC6', 2, 'reset_clicked_button_hidden'));
      await testInfo.attach('Reset Complete - Default State Restored', { path: screenshot, contentType: 'image/png' });
    });
  });

  // ============================================================================
  // SORTING TESTS (TC7-TC8)
  // These tests verify that table sorting works correctly for different data types
  // ============================================================================

  test('TC7: Numeric Sorting - Verify table sorts by Enrollments column in ascending order', async ({}, testInfo) => {
    const sortCriteria = SortTestData.byEnrollments;

    await test.step('Navigate to page and trigger sort by Enrollments column', async () => {
      // Navigate to the practice test table
      await tablePage.navigateTo(PATHS.practiceTable);
      await expect(tablePage.getPage()).toHaveURL(ValidationPatterns.practiceTableUrl);

      // Select sort option from the dropdown
      await tablePage.sortBy(sortCriteria);

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC7', 1, 'sort_by_enrollments'));
      await testInfo.attach('Sort by Enrollments Selected', { path: screenshot, contentType: 'image/png' });
    });

    await test.step('Validate enrollment values are in ascending numerical order', async () => {
      // Extract table data after sorting
      const tableRows = await tablePage.getTableData();

      // Ensure we have data to validate
      expect(tableRows.length).toBeGreaterThan(0);

      // Extract just the enrollment numbers
      const enrollmentValues = tableRows.map((row) => row.enrollments);

      // Create a sorted copy for comparison
      const sortedEnrollments = [...enrollmentValues].sort((a, b) => a - b);

      // Verify the actual order matches ascending sort
      expect(enrollmentValues).toEqual(sortedEnrollments);

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC7', 2, 'ascending_order_verified'));
      await testInfo.attach('Ascending Order Verified', { path: screenshot, contentType: 'image/png' });
    });
  });

  test('TC8: Alphabetical Sorting - Verify table sorts by Course Name column in A-Z order', async ({}, testInfo) => {
    const sortCriteria = SortTestData.byCourseName;

    await test.step('Navigate to page and trigger sort by Course Name column', async () => {
      // Navigate to the practice test table
      await tablePage.navigateTo(PATHS.practiceTable);
      await expect(tablePage.getPage()).toHaveURL(ValidationPatterns.practiceTableUrl);

      // Select sort option from the dropdown
      await tablePage.sortBy(sortCriteria);

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC8', 1, 'sort_by_course_name'));
      await testInfo.attach('Sort by Course Name Selected', { path: screenshot, contentType: 'image/png' });
    });

    await test.step('Validate course names are in alphabetical ascending order', async () => {
      // Extract table data after sorting
      const tableRows = await tablePage.getTableData();

      // Ensure we have data to validate
      expect(tableRows.length).toBeGreaterThan(0);

      // Extract just the course names
      const courseNames = tableRows.map((row) => row.name);

      // Create an alphabetically sorted copy for comparison
      const sortedNames = [...courseNames].sort((a, b) => a.localeCompare(b));

      // Verify the actual order matches alphabetical sort
      expect(courseNames).toEqual(sortedNames);

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC8', 2, 'alphabetical_order_verified'));
      await testInfo.attach('Alphabetical Order Verified', { path: screenshot, contentType: 'image/png' });
    });
  });

  // ============================================================================
  // DATA INTEGRITY TESTS (TC9-TC10)
  // These tests verify data quality and table structure
  // ============================================================================

  test('TC9: Link Validation - Verify course links contain valid HTTP/HTTPS URLs', async ({}, testInfo) => {

    await test.step('Extract course links and validate URL format', async () => {
      // Navigate to the practice test table
      await tablePage.navigateTo(PATHS.practiceTable);
      await expect(tablePage.getPage()).toHaveURL(ValidationPatterns.practiceTableUrl);

      // Get all table rows with their link data
      const tableRows = await tablePage.getTableData();

      // Ensure we have courses to check
      expect(tableRows.length).toBeGreaterThan(0);

      // Verify the first row has a valid link
      expect(tableRows[0].href).toBeTruthy();

      // Verify the link matches the expected URL pattern
      expect(tableRows[0].href).toMatch(ValidationPatterns.validUrl);

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC9', 1, 'link_validation_complete'));
      await testInfo.attach('Course Links Validated', { path: screenshot, contentType: 'image/png' });
    });
  });

  test('TC10: Table Structure - Verify table has correct column headers in expected order', async ({}, testInfo) => {

    await test.step('Extract and validate table column headers', async () => {
      // Navigate to the practice test table
      await tablePage.navigateTo(PATHS.practiceTable);
      await expect(tablePage.getPage()).toHaveURL(ValidationPatterns.practiceTableUrl);

      // Get all table headers
      const actualHeaders = await tablePage.getHeaders();

      // Verify headers match expected values exactly
      expect(actualHeaders).toEqual(EXPECTED_HEADERS);

      // Verify we have exactly the expected number of columns
      expect(actualHeaders.length).toBe(TableStructure.columnCount);

      const screenshot = await tablePage.takeScreenshot(getScreenshotName('TC10', 1, 'headers_validated'));
      await testInfo.attach('Table Headers Match Expected Structure', { path: screenshot, contentType: 'image/png' });
    });
  });
});
