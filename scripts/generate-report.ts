/**
 * Dashboard Report Generator
 *
 * Generates an interactive HTML dashboard from test execution history.
 * Features include:
 * - Analytics with pass/fail charts
 * - Run history with execution mode tracking
 * - Test evidence viewer with step screenshots
 * - Browser performance comparison
 *
 * @module scripts/generate-report
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TestExecutionRecord, BrowserType } from '../src/types';

/** Path to the execution history JSON file */
const HISTORY_FILE = path.join(process.cwd(), 'output', 'execution-history.json');

/** Path to the generated HTML dashboard */
const REPORT_FILE = path.join(process.cwd(), 'output', 'dashboard.html');

/**
 * Browser display configuration for the dashboard
 * Maps browser types to their display names, Font Awesome icons, and brand colors
 */
const BROWSER_INFO: Record<BrowserType, { name: string; icon: string; color: string }> = {
  chromium: { name: 'Chrome', icon: 'fa-brands fa-chrome', color: '#4285F4' },
  firefox: { name: 'Firefox', icon: 'fa-brands fa-firefox-browser', color: '#FF7139' },
  webkit: { name: 'Safari', icon: 'fa-brands fa-safari', color: '#006CFF' },
};

/**
 * Aggregated statistics for a specific browser
 */
interface BrowserStats {
  /** Browser type identifier */
  browser: BrowserType;
  /** Number of passed tests */
  passed: number;
  /** Number of failed tests */
  failed: number;
  /** Total number of tests */
  total: number;
  /** Average test duration in milliseconds */
  avgDuration: number;
  /** Stability percentage (passed/total * 100) */
  stability: number;
}

/**
 * Grouped test execution run with aggregated metrics
 */
interface RunGroup {
  /** Unique run identifier (e.g., RUN-2024-01-19T08-22-46) */
  id: string;
  /** ISO timestamp of the run */
  timestamp: string;
  /** Array of test execution records in this run */
  results: TestExecutionRecord[];
  /** Number of passed tests in the run */
  passed: number;
  /** Number of failed tests in the run */
  failed: number;
  /** Sum of individual test durations in milliseconds */
  duration: number;
  /** Actual wall-clock time (last test end - first test start) */
  wallClockTime: number;
  /** Array of browsers used in this run */
  browsers: BrowserType[];
  /** Execution mode: parallel, sequential, or unknown */
  executionMode: 'parallel' | 'sequential' | 'unknown';
}

/**
 * Format an ISO timestamp to a human-readable format
 *
 * @param isoString - ISO 8601 timestamp string
 * @returns Formatted string (e.g., "Jan 19, 2024, 1:53 PM")
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Calculate aggregated statistics for each browser from test execution records
 *
 * @param records - Array of test execution records to analyze
 * @returns Array of browser statistics, excluding browsers with no tests
 */
function calculateBrowserStats(records: TestExecutionRecord[]): BrowserStats[] {
  const stats: Record<BrowserType, { passed: number; failed: number; totalDuration: number; count: number }> = {
    chromium: { passed: 0, failed: 0, totalDuration: 0, count: 0 },
    firefox: { passed: 0, failed: 0, totalDuration: 0, count: 0 },
    webkit: { passed: 0, failed: 0, totalDuration: 0, count: 0 },
  };

  for (const record of records) {
    const browser = record.browser || 'chromium';
    stats[browser].count++;
    stats[browser].totalDuration += record.duration;
    if (record.status === 'passed') {
      stats[browser].passed++;
    } else {
      stats[browser].failed++;
    }
  }

  return Object.entries(stats)
    .filter(([_, s]) => s.count > 0)
    .map(([browser, s]) => ({
      browser: browser as BrowserType,
      passed: s.passed,
      failed: s.failed,
      total: s.count,
      avgDuration: Math.round(s.totalDuration / s.count),
      stability: s.count > 0 ? Math.round((s.passed / s.count) * 100) : 0,
    }));
}

/**
 * Metrics for a specific execution mode (parallel or sequential)
 */
interface ExecutionModeMetrics {
  /** Execution mode name */
  mode: string;
  /** Total number of test runs */
  totalRuns: number;
  /** Total number of tests executed */
  totalTests: number;
  /** Average individual test duration in milliseconds */
  avgDuration: number;
  /** Average wall-clock run time in milliseconds */
  avgRunTime: number;
  /** Pass rate as a percentage (0-100) */
  passRate: number;
  /** Number of passed tests */
  passed: number;
  /** Number of failed tests */
  failed: number;
  /** Number of skipped tests */
  skipped: number;
}

/**
 * Calculate metrics comparing parallel vs sequential execution modes
 *
 * @param runs - Record of run groups keyed by run ID
 * @returns Object containing metrics for both parallel and sequential execution
 */
