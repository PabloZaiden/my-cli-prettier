import { AppContext, TuiApplication, type SupportedMode, type Command } from "@pablozaiden/terminatui";
import pkg from "../package.json";
import { getEnabledServers, resolveServerConfig } from "./config/loader";
import { getCachedTools } from "./config/cache";
import { ServersCommand } from "./commands/ServersCommand";
import { SettingsCommand } from "./commands/SettingsCommand";
import { createServerCommand } from "./commands/ServerCommand";

/**
 * Builds the list of commands for the CLI.
 * This includes static commands (servers, settings) and dynamic commands
 * for each enabled MCP server in the configuration.
 */
function buildCommands(): Command[] {
  const commands: Command[] = [];

  // Add static commands
  commands.push(new ServersCommand());
  commands.push(new SettingsCommand());

  // Load config and add dynamic server commands
  try {
    const enabledServers = getEnabledServers();

    for (const [serverName, serverConfig] of Object.entries(enabledServers)) {
      // Resolve environment variables in the config
      const resolvedConfig = resolveServerConfig(serverConfig);

      // Check for cached tools to pre-populate subcommands
      const cachedTools = getCachedTools(serverName);

      // Create the dynamic server command
      const serverCommand = createServerCommand(serverName, resolvedConfig, cachedTools || undefined);
      commands.push(serverCommand);
    }
  } catch (error) {
    // Config loading failed - commands will just be the static ones
    // Error will be shown when user tries to use server commands
    console.error(`Warning: Failed to load MCP server config: ${error instanceof Error ? error.message : String(error)}`);
  }

  return commands;
}

export class MyCLIPrettierApp extends TuiApplication {
  protected override defaultMode: SupportedMode = "cli";

  constructor() {
    super({
      name: "my-cli-prettier",
      displayName: "MCP CLI",
      version: pkg.version,
      commitHash: pkg.config?.commitHash,
      commands: buildCommands(),

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
