// Purpose: v0.8 — feature lines and ratings (docs/v0.8/plan.md): the record lines read from the model's own replies
// in both indexes, how a placeholder shows them, the feature line note's place, and ids on this turn's new images.
// Input: synthetic records, transcripts and request items; output: Node test assertions only.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildClaudeIndex } from "../../plugin/src/claude-index.ts";
import { rewriteMessages } from "../../plugin/src/claude-rewrite.ts";
import { findImages, type ImageRef } from "../../plugin/src/images.ts";
import { addNotes, sceneOf, type Notes } from "../../plugin/src/notes.ts";
import { autoPlaceholder, clip, featureNote, plainPlaceholder, rewriteItems, type Described } from "../../plugin/src/rewrite.ts";
import { buildIndex, writesNotes, type Parsed } from "../../plugin/src/thread-index.ts";
import { image, pngA, pngB, text, transcript } from "./claude-fixtures.ts";
import { png } from "./testkit.ts";

const notesOf = (text: string, turn: number | null = 1) => {
  const notes = new Map<string, Notes>();
  addNotes(notes, text, turn);
  return notes;
};

test("record lines: a feature line per image, written once; ratings pile up with their turns", () => {
  const notes = notesOf([
    "两张都生成好了。",
    "",
    "[//]: # (cam IMG-001 深蓝雨夜｜近景，正脸，霓虹反光)",
    "[//]: # (cam IMG-002 暖色灯光｜中景，侧脸，逆光)",
    "[//]: # (cam IMG-001 深蓝雨夜｜别的写法)",
    "[//]: # (cam IMG-002 评价：太暗)",
  ].join("\n"), 3);
  addNotes(notes, "[//]: # (cam IMG-002 评价: 脸最好)\n  [//]: # (cam IMG-003 rated: too dark )", 5);
  assert.deepEqual(notes.get("IMG-001"), { line: "深蓝雨夜｜近景，正脸，霓虹反光", ratings: [] });
  assert.deepEqual(notes.get("IMG-002"), { line: "暖色灯光｜中景，侧脸，逆光", ratings: [{ turn: 3, text: "太暗" }, { turn: 5, text: "脸最好" }] });
  assert.deepEqual(notes.get("IMG-003"), { line: null, ratings: [{ turn: 5, text: "too dark" }] });
  // Not a record line: inside other text, ASCII parentheses inside, no id, more than three spaces before it.
  const none = notesOf("看这里 [//]: # (cam IMG-004 x)\n[//]: # (cam IMG-005 带(括号)的)\n[//]: # (cam 没有编号)\n    [//]: # (cam IMG-006 缩进太多)");
  assert.equal(none.size, 0);
  assert.equal(sceneOf("深蓝雨夜｜近景，正脸"), "深蓝雨夜");
  assert.equal(sceneOf("rainy blue night | close-up"), "rainy blue night");
  assert.equal(sceneOf(null), null);
});

test("a long feature line or rating is cut at the last punctuation mark that fits", () => {
  assert.equal(clip("深蓝雨夜｜近景，正脸", 30), "深蓝雨夜｜近景，正脸");
  assert.equal(clip("深蓝雨夜｜近景，正脸，霓虹反光，撑着一把透明的伞，背后是很长很长的街道和招牌", 30), "深蓝雨夜｜近景，正脸，霓虹反光，撑着一把透明的伞…");
  assert.equal(clip("一二三四五六七八九十一二三四五六", 15), "一二三四五六七八九十一二三四五…");
  assert.equal(clip("rainy blue night | close-up, facing the camera", 30), "rainy blue night | close-up,…");
});

const record = (type: string, payload: Record<string, any>): Parsed => ({ offset: 0, type, payload, timestamp: null });
const url = (bytes: Buffer) => `data:image/png;base64,${bytes.toString("base64")}`;
const red = png(4, 4, () => [255, 0, 0]);
const blue = png(4, 4, () => [0, 0, 255]);

test("the Codex index reads record lines from the model's replies only", () => {
  const history = [
    record("event_msg", { type: "task_started", turn_id: "t1" }),
    record("response_item", { type: "message", id: "m1", role: "user", content: [{ type: "input_image", image_url: url(red) }, { type: "input_text", text: "[//]: # (cam IMG-001 用户自己写的)" }] }),
    record("response_item", { type: "custom_tool_call", call_id: "c1", name: "exec", input: "x" }),
    record("response_item", { type: "custom_tool_call_output", id: "o1", call_id: "c1", output: [{ type: "input_text", text: "[//]: # (cam IMG-001 网页里藏的)" }] }),
    record("response_item", { type: "message", id: "m2", role: "assistant", content: [{ type: "output_text", text: "好的。\n\n[//]: # (cam IMG-001 深蓝雨夜｜近景)" }] }),
    record("event_msg", { type: "task_started", turn_id: "t2" }),
    record("response_item", { type: "message", id: "m3", role: "assistant", content: [{ type: "output_text", text: "[//]: # (cam IMG-001 评价：太暗)" }] }),
  ];
  const index = buildIndex("thread", history);
  assert.deepEqual(index.notes.get("IMG-001"), { line: "深蓝雨夜｜近景", ratings: [{ turn: 2, text: "太暗" }] });
});

