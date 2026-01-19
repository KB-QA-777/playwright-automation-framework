/**
 * Enums for Test Data
 *
 * Centralized enum definitions for all test data values.
 * Using enums provides type safety and IDE autocomplete support.
 */

/**
 * Programming languages available in the course filter
 */
export enum Language {
  JAVA = 'Java',
  PYTHON = 'Python',
  JAVASCRIPT = 'JavaScript',
}

/**
 * Difficulty levels available in the course filter
 */
export enum Level {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

/**
 * Sort criteria options for the table
 */
export enum SortCriteria {
  ENROLLMENTS = 'Enrollments',
  COURSE_NAME = 'Course Name',
}

/**
 * Minimum enrollment filter options
 */
export enum EnrollmentFilter {
  TEN_THOUSAND = '10,000+',
  FIFTY_THOUSAND = '50,000+',
  HUNDRED_THOUSAND = '100,000+',
}

/**
 * Enrollment threshold values (numeric)
 */
export enum EnrollmentThreshold {
  TEN_THOUSAND = 10000,
  FIFTY_THOUSAND = 50000,
  HUNDRED_THOUSAND = 100000,
}

/**
 * Test case identifiers
 */
export enum TestCaseId {
  TC1 = 'TC1',
  TC2 = 'TC2',
  TC3 = 'TC3',
  TC4 = 'TC4',
  TC5 = 'TC5',
  TC6 = 'TC6',
  TC7 = 'TC7',
  TC8 = 'TC8',
  TC9 = 'TC9',
  TC10 = 'TC10',
}
