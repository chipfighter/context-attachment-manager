// Purpose: P3-3 — the panel's data: image states, the ids the model asked for, check/uncheck, and thumbnails.
// P4 — previews and other formats, and threads without a rollout yet. v0.1-9 — the task's name as the title.
// v0.1-13 — a fork whose earlier history is gone.
// Input: synthetic rollouts in temporary folders; output: Node test assertions only.

import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { decodePng } from "../../plugin/src/png.ts";
import { applySelection, imageFor, loadPanelState, panelStateOf, requestedIds, sendInfo } from "../../plugin/src/panel-state.ts";
import { childrenDirOf, requestStatsDirOf } from "../../plugin/src/paths.ts";
import { recordChild } from "../../plugin/src/children.ts";
import { recordRequest } from "../../plugin/src/request-stats.ts";
import { readSelection, writeSelection } from "../../plugin/src/selection.ts";
import { assistant, line, red, sampleSessions, startThread, THREAD, turn, upload } from "./testfixtures.ts";
import { shrink } from "../../plugin/src/thumbnail.ts";
import { png } from "./testkit.ts";

const records = (text: string) => text.trim().split("\n").map((raw) => JSON.parse(raw));

test("the ids the model asked for come from its latest reply only", () => {
  assert.deepEqual(requestedIds(records(turn("t1") + assistant("需要 IMG-001", "t1") + turn("t2") + assistant("好的，需要 “IMG-004” 和 IMG-002。", "t2"))), ["IMG-004", "IMG-002"]);
  assert.deepEqual(requestedIds(records(turn("t1") + assistant("need IMG-007 to answer", "t1") + turn("t2"))), ["IMG-007"], "a turn still running falls back to the one before");
  assert.deepEqual(requestedIds(records(turn("t1") + assistant("IMG-003 与 IMG-002 相同", "t1"))), [], "mentioning an id is not asking for it");
  assert.deepEqual(requestedIds(records(turn("t1") + assistant("To answer that I need \"IMG-004\" and IMG-002.", "t1"))), ["IMG-004", "IMG-002"], "the English wording, quoted");
});

// v0.1-17 — replies seen in the 2026-09-26 self-test (unnamed tool screenshots, all unchecked): the model bolds the ids,
// or asks the user to check them again instead of writing "需要".
test("an asked-for id may be in bold, or asked for as checking it again; unchecking or a checked state is not asking", () => {
  const asked = (reply: string) => requestedIds(records(turn("t1") + assistant(reply, "t1")));
  assert.deepEqual(asked("需要 **IMG-003**（录像路径所在的设置页）。如果还想让我检查视频设置，也请勾选 **IMG-004**。"), ["IMG-003", "IMG-004"]);
  assert.deepEqual(asked("我无法根据当前画面确认设置是否已经保存。要我重新查看，请重新勾选 **IMG-003 和 IMG-004**。"), ["IMG-003", "IMG-004"]);
  assert.deepEqual(asked("To confirm it I need **IMG-004**."), ["IMG-004"]);
  assert.deepEqual(asked("你取消勾选了 IMG-003，所以现在看不到。IMG-002 已勾选，会照常发送；已勾选 IMG-001，没勾选 IMG-005。"), []);
  // English: "check it back in", "restore it" (the note says the user "can check it again").
  assert.deepEqual(asked("Please check **IMG-003** and **IMG-004** back into the conversation. IMG-003 shows the recording path settings, and IMG-004 shows the Video settings page."), ["IMG-003", "IMG-004"]);
  assert.deepEqual(asked("I can’t see IMG-004 now, so I can’t tell what color the shape is. Please check IMG-004 back in."), ["IMG-004"]);
  assert.deepEqual(asked("I can’t see that screenshot now because it was left out of the current context. If you want me to check the color, please restore IMG-004."), ["IMG-004"]);
  assert.deepEqual(asked("IMG-003 was restored earlier, and I will check IMG-004 carefully; I can't see IMG-002 now."), []);
});