test("the Claude index reads record lines from the assistant's text, with the turn", () => {
  const t = transcript();
  t.prompt([image(pngA), text("[//]: # (cam IMG-001 用户自己写的)")]);
  t.assistant(text("A red square.\n\n[//]: # (cam IMG-001 red square | flat, centered)"));
  t.prompt("Is it too dark?");
  t.assistant(text("[//]: # (cam IMG-001 rated: too dark)"));
  const index = buildClaudeIndex("s", t.records);
  assert.deepEqual(index.notes.get("IMG-001"), { line: "red square | flat, centered", ratings: [{ turn: 2, text: "too dark" }] });
});

const tagged = (name: string, n: number, bytes: Buffer) => [
  { type: "input_text", text: `<image name=[Image #${n}] path="C:\\work\\${name}">` },
  { type: "input_image", image_url: url(bytes), detail: "high" },
  { type: "input_text", text: "</image>" },
];
// Turn 1: a.png; turn 2: b.png, the request's current turn.
const turns = () => [
  { type: "message", id: "dev", role: "developer", content: [{ type: "input_text", text: "instructions" }] },
  { type: "message", id: "u1", role: "user", content: [{ type: "input_text", text: "第一张" }, ...tagged("a.png", 1, red)] },
  { type: "message", id: "a1", role: "assistant", content: [{ type: "output_text", text: "收到" }] },
  { type: "message", id: "u2", role: "user", content: [{ type: "input_text", text: "第二张" }, ...tagged("b.png", 1, blue)] },
];
const A_NOTES: Notes = { line: "深蓝雨夜｜近景，正脸", ratings: [{ turn: 1, text: "一" }, { turn: 2, text: "二" }, { turn: 3, text: "三" }, { turn: 4, text: "脸最好" }] };
function describer(list: Array<Record<string, any>>, notes: Record<string, Notes> = {}) {
  const refs = findImages(list);
  const byKey = new Map(refs.map((ref, i) => {
    const id = `IMG-00${i + 1}`;
    return [ref.key, { id, name: ref.name, label: ref.label, kind: ref.kind, turn: i + 1, width: ref.width, height: ref.height, ...(notes[id] ? { notes: notes[id] } : {}) } satisfies Described];
  }));
  return { describe: (ref: ImageRef) => byKey.get(ref.key), key: (id: string) => [...byKey].find(([, v]) => v.id === id)![0] };
}
const texts = (item: Record<string, any>): string[] => item.content.map((part: Record<string, any>) => part.text ?? part.type);

test("a placeholder carries the feature line and the latest three ratings, with their turns", () => {
  const image: Described = { id: "IMG-001", name: "a.png", label: null, kind: "upload", turn: 1, width: 4, height: 4, notes: A_NOTES };
  assert.equal(autoPlaceholder(image), "[图片 IMG-001 已省略｜a.png｜用户上传｜第 1 轮｜4×4]\n特征：深蓝雨夜｜近景，正脸；评价：第 2 轮“二”，第 3 轮“三”，第 4 轮“脸最好”\n需要原图时调用 cam_view_image，传入“IMG-001”。");
  assert.equal(plainPlaceholder(image, "en"), "[Image IMG-001 omitted | a.png | uploaded by the user | turn 1 | 4×4]\nFeatures: 深蓝雨夜｜近景，正脸; rated: \"二\" (turn 2), \"三\" (turn 3), \"脸最好\" (turn 4)\nTo see it again, write \"need IMG-001\" in your reply.");
  assert.equal(autoPlaceholder({ ...image, notes: undefined }), "[图片 IMG-001 已省略｜a.png｜用户上传｜第 1 轮｜4×4]\n需要原图时调用 cam_view_image，传入“IMG-001”。", "nothing noted: no line");
});

