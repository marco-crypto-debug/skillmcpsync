# skillmcpsync

**Universal, multi-agent synchronization for MCP servers, skills, and tools across servers and machines via Git.**

`skillmcpsync` acts as a centralized bridge that synchronizes Model Context Protocol (MCP) servers, skills, and prompt rules across all your machines (laptops, dev servers, cloud VPSs) and coding agents (OpenCode, Claude Desktop, Claude Code, Cursor, Windsurf).

---

## 🌟 Key Features

- **Multi-Server & Multi-Machine**: Synchronize your setup between local workstations, cloud VMs, and remote development servers using a Git repository as the single source of truth.
- **Universal Multi-Agent Support**: Automatically translates and merges configurations for:
  - **OpenCode** (`opencode.json` MCP block + `skills/` directory)
  - **Claude Desktop** (`claude_desktop_config.json`)
  - **Claude Code CLI** (`~/.claude.json` / `~/.claude/mcp.json` + `skills/`)
  - **Cursor** (`~/.cursor/mcp.json` + `.cursorrules`)
  - **Windsurf** (`~/.codeium/windsurf/mcp_config.json` + global rules)
- **Automatic Secret Sanitization**:
  - Automatically identifies API keys, auth tokens, and sensitive headers on export and replaces them with `${VAR_NAME}` placeholders.
  - Generates an `env.template` file in the Git vault.
  - Automatically stores raw secret values locally in `~/.config/skillmcpsync/.env` (never committed to Git).
  - Resolves `${VAR_NAME}` placeholders on `apply` and `sync`, warning if any required variables are missing.
- **Safe & Non-Destructive**:
  - Creates timestamped `.bak` backups before modifying any configuration files.
  - Preserves custom agent settings (e.g. models, themes, keybindings, disabled providers) when syncing MCP blocks.
- **Bi-directional Drift Detection**:
  - `skillmcpsync status` and `skillmcpsync diff` show exactly what is out of sync between servers.

---

## 🚀 Quick Start Guide

### Step 1: Initial Setup on Your Primary Server / Machine

1. **Initialize the tool and link to your private Git repository**:
   ```bash
   # Connect to your private git repository (e.g., GitHub, GitLab, or self-hosted Git)
   skillmcpsync init --repo git@github.com:youruser/my-agent-vault.git
   ```
   *(If you want to test locally first without a remote repo, simply run `skillmcpsync init --local`)*

2. **Export your existing MCP servers and skills into the vault**:
   ```bash
   skillmcpsync export
   ```
   This reads all installed agents, extracts their MCP servers and skills, tokenizes sensitive keys into `${VAR_NAME}`, and stages them into the vault.

3. **Push to your Git remote**:
   ```bash
   skillmcpsync sync -m "Initial sync of MCP tools and skills"
   ```

---

### Step 2: Setup on Another Server / VPS / Workstation

1. On your second machine or remote server:
   ```bash
   # Clone the vault
   skillmcpsync init --repo git@github.com:youruser/my-agent-vault.git
   ```

2. **Set your local API keys**:
   Review the required keys in `env.template`, and copy them to your local `.env`:
   ```bash
   cp ~/.config/skillmcpsync/vault/env.template ~/.config/skillmcpsync/.env
   # Add your tokens in ~/.config/skillmcpsync/.env
   ```

3. **Apply the configuration to all installed agents on this server**:
   ```bash
   skillmcpsync apply
   ```
   Now OpenCode, Claude, Cursor, and Windsurf on this server have the exact same skills and MCP tools configured!

---

### Step 3: Ongoing Synchronization

Whenever you add or change an MCP server or skill on any machine:
```bash
# Pulls latest changes, exports local changes, merges, applies, and pushes:
skillmcpsync sync
```

---

## 📖 CLI Commands Reference

| Command | Description |
| :--- | :--- |
| `skillmcpsync init` | Initialize synchronization vault and detect installed coding agents |
| `skillmcpsync export` | Export tools, skills, and MCP servers from installed agents into vault |
| `skillmcpsync apply` | Apply unified vault configuration to all local coding agents |
| `skillmcpsync sync` | Complete sync cycle: pull remote -> export -> apply -> push changes |
| `skillmcpsync status` | Visual dashboard: Git state, vault inventory, agent status, and drift |
| `skillmcpsync diff` | View granular differences between vault and local agent configs |
| `skillmcpsync mcp list` | List all MCP servers stored in the vault |
| `skillmcpsync mcp add <name>` | Add or update an MCP server directly in the vault |
| `skillmcpsync mcp remove <name>` | Delete an MCP server from the vault |
| `skillmcpsync skill list` | List all skills stored in the vault |
| `skillmcpsync skill add <path>` | Import a skill folder or markdown file into the vault |
| `skillmcpsync skill remove <name>` | Delete a skill from the vault |
| `skillmcpsync memory list` | List shared memory entries across all namespaces (`research/`, `code/`, etc.) |
| `skillmcpsync memory read <ns> [key]` | Read entry or entries from a namespace with ACL enforcement |
| `skillmcpsync memory write <ns> <key> <val>` | Write an entry to shared memory with author attribution & versioning |
| `skillmcpsync memory scratchpad <agent>` | View or record private reasoning notes (isolated per agent) |
| `skillmcpsync memory blackboard` | View collective blackboard aggregating all agent partial contributions |
| `skillmcpsync memory assemble` | Assemble partial agent contributions into a unified deliverable |
| `skillmcpsync memory conflicts` | Inspect write conflict events and resolution strategies |
| `skillmcpsync memory history` | View audit trail of memory operations |
| `skillmcpsync memory acl` | Inspect or grant access control permissions per agent and namespace |

