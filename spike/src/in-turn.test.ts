// Purpose: v0.12 — a turn's older screenshots become placeholders within the turn (docs/v0.12/plan.md §4,
// core/session.ts inTurnOut): only images tools returned, the newest five kept, the older ones in batches of ten, and
// their placeholders saying 本轮.
// Input: synthetic Claude Code transcripts and requests in temporary folders; output: Node test assertions only.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildClaudeIndex } from "../../plugin/src/adapters/claude/claude-index.ts";
import { rewriteClaudeBody } from "../../plugin/src/adapters/claude/engine.ts";
import { writeSelection } from "../../plugin/src/core/selection.ts";
import { autoChoice, BATCH_IN_TURN, inTurnOut, KEEP_IN_TURN } from "../../plugin/src/core/session.ts";
import { image, pngA, text, transcript } from "./claude-fixtures.ts";
import { png } from "./testkit.ts";

process.env.CAM_LANG = "zh";
type Json = Record<string, any>;

// A turn of computer use: the user's message (with an upload), then `count` screenshots from an MCP tool, each a
// different image; the model also reads one file with Read.
function screenshots(count: number) {
  const shots = Array.from({ length: count }, (_, at) => png(6, 4, () => [8 * at, 120, 200 - 4 * at]).toString("base64"));
  const t = transcript();
  t.prompt([image(pngA), text("book the flight")]);
  t.assistant({ type: "tool_use", id: "toolu_read", name: "Read", input: { file_path: "C:\\w\\ticket.png" } });
  t.toolResult("toolu_read", [image(png(4, 4, () => [0, 0, 0]).toString("base64"))]);
  shots.forEach((shot, at) => {
    t.assistant({ type: "tool_use", id: `toolu_${at}`, name: "mcp__computer-use__screenshot", input: {} });
    t.toolResult(`toolu_${at}`, [image(shot)]);
  });
  return { t, shots };
}

test("a turn's tool images: the newest five stay, the older ones go in batches of ten", () => {
  assert.deepEqual([KEEP_IN_TURN, BATCH_IN_TURN], [5, 10]);
  const out = (count: number) => {
    const { t } = screenshots(count);
    const index = buildClaudeIndex("s", t.records);
    return inTurnOut(index, index.turns, {}).length;
  };
  assert.deepEqual([out(5), out(14), out(15), out(24), out(25), out(40)], [0, 0, 10, 10, 20, 30]);
  // The upload and the file read with Read keep their turn; the batches are the oldest screenshots.
  const { t } = screenshots(16);
  const index = buildClaudeIndex("s", t.records);
  const keys = new Set(inTurnOut(index, index.turns, {}));
  const kinds = index.images.map((entry) => `${entry.kind}${keys.has(entry.key) ? "-out" : ""}`);
  assert.deepEqual(kinds, ["upload", "view", ...Array(10).fill("tool-out"), ...Array(6).fill("tool")]);
  // A pinned screenshot neither goes nor counts.
  const pinned = { [index.images[2].key]: { id: index.images[2].id, at: "x" } };
  assert.equal(inTurnOut(index, index.turns, pinned).includes(index.images[2].key), false);
  assert.equal(inTurnOut(index, index.turns, pinned).length, 10);
  // Automatic selection leaves them out with the earlier turns' images; an earlier turn's are not counted.
  assert.deepEqual([...autoChoice(index, index.turns, {}, true).leaveOut].sort(), [...keys].sort());
  t.prompt("next");
  const later = buildClaudeIndex("s", t.records);
  assert.equal(inTurnOut(later, later.turns, {}).length, 0);
  assert.equal(autoChoice(later, later.turns, {}, true).leaveOut.size, 18);
});

