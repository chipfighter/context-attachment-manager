// Purpose: v0.11 — OpenCode: the core alone, no panel. Each provider in opencode.json takes its own base URL
// (`options.baseURL`), so the route is registered for the provider the user picks, with that provider's address; the
// request format follows the provider (Anthropic Messages, OpenAI Responses or Chat Completions, Gemini). Its requests
// name no session the engine knows, so sessions are told apart by their first prompt; a plugin of OpenCode's own could
// add `x-cam-session` in its `model.request` hook. MCP servers go under "mcp" in opencode.json. Not tested live.
// Input: none. Output: the platform's entry for the engine (core/platform.ts).

import type { CorePlatform } from "../../core/platform.ts";

export const opencode: CorePlatform = {
  name: "opencode",
  title: "OpenCode",
  upstream: null,
  connect: ({ url, mcp }) => [
    `In opencode.json, set your provider's base URL: "provider": { "<provider id>": { "options": { "baseURL": "${url}" } } }`,
    `Add the MCP server: "mcp": { "context-attachment-manager": { "type": "local", "command": ${JSON.stringify([mcp.command, ...mcp.args])}, "environment": ${JSON.stringify(mcp.env)} } }`,
    "Restart OpenCode.",
  ],
};
