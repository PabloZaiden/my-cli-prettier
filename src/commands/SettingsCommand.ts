/**
 * Command to manage CLI settings including cache configuration.
 */

import { Command, type CommandResult, type OptionSchema, type OptionValues } from "@pablozaiden/terminatui";
import { getSettings, updateSettings, getConfigPath, createExampleConfig } from "../config/loader";
import { clearAllCache, getCacheStats } from "../config/cache";

const settingsOptions = {
  action: {
    type: "string",
    description: "Action to perform: show, cache-enable, cache-disable, cache-clear, init",
    required: false,
    default: "show",
    enum: ["show", "cache-enable", "cache-disable", "cache-clear", "init"],
  },
} satisfies OptionSchema;

export class SettingsCommand extends Command<typeof settingsOptions> {
  override name = "config";
  override description = "Manage CLI configuration and cache";
  override options = settingsOptions;
  override displayName = "Config";

  override examples = [
    { command: "mcp config", description: "Show current configuration" },
    { command: "mcp config --action cache-enable", description: "Enable caching" },
    { command: "mcp config --action cache-disable", description: "Disable caching" },
    { command: "mcp config --action cache-clear", description: "Clear all cached data" },
    { command: "mcp config --action init", description: "Create example config file" },
  ];

  override async execute(config: OptionValues<typeof settingsOptions>): Promise<CommandResult> {
    const action = config.action;

    switch (action) {
      case "show":
        return this.showSettings();
      case "cache-enable":
        return this.enableCache();
      case "cache-disable":
        return this.disableCache();
      case "cache-clear":
        return this.clearCache();
      case "init":
        return this.initConfig();
      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
        };
    }
  }

  private showSettings(): CommandResult {
    const settings = getSettings();
    const cacheStats = getCacheStats();

    return {
      success: true,
      data: {
        configPath: getConfigPath(),
        settings: {
          cacheEnabled: settings.cacheEnabled,
          cacheTtlMs: settings.cacheTtlMs,
          cacheTtlHours: settings.cacheTtlMs / (60 * 60 * 1000),
        },
        cache: {
          cachedServers: cacheStats.cachedServers,
          totalCachedTools: cacheStats.totalCachedTools,
        },
      },
      message: "Current settings",
    };
  }

  private enableCache(): CommandResult {
    const newSettings = updateSettings({ cacheEnabled: true });

    return {
      success: true,
      data: {
        cacheEnabled: newSettings.cacheEnabled,
        cacheTtlHours: newSettings.cacheTtlMs / (60 * 60 * 1000),
      },
      message: "Cache enabled",
    };
  }

  private disableCache(): CommandResult {
    const newSettings = updateSettings({ cacheEnabled: false });

    return {
      success: true,
      data: {
        cacheEnabled: newSettings.cacheEnabled,
      },
      message: "Cache disabled",
    };
  }

  private clearCache(): CommandResult {
    const clearedCount = clearAllCache();

    return {
      success: true,
      data: {
        clearedCount,
      },
      message: `Cleared ${clearedCount} cached server(s)`,
    };
  }

  private initConfig(): CommandResult {
    const created = createExampleConfig();

    if (created) {
      return {
        success: true,
        data: {
          configPath: getConfigPath(),
          created: true,
        },
        message: `Created example config at ${getConfigPath()}`,
      };
    } else {
      return {
        success: true,
        data: {
          configPath: getConfigPath(),
          created: false,
        },
        message: `Config already exists at ${getConfigPath()}`,
      };
    }
  }
}
