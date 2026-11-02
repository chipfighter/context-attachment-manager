// Purpose: v0.11 — what a platform's adapter tells the engine when the platform uses the core alone, without a panel
// (docs/v0.11/plan.md 3.8; ADAPTERS.md): its name, where its requests go, how its requests name their session, which
// of them are on the side, and what the user does to connect it. Everything else — which request format, which images,
// what is left out — the core and the request-format translators work out from the requests themselves.
// Input: none (types only). Output: the contract each adapters/<name>/platform.ts fills in.

import type { IncomingHttpHeaders } from "node:http";

export type ConnectInfo = {
  // The local address the platform is pointed at, and the command that starts the plugin's MCP service for it.
  url: string;
  mcp: { command: string; args: string[]; env: Record<string, string> };
};

export type CorePlatform = {
  // As in routes and data folders: lowercase letters, digits, hyphens.
  name: string;
  title: string;
  // Where its model requests go without the plugin, unless the user names another (`cam connect <name> --base-url`).
  upstream: string | null;
  // The session a request belongs to, from the platform's own headers. Without one the engine takes the `x-cam-session`
  // header a shim of ours may add, else tells sessions apart by their first prompt.
  sessionOf?: (headers: IncomingHttpHeaders) => string | null;
  // Requests the platform sends on the side (a title, a prompt suggestion): passed on as they are.
  sideRequest?: (headers: IncomingHttpHeaders) => boolean;
  // What the user does to connect it, one step per line (English, as in ADAPTERS.md).
  connect: (info: ConnectInfo) => string[];
};

export const headerOf = (headers: IncomingHttpHeaders, name: string): string | null => {
  const value = headers[name];
  return (Array.isArray(value) ? value[0] : value) || null;
};
