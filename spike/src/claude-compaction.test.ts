// Purpose: v0.10 — Claude Code compactions that keep the last messages (2.1.304+), and sessions Claude Desktop
// resumed after one (claude-index.ts): the chain relinked the way Claude Code reads it, the history followed back into
// the transcript the compaction happened in, ids kept, images from there read back from disk, record lines and fetch
// labels written under a renumbered id translated, and a resumed session's selection (selection.ts).
// Input: synthetic transcripts (claude-fixtures.ts) in a temporary Claude home; output: Node test assertions only.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildClaudeIndex, claudeImageData, loadClaudeIndex, readHistoryTranscript } from "../../plugin/src/adapters/claude/claude-index.ts";
import { claudeSelection } from "../../plugin/src/adapters/claude/selection.ts";
import { writeSelection } from "../../plugin/src/core/selection.ts";
import { image, pngA, pngB, pngC, text, transcript } from "./claude-fixtures.ts";
import { png } from "./testkit.ts";

type Json = Record<string, any>;
const pngD = png(8, 8, () => [30, 200, 60]).toString("base64");
const ids = { O: "aaaaaaaa-0000-4000-8000-000000000001", R: "aaaaaaaa-0000-4000-8000-000000000002", R2: "aaaaaaaa-0000-4000-8000-000000000003", F: "aaaaaaaa-0000-4000-8000-000000000004" };
const at = (minute: number) => `2026-10-01T10:${String(minute).padStart(2, "0")}:00.000Z`;
const record = (line: string) => `[//]: # (cam ${line})`;

function home(): { home: string; project: string; write: (id: string, records: Json[]) => string } {
  const root = mkdtempSync(join(tmpdir(), "cam-compaction-"));
  const project = join(root, "projects", "P");
  mkdirSync(project, { recursive: true });
  const write = (id: string, records: Json[]) => {
    const file = join(project, `${id}.jsonl`);
    writeFileSync(file, `${records.map((entry) => JSON.stringify(entry)).join("\n")}\n`);
    return file;
  };
  return { home: root, project, write };
}

// What Claude Code writes when it resumes a session after a compaction: a new session whose transcript starts at the
// boundary, the summary, the kept messages after it, then what followed, relinked as its reader does.
function resumed(records: Json[], boundary: string, anchor: string, kept: string[], sessionId: string, created: string): Json[] {
  const start = records.findIndex((entry) => entry.uuid === boundary);
  const byUuid = new Map(records.map((entry) => [entry.uuid, entry]));
  const before = new Set(records.slice(0, start).map((entry) => entry.uuid));
  const keep = new Set(kept);
  const tail = kept[kept.length - 1];
  const out: Json[] = [{ type: "custom-title", customTitle: "resumed", sessionId }, { type: "queue-operation", operation: "enqueue", timestamp: created, sessionId }];
  out.push({ ...records[start], sessionId }, { ...byUuid.get(anchor), sessionId });
  let previous = anchor;
  for (const uuid of kept) { out.push({ ...byUuid.get(uuid), parentUuid: previous, sessionId }); previous = uuid; }
  for (const entry of records.slice(start + 1)) {
    if (entry.uuid === anchor || keep.has(entry.uuid)) continue;
    const moved = entry.parentUuid === anchor || (entry.parentUuid && before.has(entry.parentUuid) && !keep.has(entry.parentUuid));
    out.push({ ...entry, parentUuid: moved ? tail : entry.parentUuid, sessionId });
  }
  return out;
}

const summaryNaming = (file: string) => `Summary of the work.\n\nIf you need specific details from before compaction (like exact code snippets, error messages, or content you generated), read the full transcript at: ${file}\nContinue the conversation from where it left off.`;

