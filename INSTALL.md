# Install

The easy way: paste this to your agent (Codex, Claude Desktop's Code tab, WorkBuddy, OpenCode, Gemini CLI, pi, DeepSeek Harness, Qwen Code, Cline, Kilo Code or goose; for Cherry Studio, see [Other agents](#other-agents)) and let it do the steps below for you.

```text
Install the Context Attachment Manager plugin for me, following https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

## For AI assistants

Install for the agent the user is talking to you in, and only that one. Which agent that is does not depend on the model you are: a DeepSeek model running in WorkBuddy installs for WorkBuddy.

1. **Find the agent.** Run `env` (`Get-ChildItem Env:` in PowerShell) and look for these variables, which each agent sets for the commands you run:

   | Variable | Agent | Section |
   |---|---|---|
   | `CODEX_THREAD_ID` | Codex | [Codex](#codex) |
   | `CLAUDECODE=1` | Claude Code | [Claude Desktop](#claude-desktop) |
   | `CODEBUDDY=1` | WorkBuddy (CodeBuddy's agent) | [Other agents](#other-agents) |
   | `OPENCODE=1` | OpenCode | [Other agents](#other-agents) |
   | `GEMINI_CLI=1` | Gemini CLI | [Other agents](#other-agents) |
   | `PI_SESSION_ID` | pi | [Other agents](#other-agents) |
   | `DSH_SHELL=1` | DeepSeek Harness | [Other agents](#other-agents) |
| `QWEN_CODE=1` | Qwen Code | [Other agents](#other-agents) |
| `CLINE_ACTIVE=true` | Cline | [Other agents](#other-agents) |
| `KILO=1` | Kilo Code | [Other agents](#other-agents) |
| `GOOSE_TERMINAL=1` | goose | [Other agents](#other-agents) |

   If none matches, or more than one, ask the user which agent this is. For the other agents, `cam detect` (below) checks the same variables and prints the exact command to run next.
2. **Follow that section only**, and run the commands yourself. Do not edit the agent's settings by hand: the commands back them up and record what they wrote, so they can be undone.
3. **When you are done**, tell the user the one step left for them: restart the agent (in Claude Desktop, start a new session in the Code tab). For Codex and Claude Desktop, also tell them how to open the panel (see [Open the panel](#open-the-panel)); the other agents have no panel, and there is nothing to open.

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

## Other agents

WorkBuddy, OpenCode, Gemini CLI, pi, DeepSeek Harness, Qwen Code, Cline, Kilo Code, goose and Cherry Studio get auto-select without a panel: earlier turns' images go out as short placeholders, and the model pulls back the one it needs by its id. These adapters are new and were not tested on the agents themselves yet; please [open an issue](https://github.com/chipfighter/context-attachment-manager/issues) if one does not work for you.

They need [Node.js 24 or later](https://nodejs.org) (`node --version`) and the plugin's code in a folder where it can stay (the agent runs it from there):

```bash
git clone --depth 1 https://github.com/chipfighter/context-attachment-manager.git "$HOME/context-attachment-manager"
```

Then let it find the agent and print the command to run:

```bash
node "$HOME/context-attachment-manager/plugin/src/cam.ts" detect
```

Run the command it prints under `next`, then restart the agent. What that command does for each agent:

- **WorkBuddy**: `cam connect workbuddy --apply` sets `CODEBUDDY_BASE_URL` under `env` in `~/.workbuddy/settings.json` and adds the plugin's MCP server to `~/.workbuddy/.mcp.json`. A relay address set there before stays the destination.
- **OpenCode**: `cam connect opencode --apply` sets `options.baseURL` of the provider your `model` uses (or `--provider <id>`) in `~/.config/opencode/opencode.json`, and adds the MCP server under `mcp`. A config file with comments is not changed; the command says so, and `cam connect opencode` without `--apply` prints the steps instead.
- **Gemini CLI**: `cam connect gemini-cli --apply` sets `GOOGLE_GEMINI_BASE_URL` (API key sign-in) or `CODE_ASSIST_ENDPOINT` (Google sign-in) in `~/.gemini/.env`, and adds the MCP server to `~/.gemini/settings.json`. A `.env` in your project folder that sets the same variable wins over it. Vertex AI is not supported.
- **pi**: `cam connect pi --apply` sets `baseUrl` of the provider pi uses now (or `--provider <name>`) in `~/.pi/agent/models.json`, and lists the plugin's pi extension under `extensions` in `~/.pi/agent/settings.json`. The extension adds the MCP server.
- **Qwen Code**: `cam connect qwen-code --apply` sets `baseUrl` of the model you use under `modelProviders` in `~/.qwen/settings.json` (or `OPENAI_BASE_URL` / `ANTHROPIC_BASE_URL` in `~/.qwen/.env`), and adds the MCP server there. Qwen OAuth is not supported.
- **Cline**: `cam connect cline --apply` sets `settings.baseUrl` of the provider you use (or `--provider <id>`) in `~/.cline/data/settings/providers.json`, and adds the MCP server to `cline_mcp_settings.json` beside it. Cline's own account provider is not supported. Reload the VS Code window afterwards.
- **Kilo Code**: `cam connect kilo-code --apply` sets `options.baseURL` of the provider your `model` uses (or `--provider <id>`) in `~/.config/kilo/kilo.json`, and adds the MCP server under `mcp`. Kilo's own gateway account is not supported.
- **goose**: `cam connect goose` prints what to put in goose's `config.yaml` (the provider's `<PROVIDER>_HOST` and an extension); this command does not write YAML.
- **Cherry Studio**: it runs no commands of its own, so run `cam connect cherry-studio --base-url <API host>` yourself, with the API host your provider shows in Cherry Studio's settings, and put the printed address in that field; add the printed MCP server under Settings > MCP Servers.
- **DeepSeek Harness**: `dsh plugin --profile <profile> add "<folder>/plugin/src/adapters/dsh"` installs the plugin as a dsh bundle. It turns dsh's own image offload off and does what it did, and also offloads earlier turns' images when a new turn starts. The model reads an offloaded image back from the path its placeholder names.

Each `cam connect --apply` records the settings it changed and what they held before (in the data folder, see [Your data](#your-data)); it never copies the files, which may hold API keys. It keeps the address the agent used before as the destination: requests go there through the engine. Run it again after an update; it keeps what it found the first time.

## Custom endpoints

Configure your gateway in the client first, as you would without this plugin. It must support image inputs, tool calls and the client's native API: Responses for Codex, or Anthropic Messages for Claude Code. The plugin manages images and forwards requests to that same endpoint; it does not convert between API formats. Claude support applies to the desktop app's **Code** tab.

- **Codex:** supports single-line `openai_base_url` and `model_providers.<name>.base_url` settings in your user `config.toml`, including normal provider tables and dotted keys. Unsupported endpoint syntax stops setup without changing the configuration. External profile files and environment overrides are not automatically rewritten. When a switching tool such as cc-switch writes another provider's address, the engine notices within a moment and points Codex at it through the engine again, so you can keep switching models; restart Codex as the switching tool asks. If Codex was closed during the switch, the first start after it connects directly, and the next one goes through the engine again. Disable the plugin in the panel to stop this.
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

### Other agents

Undo the settings first, then restart the agent and delete the folder:

```bash
node "$HOME/context-attachment-manager/plugin/src/cam.ts" disconnect <agent>
```

`<agent>` is `workbuddy`, `opencode`, `gemini-cli`, `pi`, `qwen-code`, `cline` or `kilo-code`; for goose and Cherry Studio, put back the address you had by hand. It puts back what was there before, except settings you changed since. For DeepSeek Harness: `dsh plugin --profile <profile> remove dsh-context-attachment-manager`.

Remove the plugin only after this: an agent still pointed at the engine cannot connect once nothing starts it.

### Your data

Your selections and logs stay in the data folder: `%USERPROFILE%\.codex-attachment-manager` on Windows, `~/Library/Application Support/codex-attachment-manager` on macOS, `~/.local/share/codex-attachment-manager` on Linux. It holds selections, request statistics (sizes and counts, never content), logs (no conversation content or credentials) and the backup of `config.toml`. Delete it if you don't need it.
