/**
 * Progress bar utility for batch operations
 */

import cliProgress from 'cli-progress';

export interface ProgressOptions {
  title?: string;
  total: number;
  hideCursor?: boolean;
}

/**
 * Create a multi-progress bar for batch operations
 */
export class BatchProgress {
  private multiBar: cliProgress.MultiBar;
  private bars: Map<string, cliProgress.SingleBar> = new Map();

  constructor() {
    this.multiBar = new cliProgress.MultiBar({
      clearOnComplete: false,
      hideCursor: true,
      format: '{bar} | {percentage}% | {value}/{total} | {label}',
    }, cliProgress.Presets.shades_classic);
  }

  /**
   * Create a new progress bar
   */
  createBar(id: string, total: number, label: string): cliProgress.SingleBar {
    const bar = this.multiBar.create(total, 0, { label });
    this.bars.set(id, bar);
    return bar;
  }

  /**
   * Update a progress bar
   */
  updateBar(id: string, value: number, label?: string): void {
    const bar = this.bars.get(id);
    if (bar) {
      bar.update(value, label ? { label } : undefined);
    }
  }

  /**
   * Increment a progress bar
   */
  incrementBar(id: string, delta: number = 1, label?: string): void {
    const bar = this.bars.get(id);
    if (bar) {
      bar.increment(delta, label ? { label } : undefined);
    }
  }

  /**
   * Complete a progress bar
   */
  completeBar(id: string, label?: string): void {
    const bar = this.bars.get(id);
    if (bar) {
      bar.update(bar.getTotal(), label ? { label } : undefined);
      bar.stop();
      this.bars.delete(id);
    }
  }

  /**
   * Stop all progress bars
   */
  stopAll(): void {
    this.multiBar.stop();
    this.bars.clear();
  }
}

/**
 * Create a simple single progress bar
 */
export function createProgressBar(options: ProgressOptions): cliProgress.SingleBar {
  const bar = new cliProgress.SingleBar({
    format: options.title 
      ? `${options.title} | {bar} | {percentage}% | {value}/{total}`
      : '{bar} | {percentage}% | {value}/{total}',
    hideCursor: options.hideCursor ?? true,
  }, cliProgress.Presets.shades_classic);

  return bar;
}

/**
 * Execute an async function with progress tracking
 */
export async function withProgress<T>(
  total: number,
  fn: (progress: (current: number) => void) => Promise<T>,
  label: string = 'Processing'
): Promise<T> {
  const bar = createProgressBar({ title: label, total });
  bar.start(total, 0);

  try {
    const result = await fn((current) => {
      bar.update(current);
    });
    bar.stop();
    return result;
  } catch (error) {
    bar.stop();
    throw error;
  }
}

/**
 * Process an array with progress tracking
 */
export async function processArrayWithProgress<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  label: string = 'Processing items'
): Promise<R[]> {
  const results: R[] = [];
  const bar = createProgressBar({ title: label, total: items.length });
  bar.start(items.length, 0);

  try {
    for (let i = 0; i < items.length; i++) {
      const result = await processor(items[i], i);
      results.push(result);
      bar.update(i + 1);
    }
    bar.stop();
    return results;
  } catch (error) {
    bar.stop();
    throw error;
  }
}
