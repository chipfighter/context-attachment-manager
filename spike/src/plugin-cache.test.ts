import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test, { type TestContext } from "node:test";
import { preservingPluginCache, preservingPluginCacheAsync } from "../../plugin/src/adapters/codex/plugin-cache.ts";

function fixture(t: TestContext, tempUnderVersion = false) {
  const base = mkdtempSync(join(tmpdir(), "cam-cache-test-"));
  const root = join(base, "cache");
  const temp = tempUnderVersion ? join(root, "0.9.0", "temp") : join(base, "temp");
  mkdirSync(root);
  mkdirSync(temp, { recursive: true });
  const variables = ["TMPDIR", "TEMP", "TMP"];
  const previous = variables.map((name) => process.env[name]);
  for (const name of variables) process.env[name] = temp;
  t.after(() => {
    variables.forEach((name, i) => {
      const value = previous[i];
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    });
    rmSync(base, { recursive: true, force: true });
  });
  return { root, temp };
}

test("installing a new cache restores the older runtime and removes only its own backup", async (t) => {
  const { root, temp } = fixture(t);
  mkdirSync(join(temp, "cam-runtime-backup-preexisting"));
  const old = join(root, "0.8.3"); mkdirSync(old);
  writeFileSync(join(old, "runtime.ts"), "old runtime");
  await preservingPluginCacheAsync(root, "0.9.0", async () => {
    rmSync(join(old, "runtime.ts")); // Codex's best-effort old-version cleanup can stop after this.
    mkdirSync(join(root, "0.9.0")); writeFileSync(join(root, "0.9.0", "runtime.ts"), "new runtime");
  });
  assert.equal(readFileSync(join(old, "runtime.ts"), "utf8"), "old runtime");
  assert.equal(readFileSync(join(root, "0.9.0", "runtime.ts"), "utf8"), "new runtime");
  assert.deepEqual(readdirSync(temp), ["cam-runtime-backup-preexisting"]);
});

test("a failed reinstall restores missing files and removes its backup after rollback", (t) => {
  const { root, temp } = fixture(t);
  const current = join(root, "0.9.0"); mkdirSync(current);
  writeFileSync(join(current, "runtime.ts"), "working runtime");
  assert.throws(() => preservingPluginCache(root, "0.9.0", () => {
    rmSync(join(current, "runtime.ts")); throw new Error("synthetic sharing violation");
  }), /synthetic sharing violation/);
  assert.equal(readFileSync(join(current, "runtime.ts"), "utf8"), "working runtime");
  assert.deepEqual(readdirSync(temp), []);
});

test("a backup copy failure removes the temporary directory without installing", (t) => {
  const { root, temp } = fixture(t, true);
  const current = join(root, "0.9.0", "runtime.ts");
  writeFileSync(current, "working runtime");
  // This version contains the backup destination, so the native copy refuses it.
  let installed = false;
  assert.throws(() => preservingPluginCache(root, "0.9.0", () => { installed = true; }));
  assert.equal(installed, false);
  assert.equal(readFileSync(current, "utf8"), "working runtime");
  assert.deepEqual(readdirSync(temp), []);
});

test("a failed rollback keeps the backup available for recovery", (t) => {
  const { root, temp } = fixture(t);
  const current = join(root, "0.9.0"); mkdirSync(current);
  writeFileSync(join(current, "runtime.ts"), "working runtime");
  assert.throws(() => preservingPluginCache(root, "0.9.0", () => {
    rmSync(current, { recursive: true });
    writeFileSync(current, "blocks directory restoration");
    throw new Error("synthetic install failure");
  }));
  const [backup, ...others] = readdirSync(temp);
  assert.ok(backup?.startsWith("cam-runtime-backup-"));
  assert.deepEqual(others, []);
  assert.equal(readFileSync(join(temp, backup, "0.9.0", "runtime.ts"), "utf8"), "working runtime");
});
