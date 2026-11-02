// Purpose: v0.11 — Gemini CLI: the core alone, no panel. Signed in with an API key it sends Gemini generateContent
// requests to GOOGLE_GEMINI_BASE_URL (by default https://generativelanguage.googleapis.com); signed in with Google, the
// same contents wrapped in `request` to CODE_ASSIST_ENDPOINT (by default https://cloudcode-pa.googleapis.com), which
// takes a route of its own (`cam connect gemini-cli --base-url https://cloudcode-pa.googleapis.com`). Its requests name
// no session the engine knows, so sessions are told apart by their first prompt. MCP servers go under "mcpServers" in
// ~/.gemini/settings.json. Not tested live.
// Input: none. Output: the platform's entry for the engine (core/platform.ts).

import type { CorePlatform } from "../../core/platform.ts";

export const geminiCli: CorePlatform = {
  name: "gemini-cli",
  title: "Gemini CLI",
  upstream: "https://generativelanguage.googleapis.com",
  connect: ({ url, mcp }) => [
    `In ~/.gemini/.env, set GOOGLE_GEMINI_BASE_URL=${url} (signed in with Google instead: CODE_ASSIST_ENDPOINT, with a route made by --base-url https://cloudcode-pa.googleapis.com)`,
    `In ~/.gemini/settings.json, add: "mcpServers": { "context-attachment-manager": { "command": ${JSON.stringify(mcp.command)}, "args": ${JSON.stringify(mcp.args)}, "env": ${JSON.stringify(mcp.env)} } }`,
    "Restart Gemini CLI.",
  ],
};
