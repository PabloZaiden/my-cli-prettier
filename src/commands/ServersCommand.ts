/**
 * Command to list configured MCP servers.
 */

import { Command, type CommandResult, type OptionSchema, type OptionValues } from "@pablozaiden/terminatui";
import { getEnabledServers, loadConfig } from "../config/loader";
import { isHttpConfig, isStdioConfig } from "../config/types";

const serversOptions = {
  json: {
    type: "boolean",
    description: "Output as JSON",
    default: false,
  },
} satisfies OptionSchema;

export class ServersCommand extends Command<typeof serversOptions> {
  override name = "servers";
  override description = "List configured MCP servers";
  override options = serversOptions;
  override displayName = "List Servers";

  // Always run in CLI mode - no interactive TUI
  override supportsTui(): boolean {
    return false;
  }

  override async execute(config: OptionValues<typeof serversOptions>): Promise<CommandResult> {
    const fullConfig = loadConfig();
    const allServers = fullConfig.servers;
    const enabledServers = getEnabledServers();

    const serverList = Object.entries(allServers).map(([name, serverConfig]) => {
      const isEnabled = name in enabledServers;
      let transport: string;
      let endpoint: string;

      if (isStdioConfig(serverConfig)) {
        transport = "stdio";
        endpoint = `${serverConfig.command} ${serverConfig.args?.join(" ") || ""}`.trim();
      } else if (isHttpConfig(serverConfig)) {
        transport = "http";
        endpoint = serverConfig.url;
      } else {
        transport = "unknown";
        endpoint = "unknown";
      }

      return {
        name,
        transport,
        endpoint,
        description: serverConfig.description || "",
        enabled: isEnabled,
      };
    });

    // If --json flag, return full data for JSON output
    if (config.json) {
      return {
        success: true,
        data: {
          servers: serverList,
          totalCount: serverList.length,
          enabledCount: Object.keys(enabledServers).length,
        },
      };
    }

    // Pretty print to stdout
    const enabledCount = Object.keys(enabledServers).length;
    console.log(`Configured servers: ${serverList.length} (${enabledCount} enabled)\n`);

    for (const server of serverList) {
      const status = server.enabled ? "✓" : "✗";
      const statusColor = server.enabled ? "\x1b[32m" : "\x1b[31m";
      const reset = "\x1b[0m";
      
      console.log(`${statusColor}${status}${reset} ${server.name}${server.description ? ` - ${server.description}` : ""}`);
    }

    // Return empty data so terminatui doesn't print JSON
    return {
      success: true,
    };
  }
}
