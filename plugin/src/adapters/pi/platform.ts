// Purpose: v0.11 — pi (earendil-works/pi): the core alone, no panel. Each provider in ~/.pi/agent/models.json takes
// its own `baseUrl`, so the route is registered for the provider the user picks, with that provider's address; the
// request format follows the provider. Our pi extension (extension.ts) names each request's session in
// `x-cam-session` and registers the plugin's MCP service, so pi needs no other setting. Not tested live.
// Input: none. Output: the platform's entry for the engine (core/platform.ts).

import { fileURLToPath } from "node:url";
import type { CorePlatform } from "../../core/platform.ts";

export const pi: CorePlatform = {
  name: "pi",
  title: "pi",
  upstream: null,
  connect: ({ url }) => [
    `In ~/.pi/agent/models.json, set your provider's "baseUrl": "${url}"`,
    `Load the extension: pi -e ${JSON.stringify(fileURLToPath(new URL("./extension.ts", import.meta.url)))} (or copy it to ~/.pi/agent/extensions/)`,
    "Restart pi.",
  ],
};
