// Purpose: P3 — a forked thread starts with what its parent had unchecked when the fork was made, then the two are
// independent; ordinary threads are unaffected. Covers forks of forks and threads whose rollout appears later.
// Input: synthetic rollouts and selection files in temporary folders; output: Node test assertions only.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { hasUnchecked, needsRewrite } from "../../plugin/src/proxy.ts";
import { autoDefaultSince, effectiveSelection, ensureAutoDefault, mainTaskOf, readSelection, sideChatSelection, writeSelection } from "../../plugin/src/selection.ts";
import { startThread } from "./testfixtures.ts";

const PARENT = "01a0d301-0000-7000-8000-0000000000f0";
const FORK = "01a0d301-0000-7000-8000-0000000000f1";
const FORK2 = "01a0d301-0000-7000-8000-0000000000f2";
const PLAIN = "01a0d301-0000-7000-8000-0000000000f3";
const LATE = "01a0d301-0000-7000-8000-0000000000f4";

function setup() {
  const root = mkdtempSync(join(tmpdir(), "cam-fork-"));
  const day = join(root, "sessions", "2026", "09", "24");
  mkdirSync(day, { recursive: true });
  const rollout = (id: string, meta: Record<string, unknown>) =>
    writeFileSync(join(day, `rollout-2026-09-24T10-00-00-${id}.jsonl`), `${JSON.stringify({ type: "session_meta", payload: { id, ...meta } })}\n`);
  rollout(PARENT, { timestamp: "2026-09-24T10:00:00Z" });
  rollout(FORK, { forked_from_id: PARENT, timestamp: "2026-09-24T12:00:00Z" });
  rollout(FORK2, { forked_from_id: FORK, timestamp: "2026-09-24T12:30:00Z" });
  rollout(PLAIN, { timestamp: "2026-09-24T10:00:00Z" });
  const dir = join(root, "selection");
  writeSelection({ threadId: PARENT, unchecked: { "msg_1#0": { id: "IMG-001", at: "2026-09-24T11:00:00Z" }, "msg_2#0": { id: "IMG-002", at: "2026-09-24T13:00:00Z" } } }, dir);
  return { sessionsDir: join(root, "sessions"), day, dir, rollout };
}

test("a fork takes what its parent had unchecked by the time of the fork, and keeps it as its own", () => {
  const { sessionsDir, dir } = setup();
  const fork = effectiveSelection(FORK, sessionsDir, dir);
  assert.deepEqual(Object.values(fork.unchecked).map((entry) => entry.id), ["IMG-001"], "IMG-002 was unchecked after the fork");
  assert.equal(fork.inheritedFrom, PARENT);
  assert.equal(existsSync(join(dir, `${FORK}.json`)), true);
  assert.equal(hasUnchecked(FORK, dir, sessionsDir), true);
});

test("after the fork the two selections are independent", () => {
  const { sessionsDir, dir } = setup();
  effectiveSelection(FORK, sessionsDir, dir);
  writeSelection({ threadId: FORK, unchecked: {} }, dir);
  assert.equal(Object.keys(readSelection(PARENT, dir).unchecked).length, 2, "checking in the fork leaves the parent alone");
  writeSelection({ threadId: PARENT, unchecked: {} }, dir);
  writeSelection({ threadId: FORK, unchecked: { "msg_1#0": { id: "IMG-001", at: "2026-09-24T14:00:00Z" } } }, dir);
  assert.equal(Object.keys(effectiveSelection(FORK, sessionsDir, dir).unchecked).length, 1, "the parent's change does not reach the fork");
});

test("a fork of a fork asks its own parent; ordinary threads stay empty and get no file", () => {
  const { sessionsDir, dir } = setup();
  assert.deepEqual(Object.values(effectiveSelection(FORK2, sessionsDir, dir).unchecked).map((entry) => entry.id), ["IMG-001"]);
  assert.deepEqual(effectiveSelection(PLAIN, sessionsDir, dir).unchecked, {});
  assert.equal(existsSync(join(dir, `${PLAIN}.json`)), false);
  assert.equal(hasUnchecked(PLAIN, dir, sessionsDir), false);
});

