// Purpose: v0.10 — after Codex compacts a task it keeps only the user messages, so the images tools viewed or
// generated drop out of the request: the index marks them (thread-index.ts, compacted) and the engine puts them back
// right after the compaction item (rewrite.ts, addCodexCompacted): pinned ones as originals, the others one line each
// with what the model noted.
// Input: a synthetic rollout and requests in temporary folders; output: Node test assertions only.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import zlib from "node:zlib";
import { rewriteBody } from "../../plugin/src/proxy.ts";
import { addCodexCompacted, compactList } from "../../plugin/src/rewrite.ts";
import { writeSelection } from "../../plugin/src/selection.ts";
import { loadThreadIndex } from "../../plugin/src/thread-index.ts";
import { png } from "./testkit.ts";

// These tests check the Chinese wording: the language is fixed, so neither the system's language nor one a panel
// reported on this machine decides it (v0.1-14).
process.env.CAM_LANG = "zh";

type Json = Record<string, any>;
const threadId = "01a0d301-0000-7000-8000-0000000000cc";
const red = `data:image/png;base64,${png(16, 16, () => [220, 30, 30]).toString("base64")}`;
const blue = `data:image/png;base64,${png(8, 8, () => [40, 70, 210]).toString("base64")}`;
const upload: Json = {
  type: "message", id: "msg_1", role: "user",
  content: [{ type: "input_text", text: "角色设定" }, { type: "input_text", text: String.raw`<image name=[Image #1] path="C:\w\a.png">` }, { type: "input_image", image_url: red }, { type: "input_text", text: "</image>" }],
  internal_chat_message_metadata_passthrough: { turn_id: "t1" },
};
const compaction = { type: "compaction", id: "cmp_1", encrypted_content: "opaque" };

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "cam-codex-compaction-"));
  const sessions = join(root, "sessions");
  const selections = join(root, "selection");
  mkdirSync(join(sessions, "2026", "10", "30"), { recursive: true });
  const item = (payload: Json) => ({ type: "response_item", payload });
  const turn = (id: string) => ({ type: "event_msg", payload: { type: "task_started", turn_id: id } });
  const rollout = [
    { type: "session_meta", payload: { id: threadId } },
    turn("t1"), item(upload),
    item({ type: "message", role: "assistant", content: [{ type: "output_text", text: "[//]: # (cam IMG-001 角色｜红衣女生)\n\n收到" }] }),
    turn("t2"), item({ type: "message", id: "msg_2", role: "user", content: [{ type: "input_text", text: "看看 c.png" }] }),
    item({ type: "function_call", name: "view_image", call_id: "call_v", arguments: JSON.stringify({ path: "C:\\w\\c.png" }) }),
    item({ type: "function_call_output", call_id: "call_v", output: [{ type: "input_image", image_url: blue }] }),
    item({ type: "message", role: "assistant", content: [{ type: "output_text", text: "[//]: # (cam IMG-002 街道｜蓝色方块，雨夜)\n\n看了" }] }),
    turn("t3"), item({ type: "message", id: "msg_3", role: "user", content: [{ type: "input_text", text: "c.png 那张很好" }] }),
    item({ type: "message", role: "assistant", content: [{ type: "output_text", text: "[//]: # (cam IMG-002 评价：很好)\n\n好" }] }),
    { type: "compacted", payload: { message: "", replacement_history: [{ type: "message", role: "developer", content: [{ type: "input_text", text: "system" }] }, upload, compaction] } },
    turn("t4"),
  ];
  writeFileSync(join(sessions, "2026", "10", "30", `rollout-2026-10-30T10-00-00-${threadId}.jsonl`), rollout.map((record) => JSON.stringify(record)).join("\n") + "\n");
  // What Codex sends in turn 4: the history it kept, the compaction, the new message.
  const body = () => zlib.zstdCompressSync(Buffer.from(JSON.stringify({ model: "m", input: [{ type: "message", role: "developer", content: [{ type: "input_text", text: "system" }] }, upload, compaction, { type: "message", role: "user", content: [{ type: "input_text", text: "现在呢" }] }], stream: true })));
  return { sessions, selections, body };
}

