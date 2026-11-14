// Purpose: 0.11.2 — what a Codex request already carried does not change when the model notes a rating later. The
// placeholder of an image shows the ratings noted by its own turn; after a compaction of Codex, placeholders and the
// list right after the compaction item show what was noted before it (thread-index.ts compactedNotes,
// adapters/codex/engine.ts). A later rating used to be added to the placeholder (or to the list), and the prompt
// cache was lost from that image on: Codex's backend reads the cache up to the first difference (measured
// 2026-11-14 on real tasks).
// Input: synthetic rollouts and requests in temporary folders; output: Node test assertions only.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import zlib from "node:zlib";
import { rewriteBody } from "../../plugin/src/adapters/codex/engine.ts";
import { writeSelection } from "../../plugin/src/core/selection.ts";
import { loadThreadIndex } from "../../plugin/src/adapters/codex/thread-index.ts";
import { png } from "./testkit.ts";

// These tests check the Chinese wording: the language is fixed, so neither the system's language nor one a panel
// reported on this machine decides it (v0.1-14).
process.env.CAM_LANG = "zh";

type Json = Record<string, any>;
const threadId = "01a0d301-0000-7000-8000-0000000000dc";
const red = `data:image/png;base64,${png(16, 16, () => [220, 30, 30]).toString("base64")}`;
const blue = `data:image/png;base64,${png(8, 8, () => [40, 70, 210]).toString("base64")}`;
const upload: Json = {
  type: "message", id: "msg_1", role: "user",
  content: [{ type: "input_text", text: "角色设定" }, { type: "input_text", text: String.raw`<image name=[Image #1] path="C:\w\a.png">` }, { type: "input_image", image_url: red }, { type: "input_text", text: "</image>" }],
  internal_chat_message_metadata_passthrough: { turn_id: "t1" },
};
const user = (id: string, words: string): Json => ({ type: "message", id, role: "user", content: [{ type: "input_text", text: words }] });
const reply = (words: string): Json => ({ type: "message", role: "assistant", content: [{ type: "output_text", text: words }] });
const turn = (id: string) => ({ type: "event_msg", payload: { type: "task_started", turn_id: id } });
const item = (payload: Json) => ({ type: "response_item", payload });

// A task with automatic selection on, whose rollout holds `records`.
function task(records: Json[]) {
  const root = mkdtempSync(join(tmpdir(), "cam-rating-cache-"));
  const sessions = join(root, "sessions");
  const selections = join(root, "selection");
  mkdirSync(join(sessions, "2026", "11", "14"), { recursive: true });
  writeFileSync(join(sessions, "2026", "11", "14", `rollout-2026-11-14T01-00-00-${threadId}.jsonl`), [{ type: "session_meta", payload: { id: threadId } }, ...records].map((record) => JSON.stringify(record)).join("\n") + "\n");
  writeSelection({ threadId, unchecked: {}, auto: true, autoAt: "2026-11-14T00:00:00Z", autoSince: "2026-11-14T00:00:00Z" }, selections);
  return { sessions, selections };
}
const request = (items: Json[]) => zlib.zstdCompressSync(Buffer.from(JSON.stringify({ model: "m", input: items, stream: true })));
const sent = (out: Buffer) => JSON.parse(zlib.zstdDecompressSync(out).toString("utf8")).input as Json[];
const placeholderOf = (items: Json[]) => JSON.stringify(items.find((entry) => entry.id === "msg_1"));

