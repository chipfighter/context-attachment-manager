// Purpose: v0.10 — where the engine puts the prompt-cache marks of a Claude Code request, so it still reads what the
// ones before it wrote after the engine changed the history (anthropic-messages/cache.ts). Input: requests shaped like Claude
// Code's (two marks at the end of the messages, two in the system prompt). Output: Node test assertions only.

import assert from "node:assert/strict";
import test from "node:test";
import { keepCacheRead, marksOutside, sentPrefixOf } from "../../plugin/src/adapters/protocols/anthropic-messages/cache.ts";

const mark = { type: "ephemeral", ttl: "1h" };
const text = (value: string, marked = false) => ({ type: "text", text: value, ...(marked ? { cache_control: mark } : {}) });
const user = (...content: any[]) => ({ role: "user", content });
const assistant = (...content: any[]) => ({ role: "assistant", content });
const tokens = (left: number, marked = false) => (marked ? { role: "system", content: [text(`<total_tokens>${left}</total_tokens>`, true)] } : { role: "system", content: `<total_tokens>${left}</total_tokens>` });
const read = (id: string, marked = false) => ({ type: "tool_use", id, name: "Read", input: { file_path: `${id}.png` }, ...(marked ? { cache_control: mark } : {}) });
const result = (id: string, body: string, marked = false) => ({ type: "tool_result", tool_use_id: id, content: [text(body)], ...(marked ? { cache_control: mark } : {}) });
const marked = (messages: any[]) => sentPrefixOf(messages).marks.map(({ message, block }) => `${message}.${block}`);
const plain = (messages: any[]) => messages.map((message) => JSON.stringify(message).replace(/,"cache_control":\{[^}]*\}/g, ""));

// Turn 1 as sent with its image: the request after the Read (marks on the Read call and on the closing system message).
const turnOne = (image: string, marks: boolean) => [
  user(text("look at a.png")), tokens(100), assistant(read("t1", marks)), user(result("t1", image)), tokens(99, marks),
];
const before = turnOne("[IMG-001 included] <image>", true);
// Turn 2's first request: turn 1's image is now a placeholder, Claude Code's marks are at its new end.
const after = [
  ...turnOne("[IMG-001 omitted] placeholder", false), assistant(text("a red dress", true)), user(text("now b.png")), tokens(98, true),
];

test("v0.10: after the engine changed the history, a mark goes where the request before had one before the change", () => {
  const { messages, marks } = keepCacheRead(after, [sentPrefixOf(before)], 2);
  assert.deepEqual(marks, { read: { message: 2, block: 0 }, prepare: null, dropped: [{ message: 5, block: 0 }] });
  // The Read call carries the mark again; the closing system message keeps its own, the request still writes its end.
  assert.deepEqual(marked(messages), ["2.0", "7.0"]);
  assert.deepEqual(messages[2].content[0].cache_control, mark);
  // Nothing else changed, and the input is left as it was.
  assert.deepEqual(plain(messages), plain(after));
  assert.deepEqual(marked(after), ["5.0", "7.0"]);
});

test("v0.10: when the last request's marks both come after the change, the one before it can still be read", () => {
  // Eval #4 → #6: the images went out once more (no feature line yet), then became placeholders mid-turn.
  const older = [user(text("look at a.png")), assistant(read("t1", true)), user(result("t1", "[IMG-001 included] <image>", true))];
  const newer = [user(text("look at a.png")), assistant(read("t1")), user(result("t1", "[IMG-001 included] <image>")), assistant(text("ok", true)), user(text("now b.png", true))];
  const now = [...newer.slice(0, 2), user(result("t1", "[IMG-001 omitted] placeholder")), assistant(text("ok")), user(text("now b.png")), assistant(read("t2", true)), user(result("t2", "[IMG-002 included] <image>", true))];
  assert.equal(keepCacheRead(now, [sentPrefixOf(newer)], 2).marks, null);
  assert.deepEqual(keepCacheRead(now, [sentPrefixOf(newer), sentPrefixOf(older)], 2).marks?.read, { message: 1, block: 0 });
});

