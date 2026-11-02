// Purpose: v0.11 — WorkBuddy (Tencent's desktop agent, CodeBuddy Code inside; docs/v0.11/plan.md 4): the core alone, no
// panel. Its agent sends OpenAI Chat Completions requests to CODEBUDDY_BASE_URL + /chat/completions, which by default
// is WorkBuddy's own service under /v2 (a capture on 2026-11-02: without /v2 the service answers 405). Each request
// names its conversation in `x-conversation-id`; side requests (prompt enhancement and the like) say
// `x-agent-type: auxiliary`. `env` in ~/.workbuddy/settings.json reaches the agent's environment. Not tested live.
// Input: request headers. Output: the platform's entry for the engine (core/platform.ts).

import { headerOf, type CorePlatform } from "../../core/platform.ts";

export const workbuddy: CorePlatform = {
  name: "workbuddy",
  title: "WorkBuddy",
  upstream: "https://www.workbuddy.cn/v2",
  sessionOf: (headers) => headerOf(headers, "x-conversation-id"),
  sideRequest: (headers) => headerOf(headers, "x-agent-type") === "auxiliary",
  connect: ({ url, mcp }) => [
    `In ~/.workbuddy/settings.json, add to "env": "CODEBUDDY_BASE_URL": "${url}"`,
    `Add an MCP server in WorkBuddy (stdio): command ${JSON.stringify(mcp.command)}, args ${JSON.stringify(mcp.args)}, env ${JSON.stringify(mcp.env)}`,
    "Restart WorkBuddy.",
  ],
};
