/**
 * Wait helper utilities for intelligent DOM-based waiting
 */

import type { Locator, Page } from '@playwright/test';
import type { WaitOptions } from '../types/generics';
import { DEFAULT_WAIT_OPTIONS } from '../types/generics';

/**
 * Wait helper class providing intelligent wait strategies
 */
export class WaitHelpers {
  /**
   * Wait for a table to stabilize after DOM mutations
   * Uses MutationObserver pattern for reliable detection
   *
   * @param table - Locator for the table element
   * @param options - Wait configuration options
   * @throws Error if table doesn't stabilize within timeout
   *
   * @example
   * await WaitHelpers.waitForTableStability(page.locator('#myTable'));
   */
  static async waitForTableStability(
    table: Locator,
    options: WaitOptions = {}
  ): Promise<void> {
    const {
      timeout = DEFAULT_WAIT_OPTIONS.timeout,
      stabilityThreshold = DEFAULT_WAIT_OPTIONS.stabilityThreshold,
    } = options;

    await table.evaluate(
      (element, { threshold, maxTimeout }) => {
        return new Promise<void>((resolve, reject) => {
          let stabilityTimer: ReturnType<typeof setTimeout>;
          // eslint-disable-next-line prefer-const -- assigned after callbacks that reference it
          let timeoutTimer: ReturnType<typeof setTimeout>;

          const observer = new MutationObserver(() => {
            // Reset stability timer on any mutation
            clearTimeout(stabilityTimer);
            stabilityTimer = setTimeout(() => {
              observer.disconnect();
              clearTimeout(timeoutTimer);
              resolve();
            }, threshold);
          });

          // Start observing
          observer.observe(element, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
          });

          // Initial stability check (in case no mutations occur)
          stabilityTimer = setTimeout(() => {
            observer.disconnect();
            clearTimeout(timeoutTimer);
            resolve();
          }, threshold);

          // Timeout guard
          timeoutTimer = setTimeout(() => {
            observer.disconnect();
            clearTimeout(stabilityTimer);
            reject(new Error(`Table did not stabilize within ${maxTimeout}ms`));
          }, maxTimeout);
        });
      },
      { threshold: stabilityThreshold, maxTimeout: timeout }
    );
  }

  /**
   * Wait for element count to stabilize
   * Useful when filtering causes row additions/removals
   *
   * @param locator - Locator for elements to count
   * @param options - Wait configuration options
   * @returns Final stable count
   *
   * @example
   * const rowCount = await WaitHelpers.waitForStableCount(page.locator('tr'));
   */
  static async waitForStableCount(
    locator: Locator,
    options: WaitOptions = {}
  ): Promise<number> {
    const {
      timeout = DEFAULT_WAIT_OPTIONS.timeout,
      stabilityThreshold = DEFAULT_WAIT_OPTIONS.stabilityThreshold,
      pollInterval = DEFAULT_WAIT_OPTIONS.pollInterval,
    } = options;

    const page = locator.page();
    const startTime = Date.now();
    let lastCount = await locator.count();
    let stableStart = Date.now();

    while (Date.now() - startTime < timeout) {
      await page.waitForTimeout(pollInterval);
      const currentCount = await locator.count();

      if (currentCount !== lastCount) {
        lastCount = currentCount;
        stableStart = Date.now();
      } else if (Date.now() - stableStart >= stabilityThreshold) {
        return currentCount;
      }
    }

    // Return last known count even if not fully stable
    return lastCount;
  }

  /**
   * Wait for a generic condition to be met with polling
   *
   * @template TResult - Type of the condition result
   * @param page - Playwright Page object
   * @param condition - Async function that returns the value to check
   * @param predicate - Function that returns true when condition is met
   * @param options - Wait configuration options
   * @returns The value that satisfied the predicate
   * @throws Error if condition not met within timeout
   *
   * @example
   * const data = await WaitHelpers.waitForCondition(
   *   page,
   *   () => fetchData(),
   *   (data) => data.length > 0,
   *   { timeout: 10000 }
   * );
   */
  static async waitForCondition<TResult>(
    page: Page,
    condition: () => Promise<TResult>,
    predicate: (value: TResult) => boolean,
    options: WaitOptions = {}
  ): Promise<TResult> {
    const {
      timeout = DEFAULT_WAIT_OPTIONS.timeout,
      pollInterval = DEFAULT_WAIT_OPTIONS.pollInterval,
    } = options;

    const startTime = Date.now();
    let lastValue: TResult | undefined;
    let lastError: Error | undefined;

    while (Date.now() - startTime < timeout) {
      try {
        lastValue = await condition();
        if (predicate(lastValue)) {
          return lastValue;
        }
      } catch (error) {
        lastError = error as Error;
      }
      await page.waitForTimeout(pollInterval);
    }

    if (lastError) {
      throw new Error(
        `Condition not met within ${timeout}ms. Last error: ${lastError.message}`
      );
    }

    throw new Error(
      `Condition not met within ${timeout}ms. Last value: ${JSON.stringify(lastValue)}`
    );
  }

  /**
   * Wait for a specific network request to complete
   *
   * @param page - Playwright Page object
   * @param urlPattern - URL string or RegExp to match
   * @param options - Wait configuration options
   *
   * @example
   * await WaitHelpers.waitForRequest(page, '/api/courses');
   */
  static async waitForRequest(
    page: Page,
    urlPattern: string | RegExp,
    options: WaitOptions = {}
  ): Promise<void> {
    const { timeout = DEFAULT_WAIT_OPTIONS.timeout } = options;

    await page.waitForResponse(
      (response) => {
        const url = response.url();
        return typeof urlPattern === 'string'
          ? url.includes(urlPattern)
          : urlPattern.test(url);
      },
      { timeout }
    );
  }

  /**
   * Wait for no network activity for a specified duration
   * Alternative to waitForLoadState('networkidle') with more control
   *
   * @param page - Playwright Page object
   * @param options - Wait configuration options
   *
   * @example
   * await WaitHelpers.waitForNetworkQuiet(page, { stabilityThreshold: 500 });
   */
  static async waitForNetworkQuiet(
    page: Page,
    options: WaitOptions = {}
  ): Promise<void> {
    const {
      timeout = DEFAULT_WAIT_OPTIONS.timeout,
      stabilityThreshold = 500,
    } = options;

    const startTime = Date.now();
    let lastActivityTime = Date.now();

    const requestHandler = (): void => {
      lastActivityTime = Date.now();
    };

    const responseHandler = (): void => {
      lastActivityTime = Date.now();
    };

    page.on('request', requestHandler);
    page.on('response', responseHandler);

    try {
      while (Date.now() - startTime < timeout) {
        if (Date.now() - lastActivityTime >= stabilityThreshold) {
          return;
        }
        await page.waitForTimeout(50);
      }
    } finally {
      page.off('request', requestHandler);
      page.off('response', responseHandler);
    }
  }

  /**
   * Retry an action until it succeeds or max retries reached
   *
   * @template TResult - Type of the action result
   * @param action - Async function to retry
   * @param options - Retry configuration
   * @returns Result of the successful action
   * @throws Last error if all retries fail
   *
   * @example
   * const result = await WaitHelpers.withRetry(
   *   () => clickButton(),
   *   { maxRetries: 3, delay: 1000 }
   * );
   */
  static async withRetry<TResult>(
    action: () => Promise<TResult>,
    options: { maxRetries?: number; delay?: number } = {}
  ): Promise<TResult> {
    const { maxRetries = 3, delay = 1000 } = options;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await action();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Action failed after ${maxRetries} attempts. Last error: ${lastError?.message}`
    );
  }
}
