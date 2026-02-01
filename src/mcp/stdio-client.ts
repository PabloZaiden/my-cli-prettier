/**
 * Stdio transport MCP client implementation.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { StdioServerConfig } from "../config/types";
import type { IMcpClient, McpServerInfo, McpToolResult, McpContent } from "./types";

/**
 * MCP client using stdio transport for local process-based servers.
 */
class StdioMcpClient implements IMcpClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private config: StdioServerConfig;
  private connected = false;

  constructor(_serverName: string, config: StdioServerConfig) {
    this.config = config;
    this.client = new Client(
      {
        name: "mcp-cli",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    // Build environment, merging with process.env
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      ...this.config.env,
    };

    this.transport = new StdioClientTransport({
      command: this.config.command,
      args: this.config.args,
      env,
      cwd: this.config.cwd,
      stderr: "pipe", // Capture stderr but don't print to console
    });

    await this.client.connect(this.transport);
    this.connected = true;
  }

  async close(): Promise<void> {
    if (!this.connected || !this.transport) {
      return;
    }

    try {
      await this.transport.close();
    } catch {
      // Ignore errors when closing
    }

    this.connected = false;
    this.transport = null;
  }

  getServerInfo(): McpServerInfo | undefined {
    const version = this.client.getServerVersion();
    if (!version) {
      return undefined;
    }
    return {
      name: version.name,
      version: version.version,
    };
  }

  async listTools(): Promise<Tool[]> {
    if (!this.connected) {
      throw new Error("Client is not connected");
    }

    const result = await this.client.listTools();
    return result.tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
    if (!this.connected) {
      throw new Error("Client is not connected");
    }

    const result = await this.client.callTool({ name, arguments: args });

    // Convert the result to our format
    const content: McpContent[] = [];

    if ("content" in result && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === "text") {
          content.push({ type: "text", text: item.text });
        } else if (item.type === "image") {
          content.push({ type: "image", data: item.data, mimeType: item.mimeType });
        } else if (item.type === "audio") {
          content.push({ type: "audio", data: item.data, mimeType: item.mimeType });
        } else if (item.type === "resource" && "resource" in item) {
          const resource = item.resource;
          content.push({
            type: "resource",
            resource: {
              uri: resource.uri,
              text: "text" in resource ? resource.text : undefined,
              blob: "blob" in resource ? resource.blob : undefined,
              mimeType: resource.mimeType,
            },
          });
        }
      }
    }

    return {
      isError: "isError" in result ? Boolean(result.isError) : false,
      content,
      structuredContent: "structuredContent" in result ? (result.structuredContent as Record<string, unknown> | undefined) : undefined,
    };
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Factory function to create a stdio MCP client.
 */
export function createStdioClient(serverName: string, config: StdioServerConfig): IMcpClient {
  return new StdioMcpClient(serverName, config);
}
