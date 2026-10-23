import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

test("installing a new cache preserves the older runtime even when Codex cleans its contents", async () => {
  const mod = await import("../../plugin/src/plugin-cache.ts").catch(() => null);
  assert.ok(mod, "installation protects existing runtime copies");
  const root = mkdtempSync(join(tmpdir(), "cam-cache-test-"));
  const old = join(root, "0.8.3"); mkdirSync(old);
  writeFileSync(join(old, "runtime.ts"), "old runtime");
  mod.preservingPluginCache(root, "0.9.0", () => {
    rmSync(join(old, "runtime.ts")); // Codex's best-effort old-version cleanup can stop after this.
    mkdirSync(join(root, "0.9.0")); writeFileSync(join(root, "0.9.0", "runtime.ts"), "new runtime");
  });
  assert.equal(readFileSync(join(old, "runtime.ts"), "utf8"), "old runtime");
  assert.equal(readFileSync(join(root, "0.9.0", "runtime.ts"), "utf8"), "new runtime");
});

test("a failed reinstall restores missing files in the existing version", async () => {
  const mod = await import("../../plugin/src/plugin-cache.ts").catch(() => null);
  assert.ok(mod, "installation protects existing runtime copies");
  const root = mkdtempSync(join(tmpdir(), "cam-cache-test-"));
  const current = join(root, "0.9.0"); mkdirSync(current);
  writeFileSync(join(current, "runtime.ts"), "working runtime");
  assert.throws(() => mod.preservingPluginCache(root, "0.9.0", () => {
    rmSync(join(current, "runtime.ts")); throw new Error("synthetic sharing violation");
  }), /synthetic sharing violation/);
  assert.equal(readFileSync(join(current, "runtime.ts"), "utf8"), "working runtime");
});
