/**
 * Commands to manage MCP server configurations.
 * Provides add, remove, enable, disable operations.
 */

import { Command, type CommandResult, type OptionSchema, type OptionValues } from "@pablozaiden/terminatui";
import {
  addServer,
  removeServer,
  enableServer,
  disableServer,
  getServerConfig,
  getAllServers,
  getConfigPath,
  ensureConfigDir,
  createExampleConfig,
} from "../config/loader";
import { clearServerCache } from "../config/cache";
import { spawn, execSync } from "child_process";
import { existsSync } from "fs";
import type { StdioServerConfig, HttpServerConfig } from "../config/types";

// ============================================================================
// Add Server Commands
// ============================================================================

const addStdioOptions = {
  name: {
    type: "string",
    description: "Unique name for the server",
    required: true,
  },
  command: {
    type: "string",
    description: "Command to execute (e.g., bunx, uvx, python)",
    required: true,
  },
  args: {
    type: "string",
    description: "Space-separated arguments for the command",
    required: false,
  },
  description: {
    type: "string",
    description: "Human-readable description",
    required: false,
  },
  cwd: {
    type: "string",
    description: "Working directory for the process",
    required: false,
  },
} satisfies OptionSchema;

class AddStdioServerCommand extends Command<typeof addStdioOptions> {
  override name = "stdio";
  override description = "Add a stdio-based MCP server (local process)";
  override displayName = "Add Stdio Server";
  override options = addStdioOptions;

  override examples = [
    {
      command: 'mcp server add stdio --name memory --command bunx --args "-y @modelcontextprotocol/server-memory"',
      description: "Add the memory server",
    },
    {
      command: 'mcp server add stdio --name myserver --command python --args "-m my_mcp_server" --description "My custom server"',
      description: "Add a Python-based server",
    },
  ];

  override async execute(config: OptionValues<typeof addStdioOptions>): Promise<CommandResult> {
    const name = config.name as string;
    const command = config.command as string;
    const argsStr = config.args as string | undefined;
    const description = config.description as string | undefined;
    const cwd = config.cwd as string | undefined;

    // Parse args string into array
    const args = argsStr ? argsStr.split(/\s+/).filter(Boolean) : undefined;

    const serverConfig: StdioServerConfig = {
      transport: "stdio",
      command,
      args,
      description,
      cwd,
      enabled: true,
    };

    const added = addServer(name, serverConfig);

    if (!added) {
      return {
        success: false,
        error: `Server '${name}' already exists. Use 'server remove' first or choose a different name.`,
      };
    }

    return {
      success: true,
      data: {
        name,
        transport: "stdio",
        command,
        args,
        description,
      },
      message: `Added stdio server '${name}'`,
    };
  }
}

const addHttpOptions = {
  name: {
    type: "string",
    description: "Unique name for the server",
    required: true,
  },
  url: {
    type: "string",
    description: "URL of the MCP server endpoint",
    required: true,
  },
  description: {
    type: "string",
    description: "Human-readable description",
    required: false,
  },
} satisfies OptionSchema;

class AddHttpServerCommand extends Command<typeof addHttpOptions> {
  override name = "http";
  override description = "Add an HTTP-based MCP server (remote endpoint)";
  override displayName = "Add HTTP Server";
  override options = addHttpOptions;

  override examples = [
    {
      command: 'mcp server add http --name docs --url "https://gitmcp.io/user/repo" --description "Documentation server"',
      description: "Add a GitMCP documentation server",
    },
  ];

  override async execute(config: OptionValues<typeof addHttpOptions>): Promise<CommandResult> {
    const name = config.name as string;
    const url = config.url as string;
    const description = config.description as string | undefined;

    const serverConfig: HttpServerConfig = {
      transport: "http",
      url,
      description,
      enabled: true,
    };

    const added = addServer(name, serverConfig);

    if (!added) {
      return {
        success: false,
        error: `Server '${name}' already exists. Use 'server remove' first or choose a different name.`,
      };
    }

    return {
      success: true,
      data: {
        name,
        transport: "http",
        url,
        description,
      },
      message: `Added HTTP server '${name}'`,
    };
  }
}

const emptyOptions = {} satisfies OptionSchema;

// Parent command for adding servers
class AddServerCommand extends Command<typeof emptyOptions> {
  override name = "add";
  override description = "Add a new MCP server";
  override displayName = "Add Server";
  override options = emptyOptions;
  override subCommands = [new AddStdioServerCommand(), new AddHttpServerCommand()];
}

// ============================================================================
// Remove Server Command
// ============================================================================

const removeOptions = {
  name: {
    type: "string",
    description: "Name of the server to remove",
    required: true,
  },
} satisfies OptionSchema;

class RemoveServerCommand extends Command<typeof removeOptions> {
  override name = "remove";
  override description = "Remove an MCP server from configuration";
  override displayName = "Remove Server";
  override options = removeOptions;