---

## 🧠 Multi-Agent Shared Memory & Blackboard Architecture

`skillmcpsync` incorporates the **Multi-Agent Shared Memory** architecture (based on blackboard systems and access control):

- **Private Scratchpad**: Each agent (Researcher, Coder, Reviewer) has an isolated private workspace for drafts, notes, and local reasoning that are never exposed to other agents.
- **Access Control Layer (ACL)**: Manages per-agent, per-namespace permissions (`read`, `write`, `read_write`). Default team roles:
  - `researcher`: Read/Write `research/`, Read `code/`, `review/`, `shared/`
  - `coder`: Read/Write `code/`, Read `research/`, `review/`, `shared/`
  - `reviewer`: Read/Write `review/`, Read `research/`, `code/`, `shared/`
- **Shared Memory Pool**: Logical namespaces (`research/`, `code/`, `review/`, `shared/`) with versioning, timestamps, and author tags.
- **Conflict Resolution**:
  - `last_write_wins`: Automatic last write precedence.
  - `version_check`: Optimistic concurrency locking (rejects stale writes).
  - `priority`: Role precedence hierarchy (e.g. Reviewer > Coder > Researcher).
  - `merge`: Concatenates and combines partial solutions.
- **Blackboard**: Aggregates partial solutions from all agent contributions into a unified deliverable document, posting merged results back to the shared memory pool.
- **Git Synchronization**: Shared memory, access control, and blackboard states are automatically synchronized alongside MCP servers and skills via `skillmcpsync sync`.

---

## ⚙️ Options & Flags

### `skillmcpsync init`
- `-r, --repo <url>`: Git remote repository URL.
- `-b, --branch <name>`: Git branch (default: `main`).
- `-v, --vault <path>`: Custom local directory for vault storage (default: `~/.config/skillmcpsync/vault`).
- `--local`: Set up a local Git vault without a remote.

### `skillmcpsync export`
- `-a, --agents <list>`: Comma-separated list of agents to export from (e.g. `opencode,cursor`).
- `--skip-secrets`: Export without tokenizing sensitive keys into `${VAR}`.

### `skillmcpsync apply`
- `-a, --agents <list>`: Comma-separated list of agents to update.
- `--dry-run`: Preview changes without writing to configuration files.
- `--no-backup`: Disable automatic `.bak` backup file creation.

### `skillmcpsync sync`
- `-m, --message <msg>`: Custom commit message for git push.
- `--no-push`: Pull and apply changes without pushing local commits.
- `--no-pull`: Apply and push changes without pulling remote commits.

---

## 🔒 Security Model

- **No Plaintext Secrets in Git**: Sensitive tokens matching standard patterns (`sk-...`, `ghp_...`, `xoxb-...`) or keys containing `TOKEN`, `KEY`, `SECRET`, `PASSWORD` are tokenized as `${SERVER_KEY_NAME}`.
- **Local Secret Store**: The actual values are kept safely in `~/.config/skillmcpsync/.env` on the local machine and omitted from Git (`.gitignore` included automatically).
- **Environment Fallback**: The resolver automatically checks `process.env` first, then falls back to `~/.config/skillmcpsync/.env`.

---

## 🛠 Supported Agent Formats

| Agent | Config Target | What is Synced |
| :--- | :--- | :--- |
| **OpenCode** | `~/.config/opencode/opencode.json(c)`<br>`~/.config/opencode/skills/` | MCP servers (`mcp` block with `command` arrays and `type: "local"` / `"remote"`), skills directory |
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)<br>`~/.config/claude-desktop/` (Linux)<br>`%APPDATA%\Claude\` (Windows) | `mcpServers` (command, args, env) |
| **Claude Code CLI** | `~/.claude.json` / `~/.claude/mcp.json`<br>`~/.claude/skills/` | `mcpServers` and skills |
| **Cursor** | `~/.cursor/mcp.json`<br>`~/.cursor/rules/` | `mcpServers` and `.mdc` rules |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json`<br>`~/.codeium/windsurf/memories/` | `mcpServers` and global rules |

---

## 📦 License

MIT License.
