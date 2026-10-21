# Install

The easy way: paste this to Codex, or to Claude in Claude Desktop's Code tab, and let it do the steps below for you.

```text
Install the Context Attachment Manager plugin for me, following https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

## For AI assistants

- Install for the app the user is talking to you in: the Codex desktop app, or Claude Desktop's Code tab. Install for both only if the user asks.
- Follow that app's section below and run the commands yourself.
- When you are done, tell the user the one step left for them: restart Codex, or start a new session in Claude Desktop's Code tab. Then tell them how to open the panel (see [Open the panel](#open-the-panel)).

## Codex

### One command

Windows (PowerShell):

```powershell
irm https://github.com/chipfighter/context-attachment-manager/releases/latest/download/install.ps1 | iex
```

macOS and Linux:

```bash
curl -fsSL https://github.com/chipfighter/context-attachment-manager/releases/latest/download/install.sh | sh
```

The command installs the plugin with Codex's own command line and points Codex at the plugin's local engine. Restart Codex afterwards. Run it again later to upgrade.

What it changes in Codex:

- Adds a marked proxy block to `~/.codex/config.toml`, after backing the file up.
- If a proxy is set in your environment variables, adds a marked `NO_PROXY` block with local addresses only to `~/.codex/.env`.
- Nothing else. If you have set `openai_base_url` yourself, it stops without writing anything.

### Without a terminal

1. On Codex's **Plugins** page, click **Add a marketplace**, enter `chipfighter/context-attachment-manager` as the **Source**, leave the rest empty, and click **Add marketplace**.
2. Install **Context Attachment Manager** from the list.
3. Open the panel (see below). It says the plugin is not enabled yet: click **Enable plugin**, then restart Codex.

## Claude Desktop

Claude Desktop installs plugins only from marketplaces you have added, and adding one from GitHub takes the `claude` command, Claude Code's command line ([setup guide](https://code.claude.com/docs/en/setup)). Without Codex installed, the plugin also needs [Node 24 or later](https://nodejs.org).

```bash
claude plugin marketplace add chipfighter/context-attachment-manager
```

```bash
claude plugin install codex-attachment-manager@codex-attachment-manager
```

Instead of the second command, you can also install it in the Code tab: click **+** next to the prompt box, choose **Plugins**, then **Add plugin**, pick **Context Attachment Manager**, and install it for your user account. The install ID keeps the project's old name.

Then start a new session in the Code tab. There is nothing to set up: the plugin doesn't edit any settings, and only points that session's own Claude Code process at the engine while it runs.

## Open the panel

- **Codex**: open a task, click **Toggle side panel** at the top right, open a new tab with **+**, and choose **Context Assets** under **Plugins and MCPs**. If it isn't there, restart Codex once.
- **Claude Desktop**: once a session in the Code tab has images, the panel opens by itself in the built-in browser, next to the conversation. Type `/cam` and send it to open it any time. If `/cam` is your first message in a new session, the prompt box may say the command doesn't exist: send it anyway.

## Update

- **Codex**: run the one command again, then restart Codex.
- **Claude Desktop**: run `claude plugin marketplace update codex-attachment-manager`, then `claude plugin update codex-attachment-manager@codex-attachment-manager`. New sessions use the new version.

## Uninstall

### Codex

Disable first, then remove: click **Disable plugin** in the panel, remove the plugin on the **Plugins** page, and restart Codex.

Or run the uninstall command. It restores the direct connection and removes the plugin, and it works even when the plugin files are gone:

Windows (PowerShell):

```powershell
irm https://github.com/chipfighter/context-attachment-manager/releases/latest/download/uninstall.ps1 | iex
```

macOS and Linux:

```bash
curl -fsSL https://github.com/chipfighter/context-attachment-manager/releases/latest/download/uninstall.sh | sh
```

**If Codex can't connect** and its errors mention `localhost:17891` (for example, the plugin was removed without disabling it first), run the uninstall command above and restart Codex.

### Claude Desktop

Uninstall it with **Manage plugins** under **+** → **Plugins** in the Code tab, or with `claude plugin uninstall codex-attachment-manager@codex-attachment-manager`. New sessions then connect directly; there is nothing to restore.

### Your data

Your selections and logs stay in the data folder: `%USERPROFILE%\.codex-attachment-manager` on Windows, `~/Library/Application Support/codex-attachment-manager` on macOS, `~/.local/share/codex-attachment-manager` on Linux. It holds selections, request statistics (sizes and counts, never content), logs (no conversation content or credentials) and the backup of `config.toml`. Delete it if you don't need it.