test("a compaction that kept messages, where it happened: they follow the summary, and the images before it are compacted", () => {
  for (const after of ["tail", "summary"] as const) {
    for (const list of [false, true]) {
      const t = transcript();
      const p1 = t.prompt([image(pngA), text("one")]);
      t.assistant(text("A"));
      const p2 = t.prompt([image(pngB), text("two")]);
      const kept = t.assistant(text("B"));
      const { boundary, anchor } = t.compact([kept], after, "summary", {}, list);
      const p3 = t.prompt([image(pngC), text("three")]);
      t.assistant(text("C"));
      const index = buildClaudeIndex("s", t.records);
      assert.deepEqual(index.images.map((entry) => [entry.id, entry.key, entry.compacted]), [["IMG-001", `${p1}#0`, true], ["IMG-002", `${p2}#0`, true], ["IMG-003", `${p3}#0`, false]], `${after} ${list}`);
      assert.equal(index.summary, "summary");
      const order = index.chain.map((entry) => entry.uuid);
      // boundary, summary, the kept message, what came after: as Claude Code sends it.
      assert.deepEqual([order.indexOf(boundary) + 1, order.indexOf(anchor) + 1, order.indexOf(kept) + 1], [order.indexOf(anchor), order.indexOf(kept), order.indexOf(p3)], `${after} ${list}`);
      assert.equal(index.turns, 3);
    }
  }
});

test("a compaction that kept nothing, or a broken kept list, reads as before", () => {
  const t = transcript();
  t.prompt([image(pngA), text("one")]);
  const kept = t.assistant(text("A"));
  t.compact(["00000000-0000-4000-8000-0000000009ff", kept]);
  const p2 = t.prompt([image(pngB), text("two")]);
  const index = buildClaudeIndex("s", t.records);
  // The kept list names a record that is not there: Claude Code then relinks nothing; the chain still crosses the
  // boundary through its logical parent.
  assert.deepEqual(index.images.map((entry) => [entry.id, entry.compacted]), [["IMG-001", true], ["IMG-002", false]]);
  assert.equal(index.images[1].key, `${p2}#0`);
});

// The original session: two images, a compaction keeping the last reply, a third image; the plugin noted each.
function original(write: (id: string, records: Json[]) => string, project: string, named = true) {
  const t = transcript();
  const file = join(project, `${ids.O}.jsonl`);
  const p1 = t.prompt([image(pngA), text("one")], { timestamp: at(0) });
  t.assistant(text(`${record("IMG-001 书房｜红色方块")}\n\nA`), { timestamp: at(1) });
  const p2 = t.prompt([image(pngB), text("two")], { timestamp: at(2) });
  const kept = t.assistant(text(`${record("IMG-002 书房｜蓝色方块")}\n\nB`), { timestamp: at(3) });
  const compaction = t.compact([kept], "summary", named ? summaryNaming(file) : "Summary of the work.", { timestamp: at(5) });
  const p3 = t.prompt([image(pngC), text("three")], { timestamp: at(6) });
  const a3 = t.assistant(text(`${record("IMG-003 书房｜白色长方形")}\n\nC`), { timestamp: at(7) });
  const records = t.records.map((entry) => ({ ...entry, sessionId: ids.O }));
  write(ids.O, records);
  return { records, p1, p2, p3, a3, kept, ...compaction, file };
}

