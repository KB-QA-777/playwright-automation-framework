/**
 * Test Data Layer
 *
 * Centralized test data configurations using enums.
 * All test data is defined here for easy maintenance.
 */

import {
  Language,
  Level,
  SortCriteria,
  EnrollmentFilter,
  EnrollmentThreshold,
} from './enums';

// ============================================================================
// FILTER TEST DATA
// ============================================================================

/**
 * Language filter test data
 */
export const LanguageFilterData = {
  /** TC1: Java language filter */
  java: Language.JAVA,

  /** TC4 & TC6: Python language filter */
  python: Language.PYTHON,

  /** JavaScript language filter */
  javascript: Language.JAVASCRIPT,
} as const;

/**
 * Level filter test data
 */
export const LevelFilterData = {
  /** TC2 & TC4: Beginner level filter */
  beginner: Level.BEGINNER,

  /** Intermediate level filter */
  intermediate: Level.INTERMEDIATE,

  /** Advanced level filter */
  advanced: Level.ADVANCED,

  /** TC5: Empty levels (for no results test) */
  none: [] as Level[],

  /** All levels */
  all: [Level.BEGINNER, Level.INTERMEDIATE, Level.ADVANCED] as Level[],
} as const;

/**
 * Enrollment filter test data
 */
export const EnrollmentFilterData = {
  /** TC3 & TC4: 10,000+ enrollment filter */
  tenThousandPlus: {
    displayValue: EnrollmentFilter.TEN_THOUSAND,
    threshold: EnrollmentThreshold.TEN_THOUSAND,
  },

  /** 50,000+ enrollment filter */
  fiftyThousandPlus: {
    displayValue: EnrollmentFilter.FIFTY_THOUSAND,
    threshold: EnrollmentThreshold.FIFTY_THOUSAND,
  },

  /** 100,000+ enrollment filter */
  hundredThousandPlus: {
    displayValue: EnrollmentFilter.HUNDRED_THOUSAND,
    threshold: EnrollmentThreshold.HUNDRED_THOUSAND,
  },
} as const;

/**
 * Sort criteria test data
 */
export const SortTestData = {
  /** TC7: Sort by enrollments */
  byEnrollments: SortCriteria.ENROLLMENTS,

  /** TC8: Sort by course name */
  byCourseName: SortCriteria.COURSE_NAME,
} as const;

// ============================================================================
// VALIDATION DATA
// ============================================================================

/**
 * URL validation patterns
 */
export const ValidationPatterns = {
  /** Pattern to match the practice table page URL */
  practiceTableUrl: /.*\/practice-test-table\//,

  /** Pattern to match valid HTTP/HTTPS URLs */
  validUrl: /^https?:\/\//,
} as const;

/**
 * Expected table structure
 */
export const TableStructure = {
  /** Expected number of columns */
  columnCount: 6,

  /** Expected header names (imported from selectors) */
  headers: ['ID', 'Course Name', 'Language', 'Level', 'Enrollments', 'Link'] as const,
} as const;

// ============================================================================
// TIMEOUT CONFIGURATION
// ============================================================================

/**
 * Timeout values in milliseconds
 */
export const Timeouts = {
  /** Default visibility timeout */
  visibility: 5000,

  /** Navigation timeout */
  navigation: 30000,

  /** Table stability timeout */
  tableStability: 3000,
} as const;

// ============================================================================
// SCREENSHOT HELPER
// ============================================================================

/**
 * Generate standardized screenshot filename
 *
 * @param testId - Test case identifier (e.g., 'TC1')
 * @param stepNumber - Step number within the test
 * @param description - Brief description of the screenshot
 * @returns Formatted screenshot filename
 *
 * @example
 * getScreenshotName('TC1', 1, 'page loaded') // Returns: 'tc1_step1_page_loaded'
 */
export function getScreenshotName(
  testId: string,
  stepNumber: number,
  description: string
): string {
  const sanitized = description.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return `${testId.toLowerCase()}_step${stepNumber}_${sanitized}`;
}
