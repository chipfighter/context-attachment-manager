# Connecting an agent

Context Attachment Manager can work with any agent through a thin adapter: earlier turns' images go out as short placeholders, and the model pulls back the one it needs by its id. The plugin has three layers:

- **The core** (`plugin/src/core`) knows no platform. It decides what to leave out, numbers the images and keeps them for the fetch tool.
- **Request-format translators** (`plugin/src/adapters/protocols`) find the images in a request and put the core's decision into it. Four formats today: OpenAI Responses, OpenAI Chat Completions, Anthropic Messages, Gemini generateContent.
- **Platform adapters** (`plugin/src/adapters/<name>`) are thin: where the platform's requests go, how they name their session, how the user connects it.

The panel (pick images, pin, search) is only in Codex and Claude Desktop. Every other agent uses the core alone: auto-select is always on, and the model fetches an image with `cam_view_image` when it needs it.

## Agents you can connect now

WorkBuddy, OpenCode, Gemini CLI, pi, DeepSeek Harness, Qwen Code, Cline, Kilo Code, goose and Cherry Studio. These adapters were written from each agent's code and docs and are **not tested live yet**. If you use one of them, please [open an issue](https://github.com/chipfighter/context-attachment-manager/issues) and tell us how it went, whether it worked or not.

How to install, step by step (also for an AI doing it for you): [INSTALL.md, Other agents](INSTALL.md#other-agents). In short, from a clone of this repository:

- `cam detect` tells which agent a shell runs in, from the variables each agent sets for its commands, and prints the next command.
- `cam connect <agent> --apply` registers a route in the local engine, from a local address to where the agent's requests go now, and writes the agent's settings: that address, and the MCP server for `cam_view_image`. What each setting held before is recorded (the files are never copied: they may hold API keys).
- `cam disconnect <agent>` puts back what was there, except settings changed since.
- `cam connect <agent>` without `--apply` only prints the steps.

DeepSeek Harness needs no route: `plugin/src/adapters/dsh` is a dsh bundle, installed with `dsh plugin --profile <profile> add <folder>`. It turns dsh's own image offload (`@deepseek-ai/dsh-compaction-image-offload`) off and does what it did, offloading the oldest images when a route refuses a request as over its image budget, and also offloads every earlier turn's images when a new turn starts. dsh shows an offloaded image as text with a read-only path, and the model reads it back from there.

## Adding your agent

A pull request that adds an agent touches these places:

1. **`plugin/src/adapters/<name>/platform.ts`**: the agent's entry, a `CorePlatform` (`plugin/src/core/platform.ts`). WorkBuddy's adapter, in short:

   ```ts
   export const workbuddy: CorePlatform = {
     name: "workbuddy",
     title: "WorkBuddy",
     upstream: "https://www.workbuddy.cn/v2",
     sessionOf: (headers) => headerOf(headers, "x-conversation-id"),
     sideRequest: (headers) => headerOf(headers, "x-agent-type") === "auxiliary",
     detect: (env) => env.CODEBUDDY === "1" && /* WorkBuddy's own marks */ true,
     setup: ({ home, env }) => ({ current, fallback, edits }), // what cam connect --apply writes
     connect: ({ url, mcp }) => [/* the steps cam connect prints */],
   };
   ```

2. **`plugin/src/platforms.ts`**: one line in `CORE_PLATFORMS`.
3. **Tests**: in `spike/src/platforms.test.ts`, a request as your agent sends it, rewritten as expected; in `spike/src/connect.test.ts`, what `detect` and `setup` read and write. Run `node --test` from the repository root.
4. **The "Works with" table** at the bottom of `README.md` (and `README_CN.md`, `README_JA.md` if you can; we will fill them in otherwise): one row with a link, one line on what your agent is, and how far it is tested.

What the engine needs from an agent:

- **A way to send its model requests through the engine.** Usually a base URL setting; `cam connect` registers the route. The engine keeps every header except its own (`x-cam-*`), and the credentials stay in the agent's requests.
- **A request format the translators know.** The engine tells it by the path: `/chat/completions`, `/responses`, `/messages`, `:generateContent`, `:streamGenerateContent`. A new format is a new translator in `plugin/src/adapters/protocols/<format>/` and an entry in `spike/src/contract.test.ts`, which checks every translator the same way.
- **A session id, if it has one.** Name the header in `sessionOf`. An agent with extensions can add `x-cam-session` to each request instead (see the pi extension). Without either, sessions are told apart by their first prompt, which works but can merge two sessions that start with the same words.
- **A variable it sets for the shell commands it runs** (`detect`), so `cam detect` and an AI installing the plugin pick your agent and no other.
- **Settings files `cam connect --apply` can write** (`setup`): where the base URL and the MCP servers go. Plain JSON or `NAME=value` lines; without `setup`, the steps are only printed.
- **An MCP server**, so the model has `cam_view_image`: `node plugin/src/plugin-server.ts` with `CAM_HOST=<name>`. It also keeps the engine running while the agent runs.

An agent that runs plugins inside its own process, like DeepSeek Harness, can do auto-select there instead of going through the engine. Keep its rule the same: when a new turn starts, earlier turns' images leave the request, and the model has a way to get one back.

## The panel

The panel stays in Codex and Claude Desktop. Other agents get no panel by default. If you want one for your agent, open an issue first: the panel layer (`plugin/src/panel`) reads everything through the core, and an adapter that shows it also has to store the user's choices per session (see `plugin/src/adapters/claude/panel-web.ts`).
