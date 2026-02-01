/**
 * Command to list configured MCP servers.
 */

import { Command, type CommandResult, type OptionSchema, type OptionValues } from "@pablozaiden/terminatui";
import { getEnabledServers, loadConfig } from "../config/loader";
import { isHttpConfig, isStdioConfig } from "../config/types";

const serversOptions = {} satisfies OptionSchema;

export class ServersCommand extends Command<typeof serversOptions> {
  override name = "servers";
  override description = "List configured MCP servers";
  override options = serversOptions;
  override displayName = "List Servers";

  // Always run in CLI mode - no interactive TUI
  override supportsTui(): boolean {
    return false;
  }

  override async execute(_config: OptionValues<typeof serversOptions>): Promise<CommandResult> {
    const fullConfig = loadConfig();
    const allServers = fullConfig.servers;
    const enabledServers = getEnabledServers();

    const serverList = Object.entries(allServers).map(([name, config]) => {
      const isEnabled = name in enabledServers;
      let transport: string;
      let endpoint: string;

      if (isStdioConfig(config)) {
        transport = "stdio";
        endpoint = `${config.command} ${config.args?.join(" ") || ""}`.trim();
      } else if (isHttpConfig(config)) {
        transport = "http";
        endpoint = config.url;
      } else {
        transport = "unknown";
        endpoint = "unknown";
      }

      return {
        name,
        transport,
        endpoint,
        description: config.description || "",
        enabled: isEnabled,
      };
    });

    return {
      success: true,
      data: {
        servers: serverList,
        totalCount: serverList.length,
        enabledCount: Object.keys(enabledServers).length,
      },
      message: `Found ${serverList.length} configured server(s), ${Object.keys(enabledServers).length} enabled`,
    };
  }
}
