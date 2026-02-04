/**
 * Configuration loader for the MCP CLI tool.
 * Handles loading config from config.json in the application config directory and resolving environment variables.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { DEFAULT_SETTINGS, type CliSettings, type McpCliConfig, type ServerConfig } from "./types";
import { AppContext } from "@pablozaiden/terminatui";

/**
 * Gets the path to the main configuration file.
 */
export function getConfigPath(): string {
  return join(AppContext.current.getConfigDir(), "config.json");
}

/**
 * Gets the path to the cache directory.
 */
export function getCacheDir(): string {
  return join(AppContext.current.getConfigDir(), "cache");
}

/**
 * Ensures the config directory exists.
 */
export function ensureConfigDir(): void {
  const configDir = AppContext.current.getConfigDir();
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
}

/**
 * Ensures the cache directory exists.
 */
export function ensureCacheDir(): void {
  const cacheDir = getCacheDir();
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
}

/**
 * Resolves environment variable references in a string.
 * Supports $VAR_NAME and ${VAR_NAME} syntax.
 */
export function resolveEnvVars(value: string): string {
  // Match both $VAR_NAME and ${VAR_NAME} patterns
  return value.replace(/\$\{([^}]+)\}|\$([A-Z_][A-Z0-9_]*)/gi, (_match, bracedName, simpleName) => {
    const varName = bracedName || simpleName;
    const envValue = process.env[varName];
    if (envValue === undefined) {
      // Return empty string if env var is not set
      return "";
    }
    return envValue;
  });
}

/**
 * Resolves environment variables in a record of strings.
 */
export function resolveEnvVarsInRecord(record: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    resolved[key] = resolveEnvVars(value);
  }
  return resolved;
}

/**
 * Resolves environment variables in a server configuration.
 */
export function resolveServerConfig(config: ServerConfig): ServerConfig {
  if (config.transport === "stdio") {
    return {
      ...config,
      args: config.args?.map(resolveEnvVars),
      env: config.env ? resolveEnvVarsInRecord(config.env) : undefined,
      cwd: config.cwd ? resolveEnvVars(config.cwd) : undefined,
    };
  } else {
    return {
      ...config,
      url: resolveEnvVars(config.url),
      headers: config.headers ? resolveEnvVarsInRecord(config.headers) : undefined,
    };
  }
}

/**
 * Loads the configuration from the config file.
 * Returns a default empty configuration if the file doesn't exist.
 */
export function loadConfig(): McpCliConfig {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return {
      servers: {},
      settings: DEFAULT_SETTINGS,
    };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as McpCliConfig;

    // Merge with defaults
    return {
      servers: config.servers || {},
      settings: {
        ...DEFAULT_SETTINGS,
        ...config.settings,
      },
    };
  } catch (error) {
    throw new Error(`Failed to load config from ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Saves the configuration to the config file.
 */
export function saveConfig(config: McpCliConfig): void {
  ensureConfigDir();
  const configPath = getConfigPath();

  try {
    const content = JSON.stringify(config, null, 2);
    writeFileSync(configPath, content, "utf-8");
  } catch (error) {
    throw new Error(`Failed to save config to ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gets the current settings, loading from config if needed.
 */
export function getSettings(): CliSettings {
  const config = loadConfig();
  return config.settings || DEFAULT_SETTINGS;
}

/**
 * Updates settings in the config file.
 */
export function updateSettings(updates: Partial<CliSettings>): CliSettings {
  const config = loadConfig();
  const newSettings = {
    ...DEFAULT_SETTINGS,
    ...config.settings,
    ...updates,
  };
  config.settings = newSettings;
  saveConfig(config);
  return newSettings;
}

/**
 * Gets all enabled servers from the configuration.
 */
export function getEnabledServers(): Record<string, ServerConfig> {
  const config = loadConfig();
  const enabledServers: Record<string, ServerConfig> = {};

  for (const [name, serverConfig] of Object.entries(config.servers)) {
    if (serverConfig.enabled !== false) {
      enabledServers[name] = serverConfig;
    }
  }

  return enabledServers;
}

/**
 * Gets a specific server configuration by name.
 */
export function getServerConfig(name: string): ServerConfig | undefined {
  const config = loadConfig();
  return config.servers[name];
}

/**
 * Adds a new server to the configuration.
 * Returns true if the server was added, false if it already exists.
 */
export function addServer(name: string, serverConfig: ServerConfig): boolean {
  const config = loadConfig();

  if (config.servers[name]) {
    return false;
  }

  config.servers[name] = serverConfig;
  saveConfig(config);
  return true;
}

/**
 * Updates an existing server in the configuration.
 * Returns true if the server was updated, false if it doesn't exist.
 */
export function updateServer(name: string, serverConfig: ServerConfig): boolean {
  const config = loadConfig();

  if (!config.servers[name]) {
    return false;
  }

  config.servers[name] = serverConfig;
  saveConfig(config);
  return true;
}

/**
 * Removes a server from the configuration.
 * Returns true if the server was removed, false if it doesn't exist.
 */
export function removeServer(name: string): boolean {
  const config = loadConfig();

  if (!config.servers[name]) {
    return false;
  }

  delete config.servers[name];
  saveConfig(config);
  return true;
}

/**
 * Enables a server in the configuration.
 * Returns true if the server was enabled, false if it doesn't exist.
 */
export function enableServer(name: string): boolean {
  const config = loadConfig();

  if (!config.servers[name]) {
    return false;
  }

  config.servers[name].enabled = true;
  saveConfig(config);
  return true;
}

/**
 * Disables a server in the configuration.
 * Returns true if the server was disabled, false if it doesn't exist.
 */
export function disableServer(name: string): boolean {
  const config = loadConfig();

  if (!config.servers[name]) {
    return false;
  }

  config.servers[name].enabled = false;
  saveConfig(config);
  return true;
}

/**
 * Gets all servers from the configuration (including disabled).
 */
export function getAllServers(): Record<string, ServerConfig> {
  const config = loadConfig();
  return config.servers;
}

/**
 * Creates an example configuration file if none exists.
 */
export function createExampleConfig(): boolean {
  const configPath = getConfigPath();

  if (existsSync(configPath)) {
    return false;
  }

  const exampleConfig: McpCliConfig = {
    servers: {
      // Memory server - simple key-value store, works with bunx
      memory: {
        transport: "stdio",
        command: "bunx",
        args: ["-y", "@modelcontextprotocol/server-memory"],
        description: "Simple key-value memory store",
      },
      // Filesystem server - file operations
      filesystem: {
        transport: "stdio",
        command: "bunx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", process.env["HOME"] || "/tmp"],
        description: "File system operations",
      },
      // Everything server - demo server with many tools for testing
      everything: {
        transport: "stdio",
        command: "bunx",
        args: ["-y", "@modelcontextprotocol/server-everything"],
        description: "Demo server with sample tools for testing",
      },
      // Fetch server - web content fetching and conversion
      fetch: {
        transport: "stdio",
        command: "bunx",
        args: ["-y", "@modelcontextprotocol/server-fetch"],
        description: "Fetch and convert web content for LLM usage",
      },
      // Time server - time and timezone conversion
      time: {
        transport: "stdio",
        command: "bunx",
        args: ["-y", "@anthropic-ai/server-time"],
        description: "Time and timezone conversion capabilities",
      },
    },
    settings: {
      cacheEnabled: true,
      cacheTtlMs: 4 * 60 * 60 * 1000,
    },
  };

  ensureConfigDir();
  saveConfig(exampleConfig);
  return true;
}