test("a thread whose rollout is not written yet is looked up again later", () => {
  const { sessionsDir, dir } = setup();
  assert.deepEqual(effectiveSelection(LATE, sessionsDir, dir).unchecked, {});
  // Codex files a new rollout in today's folder.
  startThread(sessionsDir, LATE, { forked_from_id: PARENT, timestamp: "2026-09-24T12:00:00Z" });
  assert.deepEqual(Object.values(effectiveSelection(LATE, sessionsDir, dir).unchecked).map((entry) => entry.id), ["IMG-001"]);
});

// v0.3: automatic selection's switch and pins are inherited the same way. FORK was made at 12:00.
test("a fork takes automatic selection when it was on at the fork, and the pins made before it", () => {
  const { sessionsDir, dir } = setup();
  const pinned = { "msg_1#0": { id: "IMG-001", at: "2026-09-24T11:40:00Z" }, "msg_2#0": { id: "IMG-002", at: "2026-09-24T13:00:00Z" } };
  writeSelection({ threadId: PARENT, unchecked: {}, auto: true, autoAt: "2026-09-24T11:30:00Z", autoSince: "2026-09-24T11:30:00Z", pinned }, dir);
  const fork = effectiveSelection(FORK, sessionsDir, dir);
  assert.equal(fork.auto, true);
  assert.deepEqual(Object.values(fork.pinned ?? {}).map((entry) => entry.id), ["IMG-001"]);
  assert.equal(needsRewrite(FORK, dir, sessionsDir), true);
});

test("switched on again after the fork, the switch stays the parent's; first used after it, nothing comes along", () => {
  const again = setup();
  writeSelection({ threadId: PARENT, unchecked: {}, auto: true, autoAt: "2026-09-24T12:30:00Z", autoSince: "2026-09-24T11:00:00Z" }, again.dir);
  const fork = effectiveSelection(FORK, again.sessionsDir, again.dir);
  assert.equal(fork.auto, false);
  assert.equal(needsRewrite(FORK, again.dir, again.sessionsDir), true, "copies fetched before the fork are still left out of its requests");
  const later = setup();
  writeSelection({ threadId: PARENT, unchecked: {}, auto: true, autoAt: "2026-09-24T12:30:00Z", autoSince: "2026-09-24T12:30:00Z" }, later.dir);
  assert.equal(effectiveSelection(FORK, later.sessionsDir, later.dir).auto, undefined);
  assert.equal(needsRewrite(FORK, later.dir, later.sessionsDir), false);
});

// v0.6 (user 2026-10-13): automatic selection is on by default in a task started after this version first ran here;
// tasks from before keep what they had. The start time is written once next to the selections.
test("v0.6: the default's start time is written once and kept", () => {
  const { dir } = setup();
  assert.equal(autoDefaultSince(dir), null, "before this version runs, no default");
  ensureAutoDefault(dir, new Date("2026-09-24T11:00:00Z"));
  ensureAutoDefault(dir, new Date("2026-09-25T00:00:00Z"));
  assert.equal(autoDefaultSince(dir), "2026-09-24T11:00:00.000Z");
});

