import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import type {
  TestExecutionRecord,
  TestStatus,
  TestStep,
  TestCategory,
  BrowserType,
  TestError,
} from '../types';

/**
 * Custom Playwright Reporter for persistent test execution history
 * Appends results to a JSON file for trend analysis and dashboard generation
 *
 * Features:
 * - Browser-wise tracking (Chromium, Firefox, WebKit)
 * - Test categorization
 * - Step-level timing and status
 * - Error capture with stack traces
 * - Retry tracking
 */
export default class CustomReporter implements Reporter {
  private readonly historyFile: string;
  private readonly runId: string;

  constructor() {
    this.historyFile = path.join(process.cwd(), 'output', 'execution-history.json');
    this.runId = `RUN-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
  }

  /**
   * Determine test category based on test ID
   */
  private getTestCategory(testId: string): TestCategory {
    const id = parseInt(testId.replace('TC', ''), 10);

    if (id >= 1 && id <= 4) return 'Filter Tests';
    if (id >= 5 && id <= 6) return 'UI State Tests';
    if (id >= 7 && id <= 8) return 'Sorting Tests';
    if (id >= 9 && id <= 10) return 'Data Integrity Tests';
    return 'Other';
  }

  /**
   * Extract browser type from project name
   */
  private getBrowserType(projectName: string): BrowserType {
    const name = projectName.toLowerCase();
    if (name.includes('firefox')) return 'firefox';
    if (name.includes('webkit') || name.includes('safari')) return 'webkit';
    return 'chromium';
  }

  /**
   * Extract error details from test result
   */
  private extractError(result: TestResult): TestError | undefined {
    if (result.status === 'passed') return undefined;

    const error = result.error;
    if (!error) return undefined;

    // Playwright errors may include expected/actual for assertion failures
    const errorWithMatcher = error as { expected?: unknown; actual?: unknown };
    return {
      message: error.message || 'Unknown error',
      stack: error.stack,
      expected: errorWithMatcher.expected?.toString(),
      actual: errorWithMatcher.actual?.toString(),
    };
  }

  /**
   * Called when a test finishes execution
   * Records the result to the persistent history file
   */
  onTestEnd(test: TestCase, result: TestResult): void {
    // Extract ID (e.g., "TC1") and Name from title "TC1: Filter by Programming Language..."
    const titleMatch = test.title.match(/^(TC\d+):\s*(.*)$/);
    const testId = titleMatch ? titleMatch[1] : 'TC-?';
    const testName = titleMatch ? titleMatch[2] : test.title;

    // Get browser from project name
    const browser = this.getBrowserType(test.parent?.project()?.name || 'chromium');

    // Get test category
    const category = this.getTestCategory(testId);

    // Archive directory for this run
    const archiveDir = path.join(process.cwd(), 'output', 'screenshots', this.runId);
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    // Helper to copy screenshot to archive and return new path
    const archiveScreenshot = (sourcePath: string): string => {
      try {
        const fileName = path.basename(sourcePath);
        const archivePath = path.join(archiveDir, fileName);
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, archivePath);
          return `screenshots/${this.runId}/${fileName}`.replace(/\\/g, '/');
        }
      } catch {
        // Ignore copy errors
      }
      return '';
    };

    // Type for step with attachments (from Playwright's internal structure)
    interface StepWithAttachments {
      attachments?: Array<{ contentType?: string; path?: string }>;
      steps?: StepWithAttachments[];
    }

    // Recursive helper to find an image attachment in a step or its sub-steps
    const findImage = (s: StepWithAttachments): string | null => {
      const found = s.attachments?.find((a) => a.contentType?.startsWith('image/'));
      if (found?.path) {
        // Archive the screenshot to permanent location
        const archived = archiveScreenshot(found.path);
        if (archived) return archived;
        return path.relative(process.cwd(), found.path).replace(/\\/g, '/');
      }
      if (s.steps) {
        for (const sub of s.steps) {
          const img = findImage(sub);
          if (img) return img;
        }
      }
      return null;
    };

    // Collect steps from result.steps (test.step calls)
    const steps: TestStep[] = result.steps
      .filter((s) => s.category === 'test.step')
      .map((s, index, arr) => {
        // Calculate step duration
        let stepDuration = s.duration;
        if (stepDuration === undefined && index < arr.length - 1) {
          // Estimate from next step's start time
          stepDuration = 0;
        }

        // Determine step status
        const stepStatus: TestStatus = s.error ? 'failed' : 'passed';

        // Extract expected/actual from step title if present
        let stepName = s.title;
        let expected: string | undefined;
        let actual: string | undefined;

        if (s.title.includes('|')) {
          const parts = s.title.split('|');
          stepName = parts.find((p) => p.startsWith('Action:'))?.replace('Action:', '').trim() || parts[0].trim();
          expected = parts.find((p) => p.startsWith('Expected:'))?.replace('Expected:', '').trim();
          actual = parts.find((p) => p.startsWith('Actual:'))?.replace('Actual:', '').trim();
        }

        return {
          name: stepName,
          status: stepStatus,
          duration: stepDuration || 0,
          timestamp: new Date().toISOString(),
          screenshot: findImage(s) || '',
          expected,
          actual,
          error: s.error ? { message: s.error.message || 'Step failed', stack: s.error.stack } : undefined,
        };
      });

    // Fallback: If no explicit steps, look for any attachments
    if (steps.length === 0) {
      const evidence = result.attachments.find((a) => a.contentType?.startsWith('image/'));
      if (evidence?.path) {
        const archived = archiveScreenshot(evidence.path);
        steps.push({
          name: 'Final Evidence',
          status: result.status as TestStatus,
          duration: result.duration,
          timestamp: new Date().toISOString(),
          screenshot: archived || path.relative(process.cwd(), evidence.path).replace(/\\/g, '/'),
          expected: undefined,
          actual: undefined,
        });
      }
    }

    const record: TestExecutionRecord = {
      testId,
      runId: this.runId,
      testName,
      description: test.title,
      status: result.status as TestStatus,
      duration: result.duration,
      timestamp: new Date().toISOString(),
      steps,
      executionMode: process.env.npm_lifecycle_event || 'unknown',

      // Enhanced fields
      browser,
      category,
      retryCount: result.retry,
      error: this.extractError(result),
    };

    this.appendToHistory(record);
  }

  /**
   * Appends a test execution record to the history file
   * Creates the file if it doesn't exist
   *
   * @param record - The test execution record to append
   */
  private appendToHistory(record: TestExecutionRecord): void {
    let history: TestExecutionRecord[] = [];

    if (fs.existsSync(this.historyFile)) {
      try {
        const data = fs.readFileSync(this.historyFile, 'utf-8');
        history = JSON.parse(data) as TestExecutionRecord[];
      } catch {
        console.error('Error reading history file, starting fresh');
      }
    }

    history.push(record);

    try {
      fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
    } catch {
      console.error('Error writing to history file');
    }
  }
}