test("a session resumed after a compaction keeps its ids: the history is read from the transcript the summary names", () => {
  const { home: root, project, write } = home();
  const o = original(write, project);
  const fresh = transcript(1000);
  fresh.from(o.a3);
  // Written while the plugin numbered the resumed transcript from its own start: its IMG-002 is the new image, IMG-001
  // the one after the compaction; a fetch then named IMG-001 too.
  const p4 = fresh.prompt([image(pngD), text("four")], { timestamp: at(31) });
  fresh.assistant({ type: "tool_use", id: "toolu_fetch", name: "mcp__plugin_codex-attachment-manager_codex_attachment_manager__cam_view_image", input: { ids: ["IMG-001"] } }, { timestamp: at(32) });
  fresh.toolResult("toolu_fetch", [text("[图片 IMG-001 取回的原图｜未命名｜用户上传｜第 3 轮]"), image(pngC)], { timestamp: at(32) });
  fresh.assistant(text(`${record("IMG-002 客厅｜绿色方块")}\n${record("IMG-001 评价：太白")}\n\nD`), { timestamp: at(33) });
  // Written once this version ran (since 10:40): its own ids.
  fresh.prompt("nice", { timestamp: at(45) });
  fresh.assistant(text(`${record("IMG-004 评价：好看")}\n\nE`), { timestamp: at(46) });
  write(ids.R, [...resumed(o.records, o.boundary, o.anchor, [o.kept], ids.R, at(30)), ...fresh.records.map((entry) => ({ ...entry, sessionId: ids.R }))]);

  const index = loadClaudeIndex(ids.R, root, at(40));
  assert.deepEqual(index.images.map((entry) => [entry.id, entry.key, entry.compacted]), [
    ["IMG-001", `${o.p1}#0`, true], ["IMG-002", `${o.p2}#0`, true], ["IMG-003", `${o.p3}#0`, false], ["IMG-004", `${p4}#0`, false],
  ]);
  // The fetched copy is known as one (its label translated), not a new image.
  assert.deepEqual([...index.copies.values()].map((copy) => copy.of), ["IMG-003"]);
  assert.deepEqual(Object.fromEntries([...index.notes].map(([id, notes]) => [id, [notes.line, notes.ratings.map((rating) => rating.text)]])), {
    "IMG-001": ["书房｜红色方块", []], "IMG-002": ["书房｜蓝色方块", []], "IMG-003": ["书房｜白色长方形", ["太白"]], "IMG-004": ["客厅｜绿色方块", ["好看"]],
  });
  // Images from the earlier transcript are read back from disk; held without their data.
  assert.equal(claudeImageData(index, index.images[0]), pngA);
  assert.equal(claudeImageData(index, index.images[1]), pngB);
  assert.equal(readHistoryTranscript(o.file).find((entry) => entry.uuid === o.p1)!.message.content[0].source.data, "");
  assert.equal(index.summary?.startsWith("Summary of the work."), true);
  assert.deepEqual(index.previous, [{ sessionId: ids.O, at: at(30) }]);
  // Before this version ran nothing is translated: the lines name the ids they named.
  assert.equal(loadClaudeIndex(ids.R, root, null).notes.get("IMG-001")?.ratings.map((rating) => rating.text).join(), "太白");
});

test("a resumed session whose summary names no transcript: the project's transcript holding the boundary is used", () => {
  const { home: root, project, write } = home();
  const o = original(write, project, false);
  write(ids.R, resumed(o.records, o.boundary, o.anchor, [o.kept], ids.R, at(30)));
  const index = loadClaudeIndex(ids.R, root, at(40));
  assert.deepEqual(index.images.map((entry) => [entry.id, entry.compacted]), [["IMG-001", true], ["IMG-002", true], ["IMG-003", false]]);
  assert.equal(index.notes.get("IMG-003")?.line, "书房｜白色长方形");
});

test("without the transcript the compaction happened in, the resumed one is read on its own", () => {
  const { home: root, project, write } = home();
  const o = original(write, project);
  write(ids.R, resumed(o.records, o.boundary, o.anchor, [o.kept], ids.R, at(30)));
  writeFileSync(o.file, "");
  const index = loadClaudeIndex(ids.R, root, at(40));
  assert.deepEqual(index.images.map((entry) => [entry.id, entry.key]), [["IMG-001", `${o.p3}#0`]]);
});