test("Claude: the older screenshots of this turn go out as placeholders saying 本轮, the newest as originals", () => {
  const { t, shots } = screenshots(15);
  const home = mkdtempSync(join(tmpdir(), "cam-in-turn-"));
  const dir = mkdtempSync(join(tmpdir(), "cam-in-turn-sel-"));
  const session = "11111111-2222-4333-8444-5555555555d0";
  mkdirSync(join(home, "projects", "D--work"), { recursive: true });
  writeFileSync(join(home, "projects", "D--work", `${session}.jsonl`), t.records.map((record) => JSON.stringify(record)).join("\n") + "\n");
  writeSelection({ threadId: session, unchecked: {}, auto: true, autoAt: "2026-11-22T00:00:00Z", autoSince: "2026-11-22T00:00:00Z" }, dir);
  const messages: Json[] = [
    { role: "user", content: [image(pngA), text("book the flight")] },
    { role: "assistant", content: [{ type: "tool_use", id: "toolu_read", name: "Read", input: { file_path: "C:\\w\\ticket.png" } }] },
    { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_read", content: [image(png(4, 4, () => [0, 0, 0]).toString("base64"))] }] },
  ];
  shots.forEach((shot, at) => {
    messages.push({ role: "assistant", content: [{ type: "tool_use", id: `toolu_${at}`, name: "mcp__computer-use__screenshot", input: {} }] });
    messages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: `toolu_${at}`, content: [image(shot)] }] });
  });
  const body = Buffer.from(JSON.stringify({ model: "claude-sonnet-5-5", tools: [{ name: "Read", input_schema: { type: "object" } }], messages }));
  const out = rewriteClaudeBody(body, undefined, session, dir, home, {}, null, [], "zh");
  const sent = JSON.parse(out.body.toString("utf8")).messages as Json[];
  const blocks = sent.flatMap((message) => (Array.isArray(message.content) ? message.content : [])).flatMap((block: Json) => (block.type === "tool_result" ? block.content : [block]));
  const placeholders = blocks.filter((block: Json) => block.type === "text" && /^\[图片 IMG-\d+ 已省略/.test(block.text));
  assert.equal(placeholders.length, 10);
  assert.match(placeholders[0].text, /^\[图片 IMG-003 已省略｜未命名｜工具结果里的图片｜本轮｜6×4\]/);
  assert.equal(blocks.filter((block: Json) => block.type === "image").length, 7, "the upload, the file read and five screenshots");
  assert.deepEqual(out.report.replaced.map((entry: Json) => entry.id), Array.from({ length: 10 }, (_, at) => `IMG-${String(at + 3).padStart(3, "0")}`));
  // One note for the batch, after the last tool result holding one of them, naming all ten.
  const notes = sent.filter((message) => message.role === "system");
  const batch = notes.filter((message) => JSON.stringify(message.content).includes("上面几条消息里的"));
  assert.equal(batch.length, 1);
  assert.equal(notes.filter((message) => /上面这条消息里的/.test(JSON.stringify(message.content))).length, 0);
  assert.match(JSON.stringify(batch[0].content), /IMG-003（工具结果里的图片）.*IMG-012（工具结果里的图片）/);
  const after = sent.indexOf(batch[0]);
  assert.equal(JSON.stringify(sent[after - 1].content).includes("toolu_9"), true, "right after the tenth screenshot's result");
});

// v0.13: Claude Code sent a turn's first request a moment before its prompt reached the transcript (2026-11-23, a
// headless run): the records still ended with the model's reply, and the turn before's images went out whole once more.
test("Claude: a turn's first request leaves out the turn before's images even before its prompt is recorded", () => {
  const t = transcript();
  t.prompt("看一下 a.png");
  t.assistant({ type: "tool_use", id: "toolu_a", name: "Read", input: { file_path: "C:\w\a.png" } });
  t.toolResult("toolu_a", [image(pngA)]);
  t.assistant(text("一张红色的图。"));
  t.prompt("它是什么颜色？");
  const messages: Json[] = [
    { role: "user", content: [text("看一下 a.png")] },
    { role: "assistant", content: [{ type: "tool_use", id: "toolu_a", name: "Read", input: { file_path: "C:\w\a.png" } }] },
    { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_a", content: [image(pngA)] }] },
    { role: "assistant", content: [text("一张红色的图。")] },
    { role: "user", content: [text("它是什么颜色？")] },
    // Claude Code may put a system message after the prompt.
    { role: "system", content: "<total_tokens>1000 tokens left</total_tokens>" },
  ];
  const session = "11111111-2222-4333-8444-5555555555d1";
  const run = (records: Json[]) => {
    const home = mkdtempSync(join(tmpdir(), "cam-turn-lag-"));
    const dir = mkdtempSync(join(tmpdir(), "cam-turn-lag-sel-"));
    mkdirSync(join(home, "projects", "D--work"), { recursive: true });
    writeFileSync(join(home, "projects", "D--work", `${session}.jsonl`), records.map((record) => JSON.stringify(record)).join("\n") + "\n");
    writeSelection({ threadId: session, unchecked: {}, auto: true, autoAt: "2026-11-23T00:00:00Z", autoSince: "2026-11-23T00:00:00Z" }, dir);
    const body = Buffer.from(JSON.stringify({ model: "claude-sonnet-5-5", tools: [{ name: "Read", input_schema: { type: "object" } }], messages }));
    return rewriteClaudeBody(body, undefined, session, dir, home, {}, null, [], "zh").report;
  };
  // Recorded or not yet, the same request.
  for (const records of [t.records, t.records.slice(0, -1)]) assert.deepEqual(run(records).replaced.map((entry: Json) => entry.id), ["IMG-001"]);
  // Within the turn that read it (its tool result last), it stays.
  const home = mkdtempSync(join(tmpdir(), "cam-turn-lag-own-"));
  const dir = mkdtempSync(join(tmpdir(), "cam-turn-lag-own-sel-"));
  mkdirSync(join(home, "projects", "D--work"), { recursive: true });
  writeFileSync(join(home, "projects", "D--work", `${session}.jsonl`), t.records.slice(0, 3).map((record) => JSON.stringify(record)).join("\n") + "\n");
  writeSelection({ threadId: session, unchecked: {}, auto: true, autoAt: "2026-11-23T00:00:00Z", autoSince: "2026-11-23T00:00:00Z" }, dir);
  const own = rewriteClaudeBody(Buffer.from(JSON.stringify({ model: "claude-sonnet-5-5", tools: [{ name: "Read", input_schema: { type: "object" } }], messages: messages.slice(0, 3) })), undefined, session, dir, home, {}, null, [], "zh").report;
  assert.deepEqual(own.replaced, []);
});
