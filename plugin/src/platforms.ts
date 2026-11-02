// Purpose: v0.11 — the platforms the plugin connects (docs/v0.11/plan.md 3.8; ADAPTERS.md). Codex and Claude Code have
// adapters of their own, with the panel (adapters/codex, adapters/claude). The others use the core alone: their entry
// (core/platform.ts) is all the engine, the plugin's MCP service and `cam connect` need. A new platform adds its
// adapters/<name>/platform.ts and one line here. DeepSeek Harness is a dsh plugin of its own (adapters/dsh/plugin.ts),
// no route, so it is not listed.
// Input: none. Output: the registry.

import { geminiCli } from "./adapters/gemini-cli/platform.ts";
import { opencode } from "./adapters/opencode/platform.ts";
import { pi } from "./adapters/pi/platform.ts";
import { workbuddy } from "./adapters/workbuddy/platform.ts";
import type { CorePlatform } from "./core/platform.ts";

export const CORE_PLATFORMS: CorePlatform[] = [workbuddy, opencode, geminiCli, pi];
export const PANEL_PLATFORMS = ["codex", "claude"] as const;

export const corePlatformOf = (name: string | null | undefined): CorePlatform | null => CORE_PLATFORMS.find((platform) => platform.name === name) ?? null;
export const isPlatform = (name: unknown): name is string => typeof name === "string" && ((PANEL_PLATFORMS as readonly string[]).includes(name) || !!corePlatformOf(name));
