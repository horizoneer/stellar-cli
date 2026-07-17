/**
 * Offline mode with extended caching
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class OfflineCache {
  private cacheDir: string;
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTTL: number = 86400000; // 24 hours in milliseconds

  constructor() {
    this.cacheDir = path.join(os.homedir(), '.stellar-cli', 'cache');
    this.ensureCacheDir();
    this.loadCacheFromDisk();
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Load cache from disk
   */
  private loadCacheFromDisk(): void {
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const entry = JSON.parse(content) as CacheEntry<unknown>;
          
          // Check if entry is still valid
          if (entry.expiresAt > Date.now()) {
            const key = file.replace('.json', '');
            this.memoryCache.set(key, entry);
          } else {
            // Remove expired file
            fs.unlinkSync(filePath);
          }
        }
      }
    } catch (error) {
      // Ignore errors during cache loading
    }
  }

  /**
   * Save cache entry to disk
   */
  private saveToDisk(key: string, entry: CacheEntry<unknown>): void {
    const filePath = path.join(this.cacheDir, `${key}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(entry));
    } catch (error) {
      // Ignore disk write errors
    }
  }

  /**
   * Remove cache entry from disk
   */
  private removeFromDisk(key: string): void {
    const filePath = path.join(this.cacheDir, `${key}.json`);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      // Ignore disk delete errors
    }
  }

  /**
   * Generate cache key
   */
  private generateKey(prefix: string, identifier: string): string {
    return `${prefix}:${identifier}`;
  }

  /**
   * Get cached data
   */
  get<T>(prefix: string, identifier: string): T | null {
    const key = this.generateKey(prefix, identifier);
    const entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(prefix, identifier);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached data
   */
  set<T>(prefix: string, identifier: string, data: T, ttl?: number): void {
    const key = this.generateKey(prefix, identifier);
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + (ttl || this.defaultTTL),
    };

    this.memoryCache.set(key, entry);
    this.saveToDisk(key, entry);
  }

  /**
   * Delete cached data
   */
  delete(prefix: string, identifier: string): void {
    const key = this.generateKey(prefix, identifier);
    this.memoryCache.delete(key);
    this.removeFromDisk(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
      }
    } catch (error) {
      // Ignore errors during cache clearing
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memorySize: number;
    diskSize: number;
    entries: number;
  } {
    let diskSize = 0;
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          const stats = fs.statSync(filePath);
          diskSize += stats.size;
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return {
      memorySize: this.memoryCache.size,
      diskSize,
      entries: this.memoryCache.size,
    };
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.memoryCache.delete(key);
      this.removeFromDisk(key);
    }
  }

  /**
   * Check if offline mode is available (has cached data)
   */
  hasCachedData(prefix?: string): boolean {
    if (prefix) {
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(prefix)) {
          return true;
        }
      }
      return false;
    }
    return this.memoryCache.size > 0;
  }
}

// Singleton instance
export const offlineCache = new OfflineCache();

/**
 * Execute function with offline fallback
 */
export async function withOfflineFallback<T>(
  prefix: string,
  identifier: string,
  onlineFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try to get from cache first
  const cached = offlineCache.get<T>(prefix, identifier);
  if (cached) {
    return cached;
  }

  // Fetch from online source
  const data = await onlineFn();
  
  // Cache the result
  offlineCache.set(prefix, identifier, data, ttl);
  
  return data;
}
