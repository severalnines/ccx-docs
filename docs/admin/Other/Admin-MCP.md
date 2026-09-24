# Admin MCP server

[`@severalnines/ccx-admin-mcp`](https://github.com/severalnines/ccx-admin-mcp) is an [MCP](https://modelcontextprotocol.io) (Model Context Protocol) server for the CCX **admin API**. It lets operators and SREs use an AI assistant (Claude Code, Claude Desktop, Cursor, ...) to look across all users and datastores of a CCX installation, for example:

- "Which datastores are degraded or have a failed last job?"
- "Show the nodes and the audit log of datastore 936a84de-... for the last 24 hours"
- "Who owns the datastore called fancy-breeze?"
- "How many users do we have, and which are suspended?"
- "Total instance hours per customer for September"

It covers the same endpoints as the admin panel and the [billing report API](Billing.md). For the end-user API (a customer's own datastores) use the [user MCP server](../../user/Technical/MCP.md) instead.

## Credentials

The admin API accepts two kinds of credentials. Both live in Kubernetes secrets in the CCX namespace, the same ones used for the [admin panel and the admin API](../Troubleshooting/Operations-and-Management.md):

| Secret | Keys | Environment variables | Covers |
|--------|------|-----------------------|--------|
| `admin-users` | `ADMIN_USERS` = `email:password` | `CCX_ADMIN_USERNAME`, `CCX_ADMIN_PASSWORD` | datastores, nodes, audit log, users, billing, cmon version |
| `admin-basic-auth` | `ADMIN_AUTH_USERNAME`, `ADMIN_AUTH_PASSWORD` | `CCX_ADMIN_BASIC_USERNAME`, `CCX_ADMIN_BASIC_PASSWORD` | health check, datastore/user counters, VPC listing, billing |

The admin user login is the one you need. Basic auth is optional for everything except `ccx_admin_list_vpcs`, which has no fallback: the counter tools count the full lists instead, and billing accepts either credential set.

```bash
kubectl -n <ccx-namespace> get secret admin-users -o jsonpath='{.data.ADMIN_USERS}' | base64 -d
kubectl -n <ccx-namespace> get secret admin-basic-auth -o jsonpath='{.data.ADMIN_AUTH_USERNAME}' | base64 -d
kubectl -n <ccx-namespace> get secret admin-basic-auth -o jsonpath='{.data.ADMIN_AUTH_PASSWORD}' | base64 -d
```

## Installation

Node.js 18 or newer is required.

### Claude Code

```bash
claude mcp add ccx-admin \
  -e CCX_BASE_URL=https://ccx.example.com \
  -e CCX_ADMIN_USERNAME=admin@example.com \
  -e CCX_ADMIN_PASSWORD='...' \
  -- npx -y @severalnines/ccx-admin-mcp@latest
```

The `-e` flags store the values as environment variables of the server, so the password does not appear in the process list.

### Other MCP clients

```json
{
  "mcpServers": {
    "ccx-admin": {
      "command": "npx",
      "args": ["-y", "@severalnines/ccx-admin-mcp@latest"],
      "env": {
        "CCX_BASE_URL": "https://ccx.example.com",
        "CCX_ADMIN_USERNAME": "admin@example.com",
        "CCX_ADMIN_PASSWORD": "..."
      }
    }
  }
}
```

### From source with a `.env` file

```bash
git clone https://github.com/severalnines/ccx-admin-mcp.git
cd ccx-admin-mcp
npm install             # also builds
cp .env.example .env    # fill in CCX_BASE_URL and the credentials
claude mcp add ccx-admin -- node "$PWD/build/index.js"
```

Only the `.env` next to `package.json` (or one given with `--dotenv`) is read, never one in the working directory, and only `CCX_*` keys are imported from it.

## Protection mode

Destructive tools are blocked until you opt out with `--protect false` or `CCX_PROTECT=false`:

- `ccx_admin_delete_datastore` (force-deletes any user's datastore)
- `ccx_admin_delete_user`
- `ccx_admin_suspend_user`

The delete tools additionally require `confirm: true` in the tool call. That is a signal for the assistant to check with you before proceeding, not a technical guarantee: protection mode is the only hard guard.

## Available tools

| Tool | Description |
|------|-------------|
| `ccx_admin_check` | Verify connectivity and both credential sets; shows the admin identity |
| `ccx_admin_cmon_version` | Version of the ClusterControl controller (cmon) |
| `ccx_admin_list_datastores` | All datastores across all users with owner, status and latest job; filter by status, cloud, type, owner, name or job status |
| `ccx_admin_get_datastore` | One datastore with its latest job and database nodes |
| `ccx_admin_list_nodes` | Database and load-balancer nodes: hostname, IP, role, cmon host status, instance type, availability zone |
| `ccx_admin_get_datastore_audit` | Audit log of a datastore (jobs, resource changes) with time bounds and type filter |
| `ccx_admin_delete_datastore` | Force-delete a datastore (protected) |
| `ccx_admin_count_datastores` | Total number of datastores |
| `ccx_admin_list_users` | All users with suspended/deleted flags; filter by login, name, suspended, deleted |
| `ccx_admin_count_users` | Customer count plus an internal/external/suspended/deleted breakdown |
| `ccx_admin_suspend_user` / `ccx_admin_unsuspend_user` | Suspend a user with a reason, or lift the suspension |
| `ccx_admin_delete_user` | Delete a user (protected) |
| `ccx_admin_billing_usage` | Per-datastore usage for a date range: instance hours, volume GiB-hours, egress, backups (see [Billing](Billing.md)) |
| `ccx_admin_list_vpcs` | VPC ids known to CCX for an AWS region. The only tool that requires the basic-auth credentials; the backend does not query the cloud, so an empty result means "unknown" rather than "none" |

## Security notes

- The server runs on the operator's machine and connects directly to the CCX API over HTTPS. `CCX_BASE_URL` must be `https://` (plain `http://` is only accepted for localhost) and redirects are never followed, so the admin password and session cookie cannot be replayed to another host.
- Credentials are never written to logs or returned in tool output.
- Everything the assistant sees comes from the admin API responses; treat the assistant session with the same care as the admin panel.

See the [project README](https://github.com/severalnines/ccx-admin-mcp#readme) for the full reference.
