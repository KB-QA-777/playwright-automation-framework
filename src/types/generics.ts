/**
 * Generic utility types for the Playwright Automation Framework
 */

// ============ Wait Strategy Types ============

/**
 * Options for wait operations
 */
export interface WaitOptions {
  /** Maximum time to wait in milliseconds */
  timeout?: number;
  /** Time in milliseconds to consider element stable */
  stabilityThreshold?: number;
  /** Polling interval in milliseconds */
  pollInterval?: number;
}

/**
 * Default wait options
 */
export const DEFAULT_WAIT_OPTIONS: Required<WaitOptions> = {
  timeout: 5000,
  stabilityThreshold: 100,
  pollInterval: 50,
} as const;
