// Purpose: v0.10 — an image of a turn the user interrupted before the model wrote its feature line is sent once more
// in the next turn, its label saying it still needs one (thread-index.ts awaitingLine; proxy.ts); and the feature line
// note says how to write it, and how to correct a wrong line (rewrite.ts, notes.ts).
// Input: synthetic rollouts and transcripts in temporary folders; output: Node test assertions only.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import zlib from "node:zlib";
import { buildClaudeIndex } from "../../plugin/src/adapters/claude/claude-index.ts";
import { rewriteBody } from "../../plugin/src/adapters/codex/engine.ts";
import { rewriteClaudeBody } from "../../plugin/src/adapters/claude/engine.ts";
import { featureNote } from "../../plugin/src/core/words.ts";
import { writeSelection } from "../../plugin/src/core/selection.ts";
import { autoChoice, awaitingLine, missedLine } from "../../plugin/src/core/session.ts";
import { addNotes } from "../../plugin/src/core/notes.ts";
import { loadThreadIndex } from "../../plugin/src/adapters/codex/thread-index.ts";
import { image, pngA, pngB, text, transcript } from "./claude-fixtures.ts";
import { png } from "./testkit.ts";

// These tests check the Chinese wording: the language is fixed, so neither the system's language nor one a panel
// reported on this machine decides it (v0.1-14).
process.env.CAM_LANG = "zh";

type Json = Record<string, any>;
const threadId = "01a0d301-0000-7000-8000-0000000000bf";
const red = `data:image/png;base64,${png(16, 16, () => [220, 30, 30]).toString("base64")}`;
const upload = (id: string, turn: string, url: string): Json => ({
  type: "message", id, role: "user",
  content: [{ type: "input_text", text: "看图" }, { type: "input_text", text: String.raw`<image name=[Image #1] path="C:\w\a.png">` }, { type: "input_image", image_url: url }, { type: "input_text", text: "</image>" }],
  internal_chat_message_metadata_passthrough: { turn_id: turn },
});

function codex(rollout: Json[]) {
  const root = mkdtempSync(join(tmpdir(), "cam-backfill-"));
  const sessions = join(root, "sessions");
  const selections = join(root, "selection");
  mkdirSync(join(sessions, "2026", "10", "31"), { recursive: true });
  writeFileSync(join(sessions, "2026", "10", "31", `rollout-2026-10-31T01-00-00-${threadId}.jsonl`), [{ type: "session_meta", payload: { id: threadId } }, ...rollout].map((record) => JSON.stringify(record)).join("\n") + "\n");
  writeSelection({ threadId, unchecked: {}, auto: true, autoAt: "2026-10-31T00:00:00Z", autoSince: "2026-10-31T00:00:00Z" }, selections);
  return { sessions, selections };
}
const turn = (id: string) => ({ type: "event_msg", payload: { type: "task_started", turn_id: id } });
const item = (payload: Json) => ({ type: "response_item", payload });
const request = (items: Json[]) => zlib.zstdCompressSync(Buffer.from(JSON.stringify({ model: "m", input: items, stream: true })));
const sentText = (out: Buffer) => zlib.zstdDecompressSync(out).toString("utf8");

