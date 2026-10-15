// Purpose: v0.7 — a task's subagents (started without history) and side chats, as the engine sees their requests, are
// recorded once each under the task, for its panel (docs/v0.7/plan.md).
// Input: synthetic rollouts and temporary folders; output: Node test assertions only.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { childOf, readChildren, recordChild } from "../../plugin/src/children.ts";

const MAIN = "01a0d307-0000-7000-8000-0000000000c0";
const CHILD = "01a0d307-0000-7000-8000-0000000000c1";
const FORKED_CHILD = "01a0d307-0000-7000-8000-0000000000c2";
const USER_FORK = "01a0d307-0000-7000-8000-0000000000c3";
const SIDE = "01a0d307-0000-7000-8000-0000000000c4";
const SIDE_OF_CHILD = "01a0d307-0000-7000-8000-0000000000c5";

function sessions() {
  const root = mkdtempSync(join(tmpdir(), "cam-children-"));
  const day = join(root, "sessions", "2026", "10", "13");
  mkdirSync(day, { recursive: true });
  const rollout = (id: string, meta: Record<string, unknown>) =>
    writeFileSync(join(day, `rollout-2026-10-13T10-00-00-${id}.jsonl`), `${JSON.stringify({ type: "session_meta", payload: { id, timestamp: "2026-10-13T10:00:00Z", ...meta } })}\n`);
  const spawned = { parent_thread_id: MAIN, source: { subagent: { thread_spawn: { parent_thread_id: MAIN, depth: 1, agent_nickname: "Franklin" } } } };
  rollout(MAIN, {});
  rollout(CHILD, spawned);
  rollout(FORKED_CHILD, { ...spawned, forked_from_id: MAIN });
  rollout(USER_FORK, { forked_from_id: MAIN });
  return { root, sessionsDir: join(root, "sessions") };
}

test("a side chat belongs to the task it came from, or to that task's own task; a subagent to the task at the top", () => {
  const { sessionsDir } = sessions();
  const at = "2026-10-13T10:05:00Z";
  assert.deepEqual(childOf({ threadId: SIDE, forkedFrom: MAIN }, sessionsDir, at), { task: MAIN, id: SIDE, child: { kind: "side", from: MAIN, at } });
  assert.deepEqual(childOf({ threadId: SIDE_OF_CHILD, forkedFrom: CHILD }, sessionsDir, at), { task: MAIN, id: SIDE_OF_CHILD, child: { kind: "side", from: CHILD, at } });
  assert.deepEqual(childOf({ threadId: CHILD, forkedFrom: null }, sessionsDir, at), { task: MAIN, id: CHILD, child: { kind: "subagent", from: MAIN, at } });
  // Not a child here: a subagent started with history, a fork the user made (it has a rollout), the task itself.
  assert.equal(childOf({ threadId: FORKED_CHILD, forkedFrom: null }, sessionsDir, at), null);
  assert.equal(childOf({ threadId: USER_FORK, forkedFrom: MAIN }, sessionsDir, at), null);
  assert.equal(childOf({ threadId: MAIN, forkedFrom: null }, sessionsDir, at), null);
  assert.equal(childOf({ threadId: null, forkedFrom: MAIN }, sessionsDir, at), null);
});

test("each child is recorded once under its task; later requests leave the record as it was", () => {
  const { root } = sessions();
  const dir = join(root, "children");
  assert.deepEqual(readChildren(MAIN, dir), {});
  assert.equal(recordChild(MAIN, SIDE, { kind: "side", from: MAIN, at: "2026-10-13T10:05:00Z" }, dir), true);
  assert.equal(recordChild(MAIN, SIDE, { kind: "side", from: MAIN, at: "2026-10-13T10:09:00Z" }, dir), false);
  assert.equal(recordChild(MAIN, CHILD, { kind: "subagent", from: MAIN, at: "2026-10-13T10:06:00Z" }, dir), true);
  assert.deepEqual(readChildren(MAIN, dir), {
    [SIDE]: { kind: "side", from: MAIN, at: "2026-10-13T10:05:00Z" },
    [CHILD]: { kind: "subagent", from: MAIN, at: "2026-10-13T10:06:00Z" },
  });
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(join(dir, `${MAIN}.json`), "utf8"))), [SIDE, CHILD]);
  // Only real thread ids name a file.
  assert.equal(recordChild("../escape", SIDE, { kind: "side", from: MAIN, at: "x" }, dir), false);
  assert.deepEqual(readChildren("../escape", dir), {});
});

// A transient write failure must not poison the engine's process-local deduplication cache.
test("a child can be recorded again after its first write fails", () => {
  const { root } = sessions();
  const dir = join(root, "blocked-children");
  const child = { kind: "side" as const, from: MAIN, at: "2026-10-15T10:00:00Z" };
  writeFileSync(dir, "temporarily blocks mkdir");
  assert.throws(() => recordChild(MAIN, SIDE, child, dir));
  rmSync(dir);
  assert.equal(recordChild(MAIN, SIDE, child, dir), true, "retry after recovery must persist the child");
  assert.deepEqual(readChildren(MAIN, dir), { [SIDE]: child });
  assert.equal(recordChild(MAIN, SIDE, child, dir), false, "successful writes are still deduplicated");
});
