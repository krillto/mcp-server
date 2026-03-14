# @krillto/mcp-server

MCP server for [krill.to](https://krill.to) — search and manage your Twitter/X bookmarks from any AI agent.

Works with **Claude Desktop**, **Claude Code**, **Cursor**, **Windsurf**, **OpenClaw**, and any MCP-compatible client.

## Quick Start

### 1. Get your API key

Sign in to [krill.to](https://krill.to), go to **Settings → API Key**, and generate a key.

### 2. Configure your MCP client

**Claude Desktop** — add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "krill": {
      "command": "npx",
      "args": ["-y", "@krillto/mcp-server"],
      "env": {
        "KRILL_API_KEY": "krill_your_key_here"
      }
    }
  }
}
```

**Cursor** — add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "krill": {
      "command": "npx",
      "args": ["-y", "@krillto/mcp-server"],
      "env": {
        "KRILL_API_KEY": "krill_your_key_here"
      }
    }
  }
}
```

**Claude Code** — add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "krill": {
      "command": "npx",
      "args": ["-y", "@krillto/mcp-server"],
      "env": {
        "KRILL_API_KEY": "krill_your_key_here"
      }
    }
  }
}
```

That's it. Your AI agent can now search your bookmarks.

## Tools

| Tool | Description |
|------|-------------|
| `search_bookmarks` | Search by keyword, topic, or author (full-text + semantic) |
| `ask_bookmarks` | Ask AI questions about your saved bookmarks |
| `list_collections` | List all your collections |
| `get_collection_bookmarks` | View bookmarks in a collection |
| `create_collection` | Create a new collection |
| `add_to_collection` | Add a bookmark to a collection |
| `update_bookmark` | Update category or tags |
| `add_notes` | Add personal notes to a bookmark |
| `get_highlights` | View all your highlighted passages |
| `delete_bookmark` | Delete a bookmark |

## Examples

Ask your AI agent:

- *"Search my bookmarks about React Server Components"*
- *"What have I saved about AI agents lately?"*
- *"Create a collection called 'Must Read' and add the latest 3 bookmarks"*
- *"Show me my highlights"*
- *"What did @karpathy tweet about that I saved?"*

## What is krill.to?

[Krill.to](https://krill.to) saves your Twitter/X bookmarks, auto-categorizes them with AI, and makes them searchable. Think of it as a second brain for everything you bookmark on X.

- One-click save via Chrome extension
- AI-powered categorization and tagging
- Full-text and semantic search
- Thread unrolling and media capture
- AI chat — ask questions about your bookmarks

## Development

```bash
git clone https://github.com/krillto/mcp-server.git
cd mcp-server
pnpm install
pnpm build
```

Test locally:

```bash
KRILL_API_KEY=krill_your_key node dist/index.js
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `KRILL_API_KEY` | Yes | Your krill.to API key (starts with `krill_`) |
| `KRILL_BASE_URL` | No | Custom API URL (default: `https://krill.to`) |

## License

MIT