function calculateExecutionModeMetrics(runs: Record<string, RunGroup>): { parallel: ExecutionModeMetrics; sequential: ExecutionModeMetrics } {
  const parallelRuns: RunGroup[] = [];
  const sequentialRuns: RunGroup[] = [];

  Object.values(runs).forEach((run) => {
    const mode = run.results[0]?.executionMode || 'unknown';
    if (mode.includes('parallel') || mode === 'test' || mode === 'npx') {
      parallelRuns.push(run);
    } else if (mode.includes('sequential')) {
      sequentialRuns.push(run);
    } else {
      // Default to parallel for unknown modes
      parallelRuns.push(run);
    }
  });

  const calcMetrics = (runList: RunGroup[], mode: string): ExecutionModeMetrics => {
    if (runList.length === 0) {
      return { mode, totalRuns: 0, totalTests: 0, avgDuration: 0, avgRunTime: 0, passRate: 0, passed: 0, failed: 0, skipped: 0 };
    }

    let totalDuration = 0;
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let totalWallClockTime = 0;

    runList.forEach((run) => {
      // Use wallClockTime for actual elapsed time (important for parallel runs)
      totalWallClockTime += run.wallClockTime;
      run.results.forEach((r) => {
        totalTests++;
        totalDuration += r.duration;
        if (r.status === 'passed') passed++;
        else if (r.status === 'skipped') skipped++;
        else failed++;
      });
    });

    return {
      mode,
      totalRuns: runList.length,
      totalTests,
      avgDuration: totalTests > 0 ? Math.round(totalDuration / totalTests) : 0,
      avgRunTime: runList.length > 0 ? Math.round(totalWallClockTime / runList.length) : 0,
      passRate: totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0,
      passed,
      failed,
      skipped,
    };
  };

  return {
    parallel: calcMetrics(parallelRuns, 'Parallel'),
    sequential: calcMetrics(sequentialRuns, 'Sequential'),
  };
}

/**
 * Generate the HTML dashboard report from test execution history
 *
 * Reads execution history from JSON, calculates statistics, and generates
 * an interactive HTML dashboard with:
 * - Analytics overview with pass/fail charts
 * - Run history with parallel/sequential comparison
 * - Test evidence viewer with step-by-step screenshots
 * - Browser performance metrics
 *
 * @throws Logs warning if no execution history exists
 */
