# My CLI is Prettier (than you MCP server)

My CLI is Prettier (than your MCP server) is a CLI tool to expose MCP server operations via a CLI

## Motivation

While MCP servers allow agents to interact with external systems, pulling more than a few of them into the context of an Agent can degrade its performance and reliability.

For tasks that involve frequent tool discovery and very open-ended goals, having local CLIs that the Agent can explore, discover, and use can be a more effective approach.

For those kinds of scenarios, this tool allows you to expose MCP server operations via a local CLI that the Agent can discover and use, without bloating the context with hundreds of MCP server tools.