test("v0.10: a mark is prepared just before the first image a later request will leave out", () => {
  // A turn whose images went out once more: they sit after Claude Code's marks of every request so far.
  const now = [user(text("look at a.png")), assistant(read("t1")), user(result("t1", "[IMG-001 included] <image>")), assistant(text("ok", true)), user(text("now b.png", true))];
  const { messages, marks } = keepCacheRead(now, [], 2, { message: 2, block: 0 });
  assert.deepEqual(marks?.prepare, { message: 1, block: 0 });
  assert.deepEqual(marked(messages), ["1.0", "4.0"]);
  // With a read as well, the two places go to the read and the prepared one; Claude Code's end gives way.
  const sent = [user(text("look at a.png", true)), assistant(read("t1")), user(result("t1", "[IMG-001 included] <image>")), assistant(text("ok", true))];
  const changed = [user(text("look at a.png")), assistant(read("t1")), user(result("t1", "[IMG-001 omitted]")), assistant(text("ok")), user(text("now b.png")), assistant(read("t2")), user(result("t2", "[IMG-002 included] <image>", true))];
  const both = keepCacheRead(changed, [sentPrefixOf(sent)], 2, { message: 6, block: 0 });
  assert.deepEqual([both.marks?.read, both.marks?.prepare], [{ message: 0, block: 0 }, { message: 5, block: 0 }]);
  assert.deepEqual(marked(both.messages), ["0.0", "5.0"]);
  // A thinking block takes no mark: the prepared place is the block before it.
  const thought = [user(text("a")), assistant({ type: "thinking", thinking: "", signature: "s" }), user(result("t1", "<image>", true))];
  assert.deepEqual(keepCacheRead(thought, [], 2, { message: 2, block: 0 }).marks?.prepare, { message: 0, block: 0 });
});

test("v0.10: a request that only adds to the last one keeps Claude Code's marks", () => {
  const next = [...before.map((message, i) => (i === 4 ? tokens(99) : message)), assistant(text("ok", true)), user(text("next")), tokens(97, true)];
  // The closing message went out as a marked block then and as a string now: the same message.
  assert.equal(keepCacheRead(next, [sentPrefixOf(before)], 2).marks, null);
});

test("v0.10: no mark is moved when nothing before the change was marked, or nothing is known of the last request", () => {
  const early = after.map((message, i) => (i === 0 ? user(text("look at a.png again")) : message));
  assert.equal(keepCacheRead(early, [sentPrefixOf(before)], 2).marks, null);
  assert.equal(keepCacheRead(after, [], 2).marks, null);
});

test("v0.10: with a place to spare, Claude Code's marks all stay", () => {
  const added = keepCacheRead(after, [sentPrefixOf(before)], 1);
  assert.deepEqual(marked(added.messages), ["2.0", "5.0", "7.0"]);
});

test("v0.10: a mark on a message now sent as a string goes on its text block", () => {
  const sent = [...before.slice(0, 4).map((message, i) => (i === 2 ? assistant(read("t1")) : message)), tokens(99, true), assistant(read("t2", true)), user(result("t2", "[IMG-002 included] <image>")), tokens(98, true)];
  const now = [...sent.slice(0, 4), tokens(99), assistant(read("t2")), user(result("t2", "[IMG-002 omitted] placeholder")), tokens(98), assistant(text("done", true)), user(text("next")), tokens(97, true)];
  const { messages, marks } = keepCacheRead(now, [{ ...sentPrefixOf(sent), marks: [{ message: 4, block: 0 }, { message: 7, block: 0 }] }], 2);
  assert.deepEqual(marks?.read, { message: 4, block: 0 });
  assert.deepEqual(messages[4], { role: "system", content: [{ type: "text", text: "<total_tokens>99</total_tokens>", cache_control: mark }] });
});

test("v0.10: a mark put earlier takes the TTL of Claude Code's next mark, so longer TTLs still come first", () => {
  const short = { type: "ephemeral" };
  const now = after.map((message, i) => (i === 7 ? { role: "system", content: [{ type: "text", text: "<total_tokens>98</total_tokens>", cache_control: short }] } : message));
  const { messages } = keepCacheRead(now, [sentPrefixOf(before)], 1);
  // Before a 1-hour mark: 1 hour; the end keeps its 5 minutes.
  assert.deepEqual([messages[2].content[0].cache_control, messages[5].content[0].cache_control, messages[7].content[0].cache_control], [mark, mark, short]);
  const onlyShort = keepCacheRead(now.map((message, i) => (i === 5 ? assistant(text("a red dress")) : message)), [sentPrefixOf(before)], 2).messages;
  assert.deepEqual(onlyShort[2].content[0].cache_control, short);
});

test("v0.10: marks outside the messages count against the four allowed", () => {
  assert.equal(marksOutside({ system: [text("a"), text("b", true), text("c", true)], tools: [{ name: "x" }] }), 2);
  assert.equal(marksOutside({ cache_control: mark, system: "plain" }), 1);
});
