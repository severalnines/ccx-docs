# MCP server for AI assistants

CCX ships an [MCP](https://modelcontextprotocol.io) (Model Context Protocol) server, [`@severalnines/ccx-mcp`](https://github.com/severalnines/ccx-mcp), that lets AI assistants such as Claude Code, Claude Desktop, Cursor and Windsurf manage your datastores through the CCX API. Once registered, you can ask the assistant things like:

- "List my datastores"
- "Create a PostgreSQL cluster on AWS in eu-west-1"
- "Get the connection string for my production database"
- "Add 10.0.0.0/24 as a trusted source on my cluster"
- "Show me the slowest queries on my database"
- "Scale my cluster to a medium instance"

The server runs on your machine and talks to CCX with your own credentials. Everything a tool returns, including connection strings and database user names, is passed to the AI assistant and from there to its model provider, so check the assistant's privacy and data-retention settings before asking it for secrets.

## Credentials

Create OAuth2 client credentials in the CCX UI under **Account > Security**. This is the recommended method. Your account email and password work as well.

## Installation

Node.js 18 or newer is required.

### Claude Code

```bash
claude mcp add ccx \
  -e CCX_BASE_URL=https://ccx.example.com \
  -e CCX_CLIENT_ID='your-client-id' \
  -e CCX_CLIENT_SECRET='your-client-secret' \
  -- npx -y @severalnines/ccx-mcp@latest
```

The `-e` flags store the values as environment variables of the registered server, so the secret is not part of the server's command line every time it starts. It is still visible in the argument list of this one `claude mcp add` invocation and in your shell history; on a shared machine prefer the JSON configuration below. For password authentication use `-e CCX_USERNAME='you@example.com'` and `-e CCX_PASSWORD='your-password'` instead of the client id and secret (keep the single quotes so shell-special characters in the password are passed through unchanged). Restart Claude Code (or run `/mcp` and reconnect) afterwards.

### Other MCP clients

Add the server to the client's MCP configuration file (`.mcp.json` for Claude Code, `claude_desktop_config.json` for Claude Desktop, `.cursor/mcp.json` for Cursor):

```json
{
  "mcpServers": {
    "ccx": {
      "command": "npx",
      "args": ["-y", "@severalnines/ccx-mcp@latest"],
      "env": {
        "CCX_BASE_URL": "https://ccx.example.com",
        "CCX_CLIENT_ID": "your-client-id",
        "CCX_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

Replace `https://ccx.example.com` with the URL of your CCX deployment. For password authentication replace `CCX_CLIENT_ID` and `CCX_CLIENT_SECRET` with `CCX_USERNAME` and `CCX_PASSWORD`. Keep the configuration file private: it holds your credentials in clear text.

## Protection mode

Destructive operations are blocked by default: delete datastore, delete database, delete database user, delete firewall rule, delete parameter group, restore backup, and apply parameter group (which changes the live database configuration). To allow them, pass `--protect false` or set `CCX_PROTECT=false`.

These tools also require an explicit `confirm: true` argument in the tool call. That is a signal for the assistant to check with you before proceeding, not a technical guarantee: protection mode is the only hard guard.

## Available tools

| Area | Tools |
|------|-------|
| Datastores | list, get details, create, delete, get nodes, get connection string, scale, add node |
| Cloud and plans | list cloud providers and regions, list instance sizes and volume types |
| Databases and users | list, create and delete databases and database users |
| Firewall | list, create and delete trusted sources |
| Backups | list backups, restore a backup |
| Configuration | list default parameters; list, get, create, update, delete and apply parameter groups |
| Monitoring | top queries, CPU/memory/disk statistics |

See the [project README](https://github.com/severalnines/ccx-mcp#readme) for the full tool reference and troubleshooting tips.

Also see the [Terraform provider](Terraform.md) for infrastructure-as-code management.