  override examples = [
    {
      command: "mcp server remove --name memory",
      description: "Remove the memory server",
    },
  ];

  override async execute(config: OptionValues<typeof removeOptions>): Promise<CommandResult> {
    const name = config.name as string;

    // Check if server exists
    const existing = getServerConfig(name);
    if (!existing) {
      return {
        success: false,
        error: `Server '${name}' not found`,
      };
    }

    const removed = removeServer(name);

    if (!removed) {
      return {
        success: false,
        error: `Failed to remove server '${name}'`,
      };
    }

    // Also clear the cache for this server
    clearServerCache(name);

    return {
      success: true,
      data: { name, removed: true },
      message: `Removed server '${name}'`,
    };
  }
}

// ============================================================================
// Enable Server Command
// ============================================================================

const enableOptions = {
  name: {
    type: "string",
    description: "Name of the server to enable",
    required: true,
  },
} satisfies OptionSchema;

class EnableServerCommand extends Command<typeof enableOptions> {
  override name = "enable";
  override description = "Enable an MCP server";
  override displayName = "Enable Server";
  override options = enableOptions;

  override examples = [
    {
      command: "mcp server enable --name memory",
      description: "Enable the memory server",
    },
  ];

  override async execute(config: OptionValues<typeof enableOptions>): Promise<CommandResult> {
    const name = config.name as string;

    // Check if server exists
    const existing = getServerConfig(name);
    if (!existing) {
      return {
        success: false,
        error: `Server '${name}' not found`,
      };
    }

    const enabled = enableServer(name);

    if (!enabled) {
      return {
        success: false,
        error: `Failed to enable server '${name}'`,
      };
    }

    return {
      success: true,
      data: { name, enabled: true },
      message: `Enabled server '${name}'`,
    };
  }
}

// ============================================================================
// Disable Server Command
// ============================================================================

const disableOptions = {
  name: {
    type: "string",
    description: "Name of the server to disable",
    required: true,
  },
} satisfies OptionSchema;

class DisableServerCommand extends Command<typeof disableOptions> {
  override name = "disable";
  override description = "Disable an MCP server (keeps configuration)";
  override displayName = "Disable Server";
  override options = disableOptions;

  override examples = [
    {
      command: "mcp server disable --name memory",
      description: "Disable the memory server",
    },
  ];

  override async execute(config: OptionValues<typeof disableOptions>): Promise<CommandResult> {
    const name = config.name as string;

    // Check if server exists
    const existing = getServerConfig(name);
    if (!existing) {
      return {
        success: false,
        error: `Server '${name}' not found`,
      };
    }

    const disabled = disableServer(name);

    if (!disabled) {
      return {
        success: false,
        error: `Failed to disable server '${name}'`,
      };
    }

    return {
      success: true,
      data: { name, enabled: false },
      message: `Disabled server '${name}'`,
    };
  }
}

// ============================================================================
// List Servers Command (detailed view)
// ============================================================================

const listOptions = {
  all: {
    type: "boolean",
    description: "Include disabled servers",
    default: false,
  },
  json: {
    type: "boolean",
    description: "Output as JSON",
    default: false,
  },
} satisfies OptionSchema;

class ListServersCommand extends Command<typeof listOptions> {
  override name = "list";
  override description = "List all configured MCP servers with details";
  override displayName = "List Servers";
  override options = listOptions;

  override async execute(config: OptionValues<typeof listOptions>): Promise<CommandResult> {
    const showAll = config.all as boolean;
    const asJson = config.json as boolean;

    const servers = getAllServers();
    let serverList = Object.entries(servers).map(([name, serverConfig]) => {
      const isStdio = serverConfig.transport === "stdio";
      return {
        name,
        transport: serverConfig.transport,
        endpoint: isStdio
          ? `${(serverConfig as StdioServerConfig).command} ${(serverConfig as StdioServerConfig).args?.join(" ") || ""}`
          : (serverConfig as HttpServerConfig).url,
        description: serverConfig.description || "",
        enabled: serverConfig.enabled !== false,
      };
    });

    // Filter to enabled only unless --all is passed
    if (!showAll) {
      serverList = serverList.filter((s) => s.enabled);
    }

    // If --json flag, return full data for JSON output
    if (asJson) {
      return {
        success: true,
        data: {
          servers: serverList,
          total: serverList.length,
          enabled: serverList.filter((s) => s.enabled).length,
        },
      };
    }

    // Pretty print to stdout
    const enabledCount = serverList.filter((s) => s.enabled).length;
    const totalCount = Object.keys(servers).length;

    if (showAll) {
      console.log(`Configured servers: ${totalCount} (${enabledCount} enabled)\n`);
    } else {
      console.log(`Enabled servers: ${serverList.length}\n`);
    }

    for (const server of serverList) {
      const status = server.enabled ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
      const desc = server.description ? ` - ${server.description}` : "";
      console.log(`${status} ${server.name}${desc}`);
      console.log(`  ${server.transport}: ${server.endpoint}`);
    }

    // Return empty data so terminatui doesn't print JSON
    return {
      success: true,
    };
  }
}