// v0.1-24 — GPT-6 Luna's reply in the user's recording of 2026-09-28 (all images unchecked): "reattach", two ids joined
// by "or", each followed by a note in brackets. Nothing showed in the "model needs" bar.
test("an asked-for id may be asked for as re-attaching or sending it, several joined by or, each with a note", () => {
  const asked = (reply: string) => requestedIds(records(turn("t1") + assistant(reply, "t1")));
  assert.deepEqual(asked("I can’t see the earlier images now; they were left out of the conversation. I didn’t mention v1’s chat button color in my earlier notes, so I can’t identify it from the context I have. Please reattach IMG-002 (v1 desktop) or IMG-003 (v1 mobile)."), ["IMG-002", "IMG-003"]);
  assert.deepEqual(asked("Could you re-attach IMG-004 or send me IMG-005 again?"), ["IMG-004", "IMG-005"]);
  assert.deepEqual(asked("Please share IMG-006, IMG-007 or IMG-008 so I can compare."), ["IMG-006", "IMG-007", "IMG-008"]);
  assert.deepEqual(asked("请重新附上 IMG-002（v1 桌面版）或 IMG-003。"), ["IMG-002", "IMG-003"]);
  assert.deepEqual(asked("请重新发送 IMG-009 或者 IMG-010。"), ["IMG-009", "IMG-010"]);
  // Not asking: an image described as attached or sent before.
  assert.deepEqual(asked("The attached IMG-001 shows the hero; you sent IMG-002 earlier, and IMG-003 was reattached before."), []);
  assert.deepEqual(asked("你已经上传 IMG-004，之前也发送过 IMG-005 的截图。"), []);
});

test("panel state lists every image with checked, same-content and requested flags", () => {
  const options = sampleSessions();
  const state = loadPanelState(THREAD, options);
  assert.deepEqual(state.images.map((image) => [image.id, image.name, image.checked, image.sameAs, image.requested]), [
    ["IMG-001", "a.png", true, [], true],
    ["IMG-002", "b.png", true, ["IMG-003"], false],
    ["IMG-003", "b-copy.png", true, ["IMG-002"], false],
  ]);
  assert.deepEqual(state.requested, ["IMG-001"]);
  assert.equal(state.totals.checkedBytes, state.totals.allBytes);
  assert.deepEqual(state.send, { baseline: null, last: null, notice: null });
  assert.deepEqual(state.images.map((image) => [image.inLastRequest, image.inNextRequest]), [[null, true], [null, true], [null, true]], "without a recorded request every image counts");
});

// v0.2 — what the panel filters by, and what it says about a PDF comment screenshot.
test("panel images carry their source, and a PDF page its page and the PDF's name", () => {
  const page = png(12, 16, (x, y) => [250, 250, (x * y) % 256]);
  const options = sampleSessions(turn("t3") + line("response_item", {
    type: "message", id: "msg_3", role: "user",
    content: [
      { type: "input_text", text: "PDF path: C:\\docs\\report.pdf\nPDF page: 3/12\n" },
      { type: "input_text", text: "The next image shows PDF page 3 at the time of Comment 1. The selected region is outlined in blue and marked by comment marker 1." },
      { type: "input_image", image_url: `data:image/png;base64,${page.toString("base64")}` },
    ],
    internal_chat_message_metadata_passthrough: { turn_id: "t3" },
  }));
  assert.deepEqual(loadPanelState(THREAD, options).images.map((image) => [image.id, image.source, image.pdfPage, image.pdfName]), [
    ["IMG-001", "upload", null, null],
    ["IMG-002", "upload", null, null],
    ["IMG-003", "upload", null, null],
    ["IMG-004", "pdf", 3, "report.pdf"],
  ]);
});

test("the size baseline: images the last request carried, images added since, and images compacted away", () => {
  const options = sampleSessions(turn("t3") + line("response_item", {
    type: "message", id: "msg_3", role: "user",
    content: [{ type: "input_image", image_url: `data:image/png;base64,${red.toString("base64")}` }],
    internal_chat_message_metadata_passthrough: { turn_id: "t3" },
  }));
  // The last request (turn 2) carried IMG-002 and IMG-003; IMG-001 had been compacted away; IMG-004 came later.
  recordRequest(THREAD, { at: "2026-09-24T12:00:00Z", transport: "http", turnId: "t2", decodedBytes: 5000, imageSizes: { "msg_1#1": 100, "msg_1#2": 100 }, rewrite: { replaced: [{ id: "IMG-003" }], decodedBefore: 5000, decodedAfter: 4500 } }, requestStatsDirOf(options.dataRoot));
  const state = loadPanelState(THREAD, options);
  assert.deepEqual(state.images.map((image) => [image.id, image.inLastRequest, image.inNextRequest]), [
    ["IMG-001", false, false], ["IMG-002", true, true], ["IMG-003", true, true], ["IMG-004", false, true],
  ]);
  assert.deepEqual(state.send, {
    baseline: { at: "2026-09-24T12:00:00Z", bytes: 5000 },
    last: { at: "2026-09-24T12:00:00Z", bytesBefore: 5000, bytesAfter: 4500, replaced: 1, resent: 0, skipped: false },
    notice: null,
  });
});

