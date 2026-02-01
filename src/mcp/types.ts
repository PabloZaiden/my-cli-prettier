/**
 * MCP client types and interfaces.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Server information returned after connection.
 */
export interface McpServerInfo {
  name?: string;
  version?: string;
}

/**
 * Result of calling a tool.
 */
export interface McpToolResult {
  /** Whether the tool call resulted in an error */
  isError?: boolean;
  /** The content returned by the tool */
  content: McpContent[];
  /** Structured content if available */
  structuredContent?: Record<string, unknown>;
}

/**
 * Content types that can be returned by tools.
 */
export type McpContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string }
  | { type: "audio"; data: string; mimeType: string }
  | { type: "resource"; resource: { uri: string; text?: string; blob?: string; mimeType?: string } };

/**
 * Interface for MCP client implementations.
 */
export interface IMcpClient {
  /** Connect to the MCP server and perform initialization */
  connect(): Promise<void>;

  /** Close the connection to the server */
  close(): Promise<void>;

  /** Get server information after connection */
  getServerInfo(): McpServerInfo | undefined;

  /** List available tools from the server */
  listTools(): Promise<Tool[]>;

  /** Call a tool with the given arguments */
  callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult>;

  /** Check if the client is connected */
  isConnected(): boolean;
}
