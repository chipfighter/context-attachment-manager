# Connecting an agent

Context Attachment Manager cuts the multimodal tax on any agent: earlier turns' images go out as short placeholders, and the model pulls back the one it needs by its id. The plugin has three layers:

- **The core** (`plugin/src/core`) knows no platform. It decides what to leave out, numbers the images and keeps them for the fetch tool.
- **Request-format translators** (`plugin/src/adapters/protocols`) find the images in a request and put the core's decision into it. Four formats today: OpenAI Responses, OpenAI Chat Completions, Anthropic Messages, Gemini generateContent.
- **Platform adapters** (`plugin/src/adapters/<name>`) are thin: where the platform's requests go, how they name their session, how the user connects it.

The panel (pick images, pin, search) is only in Codex and Claude Desktop. Every other agent uses the core alone: auto-select is always on, and the model fetches an image with `cam_view_image` when it needs it.

## Agents you can connect now

These adapters were written from each agent's code and docs and are **not tested live yet**. If one does not work for you, please [open an issue](https://github.com/chipfighter/context-attachment-manager/issues) with what you saw.

All of them need this repository on your computer and Node.js 24 or later. From the repository folder, run `cam connect <agent>` (`cam.cmd` on Windows). It registers a route in the local engine, from a local address to where the agent's requests go now, and prints the exact settings to change. It changes no file of the agent's.

### WorkBuddy

```bash
cam connect workbuddy
```

WorkBuddy's agent sends OpenAI Chat Completions requests to `CODEBUDDY_BASE_URL`, by default `https://www.workbuddy.cn/v2`. The command prints the local address to put in `~/.workbuddy/settings.json` under `env`, and the MCP server to add for `cam_view_image`. Sessions come from WorkBuddy's `x-conversation-id` header; its side requests (`x-agent-type: auxiliary`) pass unchanged.

### OpenCode

```bash
cam connect opencode --base-url https://api.anthropic.com/v1
```

Give the address your provider uses now (Anthropic, OpenAI, an OpenAI-compatible service, Google). Put the printed address in `opencode.json` as that provider's `options.baseURL`, and add the printed MCP server under `mcp`. OpenCode's requests name no session the engine can read, so sessions are told apart by their first prompt.

### Gemini CLI

```bash
cam connect gemini-cli
```

For an API key sign-in: set `GOOGLE_GEMINI_BASE_URL` to the printed address in `~/.gemini/.env`. For a Google sign-in: run `cam connect gemini-cli --base-url https://cloudcode-pa.googleapis.com` and set `CODE_ASSIST_ENDPOINT` instead. Add the printed MCP server under `mcpServers` in `~/.gemini/settings.json`.

### pi

```bash
cam connect pi --base-url https://api.anthropic.com
```

Give the address your provider uses now. Put the printed address in `~/.pi/agent/models.json` as that provider's `baseUrl`, and load our extension (`plugin/src/adapters/pi/extension.ts`, with `pi -e` or in `~/.pi/agent/extensions/`). The extension names each request's session and registers the MCP server.

### DeepSeek Harness

DeepSeek Harness needs no route: `plugin/src/adapters/dsh/plugin.ts` is a dsh plugin. In your composition's `cordis.yml`, replace the `@deepseek-ai/dsh-compaction-image-offload` row with one whose `name` is the path to that file. It keeps what dsh's own plugin does (offloading the oldest images when a route refuses a request as over its image budget) and adds auto-select: when a new turn starts, it offloads every image of the turns before. dsh shows an offloaded image as text with a read-only path, and the model reads it back from there.

## Adding your agent

A pull request that adds an agent touches these places:

1. **`plugin/src/adapters/<name>/platform.ts`**: the agent's entry, a `CorePlatform` (`plugin/src/core/platform.ts`). WorkBuddy's whole adapter:

   ```ts
   export const workbuddy: CorePlatform = {
     name: "workbuddy",
     title: "WorkBuddy",
     upstream: "https://www.workbuddy.cn/v2",
     sessionOf: (headers) => headerOf(headers, "x-conversation-id"),
     sideRequest: (headers) => headerOf(headers, "x-agent-type") === "auxiliary",
     connect: ({ url, mcp }) => [/* the steps cam connect prints */],
   };
   ```

2. **`plugin/src/platforms.ts`**: one line in `CORE_PLATFORMS`.
3. **Tests** in `spike/src/platforms.test.ts`: a request as your agent sends it, rewritten as expected. Run `node --test` from the repository root.
4. **The "Works with" table** at the bottom of `README.md` (and `README_CN.md`, `README_JA.md` if you can; we will fill them in otherwise): one row with a link, one line on what your agent is, and how far it is tested.

What the engine needs from an agent:

- **A way to send its model requests through the engine.** Usually a base URL setting; `cam connect` registers the route. The engine keeps every header except its own (`x-cam-*`), and the credentials stay in the agent's requests.
- **A request format the translators know.** The engine tells it by the path: `/chat/completions`, `/responses`, `/messages`, `:generateContent`, `:streamGenerateContent`. A new format is a new translator in `plugin/src/adapters/protocols/<format>/` and an entry in `spike/src/contract.test.ts`, which checks every translator the same way.
- **A session id, if it has one.** Name the header in `sessionOf`. An agent with extensions can add `x-cam-session` to each request instead (see the pi extension). Without either, sessions are told apart by their first prompt, which works but can merge two sessions that start with the same words.
- **An MCP server**, so the model has `cam_view_image`: `node plugin/src/plugin-server.ts` with `CAM_HOST=<name>`. It also keeps the engine running while the agent runs.

An agent that runs plugins inside its own process, like DeepSeek Harness, can do auto-select there instead of going through the engine. Keep its rule the same: when a new turn starts, earlier turns' images leave the request, and the model has a way to get one back.

## The panel

The panel stays in Codex and Claude Desktop. Other agents get no panel by default. If you want one for your agent, open an issue first: the panel layer (`plugin/src/panel`) reads everything through the core, and an adapter that shows it also has to store the user's choices per session (see `plugin/src/adapters/claude/panel-web.ts`).
