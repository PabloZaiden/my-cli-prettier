/**
 * Unified MCP client that abstracts transport-specific implementations.
 */

import type { ServerConfig } from "../config/types";
import { isHttpConfig, isStdioConfig } from "../config/types";
import { resolveServerConfig } from "../config/loader";
import type { IMcpClient, McpServerInfo, McpToolResult } from "./types";
import { createStdioClient } from "./stdio-client";
import { createHttpClient } from "./http-client";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Creates an MCP client for the given server configuration.
 * Automatically selects the appropriate transport based on config.
 */
export function createMcpClient(serverName: string, config: ServerConfig): IMcpClient {
  // Resolve environment variables in the config
  const resolvedConfig = resolveServerConfig(config);

  if (isStdioConfig(resolvedConfig)) {
    return createStdioClient(serverName, resolvedConfig);
  } else if (isHttpConfig(resolvedConfig)) {
    return createHttpClient(serverName, resolvedConfig);
  }

  throw new Error(`Unknown transport type in server configuration`);
}

/**
 * Helper class that wraps connection lifecycle for a single operation.
 * Connects, performs operation, then disconnects.
 */
export class McpClientSession {
  private client: IMcpClient;
  private serverName: string;

  constructor(serverName: string, config: ServerConfig) {
    this.serverName = serverName;
    this.client = createMcpClient(serverName, config);
  }

  /**
   * Execute an operation with automatic connect/disconnect.
   */
  async withConnection<T>(operation: (client: IMcpClient) => Promise<T>): Promise<T> {
    try {
      await this.client.connect();
      return await operation(this.client);
    } finally {
      await this.client.close();
    }
  }

  /**
   * Get tools from the server.
   */
  async getTools(): Promise<Tool[]> {
    return this.withConnection(async (client) => {
      return client.listTools();
    });
  }

  /**
   * Call a tool on the server.
   */
  async callTool(toolName: string, args: Record<string, unknown>): Promise<McpToolResult> {
    return this.withConnection(async (client) => {
      return client.callTool(toolName, args);
    });
  }

  /**
   * Get server information.
   */
  async getServerInfo(): Promise<McpServerInfo | undefined> {
    return this.withConnection(async (client) => {
      return client.getServerInfo();
    });
  }

  /**
   * Get the server name.
   */
  getServerName(): string {
    return this.serverName;
  }
}