test("the panel is told when the engine could not rewrite, or a WebSocket turn kept the unchecked images", () => {
  const http = { at: "t1", transport: "http", decodedBytes: 900, rewrite: { skipped: "thread index: Error: boom" } };
  assert.deepEqual(sendInfo({ latest: http, lastHttp: http }).notice, { kind: "skipped", at: "t1", reason: "index" });
  assert.deepEqual(sendInfo({ latest: { ...http, rewrite: { skipped: "rewrite failed: x" } }, lastHttp: { ...http, rewrite: { skipped: "rewrite failed: x" } } }).notice?.kind, "skipped");
  const busy = { at: "t2", transport: "websocket", event: "active-while-unchecked" };
  assert.deepEqual(sendInfo({ latest: busy, lastHttp: http }).notice, { kind: "websocket", at: "t2" });
  assert.equal(sendInfo({ latest: { at: "t3", transport: "http", decodedBytes: 800, rewrite: { replaced: [] } }, lastHttp: null }).notice, null);
  assert.equal(sendInfo({ latest: http, lastHttp: http }).baseline, null, "a request without image sizes is no baseline");
});

test("v0.4: the panel is told when the engine left out thinking that no longer fits, or had to send the original", () => {
  const sent = { at: "t4", transport: "http", decodedBytes: 900, rewrite: { replaced: [{ id: "IMG-001" }], thinking: { kept: 1, left: 2 }, decodedAfter: 700 } };
  assert.deepEqual(sendInfo({ latest: sent, lastHttp: sent }).notice, { kind: "thinking", at: "t4", count: 2 });
  assert.deepEqual(sendInfo({ latest: sent, lastHttp: sent }).last, { at: "t4", bytesBefore: 900, bytesAfter: 700, replaced: 1, resent: 0, skipped: false });
  // All of it fitted: nothing to tell.
  const fitted = { ...sent, rewrite: { ...sent.rewrite, thinking: { kept: 3, left: 0 } } };
  assert.equal(sendInfo({ latest: fitted, lastHttp: fitted }).notice, null);
  const original = { ...sent, rewrite: { replaced: [{ id: "IMG-001" }], fallback: "thinking-signature" } };
  assert.deepEqual(sendInfo({ latest: original, lastHttp: original }).notice, { kind: "fallback", at: "t4" });
});

test("v0.5: images from before a Claude Code compaction go out again when checked, and are marked as such", async () => {
  const { image, pngA, text, transcript } = await import("./claude-fixtures.ts");
  const { buildClaudeIndex } = await import("../../plugin/src/claude-index.ts");
  const t = transcript();
  const p1 = t.prompt([image(pngA), text("first")]);
  t.assistant(text("ok"));
  t.boundary();
  t.summary();
  t.prompt("after the compaction, no image");
  const index = buildClaudeIndex("s", t.records);
  // The latest request, as Claude Code built it, carried no image: the one from before is still sent next time.
  const carriedNone: any = { latest: { at: "t", transport: "http" }, lastHttp: { at: "t", transport: "http", decodedBytes: 100, imageSizes: {} } };
  const row = (unchecked: Set<string>) => panelStateOf("s", index, unchecked, carriedNone, null, false, [], true).images.map((image) => [image.id, image.compacted, image.checked, image.inNextRequest]);
  assert.deepEqual(row(new Set()), [["IMG-001", true, true, true]]);
  assert.deepEqual(row(new Set([`${p1}#0`])), [["IMG-001", true, false, true]]);
  // How many the last request sent again.
  const resent = { at: "t5", transport: "http", decodedBytes: 900, rewrite: { replaced: [], compacted: { at: 0, listed: 2, resent: ["IMG-001", "IMG-002"] }, decodedAfter: 1500 } };
  assert.deepEqual(sendInfo({ latest: resent, lastHttp: resent }).last, { at: "t5", bytesBefore: 900, bytesAfter: 1500, replaced: 0, resent: 2, skipped: false });
});

