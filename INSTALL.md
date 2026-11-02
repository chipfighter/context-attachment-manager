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
- If you use a custom `openai_base_url` or provider `base_url`, keeps the original endpoint beside a marked local route. Disabling restores it without replacing changes you made later.
- Leaves the provider's model, authentication and other settings in place.

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

## Custom endpoints

Configure your gateway in the client first, as you would without this plugin. It must support image inputs, tool calls and the client's native API: Responses for Codex, or Anthropic Messages for Claude Code. The plugin manages images and forwards requests to that same endpoint; it does not convert between API formats. Claude support applies to the desktop app's **Code** tab.

- **Codex:** supports single-line `openai_base_url` and `model_providers.<name>.base_url` settings in your user `config.toml`, including normal provider tables and dotted keys. Unsupported endpoint syntax stops setup without changing the configuration. External profile files and environment overrides are not automatically rewritten. After a switching tool changes provider addresses, enable the plugin again (or run the install command again), then restart Codex.
- **Claude Code:** uses the process's original `ANTHROPIC_BASE_URL`, or Anthropic's official endpoint when absent. Start a new Code session after changing the endpoint. Bedrock, Vertex and Foundry keep their own transport and are not managed.

The engine listens only on loopback: port 17891 serves the panel and existing official connections; port 17892 serves registered provider routes. Both belong to the same engine process. With a custom engine port, provider routes use the next port. Keep both ports available. An older plugin copy cannot serve the registered routes; update both platform plugins for normal operation.


### Troubleshooting

If a custom endpoint does not work with the plugin, collect the details below before opening an issue:

1. **Identify the setup.** Include the Context Attachment Manager version and the installed plugin version for the affected platform, the client version, your OS and version, and whether this is the Codex desktop app or a local Code session in Claude Desktop.
2. **Test the endpoint in the client first.** Configure and verify the gateway in Codex or Claude Code without relying on the plugin. The endpoint must accept the client's native API format: **Responses** for Codex or **Anthropic Messages** for Claude Code. It must also support image inputs and tool calls. The plugin forwards requests; it does not translate API formats.
3. **Check both local engine ports.** The engine uses loopback port `17891` for the panel and existing official connections, and port `17892` for registered provider routes. Both ports must be available to the local engine. If you configured a custom engine port, the provider-routes port is the next port number. See [Custom endpoints](#custom-endpoints) for the routing details.
4. **Apply endpoint changes in a fresh client session.** In Codex, after a tool changes provider addresses, enable the plugin again (or rerun the install command), then restart Codex. In Claude Desktop, start a new session in the Code tab after changing the endpoint. If you updated the plugin, follow [Update](#update) and make sure both platform plugin copies are current.

When reporting a failure, include the steps that reproduce it, the expected and actual result, the endpoint provider and non-secret endpoint shape (for example, whether it is a hosted gateway or a local URL, without private path or token details), the client and plugin versions, OS version, relevant error text, and whether the endpoint works directly in the client. Do not include API keys, authorization headers, private endpoint tokens, or conversation content. Remove them from logs and screenshots before attaching anything.

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
