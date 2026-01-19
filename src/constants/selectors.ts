/**
 * Centralized selector constants for the Practice Test Table page
 * Following DRY principle - all selectors defined in one place
 */

export const TABLE_SELECTORS = {
  // Main table elements
  table: '#courses_table',
  tableBody: 'tbody',
  rows: 'tbody tr',
  headers: 'th',
  
  // Filter elements
  noDataMessage: '#noData',
  resetButton: '#resetFilters',
  sortSelect: '#sortBy',
  minEnrollmentsDropdown: '.dropdown-button',
  dropdownOption: 'li[role="option"]',
  
  // Dynamic selectors (functions for parameterized values)
  languageRadio: (language: string): string => `input[name="lang"][value="${language}"]`,
  levelCheckbox: (level: string): string => `input[name="level"][value="${level}"]`,
  
  // Table cell selectors
  cells: {
    course: 'td[data-col="course"]',
    language: 'td[data-col="language"]',
    level: 'td[data-col="level"]',
    enrollments: 'td[data-col="enrollments"]',
    link: 'td[data-col="link"] a',
  },
} as const;

/**
 * Expected table headers for validation
 */
export const EXPECTED_HEADERS = ['ID', 'Course Name', 'Language', 'Level', 'Enrollments', 'Link'] as const;

/**
 * URL paths
 */
export const PATHS = {
  practiceTable: '/practice-test-table/',
} as const;