test("v0.6: a task started after the default began has automatic selection on, unless it has its own switch", () => {
  const { sessionsDir, dir, rollout } = setup();
  ensureAutoDefault(dir, new Date("2026-09-24T11:00:00Z"));
  const NEW = "01a0d301-0000-7000-8000-0000000000f5";
  rollout(NEW, { timestamp: "2026-09-24T11:30:00Z" });
  const fresh = effectiveSelection(NEW, sessionsDir, dir);
  assert.deepEqual([fresh.auto, fresh.autoSince], [true, "2026-09-24T11:30:00Z"]);
  assert.equal(existsSync(join(dir, `${NEW}.json`)), false, "the default is not written down");
  assert.equal(needsRewrite(NEW, dir, sessionsDir), true);
  // Started before (10:00): as before.
  assert.equal(effectiveSelection(PLAIN, sessionsDir, dir).auto, undefined);
  assert.equal(needsRewrite(PLAIN, dir, sessionsDir), false);
  // No rollout yet: a new task.
  assert.equal(effectiveSelection("01a0d301-0000-7000-8000-0000000000f9", sessionsDir, dir).auto, true);
  // Its own switch wins, either way.
  writeSelection({ threadId: NEW, unchecked: {}, auto: false, autoAt: "2026-09-24T11:40:00Z", autoSince: "2026-09-24T11:30:00Z" }, dir);
  assert.equal(effectiveSelection(NEW, sessionsDir, dir).auto, false);
  writeSelection({ threadId: PLAIN, unchecked: {}, auto: true, autoAt: "2026-09-24T11:40:00Z", autoSince: "2026-09-24T11:40:00Z" }, dir);
  assert.equal(effectiveSelection(PLAIN, sessionsDir, dir).auto, true);
});

test("v0.6: a fork counts from the task it came from", () => {
  const { sessionsDir, dir, rollout } = setup();
  ensureAutoDefault(dir, new Date("2026-09-24T11:00:00Z"));
  const OLD_FORK = "01a0d301-0000-7000-8000-0000000000f6";
  const NEW = "01a0d301-0000-7000-8000-0000000000f7";
  const NEW_FORK = "01a0d301-0000-7000-8000-0000000000f8";
  rollout(OLD_FORK, { forked_from_id: PLAIN, timestamp: "2026-09-24T12:00:00Z" });
  rollout(NEW, { timestamp: "2026-09-24T11:30:00Z" });
  rollout(NEW_FORK, { forked_from_id: NEW, timestamp: "2026-09-24T12:00:00Z" });
  // Forked at 12:00 from tasks that started at 10:00: as before, whether or not anything comes along.
  assert.equal(effectiveSelection(FORK, sessionsDir, dir).auto, undefined);
  assert.equal(effectiveSelection(OLD_FORK, sessionsDir, dir).auto, undefined);
  // Forked from a task that started after: on, like it.
  assert.equal(effectiveSelection(NEW_FORK, sessionsDir, dir).auto, true);
});

// v0.7: subagents and side chats (docs/v0.7/plan.md). As Codex 0.162 records them: a subagent started without history
// names its parent; one started with history is also a fork.
const MAIN = "01a0d307-0000-7000-8000-0000000000a0";
const CHILD = "01a0d307-0000-7000-8000-0000000000a1";
const GRANDCHILD = "01a0d307-0000-7000-8000-0000000000a2";
const FORKED_CHILD = "01a0d307-0000-7000-8000-0000000000a3";
const REVIEW = "01a0d307-0000-7000-8000-0000000000a4";

function family() {
  const { sessionsDir, dir, rollout } = setup();
  const spawned = (parent: string, depth: number) => ({ parent_thread_id: parent, source: { subagent: { thread_spawn: { parent_thread_id: parent, depth, agent_path: "/root/child", agent_nickname: "Franklin", agent_role: null } } }, thread_source: "subagent" });
  rollout(MAIN, { timestamp: "2026-09-24T10:00:00Z" });
  rollout(CHILD, { ...spawned(MAIN, 1), timestamp: "2026-09-24T10:05:00Z" });
  rollout(GRANDCHILD, { ...spawned(CHILD, 2), timestamp: "2026-09-24T10:06:00Z" });
  rollout(FORKED_CHILD, { ...spawned(MAIN, 1), forked_from_id: MAIN, timestamp: "2026-09-24T10:07:00Z" });
  rollout(REVIEW, { parent_thread_id: MAIN, source: { subagent: "review" }, timestamp: "2026-09-24T10:08:00Z" });
  return { sessionsDir, dir };
}