function generateReport(): void {
  if (!fs.existsSync(HISTORY_FILE)) {
    console.warn('⚠️ No history found. Run tests first.');
    return;
  }

  const rawData = fs.readFileSync(HISTORY_FILE, 'utf-8');
  let history: TestExecutionRecord[];
  try {
    history = JSON.parse(rawData);
  } catch {
    console.error('Error parsing history file');
    return;
  }

  // Grouping by Run ID
  const runs = history.reduce((acc, run) => {
    const rId = run.runId || 'LEGACY-RUN';
    if (!acc[rId]) {
      acc[rId] = {
        id: rId,
        timestamp: run.timestamp,
        results: [],
        passed: 0,
        failed: 0,
        duration: 0,
        wallClockTime: 0,
        browsers: [],
        executionMode: 'unknown',
      };
    }
    acc[rId].results.push(run);
    if (run.status === 'passed') acc[rId].passed++;
    else acc[rId].failed++;
    acc[rId].duration += run.duration;
    if (run.browser && !acc[rId].browsers.includes(run.browser)) {
      acc[rId].browsers.push(run.browser);
    }
    return acc;
  }, {} as Record<string, RunGroup>);

  // Calculate wall-clock time and determine execution mode for each run
  Object.values(runs).forEach((run) => {
    if (run.results.length > 0) {
      const timestamps = run.results.map((r) => new Date(r.timestamp).getTime());
      const startTime = Math.min(...timestamps);
      // End time = latest (timestamp + duration) among all tests
      const endTimes = run.results.map((r) => new Date(r.timestamp).getTime() + r.duration);
      const endTime = Math.max(...endTimes);
      run.wallClockTime = endTime - startTime;

      // Determine execution mode from first result
      const mode = run.results[0]?.executionMode || 'unknown';
      if (mode.includes('parallel') || mode === 'test' || mode === 'npx') {
        run.executionMode = 'parallel';
      } else if (mode.includes('sequential')) {
        run.executionMode = 'sequential';
      } else {
        run.executionMode = 'parallel'; // Default to parallel
      }
    }
  });

  const sortedRuns = Object.values(runs).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Global Stats (Last 100 tests)
  const recentHistory = history.slice(-100);
  const total = recentHistory.length;
  const passed = recentHistory.filter((r) => r.status === 'passed').length;
  const failed = recentHistory.filter((r) => r.status !== 'passed').length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
  const avgDuration = (recentHistory.reduce((a, b) => a + b.duration, 0) / (total || 1)).toFixed(0);

  // Browser Stats
  const browserStats = calculateBrowserStats(recentHistory);

  // Parallel vs Sequential Metrics
  const executionMetrics = calculateExecutionModeMetrics(runs);
  const skipped = recentHistory.filter((r) => r.status === 'skipped').length;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Infinity QA 4.0</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        :root {
            --bg-dark: #020617;
            --bg-surface: #0f172a;
            --bg-card: #1e293b;
            --primary: #818cf8;
            --success: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --accent: #c084fc;
            --glass: rgba(15, 23, 42, 0.8);
            --border: rgba(255, 255, 255, 0.08);
        }

        * { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: var(--primary) transparent; }
        body {
            font-family: 'Outfit', sans-serif;
            background: var(--bg-dark);
            color: var(--text-main);
            margin: 0; display: flex; height: 100vh; overflow: hidden;
        }

        /* Sidebar Navigation */
        aside {
            width: 80px; background: var(--bg-surface);
            display: flex; flex-direction: column; align-items: center;
            padding: 30px 0; border-right: 1px solid var(--border);
            z-index: 100; flex-shrink: 0;
        }
        .nav-icon {
            width: 48px; height: 48px; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 24px; cursor: pointer; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            color: var(--text-muted); font-size: 1.2rem;
        }
        .nav-icon:hover { color: white; background: var(--bg-card); }
        .nav-icon.active { color: white; background: var(--primary); box-shadow: 0 0 20px rgba(129, 140, 248, 0.4); }

        main { flex-grow: 1; overflow-y: auto; padding: 40px; position: relative; background: radial-gradient(circle at top right, #1e1b4b, transparent 40%); }
        .tab-content { display: none; animation: fadeIn 0.4s ease-out; }
        .tab-content.active { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        h1 { font-size: 2.2rem; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -1px; }
        h2 { font-size: 1.4rem; font-weight: 700; margin: 30px 0 20px 0; color: var(--text-main); }
        .subtitle { color: var(--text-muted); margin-bottom: 40px; font-weight: 400; font-size: 0.95rem; }

        /* Dashboard Components */
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: var(--glass); border: 1px solid var(--border); border-radius: 20px; padding: 24px; }
        .stat-label { font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600; margin-bottom: 8px; }
        .stat-val { font-size: 2rem; font-weight: 800; }

        /* Browser Table */
        .browser-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .browser-table th { text-align: left; padding: 12px; color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; border-bottom: 1px solid var(--border); }
        .browser-table td { padding: 14px 12px; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
        .browser-table tr:hover { background: rgba(255,255,255,0.02); }
        .browser-icon { width: 24px; height: 24px; margin-right: 10px; vertical-align: middle; }
        .stability-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
        .stability-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }

        /* Category Pills */
        .category-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 15px; }
        .category-pill { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; }
        .category-name { font-weight: 600; font-size: 0.9rem; }
        .category-stats { text-align: right; }
        .category-count { font-size: 1.2rem; font-weight: 700; }

        /* Flaky Tests Warning */
        .flaky-warning { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 16px; margin-top: 20px; }
        .flaky-title { color: var(--warning); font-weight: 700; margin-bottom: 10px; }
        .flaky-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }

        /* Metrics Comparison Grid */
        .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 16px; }
        .metric-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; text-align: center; }
        .metric-card.parallel { border-left: 3px solid #06b6d4; }
        .metric-card.sequential { border-left: 3px solid #f59e0b; }
        .metric-label { font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; }
        .metric-value { font-size: 1.4rem; font-weight: 700; }
        .metric-compare { font-size: 0.75rem; margin-top: 6px; }
        .metric-compare.better { color: var(--success); }
        .metric-compare.worse { color: var(--danger); }

        /* Run History (Audit Logs) */
        .run-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
        .run-card {
            background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px;
            padding: 20px; cursor: pointer; transition: 0.2s; position: relative;
        }
        .run-card:hover { border-color: var(--primary); transform: scale(1.02); }
        .run-id { font-family: 'JetBrains Mono'; color: var(--primary); font-size: 0.85rem; font-weight: 700; margin-bottom: 12px; }
        .run-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 0.85rem; }
        .badge { padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 0.7rem; text-transform: uppercase; }
        .badge-p { background: rgba(16, 185, 129, 0.1); color: var(--success); }
        .badge-f { background: rgba(239, 68, 68, 0.1); color: var(--danger); }
        .badge-parallel { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }
        .badge-sequential { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .browser-badges { display: flex; gap: 6px; margin-top: 10px; }
        .browser-badge { font-size: 1rem; opacity: 0.7; }

        /* Search and Filter */
        .search-bar { display: flex; gap: 12px; margin-bottom: 24px; }
        .search-input { flex: 1; padding: 12px 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; color: var(--text-main); font-size: 0.9rem; }
        .search-input:focus { outline: none; border-color: var(--primary); }
        .filter-btn { padding: 12px 20px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; color: var(--text-muted); cursor: pointer; transition: 0.2s; }
        .filter-btn:hover { border-color: var(--primary); color: var(--text-main); }
        .filter-btn.active { background: var(--primary); color: white; border-color: var(--primary); }

        /* Test Lab Overhaul */
        .suite-container { display: grid; grid-template-columns: 360px 1fr; gap: 24px; height: calc(100vh - 280px); }
        .tc-list { overflow-y: auto; padding-right: 8px; }
        .tc-card {
            background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px;
            padding: 14px 16px; margin-bottom: 10px; cursor: pointer; transition: 0.2s;
        }
        .tc-card:hover { border-color: var(--primary); }
        .tc-card.active { border-color: var(--primary); background: rgba(129, 140, 248, 0.1); }
        .tc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .tc-title { font-size: 0.9rem; font-weight: 600; }
        .tc-status-icon { width: 10px; height: 10px; border-radius: 50%; }
        .tc-status-icon.passed { background: var(--success); box-shadow: 0 0 8px var(--success); }
        .tc-status-icon.failed { background: var(--danger); box-shadow: 0 0 8px var(--danger); }
        .tc-meta { display: flex; gap: 12px; font-size: 0.75rem; color: var(--text-muted); }
        .tc-browser { display: flex; align-items: center; gap: 4px; }
        .tc-category { padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.05); }

        .details-pane { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; }
        .pane-header { padding: 20px 24px; border-bottom: 1px solid var(--border); }
        .pane-title { font-size: 1.1rem; font-weight: 700; }
        .pane-meta { display: flex; gap: 20px; font-size: 0.8rem; color: var(--text-muted); margin-top: 8px; }
        .pane-content { flex-grow: 1; display: grid; grid-template-columns: 380px 1fr; overflow: hidden; }

        .timeline { border-right: 1px solid var(--border); overflow-y: auto; padding: 20px; background: rgba(0,0,0,0.1); }
        .step-item { padding: 14px; border-radius: 10px; cursor: pointer; margin-bottom: 12px; border: 1px solid transparent; position: relative; }
        .step-item.active { border-color: var(--primary); background: rgba(129, 140, 248, 0.05); }
        .step-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .step-number { color: var(--primary); font-family: 'JetBrains Mono'; font-size: 0.7rem; }
        .step-status { width: 8px; height: 8px; border-radius: 50%; }
        .step-status.passed { background: var(--success); }
        .step-status.failed { background: var(--danger); }
        .step-name { font-weight: 600; font-size: 0.85rem; flex: 1; }
        .step-duration { font-size: 0.7rem; color: var(--text-muted); }
        .step-details { font-size: 0.75rem; color: var(--text-muted); margin-top: 8px; }

        .viewer { display: flex; flex-direction: column; background: #000; overflow: hidden; position: relative; }
        .viewer-main { flex-grow: 1; overflow: auto; padding: 20px; text-align: center; }
        .viewer-img { max-width: 100%; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); transition: opacity 0.2s; }
        .viewer-footer { padding: 12px 20px; background: var(--bg-card); display: flex; justify-content: space-between; font-size: 0.75rem; border-top: 1px solid var(--border); }

        /* Error Panel */
        .error-panel { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; padding: 16px; margin-top: 16px; }
        .error-title { color: var(--danger); font-weight: 700; font-size: 0.85rem; margin-bottom: 8px; }
        .error-message { font-family: 'JetBrains Mono'; font-size: 0.8rem; color: var(--text-main); word-break: break-all; }
        .error-stack { margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px; font-family: 'JetBrains Mono'; font-size: 0.7rem; color: var(--text-muted); max-height: 150px; overflow: auto; white-space: pre-wrap; }

        /* Export Button */
        .export-btn { padding: 10px 20px; background: var(--primary); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .export-btn:hover { transform: scale(1.05); box-shadow: 0 4px 12px rgba(129, 140, 248, 0.4); }

        #overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.95); display: none; padding: 40px; overflow: auto; z-index: 1000; cursor: zoom-out; }
    </style>
</head>
<body>

    <aside>
        <div class="nav-icon active" id="btn-dash" onclick="switchTab('dashboard')" title="Analytics"><i class="fa-solid fa-chart-line"></i></div>
        <div class="nav-icon" id="btn-audit" onclick="switchTab('audit')" title="Run History"><i class="fa-solid fa-history"></i></div>
        <div class="nav-icon" id="btn-lab" onclick="switchTab('lab')" title="Test Evidence"><i class="fa-solid fa-microscope"></i></div>
    </aside>

    <main>
        <!-- Analytics Dashboard -->
        <div id="dashboard" class="tab-content active">
            <h1>Infinity Analytics <span style="font-size:0.6em; color:var(--primary)">4.0</span></h1>
            <p class="subtitle">Real-time performance metrics, browser analysis, and stability tracking.</p>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Stability Index</div>
                    <div class="stat-val" style="color:${parseFloat(passRate) >= 90 ? 'var(--success)' : parseFloat(passRate) >= 70 ? 'var(--warning)' : 'var(--danger)'}">${passRate}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Avg. Execution Time</div>
                    <div class="stat-val" style="color:var(--primary)">${avgDuration}ms</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total Executions</div>
                    <div class="stat-val">${total}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Pass / Fail / Skip</div>
                    <div style="display:flex; align-items:center; gap:10px; margin-top:5px">
                        <span style="color:var(--success); font-size:1.3rem; font-weight:700"><i class="fa-solid fa-circle-check"></i> ${passed}</span>
                        <span style="color:var(--danger); font-size:1.3rem; font-weight:700"><i class="fa-solid fa-circle-xmark"></i> ${failed}</span>
                        <span style="color:var(--warning); font-size:1.3rem; font-weight:700"><i class="fa-solid fa-forward"></i> ${skipped}</span>
                    </div>
                </div>
            </div>

            <!-- Charts Grid - Side by Side -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-top:24px">
                <!-- Run Time Chart -->
                <div class="stat-card" style="padding:16px">
                    <div class="stat-label" style="margin-bottom:12px">Run Time by Date (seconds)</div>
                    <div style="height:160px; position:relative">
                        <canvas id="runTimeChart"></canvas>
                    </div>
                </div>

                <!-- Pass/Fail/Skip Chart -->
                <div class="stat-card" style="padding:16px">
                    <div class="stat-label" style="margin-bottom:12px">Test Results by Run</div>
                    <div style="height:160px; position:relative">
                        <canvas id="resultsChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Simple Execution Mode Summary -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-top:24px">
                <div class="stat-card" style="border-left: 4px solid #06b6d4">
                    <div style="display:flex; justify-content:space-between; align-items:center">
                        <div>
                            <div class="stat-label"><i class="fa-solid fa-bolt" style="color:#06b6d4"></i> Parallel Execution</div>
                            <div class="stat-val" style="color:#06b6d4">${(executionMetrics.parallel.avgRunTime / 1000).toFixed(1)}s</div>
                            <div style="font-size:0.8rem; color:var(--text-muted)">${executionMetrics.parallel.totalRuns} runs | ${executionMetrics.parallel.totalTests} tests</div>
                        </div>
                        <div style="text-align:right">
                            <div style="font-size:2rem; font-weight:800; color:${executionMetrics.parallel.passRate >= 90 ? 'var(--success)' : 'var(--danger)'}">${executionMetrics.parallel.passRate}%</div>
                            <div style="font-size:0.75rem; color:var(--text-muted)">pass rate</div>
                        </div>
                    </div>
                </div>
                <div class="stat-card" style="border-left: 4px solid #f59e0b">
                    <div style="display:flex; justify-content:space-between; align-items:center">
                        <div>
                            <div class="stat-label"><i class="fa-solid fa-arrow-right" style="color:#f59e0b"></i> Sequential Execution</div>
                            <div class="stat-val" style="color:#f59e0b">${(executionMetrics.sequential.avgRunTime / 1000).toFixed(1)}s</div>
                            <div style="font-size:0.8rem; color:var(--text-muted)">${executionMetrics.sequential.totalRuns} runs | ${executionMetrics.sequential.totalTests} tests</div>
                        </div>
                        <div style="text-align:right">
                            <div style="font-size:2rem; font-weight:800; color:${executionMetrics.sequential.passRate >= 90 ? 'var(--success)' : 'var(--danger)'}">${executionMetrics.sequential.passRate}%</div>
                            <div style="font-size:0.75rem; color:var(--text-muted)">pass rate</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Speed Comparison -->
            <div class="stat-card" style="margin-top:24px; text-align:center; padding:30px">
                <div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:10px">Performance Gain</div>
                <div style="font-size:3rem; font-weight:800; color:var(--primary)">
                    ${executionMetrics.parallel.avgRunTime > 0 && executionMetrics.sequential.avgRunTime > 0
                      ? ((executionMetrics.sequential.avgRunTime / executionMetrics.parallel.avgRunTime)).toFixed(1) + 'x'
                      : '-'}
                </div>
                <div style="font-size:1rem; color:var(--text-muted)">faster with parallel execution</div>
            </div>

            <!-- Browser Performance (kept but simplified) -->
            <div class="stat-card" style="margin-top:24px">
                <div class="stat-label">Browser Performance</div>
                <table class="browser-table">
                    <thead>
                        <tr>
                            <th>Browser</th>
                            <th>Tests</th>
                            <th>Passed</th>
                            <th>Failed</th>
                            <th>Stability</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${browserStats
                          .map(
                            (b) => `
                        <tr>
                            <td><i class="${BROWSER_INFO[b.browser].icon}" style="color:${BROWSER_INFO[b.browser].color}; margin-right:8px"></i>${BROWSER_INFO[b.browser].name}</td>
                            <td>${b.total}</td>
                            <td style="color:var(--success)">${b.passed}</td>
                            <td style="color:var(--danger)">${b.failed}</td>
                            <td>
                                <div class="stability-bar">
                                    <div class="stability-fill" style="width:${b.stability}%; background:${b.stability >= 90 ? 'var(--success)' : b.stability >= 70 ? 'var(--warning)' : 'var(--danger)'}"></div>
                                </div>
                                <span style="font-size:0.75rem">${b.stability}%</span>
                            </td>
                        </tr>
                        `
                          )
                          .join('')}
                    </tbody>
                </table>
            </div>

        </div>

        <!-- Audit History -->
        <div id="audit" class="tab-content">
            <h1>Execution Runs</h1>
            <p class="subtitle">Grouped execution history. Click a run to inspect detailed evidence.</p>

            <div class="search-bar">
                <input type="text" class="search-input" placeholder="Search by Run ID..." id="runSearch" onkeyup="filterRuns()">
                <button class="filter-btn" onclick="exportHistory()"><i class="fa-solid fa-download"></i> Export JSON</button>
            </div>

            <div class="run-list" id="runList">
                ${sortedRuns
                  .map(
                    (r) => `
                <div class="run-card" onclick="goToRun('${r.id}')" data-runid="${r.id.toLowerCase()}">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
                        <div class="run-id">${r.id}</div>
                        <span class="badge ${r.executionMode === 'parallel' ? 'badge-parallel' : 'badge-sequential'}">${r.executionMode === 'parallel' ? '<i class="fa-solid fa-bolt"></i> Parallel' : '<i class="fa-solid fa-arrow-right"></i> Sequential'}</span>
                    </div>
                    <div style="font-size:0.8rem; opacity:0.6">${formatTimestamp(r.timestamp)}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px"><i class="fa-solid fa-clock"></i> ${(r.wallClockTime / 1000).toFixed(1)}s total</div>
                    <div class="browser-badges">
                        ${r.browsers.map((b: BrowserType) => `<i class="${BROWSER_INFO[b].icon} browser-badge" style="color:${BROWSER_INFO[b].color}" title="${BROWSER_INFO[b].name}"></i>`).join('')}
                    </div>
                    <div class="run-meta">
                        <div>Tests: <b>${r.results.length}</b></div>
                        <div>
                            <span class="badge badge-p">${r.passed} PASS</span>
                            <span class="badge badge-f">${r.failed} FAIL</span>
                        </div>
                    </div>
                </div>
                `
                  )
                  .join('')}
            </div>
        </div>

        <!-- Test Lab -->
        <div id="lab" class="tab-content">
            <h1>Test Evidence Hub</h1>
            <p class="subtitle">Showing: <b id="currentRunName">${sortedRuns[0]?.id || 'No runs available'}</b> <span id="currentRunMode" class="badge ${sortedRuns[0]?.executionMode === 'parallel' ? 'badge-parallel' : 'badge-sequential'}">${sortedRuns[0]?.executionMode === 'parallel' ? '<i class="fa-solid fa-bolt"></i> Parallel' : '<i class="fa-solid fa-arrow-right"></i> Sequential'}</span></p>

            <div class="search-bar">
                <input type="text" class="search-input" placeholder="Filter tests..." id="testSearch" onkeyup="filterTests()">
                <button class="filter-btn" id="filterAll" onclick="setFilter('all')">All</button>
                <button class="filter-btn" id="filterPassed" onclick="setFilter('passed')">Passed</button>
                <button class="filter-btn" id="filterFailed" onclick="setFilter('failed')">Failed</button>
            </div>

            <div class="suite-container">
                <div class="tc-list" id="tcList"></div>
                <div class="details-pane" id="detailsPane">
                    <div class="pane-header">
                        <div class="pane-title" id="tcName">Select a test scenario...</div>
                        <div class="pane-meta" id="tcMeta"></div>
                    </div>
                    <div class="pane-content">
                        <div class="timeline" id="timeline"></div>
                        <div class="viewer">
                            <div class="viewer-main">
                                <img src="" id="mainImg" class="viewer-img" onclick="openZoom()">
                            </div>
                            <div class="viewer-footer">
                                <span id="stepName">Step Evidence</span>
                                <span style="color:var(--primary); cursor:pointer; font-weight:700" onclick="openZoom()">FULL VIEW <i class="fa-solid fa-expand"></i></span>
                            </div>
                        </div>
                    </div>
                    <div id="errorPanel"></div>
                </div>
            </div>
        </div>
    </main>

    <div id="overlay" onclick="closeZoom()"><img id="zoomImg" style="width:100%"></div>

    <script>
        const historyData = ${JSON.stringify(history)};
        const runGroups = ${JSON.stringify(runs)};
        const browserInfo = ${JSON.stringify(BROWSER_INFO)};
        let currentRun = '${sortedRuns[0]?.id || ''}';
        let currentFilter = 'all';

        function switchTab(id) {
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.nav-icon').forEach(n => n.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            const btnId = id === 'dashboard' ? 'btn-dash' : id === 'audit' ? 'btn-audit' : 'btn-lab';
            document.getElementById(btnId).classList.add('active');
        }

        function goToRun(id) {
            currentRun = id;
            const run = runGroups[id];
            document.getElementById('currentRunName').innerText = id;
            // Update execution mode badge
            const modeEl = document.getElementById('currentRunMode');
            if (run && modeEl) {
                const isParallel = run.executionMode === 'parallel';
                modeEl.className = 'badge ' + (isParallel ? 'badge-parallel' : 'badge-sequential');
                modeEl.innerHTML = isParallel ? '<i class="fa-solid fa-bolt"></i> Parallel' : '<i class="fa-solid fa-arrow-right"></i> Sequential';
            }
            updateTCList();
            switchTab('lab');
        }

        function setFilter(filter) {
            currentFilter = filter;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('filter' + filter.charAt(0).toUpperCase() + filter.slice(1)).classList.add('active');
            updateTCList();
        }

        function filterRuns() {
            const search = document.getElementById('runSearch').value.toLowerCase();
            document.querySelectorAll('.run-card').forEach(card => {
                const runId = card.getAttribute('data-runid');
                card.style.display = runId.includes(search) ? 'block' : 'none';
            });
        }

        function filterTests() {
            const search = document.getElementById('testSearch').value.toLowerCase();
            document.querySelectorAll('.tc-card').forEach(card => {
                const text = card.innerText.toLowerCase();
                const matchesSearch = text.includes(search);
                const matchesFilter = currentFilter === 'all' || card.getAttribute('data-status') === currentFilter;
                card.style.display = matchesSearch && matchesFilter ? 'block' : 'none';
            });
        }

        function exportHistory() {
            const dataStr = JSON.stringify(historyData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'test-execution-history.json';
            a.click();
        }

        function updateTCList() {
            const run = runGroups[currentRun];
            if (!run) return;

            const list = document.getElementById('tcList');
            const filteredResults = run.results.filter(r => {
                if (currentFilter === 'all') return true;
                return r.status === currentFilter;
            });

            list.innerHTML = filteredResults.map(r => {
                const browser = r.browser || 'chromium';
                const category = r.category || 'Other';
                return \`
                <div class="tc-card" onclick="viewTest('\${r.testId}', '\${r.browser || 'chromium'}')" data-id="\${r.testId}-\${browser}" data-status="\${r.status}">
                    <div class="tc-header">
                        <span class="tc-title">\${r.testId}: \${r.testName}</span>
                        <div class="tc-status-icon \${r.status}"></div>
                    </div>
                    <div class="tc-meta">
                        <span class="tc-browser"><i class="\${browserInfo[browser].icon}" style="color:\${browserInfo[browser].color}"></i> \${browserInfo[browser].name}</span>
                        <span class="tc-category">\${category}</span>
                        <span>\${r.duration}ms</span>
                    </div>
                </div>
            \`}).join('');

            if (filteredResults.length > 0) {
                viewTest(filteredResults[0].testId, filteredResults[0].browser || 'chromium');
            }
        }

        function viewTest(testId, browser) {
            const run = runGroups[currentRun];
            const result = run.results.find(r => r.testId === testId && (r.browser || 'chromium') === browser);
            if (!result) return;

            document.querySelectorAll('.tc-card').forEach(c => c.classList.remove('active'));
            const activeCard = document.querySelector(\`.tc-card[data-id="\${testId}-\${browser}"]\`);
            if (activeCard) activeCard.classList.add('active');

            document.getElementById('tcName').innerText = result.testName;
            document.getElementById('tcMeta').innerHTML = \`
                <span><i class="fa-solid fa-clock"></i> \${result.duration}ms</span>
                <span><i class="\${browserInfo[result.browser || 'chromium'].icon}" style="color:\${browserInfo[result.browser || 'chromium'].color}"></i> \${browserInfo[result.browser || 'chromium'].name}</span>
                <span><i class="fa-solid fa-folder"></i> \${result.category || 'Other'}</span>
                <span class="badge \${result.status === 'passed' ? 'badge-p' : 'badge-f'}">\${result.status.toUpperCase()}</span>
            \`;

            // Clear error panel - will be shown when failed step is selected
            document.getElementById('errorPanel').innerHTML = '';

            const timeline = document.getElementById('timeline');
            timeline.innerHTML = result.steps.map((s, i) => \`
                <div class="step-item" id="step-\${i}" onclick="setStep(\${i}, '\${testId}', '\${browser}')">
                    <div class="step-header">
                        <span class="step-number">STEP \${String(i+1).padStart(2, '0')}</span>
                        <div class="step-status \${s.status || 'passed'}"></div>
                        <span class="step-name">\${s.name}</span>
                        <span class="step-duration">\${s.duration || 0}ms</span>
                    </div>
                    <div class="step-details">
                        \${s.expected ? \`<div><b>Expected:</b> \${s.expected}</div>\` : ''}
                        \${s.actual ? \`<div><b>Actual:</b> \${s.actual}</div>\` : ''}
                    </div>
                </div>
            \`).join('');

            if (result.steps.length > 0) setStep(0, testId, browser);
        }

        const noScreenshotPlaceholder = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%231e293b" width="400" height="300"/><text fill="%2394a3b8" x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="sans-serif">Screenshot Not Available</text><text fill="%23475569" x="50%" y="60%" text-anchor="middle" font-size="12" font-family="sans-serif">(File may have been overwritten by newer run)</text></svg>';

        function setStep(idx, testId, browser) {
            const run = runGroups[currentRun];
            const result = run.results.find(r => r.testId === testId && (r.browser || 'chromium') === browser);
            const step = result.steps[idx];

            document.querySelectorAll('.step-item').forEach(s => s.classList.remove('active'));
            document.getElementById('step-' + idx).classList.add('active');

            const img = document.getElementById('mainImg');
            img.style.opacity = '0';

            // Add error handler for missing screenshots
            img.onerror = function() {
                this.src = noScreenshotPlaceholder;
            };

            setTimeout(() => {
                img.src = step.screenshot || noScreenshotPlaceholder;
                img.style.opacity = '1';
                document.getElementById('stepName').innerText = 'Step ' + String(idx+1).padStart(2, '0') + ' | ' + step.name;
            }, 100);

            // Show error panel only for failed steps
            const errorPanel = document.getElementById('errorPanel');
            if (step.status === 'failed' && (step.error || result.error)) {
                const err = step.error || result.error;
                errorPanel.innerHTML = \`
                    <div class="error-panel" style="margin:20px">
                        <div class="error-title"><i class="fa-solid fa-bug"></i> Error Details</div>
                        <div class="error-message">\${err.message || 'Step failed'}</div>
                        \${err.stack ? \`<div class="error-stack">\${err.stack}</div>\` : ''}
                    </div>
                \`;
            } else {
                errorPanel.innerHTML = '';
            }
        }

        function openZoom() {
            document.getElementById('zoomImg').src = document.getElementById('mainImg').src;
            document.getElementById('overlay').style.display = 'block';
        }
        function closeZoom() { document.getElementById('overlay').style.display = 'none'; }

        // Run Time Chart Data - Simple run time by date with execution mode
        const runTimeData = ${JSON.stringify(
          sortedRuns.slice(0, 10).reverse().map((r) => ({
            label: new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            runId: r.id,
            runTime: (r.wallClockTime / 1000).toFixed(1),
            mode: r.executionMode,
            passed: r.passed,
            failed: r.failed,
            total: r.results.length,
          }))
        )};

        // Run Time Bar Chart - Color coded by execution mode (Cyan for parallel, Orange for sequential)
        new Chart(document.getElementById('runTimeChart'), {
            type: 'bar',
            data: {
                labels: runTimeData.map(r => r.label),
                datasets: [{
                    label: 'Run Time (seconds)',
                    data: runTimeData.map(r => parseFloat(r.runTime)),
                    backgroundColor: runTimeData.map(r => r.mode === 'parallel' ? '#06b6d4' : '#f59e0b'),
                    borderRadius: 4,
                    borderSkipped: false,
                    barThickness: 32,
                    maxBarThickness: 40,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (items) => runTimeData[items[0].dataIndex].runId,
                            label: (item) => {
                                const d = runTimeData[item.dataIndex];
                                return [
                                    'Run Time: ' + d.runTime + 's',
                                    'Mode: ' + (d.mode === 'parallel' ? 'Parallel ⚡' : 'Sequential →'),
                                    'Tests: ' + d.passed + ' passed / ' + d.failed + ' failed'
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#94a3b8', font: { size: 9 }, maxRotation: 0 },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Seconds', color: '#64748b', font: { size: 10 } },
                        ticks: { color: '#94a3b8', font: { size: 9 } },
                        grid: { color: 'rgba(255,255,255,0.03)' }
                    }
                }
            }
        });

        // Legend for run time chart
        document.getElementById('runTimeChart').insertAdjacentHTML('afterend',
            '<div style="display:flex; justify-content:center; gap:20px; margin-top:8px; font-size:0.7rem; color:#94a3b8">' +
            '<span><span style="display:inline-block;width:8px;height:8px;background:#06b6d4;border-radius:2px;margin-right:4px"></span>Parallel</span>' +
            '<span><span style="display:inline-block;width:8px;height:8px;background:#f59e0b;border-radius:2px;margin-right:4px"></span>Sequential</span>' +
            '</div>'
        );

        // Pass/Fail Stacked Bar Chart (Green for passed, Red for failed)
        new Chart(document.getElementById('resultsChart'), {
            type: 'bar',
            data: {
                labels: runTimeData.map(r => r.label),
                datasets: [
                    {
                        label: 'Passed',
                        data: runTimeData.map(r => r.passed),
                        backgroundColor: '#22c55e',
                        borderRadius: 2,
                    },
                    {
                        label: 'Failed',
                        data: runTimeData.map(r => r.failed),
                        backgroundColor: '#ef4444',
                        borderRadius: 2,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { color: '#94a3b8', boxWidth: 8, boxHeight: 8, padding: 12, font: { size: 10 } }
                    },
                    tooltip: {
                        callbacks: {
                            title: (items) => runTimeData[items[0].dataIndex].runId,
                            afterBody: (items) => {
                                const d = runTimeData[items[0].dataIndex];
                                return 'Total: ' + d.total + ' tests';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        ticks: { color: '#94a3b8', font: { size: 9 }, maxRotation: 0 },
                        grid: { display: false }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: { display: true, text: 'Tests', color: '#64748b', font: { size: 10 } },
                        ticks: { color: '#94a3b8', font: { size: 9 } },
                        grid: { color: 'rgba(255,255,255,0.03)' }
                    }
                }
            }
        });

        // Init
        setFilter('all');
        updateTCList();
    </script>
</body>
</html>`;

  fs.writeFileSync(REPORT_FILE, html);
  // eslint-disable-next-line no-console
  console.log('✅ Infinity Dashboard 4.0 Generated Successfully!');
}

generateReport();