test("Codex: a rating noted in a later turn leaves the placeholder that already went out as it was", () => {
  const a1 = reply("[//]: # (cam IMG-001 书房｜红色方块)\n[//]: # (cam IMG-001 评价：构图好)\n\n收到");
  const m2 = user("msg_2", "继续");
  const a2 = reply("好");
  const m3 = user("msg_3", "第一张太暗了");
  const a3 = reply("[//]: # (cam IMG-001 评价：太暗)\n\n记下了");
  const m4 = user("msg_4", "再看看");
  const early = task([turn("t1"), item(upload), item(a1), turn("t2"), item(m2)]);
  const late = task([turn("t1"), item(upload), item(a1), turn("t2"), item(m2), item(a2), turn("t3"), item(m3), item(a3), turn("t4"), item(m4)]);
  // The index still has every rating (the panel shows them all).
  assert.deepEqual(loadThreadIndex(late.sessions, threadId).notes.get("IMG-001")?.ratings.map((rating) => rating.text), ["构图好", "太暗"]);
  const before = sent(rewriteBody(request([upload, a1, m2]), "zstd", threadId, early.sessions, early.selections, "t2").body);
  const after = sent(rewriteBody(request([upload, a1, m2, a2, m3, a3, m4]), "zstd", threadId, late.sessions, late.selections, "t4").body);
  // The rating of the image's own turn is in its placeholder; the one noted two turns later is not (the model has it
  // in its own reply).
  assert.match(placeholderOf(before), /\[图片 IMG-001（\[Image #1\]） 已省略/);
  assert.match(placeholderOf(after), /特征：书房｜红色方块；评价：第 1 轮“构图好”/);
  assert.doesNotMatch(placeholderOf(after), /太暗/);
  // What went out in turn 2 is the start of what goes out in turn 4, item for item: the cache reads all of it.
  assert.deepEqual(after.slice(0, before.length), before);
});

test("Codex: after a compaction, placeholders and the list show what was noted before it and stay the same", () => {
  const compaction = { type: "compaction", id: "cmp_1", encrypted_content: "opaque" };
  const developer = { type: "message", role: "developer", content: [{ type: "input_text", text: "system" }] };
  const m4 = user("msg_4", "现在呢");
  const a4 = reply("[//]: # (cam IMG-002 评价：再亮一点)\n[//]: # (cam IMG-001 评价：保留)\n\n好");
  const m5 = user("msg_5", "继续");
  const history = [
    turn("t1"), item(upload), item(reply("[//]: # (cam IMG-001 角色｜红衣女生)\n\n收到")),
    turn("t2"), item(user("msg_2", "看看 c.png")),
    item({ type: "function_call", name: "view_image", call_id: "call_v", arguments: JSON.stringify({ path: "C:\\w\\c.png" }) }),
    item({ type: "function_call_output", call_id: "call_v", output: [{ type: "input_image", image_url: blue }] }),
    item(reply("[//]: # (cam IMG-002 街道｜蓝色方块，雨夜)\n\n看了")),
    turn("t3"), item(user("msg_3", "c.png 那张很好，第一张衣服对")),
    item(reply("[//]: # (cam IMG-002 评价：很好)\n[//]: # (cam IMG-001 评价：衣服对)\n\n好")),
    { type: "compacted", payload: { message: "", replacement_history: [developer, upload, compaction] } },
    turn("t4"), item(m4),
  ];
  const early = task(history);
  const late = task([...history, item(a4), turn("t5"), item(m5)]);
  const before = sent(rewriteBody(request([developer, upload, compaction, m4]), "zstd", threadId, early.sessions, early.selections, "t4").body);
  const after = sent(rewriteBody(request([developer, upload, compaction, m4, a4, m5]), "zstd", threadId, late.sessions, late.selections, "t5").body);
  // The upload Codex kept: its placeholder carries the rating noted before the compaction (the reply that held it is
  // gone from the request), not the one noted after.
  assert.match(placeholderOf(before), /评价：第 3 轮“衣服对”/);
  assert.doesNotMatch(placeholderOf(after), /保留/);
  // The list after the compaction item: the same.
  const list = (items: Json[]) => items[items.findIndex((entry) => entry.type === "compaction") + 1].content[0].text as string;
  assert.match(list(before), /\nIMG-002｜c\.png｜[^｜]+｜第 2 轮｜街道｜蓝色方块，雨夜｜评价：第 3 轮“很好”$/);
  assert.equal(list(after), list(before));
  assert.deepEqual(after.slice(0, before.length), before);
});