test("check and uncheck are kept per thread and validated", () => {
  const options = sampleSessions();
  let state = applySelection(THREAD, { uncheck: ["IMG-001", "IMG-003"] }, options);
  assert.deepEqual(state.images.filter((image) => !image.checked).map((image) => image.id), ["IMG-001", "IMG-003"]);
  assert.equal(state.totals.unchecked, 2);
  assert.ok(state.totals.checkedBytes < state.totals.allBytes);
  state = applySelection(THREAD, { check: ["IMG-001"] }, options);
  assert.deepEqual(loadPanelState(THREAD, options).images.filter((image) => !image.checked).map((image) => image.id), ["IMG-003"]);
  state = applySelection(THREAD, { checkAll: true }, options);
  assert.equal(state.totals.unchecked, 0);
  assert.throws(() => applySelection(THREAD, { uncheck: ["IMG-099"] }, options), /not an image of this thread/);
});

test("with automatic selection on, a tick pins, and the latest turn's fetches are listed (v0.3)", () => {
  // Turn 3: the model fetched IMG-001 with cam_view_image.
  const fetched = turn("t3") +
    line("response_item", { type: "custom_tool_call", call_id: "c3", name: "exec", input: 'await tools.mcp__codex_attachment_manager__cam_view_image({ids:["IMG-001"]})' }) +
    line("response_item", { type: "custom_tool_call_output", call_id: "c3", output: [{ type: "input_text", text: "[图片 IMG-001 取回的原图｜a.png｜用户上传｜第 1 轮｜64×32]" }, { type: "input_image", image_url: `data:image/png;base64,${red.toString("base64")}` }] });
  const options = sampleSessions(fetched);
  applySelection(THREAD, { uncheck: ["IMG-003"] }, options);
  let state = applySelection(THREAD, { auto: true }, options);
  assert.deepEqual([state.auto, state.fetched, state.images.length], [true, ["IMG-001"], 3], "the copy is no row of its own");
  assert.deepEqual(state.images.map((image) => [image.id, image.checked, image.fetched]), [["IMG-001", false, true], ["IMG-002", false, false], ["IMG-003", false, false]]);
  state = applySelection(THREAD, { check: ["IMG-002"], mode: "auto" }, options);
  assert.deepEqual(state.images.map((image) => image.checked), [false, true, false]);
  assert.equal(state.totals.unchecked, 2);
  // Switched off, the manual ticks are back as they were; switched on again, so is the pin.
  state = applySelection(THREAD, { auto: false }, options);
  assert.deepEqual([state.auto, state.images.map((image) => image.checked)], [false, [true, true, false]]);
  assert.deepEqual(loadPanelState(THREAD, { ...options }).images.map((image) => image.checked), [true, true, false]);
  assert.deepEqual(applySelection(THREAD, { auto: true }, options).images.map((image) => image.checked), [false, true, false]);
});

test("checking and unchecking keep automatic selection's switch and pins (v0.3)", () => {
  const options = sampleSessions();
  const dir = join(options.dataRoot, "selection");
  const auto = { auto: true, autoAt: "2026-10-06T10:00:00Z", autoSince: "2026-10-06T10:00:00Z", pinned: { "msg_1#1": { id: "IMG-002", at: "2026-10-06T10:00:00Z" } } };
  writeSelection({ threadId: THREAD, unchecked: {}, ...auto }, dir);
  applySelection(THREAD, { uncheck: ["IMG-001"] }, options);
  const { unchecked, ...rest } = readSelection(THREAD, dir);
  assert.deepEqual(Object.values(unchecked).map((entry) => entry.id), ["IMG-001"]);
  assert.deepEqual(rest, { threadId: THREAD, ...auto });
});

test("thumbnails keep the aspect ratio and fit the requested size", () => {
  const options = sampleSessions();
  const thumb = imageFor(THREAD, "IMG-001", 32, options);
  assert.ok(thumb.dataUrl?.startsWith("data:image/png;base64,"));
  const decoded = decodePng(Buffer.from(thumb.dataUrl!.split(",")[1], "base64"));
  assert.deepEqual([decoded.width, decoded.height], [32, 16]);
  const averaged = shrink(2, 1, Buffer.from([0, 0, 0, 255, 200, 100, 50, 255]), 1);
  assert.deepEqual([...averaged.pixels], [100, 50, 25, 255], "a box filter averages the covered pixels");
});

test("images within the requested size, and formats other than PNG, reach the panel as they are", () => {
  const jpeg = Buffer.from("ffd8ffe000104a46494600010100000100010000ffd9", "hex").toString("base64");
  const options = sampleSessions(turn("t3") + line("response_item", {
    type: "message", id: "msg_3", role: "user",
    content: [{ type: "input_image", image_url: `data:image/jpeg;base64,${jpeg}` }],
    internal_chat_message_metadata_passthrough: { turn_id: "t3" },
  }));
  assert.equal(imageFor(THREAD, "IMG-001", 160, options).dataUrl, `data:image/png;base64,${red.toString("base64")}`);
  assert.equal(imageFor(THREAD, "IMG-004", 160, options).dataUrl, `data:image/jpeg;base64,${jpeg}`);
  assert.throws(() => imageFor(THREAD, "IMG-099", 160, options), /not an image of this thread/);
});

