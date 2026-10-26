# MCP server for AI assistants

CCX ships an [MCP](https://modelcontextprotocol.io) (Model Context Protocol) server, [`@severalnines/ccx-mcp`](https://github.com/severalnines/ccx-mcp), that lets AI assistants such as Claude Code, Claude Desktop, Cursor and Windsurf manage your datastores through the CCX API. Once registered, you can ask the assistant things like:

- "List my datastores"
- "Create a PostgreSQL cluster on AWS in eu-west-1"
- "Get the connection string for my production database"
- "Add 10.0.0.0/24 as a trusted source on my cluster"
- "Show me the slowest queries on my database"
- "Scale my cluster to a medium instance"

The server runs on your machine and talks to CCX with your own credentials. Everything a tool returns, including connection strings and database user names, is passed to the AI assistant and from there to its model provider, so check the assistant's privacy and data-retention settings before asking it for secrets.

## Connect from the CCX UI (recommended)

Go to **Settings > Credentials** and use the **Connect an AI assistant (MCP)** card. Node.js 18 or newer is required on the machine that runs the assistant.

1. Click **Generate credentials** and pick when the key expires: 30 days, 90 days (the default) or 1 year.
2. Copy the command from the **Claude Code** tab and run it in your terminal.
3. Restart Claude Code, or run `/mcp` and reconnect.

The command looks like this, with your CCX URL and the new key filled in:

```bash
claude mcp add ccx -s user -e CCX_BASE_URL=https://ccx.example.com -e CCX_CLIENT_ID=<client-id> -e CCX_CLIENT_SECRET=<client-secret> -- npx -y @severalnines/ccx-mcp@latest
```

For Claude Desktop or Cursor, copy the configuration from the **Claude Desktop / Cursor** tab instead and add it to the client's MCP configuration file (see [Other MCP clients](#other-mcp-clients)), then restart the client.

What the card does:

- **The key.** Generate creates an OAuth2 credential named "Claude Code (MCP)". It acts as you, with your access, and appears in the **OAuth2 Credentials** table on the same page. The secret is shown only once: copy the command before you leave the page. The command box masks the client id and secret as `*****`; the eye button shows them, and the copy button always copies the real command. The command also ends up in your shell history.
- **The secret stays out of the server's arguments.** The settings are passed with `-e` as environment variables of the registered server, so `claude mcp list` does not print the secret.
- **User scope.** `-s user` registers the server for your user, so it is available in every project. A `ccx` server registered at local scope (one directory, for example from older setup instructions) or at project scope (`.mcp.json`) takes precedence inside that project.
- **Regenerate.** Click **Regenerate** to rotate the key, or when it is about to expire. The card creates the new key first and then revokes your previous MCP keys, so the MCP server stops working until you run the new command. If you have had an MCP key before, the command has two lines: `claude mcp remove ccx -s user` followed by the same `claude mcp add` line, because `claude mcp add` refuses a name that is already registered. Run both.
- **Allow destructive operations.** Off by default. Turning it on adds `-e CCX_PROTECT=false` to the command (`"CCX_PROTECT": "false"` in the JSON configuration). See [Protection mode](#protection-mode).

If Claude Code still uses an old key in one project after you regenerated, that project has its own local-scope `ccx` registration. Run this in that project directory, then restart Claude Code:

```bash
claude mcp remove ccx -s local
```

The card is only shown if your CCX operator has enabled it. Without it, create a credential in the **OAuth2 Credentials** table on **Settings > Credentials** and follow the manual setup below.

## Manual setup

Use OAuth2 client credentials created in the **OAuth2 Credentials** table on **Settings > Credentials**. This is the recommended method. Your account email and password work as well.

Node.js 18 or newer is required.

### Claude Code

```bash
claude mcp add ccx -s user \
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

Destructive operations are blocked by default: delete datastore, delete database, delete database user, delete firewall rule, delete parameter group, restore backup, and apply parameter group (which changes the live database configuration). To allow them, pass `--protect false` or set `CCX_PROTECT=false`. The **Allow destructive operations** toggle on the CCX card does the latter for you. With protection on, these tools are not registered at all, so the assistant cannot call them.

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
