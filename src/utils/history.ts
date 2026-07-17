/**
 * Command history persistence utility
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

interface HistoryEntry {
  command: string;
  timestamp: number;
  directory: string;
}

class CommandHistory {
  private historyFile: string;
  private history: HistoryEntry[] = [];
  private maxHistory: number = 1000;

  constructor() {
    const historyDir = path.join(os.homedir(), '.stellar-cli');
    this.historyFile = path.join(historyDir, 'history.json');
    this.ensureHistoryFile();
    this.loadHistory();
  }

  /**
   * Ensure history file and directory exist
   */
  private ensureHistoryFile(): void {
    const historyDir = path.dirname(this.historyFile);
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    if (!fs.existsSync(this.historyFile)) {
      fs.writeFileSync(this.historyFile, JSON.stringify([]));
    }
  }

  /**
   * Load history from file
   */
  private loadHistory(): void {
    try {
      const content = fs.readFileSync(this.historyFile, 'utf-8');
      this.history = JSON.parse(content);
    } catch (error) {
      this.history = [];
    }
  }

  /**
   * Save history to file
   */
  private saveHistory(): void {
    try {
      fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2));
    } catch (error) {
      // Ignore save errors
    }
  }

  /**
   * Add a command to history
   */
  add(command: string): void {
    // Skip empty commands and duplicates of the last command
    if (!command || command.trim() === '') {
      return;
    }

    if (this.history.length > 0 && this.history[this.history.length - 1].command === command) {
      return;
    }

    const entry: HistoryEntry = {
      command,
      timestamp: Date.now(),
      directory: process.cwd(),
    };

    this.history.push(entry);

    // Trim history if it exceeds max size
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    this.saveHistory();
  }

  /**
   * Get all history
   */
  getAll(): HistoryEntry[] {
    return [...this.history];
  }

  /**
   * Get recent history
   */
  getRecent(count: number = 10): HistoryEntry[] {
    return this.history.slice(-count);
  }

  /**
   * Search history by command pattern
   */
  search(pattern: string): HistoryEntry[] {
    const regex = new RegExp(pattern, 'i');
    return this.history.filter(entry => regex.test(entry.command));
  }

  /**
   * Get history for a specific directory
   */
  getForDirectory(directory: string): HistoryEntry[] {
    return this.history.filter(entry => entry.directory === directory);
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.saveHistory();
  }

  /**
   * Clear history older than specified days
   */
  clearOlderThan(days: number): void {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    this.history = this.history.filter(entry => entry.timestamp > cutoff);
    this.saveHistory();
  }

  /**
   * Get history statistics
   */
  getStats(): {
    totalCommands: number;
    uniqueCommands: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
    mostUsedCommands: Array<{ command: string; count: number }>;
  } {
    if (this.history.length === 0) {
      return {
        totalCommands: 0,
        uniqueCommands: 0,
        oldestEntry: null,
        newestEntry: null,
        mostUsedCommands: [],
      };
    }

    const commandCounts = new Map<string, number>();
    for (const entry of this.history) {
      const count = commandCounts.get(entry.command) || 0;
      commandCounts.set(entry.command, count + 1);
    }

    const mostUsedCommands = Array.from(commandCounts.entries())
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCommands: this.history.length,
      uniqueCommands: commandCounts.size,
      oldestEntry: new Date(this.history[0].timestamp),
      newestEntry: new Date(this.history[this.history.length - 1].timestamp),
      mostUsedCommands,
    };
  }
}

// Singleton instance
export const commandHistory = new CommandHistory();

/**
 * Hook to automatically track commands
 */
export function trackCommand(command: string): void {
  commandHistory.add(command);
}