// ============================================================================
// Edit Config Command
// ============================================================================

class EditConfigCommand extends Command<typeof emptyOptions> {
  override name = "edit";
  override description = "Open the config file in your system editor";
  override displayName = "Edit Config";
  override options = emptyOptions;

  override examples = [
    {
      command: "mcp server edit",
      description: "Open config in default editor",
    },
  ];

  override async execute(): Promise<CommandResult> {

    // Ensure config directory exists
    ensureConfigDir();
    const configPath = getConfigPath();

    // Check if config exists, if not suggest init
    if (!existsSync(configPath)) {
      return {
        success: false,
        error: `Config file does not exist. Run 'mcp config --action init' first to create it.`,
      };
    }

    // Determine the editor to use
    const editor = this.getEditor();

    if (!editor) {
      return {
        success: false,
        error: `No editor found. Set the EDITOR or VISUAL environment variable, or install a common editor (code, vim, nano).`,
      };
    }

    // Open the editor
    return new Promise((resolve) => {
      const args = editor.args ? [...editor.args, configPath] : [configPath];
      const child = spawn(editor.command, args, {
        stdio: "inherit",
        detached: editor.detached,
      });

      if (editor.detached) {
        // For GUI editors, don't wait for them to close
        child.unref();
        resolve({
          success: true,
          message: `Opened config in ${editor.name}`,
          data: { editor: editor.name, configPath },
        });
      } else {
        // For terminal editors, wait for them to close
        child.on("close", (code) => {
          if (code === 0) {
            resolve({
              success: true,
              message: `Config edited with ${editor.name}`,
              data: { editor: editor.name, configPath },
            });
          } else {
            resolve({
              success: false,
              error: `Editor exited with code ${code}`,
            });
          }
        });

        child.on("error", (err) => {
          resolve({
            success: false,
            error: `Failed to open editor: ${err.message}`,
          });
        });
      }
    });
  }

  private getEditor(): { command: string; args?: string[]; name: string; detached: boolean } | null {
    const platform = process.platform;

    // Check VISUAL first, then EDITOR
    const envEditor = process.env["VISUAL"] || process.env["EDITOR"];
    if (envEditor) {
      // GUI editors that should be detached
      const guiEditors = ["code", "subl", "atom", "gedit", "kate", "notepad"];
      const isGui = guiEditors.some((e) => envEditor.includes(e));
      return { command: envEditor, name: envEditor, detached: isGui };
    }

    // Platform-specific fallbacks
    if (platform === "darwin") {
      // macOS: try VS Code, then open with default app, then vim
      if (this.commandExists("code")) {
        return { command: "code", args: ["--wait"], name: "VS Code", detached: false };
      }
      // Use 'open -t' to open in default text editor
      return { command: "open", args: ["-t"], name: "default editor", detached: true };
    } else if (platform === "win32") {
      // Windows: try VS Code, then notepad
      if (this.commandExists("code")) {
        return { command: "code", args: ["--wait"], name: "VS Code", detached: false };
      }
      return { command: "notepad", name: "Notepad", detached: true };
    } else {
      // Linux: try VS Code, then common terminal editors
      if (this.commandExists("code")) {
        return { command: "code", args: ["--wait"], name: "VS Code", detached: false };
      }
      if (this.commandExists("vim")) {
        return { command: "vim", name: "vim", detached: false };
      }
      if (this.commandExists("nano")) {
        return { command: "nano", name: "nano", detached: false };
      }
      if (this.commandExists("vi")) {
        return { command: "vi", name: "vi", detached: false };
      }
    }

    return null;
  }

  private commandExists(cmd: string): boolean {
    try {
      const checkCmd = process.platform === "win32" ? `where ${cmd}` : `which ${cmd}`;
      execSync(checkCmd, { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Init Config Command
// ============================================================================

class InitConfigCommand extends Command<typeof emptyOptions> {
  override name = "init";
  override description = "Create an example config file with sample servers";
  override displayName = "Initialize Config";
  override options = emptyOptions;

  override examples = [
    {
      command: "mcp server init",
      description: "Create example config with sample MCP servers",
    },
  ];

  override async execute(): Promise<CommandResult> {
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

// ============================================================================
// Main Server Management Command
// ============================================================================

/**
 * Parent command for server management operations.
 */
export class ServerManagementCommand extends Command<typeof emptyOptions> {
  override name = "server";
  override description = "Manage MCP server configurations";
  override displayName = "Server Management";
  override options = emptyOptions;
  override subCommands = [
    new InitConfigCommand(),
    new AddServerCommand(),
    new RemoveServerCommand(),
    new EnableServerCommand(),
    new DisableServerCommand(),
    new ListServersCommand(),
    new EditConfigCommand(),
  ];
}