test("resumed twice across two compactions, and forked: ids and history carry through", () => {
  const { home: root, project, write } = home();
  const o = original(write, project);
  // In the resumed session: a fourth image, then a second compaction keeping its reply, then a fifth image.
  const r = transcript(1000);
  r.from(o.a3);
  const p4 = r.prompt([image(pngD), text("four")], { timestamp: at(41) });
  const kept2 = r.assistant(text(`${record("IMG-004 客厅｜绿色方块")}\n\nD`), { timestamp: at(42) });
  const second = r.compact([kept2], "tail", summaryNaming(join(project, `${ids.R}.jsonl`)), { timestamp: at(43) });
  const p5 = r.prompt([image(pngA), text("five")], { timestamp: at(44) });
  r.assistant(text(`${record("IMG-005 门口｜红色方块又一张")}\n\nE`), { timestamp: at(45) });
  const resumedOnce = [...resumed(o.records, o.boundary, o.anchor, [o.kept], ids.R, at(30)), ...r.records.map((entry) => ({ ...entry, sessionId: ids.R }))];
  write(ids.R, resumedOnce);
  const live = loadClaudeIndex(ids.R, root, at(20));
  assert.deepEqual(live.images.map((entry) => [entry.id, entry.compacted]), [["IMG-001", true], ["IMG-002", true], ["IMG-003", true], ["IMG-004", true], ["IMG-005", false]]);
  // Resumed again after the second compaction.
  const twice = resumed(resumedOnce, second.boundary, second.anchor, [kept2], ids.R2, at(50));
  write(ids.R2, twice);
  const index = loadClaudeIndex(ids.R2, root, at(20));
  assert.deepEqual(index.images.map((entry) => [entry.id, entry.key, entry.compacted]), [
    ["IMG-001", `${o.p1}#0`, true], ["IMG-002", `${o.p2}#0`, true], ["IMG-003", `${o.p3}#0`, true], ["IMG-004", `${p4}#0`, true], ["IMG-005", `${p5}#0`, false],
  ]);
  assert.equal(index.notes.get("IMG-004")?.line, "客厅｜绿色方块");
  assert.deepEqual(index.previous.map((entry) => entry.sessionId), [ids.R, ids.O]);
  assert.equal(claudeImageData(index, index.images[3]), pngD);
  // A fork copies the records with the session's own id in them, from the same compaction.
  write(ids.F, [{ type: "queue-operation", operation: "enqueue", timestamp: at(55), sessionId: ids.F }, ...twice.filter((entry) => entry.uuid).map((entry) => ({ ...entry, sessionId: ids.R2 }))]);
  const fork = loadClaudeIndex(ids.F, root, at(20));
  assert.deepEqual(fork.images.map((entry) => entry.key), index.images.map((entry) => entry.key));
  assert.equal(fork.previous[0].sessionId, ids.R2);
});

test("a resumed or forked Claude session starts with the selection of the session it continues", () => {
  const dir = mkdtempSync(join(tmpdir(), "cam-claude-selection-"));
  writeSelection({ threadId: ids.O, unchecked: { "k#0": { id: "IMG-001", at: at(10) }, "k#1": { id: "IMG-002", at: at(35) } }, auto: true, autoAt: at(5), autoSince: at(5), pinned: { "k#2": { id: "IMG-003", at: at(12) } } }, dir);
  const inherited = claudeSelection(ids.R, dir, at(0), [{ sessionId: ids.R2, at: at(30) }, { sessionId: ids.O, at: at(30) }]);
  assert.deepEqual(Object.keys(inherited.unchecked), ["k#0"]);
  assert.deepEqual(Object.keys(inherited.pinned ?? {}), ["k#2"]);
  assert.equal(inherited.auto, true);
  assert.equal(inherited.inheritedFrom, ids.O);
  // Kept as its own from then on.
  assert.equal(existsSync(join(dir, `${ids.R}.json`)), true);
  assert.equal(JSON.parse(readFileSync(join(dir, `${ids.R}.json`), "utf8")).inheritedFrom, ids.O);
  // Its own selection wins; nothing to inherit leaves the default.
  writeSelection({ threadId: ids.F, unchecked: {} , auto: false }, dir);
  assert.equal(claudeSelection(ids.F, dir, at(0), [{ sessionId: ids.O, at: at(30) }]).auto, false);
  assert.deepEqual(claudeSelection(ids.R2, dir, at(0), []).unchecked, {});
});
