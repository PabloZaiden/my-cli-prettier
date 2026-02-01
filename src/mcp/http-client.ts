/**
 * HTTP/SSE transport MCP client implementation.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { HttpServerConfig } from "../config/types";
import type { IMcpClient, McpServerInfo, McpToolResult, McpContent } from "./types";

/**
 * MCP client using HTTP transport for remote servers.
 * Supports both Streamable HTTP and SSE transports with automatic fallback.
 */
class HttpMcpClient implements IMcpClient {
  private client: Client;
  private transport: Transport | null = null;
  private config: HttpServerConfig;
  private connected = false;

  constructor(_serverName: string, config: HttpServerConfig) {
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

    const url = new URL(this.config.url);

    // Build request init with headers
    const requestInit: RequestInit = {};
    if (this.config.headers) {
      requestInit.headers = this.config.headers;
    }

    // Try Streamable HTTP first, fall back to SSE if it fails
    try {
      this.transport = new StreamableHTTPClientTransport(url, {
        requestInit,
      });
      await this.client.connect(this.transport);
      this.connected = true;
    } catch (streamableError) {
      // Check if it's a 4xx error that suggests we should try SSE
      const isClientError =
        streamableError instanceof Error &&
        streamableError.message.includes("4");

      if (isClientError) {
        // Try SSE transport as fallback
        try {
          this.transport = new SSEClientTransport(url, {
            requestInit,
          });
          await this.client.connect(this.transport);
          this.connected = true;
        } catch (sseError) {
          throw new Error(
            `Failed to connect with both Streamable HTTP and SSE: ${streamableError instanceof Error ? streamableError.message : String(streamableError)}`
          );
        }
      } else {
        throw streamableError;
      }
    }
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
 * Factory function to create an HTTP MCP client.
 */
export function createHttpClient(serverName: string, config: HttpServerConfig): IMcpClient {
  return new HttpMcpClient(serverName, config);
}
