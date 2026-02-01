/**
 * Dynamic parent command for each MCP server.
 * Contains subcommands for each tool available on the server.
 * The server command itself just shows help - tools must be specified as subcommands.
 */

import { Command, type OptionSchema, AppContext } from "@pablozaiden/terminatui";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ServerConfig } from "../config/types";
import { isHttpConfig, isStdioConfig } from "../config/types";
import { McpClientSession } from "../mcp/client";
import { getCachedTools, setCachedTools } from "../config/cache";
import { createToolCommand } from "./ToolCommand";

const serverOptions = {} satisfies OptionSchema;

/**
 * Creates a dynamic Command for an MCP server.
 * This command has no direct action - it's a parent for tool subcommands.
 * Running it without a tool subcommand will show a message to use help.
 */
export function createServerCommand(
  serverName: string,
  serverConfig: ServerConfig,
  cachedTools?: Tool[]
): Command {
  // Determine transport type and endpoint for description
  let transportInfo: string;
  if (isStdioConfig(serverConfig)) {
    transportInfo = `stdio (${serverConfig.command})`;
  } else if (isHttpConfig(serverConfig)) {
    transportInfo = `http (${serverConfig.url})`;
  } else {
    transportInfo = "unknown";
  }

  const description = serverConfig.description || `MCP server via ${transportInfo}`;

  class DynamicServerCommand extends Command<typeof serverOptions> {
    override name = serverName;
    override description = description;
    override displayName = serverConfig.description || serverName;
    override options = serverOptions;
    override subCommands: Command[] = [];

    // No TUI support for server commands
    override supportsTui(): boolean {
      return false;
    }

    private toolsLoaded = false;

    constructor() {
      super();
      // If we have cached tools, create subcommands immediately
      if (cachedTools && cachedTools.length > 0) {
        this.createSubCommands(cachedTools);
        this.toolsLoaded = true;
      }
    }

    private createSubCommands(tools: Tool[]): void {
      this.subCommands = tools.map((tool) => createToolCommand(serverName, serverConfig, tool));
    }

    /**
     * Load tools from the server if not already loaded.
     */
    async loadTools(): Promise<Tool[]> {
      // Check cache first
      const cached = getCachedTools(serverName);
      if (cached) {
        if (!this.toolsLoaded) {
          this.createSubCommands(cached);
          this.toolsLoaded = true;
        }
        return cached;
      }

      // Fetch from server
      try {
        const session = new McpClientSession(serverName, serverConfig);
        const tools = await session.getTools();

        // Cache the tools
        const serverInfo = await session.getServerInfo();
        setCachedTools(serverName, tools, serverInfo);

        // Create subcommands
        this.createSubCommands(tools);
        this.toolsLoaded = true;

        return tools;
      } catch (error) {
        AppContext.current.logger.error(
          `Failed to load tools from ${serverName}: ${error instanceof Error ? error.message : String(error)}`
        );
        return [];
      }
    }
  }

  return new DynamicServerCommand();
}
