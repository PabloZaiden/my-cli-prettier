/**
 * Cache manager for MCP tool definitions.
 * Caches tool lists from MCP servers with a configurable TTL.
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from "fs";
import { join } from "path";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ensureCacheDir, getCacheDir, getSettings } from "./loader";

/**
 * Cached tool data for a server.
 */
interface CachedToolData {
  /** Timestamp when the cache was created */
  cachedAt: number;
  /** The cached tools */
  tools: Tool[];
  /** Server info (name, version) */
  serverInfo?: {
    name?: string;
    version?: string;
  };
}

/**
 * Gets the cache file path for a server.
 */
function getCacheFilePath(serverName: string): string {
  // Sanitize server name for use as filename
  const safeName = serverName.replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(getCacheDir(), `${safeName}.json`);
}

/**
 * Checks if the cache is still valid based on TTL.
 */
function isCacheValid(cachedAt: number, ttlMs: number): boolean {
  const now = Date.now();
  return now - cachedAt < ttlMs;
}

/**
 * Gets cached tools for a server.
 * Returns undefined if cache doesn't exist, is disabled, or has expired.
 */
export function getCachedTools(serverName: string): Tool[] | undefined {
  const settings = getSettings();

  if (!settings.cacheEnabled) {
    return undefined;
  }

  const cachePath = getCacheFilePath(serverName);

  if (!existsSync(cachePath)) {
    return undefined;
  }

  try {
    const content = readFileSync(cachePath, "utf-8");
    const data = JSON.parse(content) as CachedToolData;

    if (!isCacheValid(data.cachedAt, settings.cacheTtlMs)) {
      // Cache expired, remove it
      unlinkSync(cachePath);
      return undefined;
    }

    return data.tools;
  } catch {
    // Invalid cache file, remove it
    try {
      unlinkSync(cachePath);
    } catch {
      // Ignore errors when removing
    }
    return undefined;
  }
}

/**
 * Caches tools for a server.
 */
export function setCachedTools(
  serverName: string,
  tools: Tool[],
  serverInfo?: { name?: string; version?: string }
): void {
  const settings = getSettings();

  if (!settings.cacheEnabled) {
    return;
  }

  ensureCacheDir();
  const cachePath = getCacheFilePath(serverName);

  const data: CachedToolData = {
    cachedAt: Date.now(),
    tools,
    serverInfo,
  };

  try {
    const content = JSON.stringify(data, null, 2);
    writeFileSync(cachePath, content, "utf-8");
  } catch {
    // Silently fail if we can't write cache
  }
}

/**
 * Clears the cache for a specific server.
 */
export function clearServerCache(serverName: string): boolean {
  const cachePath = getCacheFilePath(serverName);

  if (!existsSync(cachePath)) {
    return false;
  }

  try {
    unlinkSync(cachePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears all cached data.
 */
export function clearAllCache(): number {
  const cacheDir = getCacheDir();

  if (!existsSync(cacheDir)) {
    return 0;
  }

  let count = 0;
  try {
    const files = readdirSync(cacheDir);
    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          unlinkSync(join(cacheDir, file));
          count++;
        } catch {
          // Ignore errors when removing individual files
        }
      }
    }
  } catch {
    // Ignore errors when reading directory
  }

  return count;
}

/**
 * Gets cache statistics.
 */
export function getCacheStats(): {
  enabled: boolean;
  ttlMs: number;
  ttlHours: number;
  cachedServers: string[];
  totalCachedTools: number;
} {
  const settings = getSettings();
  const cacheDir = getCacheDir();
  const cachedServers: string[] = [];
  let totalCachedTools = 0;

  if (existsSync(cacheDir)) {
    try {
      const files = readdirSync(cacheDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const serverName = file.replace(/\.json$/, "").replace(/_/g, "-");
          try {
            const content = readFileSync(join(cacheDir, file), "utf-8");
            const data = JSON.parse(content) as CachedToolData;
            if (isCacheValid(data.cachedAt, settings.cacheTtlMs)) {
              cachedServers.push(serverName);
              totalCachedTools += data.tools.length;
            }
          } catch {
            // Ignore invalid cache files
          }
        }
      }
    } catch {
      // Ignore errors when reading directory
    }
  }

  return {
    enabled: settings.cacheEnabled,
    ttlMs: settings.cacheTtlMs,
    ttlHours: settings.cacheTtlMs / (60 * 60 * 1000),
    cachedServers,
    totalCachedTools,
  };
}