test("with feature lines, the note goes before the first image's turn and this turn's new image says its id", () => {
  const input = turns();
  const { describe, key } = describer(input, { "IMG-001": A_NOTES });
  // Turn 2 with automatic selection: turn 1's a.png is left out, b.png is new.
  const { items: out, report } = rewriteItems(input, describe, new Set([key("IMG-001")]), () => null, { auto: { currentTurn: 2 }, features: true });
  assert.deepEqual(out.map((item) => item.role ?? item.type), ["developer", "developer", "developer", "user", "assistant", "user"]);
  assert.equal(out[1].content[0].text, featureNote("zh"));
  assert.match(out[2].content[0].text, /^上下文管理说明（来自用户安装的上下文素材管理工具）：这个任务开着“自动选图”/);
  assert.deepEqual([report.featureAt, report.noteAt, report.labeled], [1, 2, 1]);
  assert.match(texts(out[3])[1], /^\[图片 IMG-001（\[Image #1\]） 已省略｜a\.png｜用户上传｜第 1 轮｜4×4\]\n特征：深蓝雨夜｜近景，正脸；/);
  assert.deepEqual(texts(out[5]).slice(0, 3), ["第二张", "[图片 IMG-002（[Image #1]） 已提供｜b.png｜用户上传｜第 2 轮｜4×4]", `<image name=[Image #1] path="C:\\work\\b.png">`]);
  // Turn 1's own request, nothing left out: the note and a.png's id only.
  const first = turns().slice(0, 2);
  const one = rewriteItems(first, describer(first).describe, new Set(), () => null, { auto: { currentTurn: 1 }, features: true });
  assert.deepEqual(one.items.map((item) => item.role), ["developer", "developer", "user"]);
  assert.deepEqual([one.report.replaced, one.report.featureAt, one.report.noteAt, one.report.labeled], [[], 1, undefined, 1]);
  // Without feature lines (a side chat, a subagent) all is as before: nothing to do, the same items back.
  assert.equal(rewriteItems(first, describer(first).describe, new Set(), () => null, { auto: { currentTurn: 1 } }).items, first);
  // An image the index does not know yet is sent as it is, and counted.
  const unknown = rewriteItems(first, () => undefined, new Set(), () => null, { features: true });
  assert.deepEqual([unknown.items === first, unknown.report.unknown], [true, 1]);
});

test("Claude: the feature line note follows the message holding the first image, joining a note already there", () => {
  const t = transcript();
  t.prompt([image(pngA), text("first")]);
  t.assistant(text("A red square."));
  const p2 = t.prompt([image(pngB), text("second")]);
  const index = buildClaudeIndex("s", t.records);
  const messages = [
    { role: "user", content: [image(pngA), text("first")] },
    { role: "assistant", content: [text("A red square.")] },
    { role: "user", content: [image(pngB), text("second")] },
  ];
  const plain = rewriteMessages(messages, index, new Set(), () => null, { features: true });
  assert.deepEqual(plain.messages.map((message) => message.role), ["user", "system", "assistant", "user"]);
  assert.equal(plain.messages[1].content, featureNote("zh"));
  assert.deepEqual([plain.report.featureAt, plain.report.labeled], [1, 2]);
  assert.match(plain.messages[3].content[0].text, /^\[图片 IMG-002 已提供｜未命名｜用户上传｜第 2 轮｜8×8\]$/);
  // B unchecked: the full note and its short note follow its message; the feature line note stays after A's.
  const some = rewriteMessages(messages, index, new Set([`${p2}#0`]), () => null, { features: true });
  assert.deepEqual(some.messages.map((message) => message.role), ["user", "system", "assistant", "user", "system"]);
  assert.deepEqual([some.report.featureAt, some.report.noteAt], [1, 4]);
});

test("a subagent's model writes no feature lines; the user's own task does, also before its rollout's first line", () => {
  const sessions = mkdtempSync(join(tmpdir(), "cam-notes-sessions-"));
  const day = join(sessions, "2026", "10", "19");
  mkdirSync(day, { recursive: true });
  const write = (id: string, meta: Record<string, any>) => writeFileSync(join(day, `rollout-2026-10-19T10-00-00-${id}.jsonl`), `${JSON.stringify({ type: "session_meta", payload: { id, ...meta } })}\n`);
  const own = "01a15100-0000-7000-8000-000000000001";
  const sub = "01a15100-0000-7000-8000-000000000002";
  const forkedSub = "01a15100-0000-7000-8000-000000000003";
  write(own, { source: "vscode" });
  write(sub, { source: { subagent: { thread_spawn: { parent_thread_id: own, depth: 1 } } }, parent_thread_id: own });
  write(forkedSub, { source: { subagent: { thread_spawn: { parent_thread_id: own } } }, forked_from_id: own });
  assert.equal(writesNotes(sessions, own), true);
  assert.equal(writesNotes(sessions, sub), false);
  assert.equal(writesNotes(sessions, forkedSub), false);
  assert.equal(writesNotes(sessions, "01a15100-0000-7000-8000-000000000009"), true, "no rollout yet");
});
