# my-cli-prettier

A CLI tool that exposes MCP (Model Context Protocol) servers as local command-line tools.

## Why?

MCP servers let AI agents interact with external systems, but loading many servers into an agent's context can degrade performance. This tool provides a different approach:

- **Discoverable**: Agents can explore available servers and tools via `--help`
- **Lightweight**: Only the tools you call are loaded, not the entire MCP ecosystem
- **Familiar**: Standard CLI interface that any agent (or human) can use

## Quick Start

```bash
# Clone and install
git clone https://github.com/pablozaiden/my-cli-prettier.git
cd my-cli-prettier
bun install

# Initialize config with example servers
bun start -- config --action init

# List available servers
bun start -- server list

# Explore a server's tools
bun start -- everything help

# Call a tool
bun start -- everything echo --message "Hello MCP!"
```

## Installation

### Prerequisites

- [Bun](https://bun.sh)

### Run from source

```bash
bun install
bun start -- <command>
```

### Compile to binary

```bash
npm run compile
./out/mcp <command>
```

## Configuration

Config is stored at `~/.my-cli-prettier/config.json`:

```json
{
  "servers": {
    "memory": {
      "transport": "stdio",
      "command": "bunx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "description": "Simple key-value memory store"
    },
    "fetch": {
      "transport": "stdio",
      "command": "bunx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"],
      "description": "Fetch and convert web content"
    }
  },
  "settings": {
    "cacheEnabled": true,
    "cacheTtlMs": 14400000
  }
}
```

### Server Types

**Stdio servers** - Local processes:
```json
{
  "transport": "stdio",
  "command": "bunx",
  "args": ["-y", "@modelcontextprotocol/server-memory"],
  "env": { "API_KEY": "$MY_API_KEY" },
  "description": "Optional description",
  "enabled": true
}
```

**HTTP servers** - Remote endpoints:
```json
{
  "transport": "http",
  "url": "https://example.com/mcp",
  "headers": { "Authorization": "Bearer $TOKEN" },
  "description": "Optional description"
}
```

Environment variables in the format `$VAR_NAME` are automatically resolved.

## Usage

### Manage servers

```bash
# List enabled servers
mcp server list

# List all servers including disabled
mcp server list --all

# Add a stdio-based server (local process)
mcp server add stdio --name memory --command bunx --args "-y @modelcontextprotocol/server-memory" --description "Memory store"

# Add an HTTP-based server (remote endpoint)
mcp server add http --name api --url "https://api.example.com/mcp" --description "Remote API"

# Disable a server (keeps configuration)
mcp server disable --name memory

# Enable a server
mcp server enable --name memory
# Remove a server completely
mcp server remove --name memory

# Open config file in your editor
mcp server edit
```

Output of `server list`:
```
Enabled servers: 5

✓ memory - Simple key-value memory store
  stdio: bunx -y @modelcontextprotocol/server-memory
✓ filesystem - File system operations
  stdio: bunx -y @modelcontextprotocol/server-filesystem /Users/me
✓ everything - Demo server with sample tools for testing
  stdio: bunx -y @modelcontextprotocol/server-everything
✓ fetch - Fetch and convert web content for LLM usage
  stdio: bunx -y @modelcontextprotocol/server-fetch
✓ time - Time and timezone conversion capabilities
  stdio: bunx -y @anthropic-ai/server-time
```

Use `--json` for machine-readable output.

### Explore server tools

```bash
mcp <server> help
```

Example:
```bash
mcp everything help
```

### Call a tool

```bash
mcp <server> <tool> [options]
```

Examples:
```bash
# Echo a message
mcp everything echo --message "Hello!"

# Sum two numbers
mcp everything get-sum --a 10 --b 20
# List files
mcp filesystem list_directory --path "/Users/me/projects"

# Fetch a web page
mcp fetch fetch --url "https://example.com"

# Get current time
mcp time get_current_time
```

### Get tool help

```bash
mcp <server> <tool> help
```

### Manage configuration

```bash
# Show current config
mcp config

# Initialize example config
mcp server init

# Clear tool cache
mcp config --action cache-clear
```

## Caching

Tool definitions are cached for 4 hours by default to avoid reconnecting to servers on every command. The cache is stored at `~/.my-cli-prettier/cache/`.

To refresh tools from a server, clear the cache:
```bash
mcp config --action cache-clear
```

## Example Servers

The default config includes these servers (all work with just `bunx`):

| Server | Description |
|--------|-------------|
| `memory` | Knowledge graph / key-value store |
| `filesystem` | File system operations |
| `everything` | Demo server with 13 sample tools |
| `fetch` | Web content fetching and conversion |
| `time` | Time and timezone conversion |

## For AI Agents

This tool is designed to be easily discoverable by AI agents:

```bash
# Agent discovers available servers
mcp server list

# Agent explores a server
mcp filesystem help

# Agent gets help on a specific tool
mcp filesystem read_text_file help

# Agent calls the tool
mcp filesystem read_text_file --path "/path/to/file.txt"
```

All output is JSON by default when data is returned, making it easy to parse programmatically.

## Built With

- [Terminatui](https://github.com/pablozaiden/terminatui) - CLI/TUI framework
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Model Context Protocol client

## License

MIT
