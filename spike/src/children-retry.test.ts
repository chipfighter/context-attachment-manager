// A transient write failure must not poison the engine's process-local child deduplication cache.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readChildren, recordChild } from "../../plugin/src/children.ts";

test("a child can be recorded again after its first write fails", (t) => {
  const root = mkdtempSync(join(tmpdir(), "cam-children-retry-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dir = join(root, "blocked-children");
  const task = "11111111-1111-4111-8111-111111111111";
  const id = "22222222-2222-4222-8222-222222222222";
  const child = { kind: "side" as const, from: task, at: "2026-10-15T10:00:00Z" };
  writeFileSync(dir, "temporarily blocks mkdir");
  assert.throws(() => recordChild(task, id, child, dir));
  rmSync(dir);
  assert.equal(recordChild(task, id, child, dir), true, "retry after recovery must persist the child");
  assert.deepEqual(readChildren(task, dir), { [id]: child });
  assert.equal(recordChild(task, id, child, dir), false, "successful writes are still deduplicated");
});