test("a thread without a rollout yet shows an empty panel instead of an error, and says it has not started", () => {
  const options = sampleSessions();
  const state = loadPanelState("01a0d301-0000-7000-8000-00000000ffff", options);
  assert.deepEqual([state.images, state.turns, state.totals.images, state.started], [[], 0, 0, false]);
  assert.equal(loadPanelState(THREAD, options).started, true);
});

test("the title is the task's name, else the start of its first message; a thread that has not started has none", () => {
  const options = sampleSessions(line("event_msg", { type: "user_message", message: "第一条消息" }));
  assert.equal(loadPanelState(THREAD, options).title, "第一条消息");
  writeFileSync(join(dirname(options.sessionsDir), "session_index.jsonl"), `${JSON.stringify({ id: THREAD, thread_name: "改图任务", updated_at: "2026-09-25T10:00:00Z" })}
`);
  assert.equal(loadPanelState(THREAD, options).title, "改图任务");
  assert.equal(loadPanelState("01a0d301-0000-7000-8000-00000000ffff", options).title, null);
});

test("a fork whose earlier history is gone lists the images left and says part of the history is missing", () => {
  const options = sampleSessions();
  const FORK = "01a0d301-0000-7000-8000-00000000abce";
  writeFileSync(join(options.sessionsDir, "2026", "09", "24", `rollout-2026-09-24T11-00-00-${FORK}.jsonl`),
    line("session_meta", { id: FORK, forked_from_id: "01a0d301-0000-7000-8000-00000000dead", history_base: { thread_id: "01a0d301-0000-7000-8000-00000000dead", end_byte_offset: 99 } }) +
    turn("t5") + upload("msg_5", "t5", [["later.png", red]]));
  const state = loadPanelState(FORK, options);
  assert.deepEqual([state.historyMissing, state.started, state.images.map((image) => image.name)], [true, true, ["later.png"]]);
  assert.equal(loadPanelState(THREAD, options).historyMissing, false);
});

// v0.7: the task's subagents and side chats, from the engine's record of them and their own requests.
test("the task's panel lists its subagents and side chats with their last request", () => {
  const options = sampleSessions();
  const CHILD = "01a0d307-0000-7000-8000-0000000000e1";
  const SIDE = "01a0d307-0000-7000-8000-0000000000e2";
  assert.deepEqual(loadPanelState(THREAD, options).children, []);
  // A subagent has a rollout naming its parent, started now (today's folder); a side chat has none.
  startThread(options.sessionsDir, CHILD, { parent_thread_id: THREAD, source: { subagent: { thread_spawn: { parent_thread_id: THREAD, depth: 1, agent_path: "/root/reviewer", agent_nickname: "Franklin" } } }, thread_source: "subagent" });
  const children = childrenDirOf(options.dataRoot);
  recordChild(THREAD, SIDE, { kind: "side", from: THREAD, at: "2026-09-24T10:06:00Z" }, children);
  recordChild(THREAD, CHILD, { kind: "subagent", from: THREAD, at: "2026-09-24T10:05:00Z" }, children);
  recordRequest(SIDE, { at: "2026-09-24T10:07:00Z", transport: "http", images: 3, decodedBytes: 9000, rewrite: { images: 3, replaced: [{ id: "IMG-001" }, { id: "IMG-002" }, { id: "IMG-003" }], decodedAfter: 1000, auto: true, sideChatOf: THREAD } }, requestStatsDirOf(options.dataRoot));
  const state = loadPanelState(THREAD, options);
  // Oldest first; the subagent has sent nothing through the engine yet.
  assert.deepEqual(state.children.map((child) => [child.threadId, child.kind, child.name, child.startedAt, child.images, child.last?.replaced ?? null, child.last?.bytesAfter ?? null]), [
    [CHILD, "subagent", "Franklin", "2026-09-24T10:05:00Z", null, null, null],
    [SIDE, "side", null, "2026-09-24T10:06:00Z", 3, 3, 1000],
  ]);
});

