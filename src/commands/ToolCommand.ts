/**
 * Dynamic command generated for each MCP tool.
 */

import { Command, type CommandResult, type OptionValues, type CommandExecutionContext } from "@pablozaiden/terminatui";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ServerConfig } from "../config/types";
import { McpClientSession } from "../mcp/client";
import { toolToOptionSchema, parseOptionValues, getToolDisplayName, getToolDescription } from "../utils/schema-to-options";

/**
 * Creates a dynamic Command class for an MCP tool.
 */
export function createToolCommand(
  serverName: string,
  serverConfig: ServerConfig,
  tool: Tool
): Command {
  const optionSchema = toolToOptionSchema(tool);

  class DynamicToolCommand extends Command<typeof optionSchema> {
    override name = tool.name;
    override description = getToolDescription(tool);
    override displayName = getToolDisplayName(tool);
    override options = optionSchema;
    override actionLabel = "Execute";

    override async execute(
      config: OptionValues<typeof optionSchema>,
      _execCtx?: CommandExecutionContext
    ): Promise<CommandResult> {
      try {
        // Parse the option values to correct types
        const args = parseOptionValues(config as Record<string, unknown>, optionSchema);

        // Create a session and call the tool
        const session = new McpClientSession(serverName, serverConfig);
        const result = await session.callTool(tool.name, args);

        // Format the result
        if (result.isError) {
          return {
            success: false,
            error: this.formatContent(result.content),
            data: result.structuredContent,
          };
        }

        return {
          success: true,
          data: result.structuredContent || this.formatContentAsData(result.content),
          message: `Tool ${tool.name} executed successfully`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    private formatContent(content: { type: string; text?: string }[]): string {
      return content
        .filter((c) => c.type === "text" && c.text)
        .map((c) => c.text)
        .join("\n");
    }

    private formatContentAsData(content: { type: string; text?: string; data?: string; mimeType?: string }[]): unknown {
      // If there's only one text content, try to parse it as JSON
      const firstItem = content[0];
      if (content.length === 1 && firstItem && firstItem.type === "text" && firstItem.text) {
        try {
          return JSON.parse(firstItem.text);
        } catch {
          // Not JSON, return as text
          return { text: firstItem.text };
        }
      }

      // Multiple items or non-text, return as array
      return content.map((c) => {
        if (c.type === "text") {
          // Try to parse text as JSON
          try {
            return { type: "text", content: JSON.parse(c.text || "") };
          } catch {
            return { type: "text", content: c.text };
          }
        }
        return c;
      });
    }
  }

  return new DynamicToolCommand();
}
