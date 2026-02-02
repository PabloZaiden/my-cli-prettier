import { AppContext, TuiApplication, type SupportedMode, type Command } from "@pablozaiden/terminatui";
import pkg from "../package.json";
import { getEnabledServers, resolveServerConfig } from "./config/loader";
import { getCachedTools, setCachedTools } from "./config/cache";
import { SettingsCommand } from "./commands/SettingsCommand";
import { ServerManagementCommand } from "./commands/ServerManagementCommand";
import { createServerCommand } from "./commands/ServerCommand";
import { McpClientSession } from "./mcp/client";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Fetches tools from a server and caches them.
 */
async function fetchAndCacheTools(
  serverName: string,
  serverConfig: ReturnType<typeof resolveServerConfig>
): Promise<Tool[]> {
  try {
    const session = new McpClientSession(serverName, serverConfig);
    const tools = await session.getTools();
    const serverInfo = await session.getServerInfo();
    setCachedTools(serverName, tools, serverInfo);
    return tools;
  } catch (error) {
    console.error(
      `Warning: Failed to fetch tools from ${serverName}: ${error instanceof Error ? error.message : String(error)}`
    );
    return [];
  }
}

/**
 * Builds the list of commands for the CLI.
 * This includes static commands (server, config) and dynamic commands
 * for each enabled MCP server in the configuration.
 * 
 * If tools aren't cached, fetches them from the server (first run will be slower).
 */
async function buildCommands(): Promise<Command[]> {
  const commands: Command[] = [];

  // Add static commands
  commands.push(new ServerManagementCommand());
  commands.push(new SettingsCommand());

  // Load config and add dynamic server commands
  try {
    const enabledServers = getEnabledServers();

    // Fetch tools for all servers in parallel
    const serverEntries = Object.entries(enabledServers);
    const toolsPromises = serverEntries.map(async ([serverName, serverConfig]) => {
      const resolvedConfig = resolveServerConfig(serverConfig);
      
      // Check cache first
      let tools = getCachedTools(serverName);
      
      // If not cached, fetch from server
      if (!tools) {
        tools = await fetchAndCacheTools(serverName, resolvedConfig);
      }
      
      return { serverName, resolvedConfig, tools };
    });

    const serversWithTools = await Promise.all(toolsPromises);

    // Create commands for each server
    for (const { serverName, resolvedConfig, tools } of serversWithTools) {
      const serverCommand = createServerCommand(serverName, resolvedConfig, tools.length > 0 ? tools : undefined);
      commands.push(serverCommand);
    }
  } catch (error) {
    // Config loading failed - commands will just be the static ones
    console.error(`Warning: Failed to load MCP server config: ${error instanceof Error ? error.message : String(error)}`);
  }

  return commands;
}

/**
 * Creates and returns a configured MyCLIPrettierApp instance.
 * This is async because it needs to fetch tools from servers if not cached.
 */
export async function createApp(): Promise<MyCLIPrettierApp> {
  const app = new MyCLIPrettierApp();
  const commands = await buildCommands();
  app.registerCommands(commands);
  
  return app;
}

export class MyCLIPrettierApp extends TuiApplication {
  static appName = "mcp";

  protected override defaultMode: SupportedMode = "cli";

  constructor() {
    super({
      name: MyCLIPrettierApp.appName,
      displayName: "MCP CLI",
      version: pkg.version,
      commitHash: pkg.config?.commitHash,

      logger: {
        detailed: false,
      },
    });

    // Set up lifecycle hooks
    this.setHooks({
      onError: async (error) => {
        AppContext.current.logger.error(`Error: ${error.message}`);
        process.exitCode = 1;
      },
    });
  }
}
