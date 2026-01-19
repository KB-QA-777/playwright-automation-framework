/**
 * Type definitions for the Playwright Automation Framework
 */

// Re-export wait options
export type { WaitOptions } from './generics';
export { DEFAULT_WAIT_OPTIONS } from './generics';

// ============ Test Data Types ============

/**
 * Represents a single row in the courses table
 */
export interface CourseRow {
  name: string;
  language: Language;
  level: Level;
  enrollments: number;
  href: string | null;
}

/**
 * Available programming languages in the course filter
 */
export type Language = 'Java' | 'Python' | 'JavaScript';

/**
 * Available course difficulty levels
 */
export type Level = 'Beginner' | 'Intermediate' | 'Advanced';

/**
 * Available sorting criteria for the table
 */
export type SortCriteria = 'Enrollments' | 'Course Name';

// ============ Reporter Types ============

/**
 * Possible test execution statuses from Playwright
 */
export type TestStatus = 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';

/**
 * Browser types for cross-browser testing
 */
export type BrowserType = 'chromium' | 'firefox' | 'webkit';

/**
 * Test categories for grouping related tests
 */
export type TestCategory = 'Filter Tests' | 'UI State Tests' | 'Sorting Tests' | 'Data Integrity Tests' | 'Other';

/**
 * Error details for failed tests
 */
export interface TestError {
  message: string;
  stack?: string;
  expected?: string;
  actual?: string;
}

/**
 * Represents a single step within a test case with its specific evidence
 */
export interface TestStep {
  name: string;
  status: TestStatus;
  duration: number;
  timestamp: string;
  screenshot: string;
  actual?: string;
  expected?: string;
  error?: TestError;
}

/**
 * Record structure for test execution history
 */
export interface TestExecutionRecord {
  testId: string;
  runId: string;
  testName: string;
  description: string;
  status: TestStatus;
  duration: number;
  timestamp: string;
  steps: TestStep[];
  executionMode: string;

  // Enhanced fields
  browser: BrowserType;
  category: TestCategory;
  retryCount: number;
  error?: TestError;
}

// ============ Configuration Types ============

/**
 * Environment configuration options
 */
export interface EnvironmentConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

/**
 * All supported levels as a constant array (useful for iteration)
 */
export const ALL_LEVELS: readonly Level[] = ['Beginner', 'Intermediate', 'Advanced'] as const;

/**
 * All supported languages as a constant array
 */
export const ALL_LANGUAGES: readonly Language[] = ['Java', 'Python', 'JavaScript'] as const;
