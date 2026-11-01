// Purpose: v0.11 — keeps the plugin's three layers apart (docs/v0.11/plan.md 3.6). The core imports only the core;
// the panel only the core; a request-format translator (adapters/protocols) the core and other translators; a
// platform (adapters/<name>) the core, the translators and its own files. Files at the top of plugin/src are the
// entry points and the ones not sorted yet; they may import anything.
// PENDING lists the imports that still break a rule while the split goes on. It may only shrink: a new break fails,
// and so does an entry that no longer occurs, so the list never keeps a stale exception.
// Input: the source files of plugin/src. Output: test results.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "plugin", "src");

const PENDING = new Set<string>([
  "adapters/claude/claude-index.ts -> adapters/codex/thread-index.ts",
  "adapters/claude/claude-index.ts -> images.ts",
  "adapters/codex/install.ts -> language.ts",
  "adapters/codex/install.ts -> messages.ts",
  "adapters/codex/thread-index.ts -> images.ts",
  "panel/panel-state.ts -> adapters/claude/claude-index.ts",
  "panel/panel-state.ts -> adapters/codex/thread-index.ts",
  "panel/panel-state.ts -> adapters/codex/thread-names.ts",
  "panel/panel-state.ts -> children.ts",
  "panel/panel-state.ts -> images.ts",
  "panel/panel-state.ts -> selection.ts",
]);

type Layer = "core" | "panel" | "protocols" | `adapter:${string}` | "top";

export function layerOf(file: string): Layer {
  const [first, second] = file.split("/");
  if (first === "core" || first === "panel") return first;
  if (first === "adapters" && second === "protocols") return "protocols";
  if (first === "adapters" && second && file.split("/").length > 2) return `adapter:${second}`;
  return "top";
}

export function allowed(from: Layer, to: Layer): boolean {
  if (from === "top") return true;
  if (to === "core") return true;
  if (from === "protocols" || from.startsWith("adapter:")) return to === "protocols" || to === from;
  return false;
}

function sources(): string[] {
  return readdirSync(src, { recursive: true, encoding: "utf8" }).map((name) => name.replaceAll("\\", "/")).filter((name) => /\.(ts|js)$/.test(name)).sort();
}

function importsOf(file: string): string[] {
  const text = readFileSync(join(src, file), "utf8");
  const found = new Set<string>();
  for (const match of text.matchAll(/(?:\bfrom|\bimport)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g)) found.add(posix.normalize(posix.join(posix.dirname(file), match[1])));
  return [...found];
}

export function breaks(): string[] {
  const out: string[] = [];
  for (const file of sources()) {
    for (const target of importsOf(file)) if (!allowed(layerOf(file), layerOf(target))) out.push(`${file} -> ${target}`);
  }
  return out.sort();
}

test("layers: each folder is the layer the plan says", () => {
  assert.equal(layerOf("core/notes.ts"), "core");
  assert.equal(layerOf("panel/panel-state.ts"), "panel");
  assert.equal(layerOf("adapters/protocols/openai-chat/read.ts"), "protocols");
  assert.equal(layerOf("adapters/codex/thread-index.ts"), "adapter:codex");
  assert.equal(layerOf("proxy.ts"), "top");
  assert.equal(allowed("core", "panel"), false);
  assert.equal(allowed("panel", "adapter:codex"), false);
  assert.equal(allowed("adapter:claude", "adapter:codex"), false);
  assert.equal(allowed("adapter:claude", "protocols"), true);
  assert.equal(allowed("protocols", "adapter:codex"), false);
  assert.equal(allowed("adapter:codex", "top"), false);
});

test("layers: no import breaks the rules beyond the pending list, and the list has nothing stale", () => {
  const now = breaks();
  assert.deepEqual(now.filter((line) => !PENDING.has(line)), [], "new imports across layers");
  assert.deepEqual([...PENDING].filter((line) => !now.includes(line)), [], "pending entries that no longer occur: remove them");
});