test("v0.7: a subagent started without history belongs to the task at the top of its parents", () => {
  const { sessionsDir } = family();
  assert.equal(mainTaskOf(sessionsDir, CHILD), MAIN);
  assert.equal(mainTaskOf(sessionsDir, GRANDCHILD), MAIN);
  // A fork follows the fork rules; the user's task, Codex's background tasks and unknown threads belong to none.
  for (const other of [FORKED_CHILD, MAIN, REVIEW, "01a0d307-0000-7000-8000-0000000000af"]) assert.equal(mainTaskOf(sessionsDir, other), null, other);
});

test("v0.7: a subagent has automatic selection, whatever its task's own switch says", () => {
  const { sessionsDir, dir } = family();
  // No default for the task itself here (no auto-default.json): its subagents have it regardless.
  const child = effectiveSelection(CHILD, sessionsDir, dir);
  assert.deepEqual([child.auto, child.autoSince], [true, "2026-09-24T10:05:00Z"], "from the subagent's start");
  assert.equal(needsRewrite(CHILD, dir, sessionsDir), true);
  assert.equal(effectiveSelection(GRANDCHILD, sessionsDir, dir).auto, true);
  // The task's own switch is a different one.
  writeSelection({ threadId: MAIN, unchecked: {}, auto: false, autoAt: "2026-09-24T10:01:00Z", autoSince: "2026-09-24T10:00:30Z" }, dir);
  assert.equal(effectiveSelection(CHILD, sessionsDir, dir).auto, true);
  // v0.8: the switch v0.7 had for them is gone; one it turned off stays without effect.
  writeSelection({ threadId: MAIN, unchecked: {}, childrenAuto: false } as Parameters<typeof writeSelection>[0], dir);
  assert.equal(effectiveSelection(CHILD, sessionsDir, dir).auto, true);
  assert.equal(effectiveSelection(GRANDCHILD, sessionsDir, dir).auto, true);
  assert.equal(needsRewrite(CHILD, dir, sessionsDir), true);
  // A switch of the subagent's own wins.
  writeSelection({ threadId: CHILD, unchecked: {}, auto: true, autoAt: "2026-09-24T10:10:00Z", autoSince: "2026-09-24T10:10:00Z" }, dir);
  assert.equal(effectiveSelection(CHILD, sessionsDir, dir).auto, true);
});

test("v0.7: a side chat uses the selection of the task it came from, keeping what is pinned there", () => {
  const { sessionsDir, dir } = family();
  const pinned = { "msg_9#0": { id: "IMG-009", at: "2026-09-24T10:02:00Z" } };
  writeSelection({ threadId: MAIN, unchecked: {}, auto: true, autoAt: "2026-09-24T10:01:00Z", autoSince: "2026-09-24T10:01:00Z", pinned }, dir);
  const side = sideChatSelection(MAIN, sessionsDir, dir);
  assert.deepEqual([side.threadId, side.auto, side.pinned], [MAIN, true, pinned]);
  // Forked from a subagent: its images.
  assert.deepEqual([sideChatSelection(CHILD, sessionsDir, dir).threadId, sideChatSelection(CHILD, sessionsDir, dir).auto], [CHILD, true]);
  // v0.8: a switch v0.7 turned off changes nothing.
  writeSelection({ threadId: MAIN, unchecked: {}, auto: true, autoAt: "2026-09-24T10:01:00Z", autoSince: "2026-09-24T10:01:00Z", pinned, childrenAuto: false } as Parameters<typeof writeSelection>[0], dir);
  assert.deepEqual([sideChatSelection(MAIN, sessionsDir, dir).auto, sideChatSelection(CHILD, sessionsDir, dir).auto], [true, true]);
});
