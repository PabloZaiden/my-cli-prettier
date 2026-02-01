/**
 * Utility to convert MCP tool JSON Schema to terminatui OptionSchema.
 */

import type { OptionSchema, OptionDef } from "@pablozaiden/terminatui";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * JSON Schema property definition (simplified).
 */
interface JsonSchemaProperty {
  type?: string | string[];
  description?: string;
  default?: unknown;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  items?: { type?: string };
}

/**
 * Converts a MCP tool's inputSchema to a terminatui OptionSchema.
 *
 * @param tool The MCP tool definition
 * @returns The equivalent terminatui option schema
 */
export function toolToOptionSchema(tool: Tool): OptionSchema {
  const inputSchema = tool.inputSchema;
  const schema: OptionSchema = {};

  if (!inputSchema || typeof inputSchema !== "object") {
    return schema;
  }

  const properties = inputSchema.properties as Record<string, JsonSchemaProperty> | undefined;
  const required = inputSchema.required as string[] | undefined;
  const requiredSet = new Set(required || []);

  if (!properties) {
    return schema;
  }

  let order = 0;
  for (const [key, prop] of Object.entries(properties)) {
    const optionDef = jsonSchemaPropertyToOptionDef(key, prop, requiredSet.has(key), order++);
    if (optionDef) {
      schema[key] = optionDef;
    }
  }

  return schema;
}

/**
 * Converts a single JSON Schema property to a terminatui OptionDef.
 */
function jsonSchemaPropertyToOptionDef(
  key: string,
  prop: JsonSchemaProperty,
  isRequired: boolean,
  order: number
): OptionDef | null {
  // Determine the type
  const jsonType = Array.isArray(prop.type) ? prop.type[0] : prop.type;

  let type: OptionDef["type"];
  switch (jsonType) {
    case "string":
      type = "string";
      break;
    case "number":
    case "integer":
      type = "number";
      break;
    case "boolean":
      type = "boolean";
      break;
    case "array":
      type = "array";
      break;
    default:
      // Default to string for unknown types
      type = "string";
  }

  const optionDef: OptionDef = {
    type,
    description: prop.description || `The ${key} parameter`,
    required: isRequired,
    order,
  };

  // Handle defaults
  if (prop.default !== undefined) {
    optionDef.default = prop.default;
    // If there's a default, it's effectively not required from CLI perspective
    optionDef.required = false;
  }

  // Handle enums
  if (prop.enum && prop.enum.length > 0) {
    optionDef.enum = prop.enum;
  }

  // Handle min/max for numbers
  if (type === "number") {
    if (prop.minimum !== undefined) {
      optionDef.min = prop.minimum;
    }
    if (prop.maximum !== undefined) {
      optionDef.max = prop.maximum;
    }
  }

  // Create a label from the key (convert camelCase to Title Case)
  optionDef.label = keyToLabel(key);

  return optionDef;
}

/**
 * Converts a camelCase or snake_case key to a human-readable label.
 */
function keyToLabel(key: string): string {
  // Handle snake_case
  let result = key.replace(/_/g, " ");
  // Handle camelCase
  result = result.replace(/([a-z])([A-Z])/g, "$1 $2");
  // Capitalize first letter of each word
  result = result.replace(/\b\w/g, (c) => c.toUpperCase());
  return result;
}

/**
 * Parses option values from CLI to the correct types based on schema.
 * terminatui gives us strings for most things, so we need to convert.
 * Skips undefined/null values to avoid sending them to MCP servers.
 */
export function parseOptionValues(
  values: Record<string, unknown>,
  schema: OptionSchema
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(values)) {
    // Skip undefined/null values - don't send them to MCP servers
    if (value === undefined || value === null) {
      continue;
    }

    const optionDef = schema[key];
    if (!optionDef) {
      result[key] = value;
      continue;
    }

    // Convert based on type
    switch (optionDef.type) {
      case "number":
        result[key] = typeof value === "number" ? value : parseFloat(String(value));
        break;
      case "boolean":
        result[key] = typeof value === "boolean" ? value : value === "true" || value === "1";
        break;
      case "array":
        result[key] = Array.isArray(value) ? value : String(value).split(",").map((s) => s.trim());
        break;
      default:
        result[key] = value;
    }
  }

  return result;
}

/**
 * Gets the tool display name, preferring title over name.
 */
export function getToolDisplayName(tool: Tool): string {
  if (tool.title) {
    return tool.title;
  }
  return keyToLabel(tool.name);
}

/**
 * Gets the tool description, handling undefined.
 */
export function getToolDescription(tool: Tool): string {
  return tool.description || `Execute the ${tool.name} tool`;
}