test("the image preview supports Ctrl+wheel zoom and preserves keyboard and backdrop behavior", async () => {
  const html = readFileSync(join(import.meta.dirname, "..", "..", "plugin", "src", "panel.html"), "utf8");
  const messagesJson = /<script type="application\/json" id="messages">([\s\S]*?)<\/script>/.exec(html)![1];
  const scriptCode = /<script>\s*(\(\(\) => \{[\s\S]*?\}\)\(\);)\s*<\/script>/.exec(html)![1];

  let activeElement: any = null;
  class El {
    tagName: string; id: string; className: string;
    type = ""; textContent = ""; title = ""; value = ""; placeholder = ""; src = ""; alt = "";
    hidden = false; disabled = false; checked = false; indeterminate = false; isConnected = true;
    clientWidth = 360; offsetWidth = 360; offsetHeight = 26; scrollHeight = 400; clientHeight = 400; scrollTop = 0;
    dataset: Record<string, string> = {};
    style: Record<string, any> = { display: "", visibility: "", setProperty(k: string, v: string) { this[k] = v; } };
    attrs = new Map<string, string>();
    parent: El | null = null;
    children: El[] = [];
    listeners = new Map<string, Array<(e: any) => void>>();
    constructor(tag: string, id = "", className = "") { this.tagName = tag.toLowerCase(); this.id = id; this.className = className; }
    get classList() {
      const split = () => this.className.split(/\s+/).filter(Boolean);
      return {
        add: (...names: string[]) => { const s = new Set(split()); names.forEach((n) => s.add(n)); this.className = [...s].join(" "); },
        remove: (...names: string[]) => { const s = new Set(split()); names.forEach((n) => s.delete(n)); this.className = [...s].join(" "); },
        toggle: (name: string, force?: boolean) => { const on = force ?? !split().includes(name); if (on) this.classList.add(name); else this.classList.remove(name); return on; },
        contains: (name: string) => split().includes(name),
      };
    }
    set innerHTML(raw: string) {
      this.children = [];
      if (raw.includes("<input")) this.append(new El("input"));
      if (raw.includes("<strong")) this.append(new El("strong"));
      if (raw.includes("<span")) this.append(new El("span", "", raw.includes('class="box"') ? "box" : ""));
    }
    setAttribute(k: string, v: string) { this.attrs.set(k, v); if (k === "hidden") this.hidden = true; }
    getAttribute(k: string) { return this.attrs.get(k) ?? null; }
    append(...nodes: any[]) { for (const n of nodes) if (n instanceof El) { n.parent = this; this.children.push(n); } }
    prepend(...nodes: any[]) { for (const n of nodes.reverse()) if (n instanceof El) { n.parent = this; this.children.unshift(n); } }
    replaceChildren(...nodes: any[]) { this.children = []; this.append(...nodes); }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; }
    matches(sel: string): boolean {
      return sel.split(",").map((s) => s.trim()).some((p) => p === "[hidden]" ? (this.hidden || this.attrs.has("hidden")) : p === ".chip[data-chip]" ? (this.classList.contains("chip") && "chip" in this.dataset) : p.startsWith(".") ? this.classList.contains(p.slice(1)) : this.tagName === p.toLowerCase());
    }
    closest(sel: string): El | null { for (let cur: El | null = this; cur; cur = cur.parent) if (cur.matches(sel)) return cur; return null; }
    querySelectorAll(sel: string): El[] {
      const out: El[] = [];
      const walk = (n: El) => { for (const c of n.children) { if (c.matches(sel)) out.push(c); walk(c); } };
      walk(this);
      return out;
    }
    querySelector(sel: string): El | null { return this.querySelectorAll(sel)[0] ?? null; }
    addEventListener(type: string, fn: (e: any) => void) { this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]); }
    dispatchEvent(event: any) { event.target ??= this; for (const fn of this.listeners.get(event.type) ?? []) fn(event); return !event.defaultPrevented; }
    focus() { if (!this.disabled && !this.closest("[hidden]")) activeElement = this; }
    click() { this.dispatchEvent({ type: "click", target: this }); }
    getBoundingClientRect() { return { top: 0, height: 90 }; }
    scrollTo() {}
  }

  const byId = new Map<string, El>();
  const reg = (el: El) => { if (el.id) byId.set(el.id, el); return el; };
  for (const id of ["title", "refresh", "plugin", "card", "meterLabel", "meterValue", "meterFull", "meterBarBox", "meterBar", "nextLine", "nextLabel", "nextValue", "details", "lastLine", "lastLabel", "lastValue", "fetchedLine", "fetchedLabel", "fetchedIds", "childrenLine", "childrenLabel", "childrenValue", "needs", "searchBox", "search", "chips", "main", "status"]) {
    reg(new El(id === "search" ? "input" : id === "refresh" ? "button" : "div", id));
  }
  reg(new El("button", "more")).append(new El("span"));
  const auto = reg(new El("label", "auto", "switch")); auto.hidden = true; auto.append(new El("span", "", "auto-label"), new El("input"));
  const viewer = reg(new El("div", "viewer", "viewer")); viewer.hidden = true;
  const viewerTop = new El("div", "", "viewer-top");
  const viewerTitle = new El("div", "", "viewer-title");
  viewerTitle.append(reg(new El("span", "viewerId", "vid")), reg(new El("span", "viewerName", "vname")));
  const viewerClose = reg(new El("button", "viewerClose", "icon-btn"));
  viewerTop.append(viewerTitle, viewerClose);
  const viewerStage = reg(new El("div", "viewerStage", "viewer-stage"));
  const viewerBottom = new El("div", "", "viewer-bottom");
  const viewerCheck = reg(new El("label", "viewerCheck", "check"));
  const viewerInput = new El("input"); viewerInput.type = "checkbox";
  viewerCheck.append(viewerInput, new El("span", "", "box"), new El("span", "", "label"));
  viewerBottom.append(reg(new El("span", "viewerMeta", "viewer-meta")), viewerCheck);
  viewer.append(viewerTop, viewerStage, viewerBottom);
  reg(new El("script", "messages")).textContent = messagesJson;

  const docListeners = new Map<string, Array<(e: any) => void>>();
  const winListeners = new Map<string, Array<(e: any) => void>>();
  const sentCalls: any[] = [];
  const documentObj = {
    documentElement: new El("html"), title: "", hidden: false, visibilityState: "visible",
    get activeElement() { return activeElement; },
    getElementById: (id: string) => byId.get(id) ?? null,
    createElement: (tag: string) => new El(tag),
    addEventListener: (type: string, fn: (e: any) => void) => { docListeners.set(type, [...(docListeners.get(type) ?? []), fn]); },
  };
  const panelState = {
    threadId: THREAD, title: "Focus test", started: true, auto: false,
    images: [
      { id: "IMG-001", name: "replaceable.png", kind: "upload", source: "upload", turn: 1, width: 64, height: 32, bytes: 120, base64Chars: 160, checked: true, replaceable: true, inNextRequest: true, inLastRequest: true, sameAs: [], requested: false, fetched: false, compacted: false },
      { id: "IMG-002", name: "locked.png", kind: "upload", source: "upload", turn: 1, width: 64, height: 32, bytes: 120, base64Chars: 160, checked: true, replaceable: false, inNextRequest: true, inLastRequest: true, sameAs: [], requested: false, fetched: false, compacted: false },
    ],
  };
  const windowObj: any = {
    innerWidth: 420, innerHeight: 680, devicePixelRatio: 1, matchMedia: () => ({ matches: false }),
    addEventListener: (type: string, fn: (e: any) => void) => { winListeners.set(type, [...(winListeners.get(type) ?? []), fn]); },
    camHost: {
      post(msg: any) {
        if (msg.method === "tools/call") {
          sentCalls.push(msg.params);
          for (const fn of winListeners.get("message") ?? []) fn({ data: { id: msg.id, result: { _meta: { dataUrl: "data:image/png;base64,AAAA" }, structuredContent: panelState } } });
        }
      },
    },
  };

  new Function("window", "document", "navigator", "IntersectionObserver", "ResizeObserver", "getComputedStyle", "setTimeout", "clearTimeout", "setInterval", scriptCode)(
    windowObj, documentObj, { language: "en-US" },
    class { observe() {} unobserve() {} }, class { observe() {} },
    (el: El) => ({ rowGap: "6px", display: el.style.display || "block", visibility: el.style.visibility || "visible" }),
    () => 1, () => {}, () => 1,
  );
  for (const fn of winListeners.get("message") ?? []) fn({ data: { method: "ui/notifications/tool-result", params: { structuredContent: panelState } } });

  const keydown = (key: string, shiftKey = false) => {
    let defaultPrevented = false;
    const event = { key, shiftKey, altKey: false, ctrlKey: false, metaKey: false, get defaultPrevented() { return defaultPrevented; }, preventDefault() { defaultPrevented = true; } };
    for (const fn of docListeners.get("keydown") ?? []) fn(event);
    return event;
  };
  const wheel = (deltaY: number, ctrlKey = true) => {
    const event = { type: "wheel", deltaY, deltaMode: 0, ctrlKey, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    viewerStage.dispatchEvent(event);
    return event;
  };
  const scale = () => {
    const img = viewerStage.querySelector("img");
    return img ? Number(/^scale\((.+)\)$/.exec(img.style.transform ?? "")?.[1] ?? 1) : NaN;
  };

  const [tile1, tile2] = byId.get("main")!.querySelectorAll("button");
  tile1.focus();
  assert.equal(keydown("Tab").defaultPrevented, false, "outside the preview Tab is not intercepted");
  assert.equal(documentObj.activeElement, tile1);

  tile1.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(scale(), 1, "a preview starts fitted to its panel");
  assert.equal(wheel(-100, false).defaultPrevented, false, "ordinary scrolling is not intercepted");
  assert.equal(scale(), 1);
  assert.equal(wheel(-100).defaultPrevented, true, "Ctrl+wheel prevents page zoom");
  assert.ok(scale() > 1, "Ctrl+wheel up enlarges the image");
  assert.equal(wheel(100).defaultPrevented, true);
  assert.ok(Math.abs(scale() - 1) < 1e-10, "Ctrl+wheel down shrinks the image");
  wheel(-1e6);
  assert.ok(Number.isFinite(scale()) && scale() > 1 && scale() <= 10, "large wheel deltas have a bounded scale");
  wheel(1e6);
  assert.ok(scale() > 0 && scale() < 1, "zooming out never collapses or flips the image");
  assert.deepEqual([viewer.hidden, viewerInput.disabled, documentObj.activeElement], [false, false, viewerClose]);
  assert.equal(keydown("Tab").defaultPrevented, true);
  assert.equal(documentObj.activeElement, viewerInput, "Tab moves from close button to checkbox");
  assert.equal(keydown("Tab").defaultPrevented, true);
  assert.equal(documentObj.activeElement, viewerClose, "Tab wraps from checkbox back to close button");
  assert.equal(keydown("Tab", true).defaultPrevented, true);
  assert.equal(documentObj.activeElement, viewerInput, "Shift+Tab wraps from close button to checkbox");
  assert.equal(keydown("Tab", true).defaultPrevented, true);
  assert.equal(documentObj.activeElement, viewerClose, "Shift+Tab moves from checkbox back to close button");

  viewerInput.checked = false;
  viewerInput.dispatchEvent({ type: "change", target: viewerInput });
  assert.deepEqual(sentCalls.find((c) => c.name === "cam_set_selection")?.arguments.uncheck, ["IMG-001"]);

  keydown("Escape");
  assert.deepEqual([viewer.hidden, documentObj.activeElement], [true, tile1], "Escape closes and restores focus to opening tile");
  assert.equal(wheel(-100).defaultPrevented, false, "Ctrl+wheel is ignored when the preview is closed");

  tile2.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(scale(), 1, "opening another image resets the scale");
  wheel(-100);
  assert.deepEqual([viewer.hidden, viewerInput.disabled, documentObj.activeElement], [false, true, viewerClose]);
  assert.equal(keydown("Tab").defaultPrevented, true);
  assert.equal(documentObj.activeElement, viewerClose, "Tab skips disabled checkbox");
  assert.equal(keydown("Tab", true).defaultPrevented, true);
  assert.equal(documentObj.activeElement, viewerClose, "Shift+Tab skips disabled checkbox");

  viewer.dispatchEvent({ type: "click", target: viewerStage });
  assert.deepEqual([viewer.hidden, documentObj.activeElement], [true, tile2], "backdrop click closes and restores focus to opening tile");

  // Host language changes only translate panel chrome; the session title is content.
  const hostLocale = (locale: string) => {
    for (const fn of winListeners.get("message") ?? []) fn({ data: { method: "ui/notifications/host-context-changed", params: { locale } } });
  };
  hostLocale("ja-JP");
  assert.equal(byId.get("search")!.placeholder, "画像の内容や、そのときの言葉");
  assert.equal(documentObj.documentElement.lang, "ja");
  assert.equal(byId.get("title")!.textContent, "Focus test");
  hostLocale("zh-CN");
  assert.equal(byId.get("search")!.placeholder, "画面，或你当时说过的话");
  assert.equal(byId.get("title")!.textContent, "Focus test");
  hostLocale("en-US");
  assert.equal(byId.get("search")!.placeholder, "What it shows, or what you said then");
  assert.equal(byId.get("title")!.textContent, "Focus test");
});