const sent = (out: Buffer) => JSON.parse(zlib.zstdDecompressSync(out).toString("utf8")).input as Json[];

test("the index marks the images Codex's compaction did not keep", () => {
  const { sessions } = fixture();
  const index = loadThreadIndex(sessions, threadId);
  assert.deepEqual(index.images.map((image) => [image.id, image.key, !!image.compacted]), [["IMG-001", "msg_1#0", false], ["IMG-002", "function_call_output:call_v#0", true]]);
});

test("after a Codex compaction, the images it dropped come back right after its compaction item", () => {
  const { sessions, selections, body } = fixture();
  writeSelection({ threadId, unchecked: {}, auto: true, autoAt: "2026-10-30T10:00:00Z", autoSince: "2026-10-30T10:00:00Z" }, selections);
  const { body: out, report } = rewriteBody(body(), "zstd", threadId, sessions, selections, "t4");
  const items = sent(out);
  const at = items.findIndex((item) => item.type === "compaction");
  // (after the notes rewriteItems put before the first turn)
  assert.deepEqual(report.compacted, { at, listed: 1, resent: [] });
  // A developer message with the note and the list, right after the compaction; the new message after it.
  const note = items[at + 1];
  assert.equal(note.role, "developer");
  assert.match(note.content[0].text, /^上下文管理说明（来自用户安装的上下文素材管理工具）：这个任务压缩过对话。压缩时，之前各轮里工具查看、生成或返回的 1 张图片没有保留下来/);
  assert.match(note.content[0].text, /调用 cam_view_image 工具/);
  assert.match(note.content[0].text, /\nIMG-002｜c\.png｜[^｜]+｜第 2 轮｜街道｜蓝色方块，雨夜｜评价：第 3 轮“很好”$/);
  assert.equal(items[at + 2].content[0].text, "现在呢");
  // The upload Codex kept is still a placeholder where it was (an earlier turn's image, automatic selection).
  assert.match(JSON.stringify(items.find((item) => item.id === "msg_1")), /\[图片 IMG-001（\[Image #1\]） 已省略/);
  // The same request again: the same items, so the cached prefix holds.
  assert.deepEqual(sent(rewriteBody(body(), "zstd", threadId, sessions, selections, "t4").body), items);
  // Pinned: it goes out as its original, labelled, after the note.
  writeSelection({ threadId, unchecked: {}, auto: true, autoAt: "2026-10-30T10:00:00Z", autoSince: "2026-10-30T10:00:00Z", pinned: { "function_call_output:call_v#0": { id: "IMG-002", at: "2026-10-30T10:00:00Z" } } }, selections);
  const pinned = rewriteBody(body(), "zstd", threadId, sessions, selections, "t4");
  const again = sent(pinned.body);
  assert.deepEqual(pinned.report.compacted.resent, ["IMG-002"]);
  assert.deepEqual(again[at + 2].content.map((part: Json) => part.type === "input_image" ? part.image_url === blue : part.text.startsWith("[图片 IMG-002 已提供｜c.png")), [true, true]);
  assert.doesNotMatch(again[at + 1].content[0].text, /清单/);
});

test("no compaction item in the request, or nothing dropped: nothing is added", () => {
  const listed = [{ id: "IMG-002", name: "c.png", label: null, kind: "view" as const, turn: 2, width: 8, height: 8 }];
  const items = [{ type: "message", role: "user", content: [{ type: "input_text", text: "hi" }] }];
  assert.deepEqual(addCodexCompacted(items, listed, []), { items, at: null });
  assert.deepEqual(addCodexCompacted([...items, compaction], [], []), { items: [...items, compaction], at: null });
  assert.equal(compactList(listed, "en"), "[Images from before the compaction, the 1 not included as originals this time: id | name | source | turn | features and ratings]\nIMG-002 | c.png | viewed | turn 2");
});