test("Codex: the image of an interrupted turn without a feature line goes out once more, labelled", () => {
  const first = upload("msg_1", "t1", red);
  const next = { type: "message", id: "msg_2", role: "user", content: [{ type: "input_text", text: "继续" }] };
  const { sessions, selections } = codex([turn("t1"), item(first), { type: "event_msg", payload: { type: "turn_aborted", turn_id: "t1" } }, turn("t2"), item(next)]);
  const index = loadThreadIndex(sessions, threadId);
  assert.deepEqual([...index.interrupted!], [1]);
  assert.equal(awaitingLine(index, index.images[0], 2), true);
  const { body, report } = rewriteBody(request([first, next]), "zstd", threadId, sessions, selections, "t2");
  assert.deepEqual(report.replaced, []);
  assert.ok(sentText(body).includes(red.slice(40)), "sent again");
  assert.match(sentText(body), /\[图片 IMG-001（\[Image #1\]） 已提供，还没有特征行｜a\.png｜用户上传｜第 1 轮/);
  // Once a turn finished after it, it is left out as usual, line or not.
  const done = codex([turn("t1"), item(first), { type: "event_msg", payload: { type: "turn_aborted", turn_id: "t1" } }, turn("t2"), item(next), { type: "event_msg", payload: { type: "task_complete", turn_id: "t2" } }, turn("t3")]);
  const later = rewriteBody(request([first, next, { type: "message", role: "user", content: [{ type: "input_text", text: "再来" }] }]), "zstd", threadId, done.sessions, done.selections, "t3");
  assert.deepEqual(later.report.replaced.map((entry: Json) => entry.id), ["IMG-001"]);
  // A turn that was not interrupted: its images are left out in the next one, as before.
  const plain = codex([turn("t1"), item(first), { type: "event_msg", payload: { type: "task_complete", turn_id: "t1" } }, turn("t2"), item(next)]);
  assert.deepEqual(rewriteBody(request([first, next]), "zstd", threadId, plain.sessions, plain.selections, "t2").report.replaced.map((entry: Json) => entry.id), ["IMG-001"]);
  // With its line written (in the reply that was cut short), nothing is sent again.
  const lined = codex([turn("t1"), item(first), item({ type: "message", role: "assistant", content: [{ type: "output_text", text: "[//]: # (cam IMG-001 书房｜红色方块)\n\n…" }] }), { type: "event_msg", payload: { type: "turn_aborted", turn_id: "t1" } }, turn("t2"), item(next)]);
  assert.deepEqual(rewriteBody(request([first, next]), "zstd", threadId, lined.sessions, lined.selections, "t2").report.replaced.map((entry: Json) => entry.id), ["IMG-001"]);
});

test("Claude: an image before Claude Code's interruption mark goes out once more, labelled", async () => {
  const t = transcript();
  const p1 = t.prompt([image(pngA), text("look")]);
  t.assistant(text("Looking…"));
  t.prompt("[Request interrupted by user]");
  t.prompt([image(pngB), text("and this one")]);
  const index = buildClaudeIndex("s", t.records);
  assert.deepEqual([[...index.interrupted!], [...index.skipped!]], [[1], [2]]);
  assert.deepEqual(index.images.map((entry) => awaitingLine(index, entry, 3)), [true, false]);
  const home = mkdtempSync(join(tmpdir(), "cam-backfill-claude-"));
  const dir = mkdtempSync(join(tmpdir(), "cam-backfill-sel-"));
  const session = "11111111-2222-4333-8444-5555555555bf";
  mkdirSync(join(home, "projects", "D--work"), { recursive: true });
  writeFileSync(join(home, "projects", "D--work", `${session}.jsonl`), t.records.map((record) => JSON.stringify(record)).join("\n") + "\n");
  writeSelection({ threadId: session, unchecked: {}, auto: true, autoAt: "2026-10-31T00:00:00Z", autoSince: "2026-10-31T00:00:00Z" }, dir);
  const body = Buffer.from(JSON.stringify({ model: "claude-haiku-5-5", messages: [
    { role: "user", content: [image(pngA), text("look")] },
    { role: "assistant", content: [text("Looking…")] },
    { role: "user", content: [text("[Request interrupted by user]")] },
    { role: "user", content: [image(pngB), text("and this one")] },
  ] }));
  const out = rewriteClaudeBody(body, undefined, session, dir, home, {});
  const messages = JSON.parse(out.body.toString("utf8")).messages as Json[];
  assert.deepEqual(out.report.replaced, []);
  const labels = messages.flatMap((message) => (Array.isArray(message.content) ? message.content : [])).filter((block: Json) => block.type === "text" && /^\[图片 IMG-/.test(block.text)).map((block: Json) => block.text.split("｜")[0]);
  assert.deepEqual(labels, ["[图片 IMG-001 已提供，还没有特征行", "[图片 IMG-002 已提供"]);
  assert.equal(p1.length > 0, true);
});

// v0.12: Claude Code wrote a session's first message to its transcript only after the request (gate 1, 2026-11-22), so
// its images went out without ids and the model wrote no lines for them.
test("v0.12: images sent before the transcript had them go out once more in the next turn, the newest five", () => {
  const colors = Array.from({ length: 7 }, (_, at) => png(4, 4, () => [30 * at, 90, 160]).toString("base64"));
  const t = transcript();
  t.prompt([...colors.map((bytes) => image(bytes)), text("look")]);
  t.assistant(text("Seven images."));
  t.prompt("next");
  const index = buildClaudeIndex("s", t.records);
  const missed = new Set(index.images.map((entry) => entry.contentId));
  assert.deepEqual(index.images.map((entry) => missedLine(index, entry, 2, new Set([index.images[0].contentId]))), [true, false, false, false, false, false, false]);
  // Only in the turn right after, and only without a line.
  assert.equal(missedLine(index, index.images[0], 3, missed), false);
  const lined = buildClaudeIndex("s", [...t.records.slice(0, -1)]);
  addNotes(lined.notes, "[//]: # (cam IMG-001 其他:色块｜蓝)", 1);
  assert.equal(missedLine(lined, lined.images[0], 2, missed), false);
  // All seven missed: the newest five go out again, the other two become placeholders.
  const choice = autoChoice(index, 2, {}, true, missed);
  assert.deepEqual([...choice.awaiting], index.images.slice(2).map((entry) => entry.key));
  assert.deepEqual([...choice.leaveOut], index.images.slice(0, 2).map((entry) => entry.key));
  // Nothing missed: the turn's images are left out as before.
  assert.equal(autoChoice(index, 2, {}, true).awaiting.size, 0);
});

test("v0.12, Claude: an image the engine sent without its id goes out once more, labelled", () => {
  const t = transcript();
  t.prompt([image(pngA), text("look")]);
  t.assistant(text("A square."));
  t.prompt("next");
  const index = buildClaudeIndex("s", t.records);
  const home = mkdtempSync(join(tmpdir(), "cam-missed-claude-"));
  const dir = mkdtempSync(join(tmpdir(), "cam-missed-sel-"));
  const session = "11111111-2222-4333-8444-5555555555c0";
  mkdirSync(join(home, "projects", "D--work"), { recursive: true });
  writeFileSync(join(home, "projects", "D--work", `${session}.jsonl`), t.records.map((record) => JSON.stringify(record)).join("\n") + "\n");
  writeSelection({ threadId: session, unchecked: {}, auto: true, autoAt: "2026-11-22T00:00:00Z", autoSince: "2026-11-22T00:00:00Z" }, dir);
  const body = Buffer.from(JSON.stringify({ model: "claude-haiku-5-5", messages: [
    { role: "user", content: [image(pngA), text("look")] },
    { role: "assistant", content: [text("A square.")] },
    { role: "user", content: [text("next")] },
  ] }));
  const labels = (out: { body: Buffer }) => (JSON.parse(out.body.toString("utf8")).messages as Json[]).flatMap((message) => (Array.isArray(message.content) ? message.content : [])).filter((block: Json) => block.type === "text" && /^\[图片 IMG-/.test(block.text)).map((block: Json) => block.text.split("｜")[0]);
  const again = rewriteClaudeBody(body, undefined, session, dir, home, {}, null, [], "zh", new Set([index.images[0].contentId]));
  assert.deepEqual(again.report.replaced, []);
  assert.deepEqual(labels(again), ["[图片 IMG-001 已提供，还没有特征行"]);
  // A note after the turn's own message names it, at the end of the request.
  const sent = JSON.parse(again.body.toString("utf8")).messages as Json[];
  assert.equal(sent.at(-1)?.role, "system");
  assert.match(JSON.stringify(sent.at(-1)?.content), /特征行说明：IMG-001 在它们那一轮没有写上特征行/);
  assert.equal(sent.at(-2)?.content?.[0]?.text, "next");
  const usual = rewriteClaudeBody(body, undefined, session, dir, home, {}, null, [], "zh");
  assert.deepEqual(usual.report.replaced.map((entry: Json) => entry.id), ["IMG-001"]);
});

test("the feature line note says how to write a missing line and how to correct a wrong one", () => {
  assert.match(featureNote("zh"), /标着“\[图片 IMG-xxx 已提供，还没有特征行…\]”的图，是之前那一轮没来得及写特征行的/);
  assert.match(featureNote("zh"), /开头加“更正：”/);
  assert.match(featureNote("en"), /"\[Image IMG-xxx included, no feature line yet…\]"/);
  assert.match(featureNote("en"), /starting with "corrected:"/);
});
