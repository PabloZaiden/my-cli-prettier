/**
 * Configuration types for the MCP CLI tool.
 */

/**
 * Base configuration for all MCP server types.
 */
export interface BaseServerConfig {
  /** Human-readable description of the server */
  description?: string;
  /** Whether the server is enabled (defaults to true) */
  enabled?: boolean;
}

/**
 * Configuration for stdio-based MCP servers (local processes).
 */
export interface StdioServerConfig extends BaseServerConfig {
  transport: "stdio";
  /** Command to execute (e.g., "npx", "uvx", "python") */
  command: string;
  /** Arguments to pass to the command */
  args?: string[];
  /** Environment variables for the process. Use $VAR_NAME to reference system env vars */
  env?: Record<string, string>;
  /** Working directory for the process */
  cwd?: string;
}

/**
 * Configuration for HTTP-based MCP servers (remote servers).
 */
export interface HttpServerConfig extends BaseServerConfig {
  transport: "http";
  /** URL of the MCP server endpoint */
  url: string;
  /** HTTP headers to include in requests. Use $VAR_NAME to reference system env vars */
  headers?: Record<string, string>;
}

/**
 * Union type for all server configurations.
 */
export type ServerConfig = StdioServerConfig | HttpServerConfig;

/**
 * Settings for the CLI tool.
 */
export interface CliSettings {
  /** Whether to cache tool definitions from MCP servers */
  cacheEnabled: boolean;
  /** Cache TTL in milliseconds (default: 4 hours) */
  cacheTtlMs: number;
}

/**
 * Root configuration for the MCP CLI tool.
 */
export interface McpCliConfig {
  /** MCP server configurations keyed by server name */
  servers: Record<string, ServerConfig>;
  /** CLI settings */
  settings?: CliSettings;
}

/**
 * Default settings for the CLI tool.
 */
export const DEFAULT_SETTINGS: CliSettings = {
  cacheEnabled: true,
  cacheTtlMs: 4 * 60 * 60 * 1000, // 4 hours
};

/**
 * Type guard to check if a server config is stdio-based.
 */
export function isStdioConfig(config: ServerConfig): config is StdioServerConfig {
  return config.transport === "stdio";
}

/**
 * Type guard to check if a server config is HTTP-based.
 */
export function isHttpConfig(config: ServerConfig): config is HttpServerConfig {
  return config.transport === "http";
}
