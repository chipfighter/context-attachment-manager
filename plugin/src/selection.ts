// Purpose: P2 — per-thread selection state: which image occurrences the user unchecked. Written by the CLI (later
// the panel), read by the proxy on every request of that thread.
// P3 — a forked thread starts with what its parent had unchecked when the fork was made (user decision 2026-09-24);
// from then on the two are independent.
// v0.3 — automatic selection: a switch per thread and the images pinned while it is on ("固定发送"), kept apart from
// the manual checks, which come back as they were when it is switched off. `autoAt` is when it was last switched,
// `autoSince` when it was first switched on: from then on the history may hold copies the model fetched, which the
// engine leaves out of later turns even with the switch off.
// v0.6 — automatic selection is on by default in a thread started after this version first ran here (user
// 2026-10-13: every new task and session, in Codex and Claude Code; the ones from before keep what they had). That
// time is written once next to the selections (auto-default.json); a thread's own switch always wins, and the default
// itself is never written down.
// Input/Output: <data dir>/selection/<thread id>.json, e.g. { "threadId": "…", "unchecked": { "<key>": { "id": "IMG-003", "at": "…" } } },
// plus "auto", "autoAt", "autoSince" and "pinned" (same shape as "unchecked") once automatic selection has been used.

import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { selectionDirOf } from "./paths.ts";
import { forkOrigin, threadStartedAt } from "./thread-index.ts";

export type Mark = { id: string; at: string };
export type Selection = { threadId: string; unchecked: Record<string, Mark>; auto?: boolean; autoAt?: string; autoSince?: string; pinned?: Record<string, Mark>; inheritedFrom?: string };

export const selectionDir = selectionDirOf();
const THREAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const cache = new Map<string, { mtimeMs: number; size: number; selection: Selection }>();

function fileFor(threadId: string, dir: string): string {
  if (!THREAD_ID.test(threadId)) throw new Error(`not a thread id: ${threadId}`);
  return join(dir, `${threadId}.json`);
}

export function readSelection(threadId: string, dir = selectionDir): Selection {
  const file = fileFor(threadId, dir);
  if (!existsSync(file)) return { threadId, unchecked: {} };
  const { mtimeMs, size } = statSync(file);
  const known = cache.get(file);
  if (known && known.mtimeMs === mtimeMs && known.size === size) return known.selection;
  const selection = JSON.parse(readFileSync(file, "utf8")) as Selection;
  cache.set(file, { mtimeMs, size, selection });
  return selection;
}

// Written to a temporary file first, so the proxy never reads a half-written selection.
export function writeSelection(selection: Selection, dir = selectionDir): void {
  const file = fileFor(selection.threadId, dir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${file}.tmp`, JSON.stringify(selection, null, 2));
  renameSync(`${file}.tmp`, file);
}

// v0.6: written by the engine and the plugin service when they start; the first one wins.
const AUTO_DEFAULT = "auto-default.json";
const sinceOf = new Map<string, string>();
export function ensureAutoDefault(dir = selectionDir, now = new Date()): void {
  mkdirSync(dir, { recursive: true });
  try {
    writeFileSync(join(dir, AUTO_DEFAULT), JSON.stringify({ since: now.toISOString() }, null, 2), { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
}

// null until this version has run here: then nothing is on by default.
export function autoDefaultSince(dir = selectionDir): string | null {
  const known = sinceOf.get(dir);
  if (known) return known;
  try {
    const since = JSON.parse(readFileSync(join(dir, AUTO_DEFAULT), "utf8")).since;
    if (typeof since === "string") sinceOf.set(dir, since);
    return typeof since === "string" ? since : null;
  } catch {
    return null;
  }
}

// A thread with no switch of its own that started at or after `since` has automatic selection on, from its start;
// one with no history yet (startedAt null) is just starting.
export function withAutoDefault(selection: Selection, startedAt: string | null, since: string | null): Selection {
  if (typeof selection.auto === "boolean" || !since) return selection;
  const started = startedAt ?? new Date().toISOString();
  if (Date.parse(started) < Date.parse(since)) return selection;
  return { ...selection, auto: true, autoSince: selection.autoSince ?? started };
}

// v0.6: a Claude Code session's selection with the default applied, given when it started (claudeStartedAt).
export function claudeSelection(sessionId: string, dir: string, startedAt: string | null): Selection {
  return withAutoDefault(readSelection(sessionId, dir), startedAt, autoDefaultSince(dir));
}

// The thread's own selection; a fork without one takes the images its parent had unchecked by the time of the fork
// (a fork of a fork asks its own parent in turn) and keeps them as its own file from then on. v0.3: likewise the
// pinned images and the switch, when it was turned on before the fork. v0.6: then the default applies, a fork
// counting from the thread it came from.
export function effectiveSelection(threadId: string, sessionsDir: string, dir = selectionDir, depth = 0): Selection {
  return withAutoDefault(ownSelection(threadId, sessionsDir, dir, depth), threadStartedAt(sessionsDir, threadId), autoDefaultSince(dir));
}

function ownSelection(threadId: string, sessionsDir: string, dir: string, depth: number): Selection {
  if (existsSync(fileFor(threadId, dir)) || depth > 16) return readSelection(threadId, dir);
  const origin = forkOrigin(sessionsDir, threadId);
  if (!origin) return { threadId, unchecked: {} };
  const parent = effectiveSelection(origin.parent, sessionsDir, dir, depth + 1);
  const before = (entries: Record<string, Mark> = {}) => Object.fromEntries(Object.entries(entries).filter(([, entry]) => !origin.at || entry.at <= origin.at));
  const unchecked = before(parent.unchecked);
  const pinned = before(parent.pinned);
  const used = !!parent.autoSince && (!origin.at || parent.autoSince <= origin.at);
  // On at the fork if it is on now and was last switched before the fork.
  const auto = used && parent.auto === true && (!origin.at || !parent.autoAt || parent.autoAt <= origin.at);
  if (!Object.keys(unchecked).length && !Object.keys(pinned).length && !used) return { threadId, unchecked: {} };
  const switches = used ? { auto, autoSince: parent.autoSince, ...(auto ? { autoAt: parent.autoAt } : {}) } : {};
  const inherited: Selection = { threadId, unchecked, ...switches, ...(Object.keys(pinned).length ? { pinned } : {}), inheritedFrom: origin.parent };
  writeSelection(inherited, dir);
  return inherited;
}
