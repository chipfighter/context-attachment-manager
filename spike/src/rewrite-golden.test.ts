// Purpose: v0.11 — the rewrite gives byte for byte what it gave before the split into core and translators
// (docs/v0.11/plan.md, step 2). Every combination of unchecked images, automatic selection, feature lines, language,
// pixel matching, copies and notes, on synthetic Codex and Claude requests, is rewritten; each group of combinations
// is hashed and compared with rewrite-golden.json, written once by the code before the split
// (CAM_WRITE_GOLDEN=1 node --test src/rewrite-golden.test.ts). A group that differs is named in the failure.
// Input: synthetic requests (claude-fixtures.ts, the shapes of rewrite.test.ts). Output: test results.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { buildClaudeIndex } from "../../plugin/src/adapters/claude/claude-index.ts";
import { addCompacted } from "../../plugin/src/adapters/protocols/anthropic-messages/rewrite.ts";
import { rewriteMessages } from "../../plugin/src/adapters/claude/claude-rewrite.ts";
import { findImages, type ImageRef } from "../../plugin/src/adapters/protocols/openai-responses/images.ts";
import { addCodexCompacted, rewriteItems } from "../../plugin/src/adapters/protocols/openai-responses/rewrite.ts";
import type { Described } from "../../plugin/src/core/words.ts";
import { image, pngA, pngB, pngC, text, transcript, usualRequest } from "./claude-fixtures.ts";
import { png } from "./testkit.ts";

type Json = Record<string, any>;
const GOLDEN = new URL("./rewrite-golden.json", import.meta.url);

const url = (bytes: Buffer) => `data:image/png;base64,${bytes.toString("base64")}`;
const red = png(4, 4, () => [255, 0, 0]);
const blue = png(4, 4, () => [0, 0, 255]);
const green = png(4, 4, () => [0, 255, 0]);
const tagged = (name: string, n: number, bytes: Buffer) => [
  { type: "input_text", text: `<image name=[Image #${n}] path="C:\\work\\${name}">` },
  { type: "input_image", image_url: url(bytes), detail: "high" },
  { type: "input_text", text: "</image>" },
];
const FETCHED = "[图片 IMG-001 取回的原图｜a.png｜用户上传｜第 1 轮｜4×4]";

// Codex requests: uploads (one repeated), a viewed image, a hosted generation, a second turn, a fetched copy, a PDF
// comment screenshot, an image the index does not know.
const codexSets: Record<string, () => Json[]> = {
  base: () => [
    { type: "message", id: "msg_dev", role: "developer", content: [{ type: "input_text", text: "instructions" }] },
    { type: "message", id: "msg_1", role: "user", content: [{ type: "input_text", text: "三张图" }, ...tagged("a.png", 1, red), ...tagged("b.png", 2, blue), ...tagged("b copy.png", 3, blue)] },
    { type: "message", id: "msg_2", role: "assistant", content: [{ type: "output_text", text: "收到" }] },
    { type: "custom_tool_call", call_id: "c1", name: "exec", input: 'await tools.view_image({path:"C:\\\\work\\\\a.png"})' },
    { type: "custom_tool_call_output", id: "ctco_1", call_id: "c1", output: [{ type: "input_text", text: "Script completed" }, { type: "input_image", image_url: url(red) }] },
    { type: "image_generation_call", id: "ig_1", status: "completed", result: green.toString("base64") },
  ],
  turns: () => [
    { type: "message", id: "msg_dev", role: "developer", content: [{ type: "input_text", text: "instructions" }] },
    { type: "message", id: "msg_1", role: "user", content: [{ type: "input_text", text: "两张图" }, ...tagged("a.png", 1, red), ...tagged("b.png", 2, blue)] },
    { type: "message", id: "msg_2", role: "assistant", content: [{ type: "output_text", text: "收到" }] },
    { type: "message", id: "msg_3", role: "user", content: [{ type: "input_text", text: "这张呢" }, ...tagged("c.png", 1, green), { type: "input_text", text: "The next image shows PDF page 3 at the time of Comment 1." }, { type: "input_image", image_url: url(blue) }] },
    { type: "custom_tool_call", call_id: "c2", name: "exec", input: 'const r = await tools.mcp__codex_attachment_manager__cam_view_image({ids:["IMG-001"]});' },
    { type: "custom_tool_call_output", id: "ctco_2", call_id: "c2", output: [{ type: "input_text", text: "Script completed" }, { type: "input_text", text: FETCHED }, { type: "input_image", image_url: url(red) }] },
    { type: "custom_tool_call", call_id: "c3", name: "exec", input: "await tools.other()" },
    { type: "custom_tool_call_output", id: "ctco_3", call_id: "c3", output: [{ type: "input_image", image_url: url(png(4, 4, () => [9, 9, 9])) }] },
  ],
};

// The thread index's view: ids in order (copies and the unknown image left out), turns, notes on IMG-001, and IMG-002
// waiting for its feature line.
function codexIndex(items: Json[]) {
  const refs = findImages(items);
  const byKey = new Map<string, Described>();
  const unknownKey = refs.find((ref) => ref.item === 7)?.key;
  for (const ref of refs) {
    if (ref.fetchedId || ref.key === unknownKey) continue;
    const id = `IMG-00${byKey.size + 1}`;
    const notes = id === "IMG-001" ? { line: "街头｜近景，正脸，雨夜，霓虹反光，一个很长很长很长很长的特征行用来测试截断的效果", ratings: [{ text: "太暗", turn: 1 }, { text: "好多了", turn: 2 }] } : undefined;
    byKey.set(ref.key, { id, name: ref.name, label: ref.label, kind: ref.kind, turn: ref.item <= 2 ? 1 : 2, width: ref.width, height: ref.height, ...(notes ? { notes } : {}), ...(id === "IMG-002" ? { awaiting: true } : {}) });
  }
  return { refs, byKey, copyKey: refs.find((ref) => ref.fetchedId)?.key ?? null };
}

function subsets<T>(list: T[]): T[][] {
  return Array.from({ length: 2 ** list.length }, (_, mask) => list.filter((_, i) => mask & (1 << i)));
}
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);

function codexGroups(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, build] of Object.entries(codexSets)) {
    const { refs, byKey, copyKey } = codexIndex(build());
    const describe = (ref: ImageRef) => byKey.get(ref.key);
    for (const lang of ["zh", "en"] as const)
      for (const auto of [undefined, { currentTurn: 1 }, { currentTurn: 2 }])
        for (const features of [false, true])
          for (const pixels of ["none", "size"] as const)
            for (const copied of copyKey ? [false, true] : [false]) {
              const pixelHash = pixels === "none" ? () => null : (ref: ImageRef) => `${ref.width}x${ref.height}`;
              const copies = new Map(copied && copyKey ? [[copyKey, "IMG-001"]] : []);
              const results = subsets(refs.map((ref) => ref.key)).map((keys) => rewriteItems(build(), describe, new Set(keys), pixelHash, { lang, copies, auto, features }));
              out[`codex ${name} ${lang} auto=${auto?.currentTurn ?? "off"} features=${features} pixels=${pixels} copies=${copied}`] = hash(results);
            }
  }
  return out;
}

// Claude: the usual session, its notes on IMG-001, and request variants (as is, an image the transcript lacks yet,
// system messages where the notes go).
function claudeSession() {
  const t = transcript();
  const p1 = t.prompt([image(pngA), image(pngB), text("What are these?")]);
  t.assistant({ type: "thinking", thinking: "", signature: "sig-1" });
  t.assistant(text("[//]: # (cam IMG-001 桌面｜红色方块，正面)\n[//]: # (cam IMG-002 评价：太蓝)\n\nA red square and a blue square."));
  t.prompt("Read c.png");
  t.assistant({ type: "tool_use", id: "toolu_1", name: "Read", input: { file_path: "C:\\work\\c.png" } });
  t.toolResult("toolu_1", [image(pngC)]);
  t.assistant(text("A white rectangle. need IMG-001"));
  const p3 = t.prompt([image(pngA), text("Again?")]);
  t.assistant(text("Same red square."));
  return { index: buildClaudeIndex("s", t.records), p1, p3 };
}
const claudeRequests: Record<string, () => Json[]> = {
  usual: () => usualRequest(),
  late: () => [...usualRequest(), { role: "user", content: [image(pngB), text("new one")] }],
  system: () => {
    const messages = usualRequest();
    messages.splice(5, 0, { role: "system", content: "reminder" });
    messages.splice(1, 0, { role: "system", content: [text("other")] });
    return messages;
  },
};

function claudeGroups(): Record<string, string> {
  const out: Record<string, string> = {};
  const { index, p3 } = claudeSession();
  const keys = [...index.byKey.keys()];
  for (const [name, build] of Object.entries(claudeRequests))
    for (const lang of ["zh", "en"] as const)
      for (const auto of [undefined, { currentTurn: 3 }, { currentTurn: 4 }])
        for (const features of [false, true])
          for (const noted of [false, true])
            for (const pixels of ["none", "size"] as const)
              for (const copied of [false, true])
                for (const waiting of [false, true]) {
                  const pixelHash = pixels === "none" ? () => null : (ref: { width: number | null; height: number | null }) => `${ref.width}x${ref.height}`;
                  const copies = new Map(copied ? [["tool:toolu_1#0", "IMG-001"]] : []);
                  const awaiting = new Set(waiting ? [`${p3}#0`] : []);
                  const results = subsets(keys).map((leaveOut) => rewriteMessages(build(), index, new Set(leaveOut), pixelHash, { lang, copies, auto, features, noted, awaiting }));
                  out[`claude ${name} ${lang} auto=${auto?.currentTurn ?? "off"} features=${features} noted=${noted} pixels=${pixels} copies=${copied} awaiting=${waiting}`] = hash(results);
                }
  return out;
}

// After a compaction: Codex's compaction item and Claude's summary, with every split of the images into sent and listed.
function compactionGroups(): Record<string, string> {
  const out: Record<string, string> = {};
  const images: Described[] = [
    { id: "IMG-001", name: "a.png", label: null, kind: "upload", turn: 1, width: 4, height: 4, notes: { line: "街头｜近景", ratings: [{ text: "太暗", turn: 2 }] } },
    { id: "IMG-002", name: null, label: null, kind: "view", turn: 2, width: null, height: null },
    { id: "IMG-003", name: "c.png", label: "[Image #1]", kind: "generated", turn: 3, width: 8, height: 8 },
  ];
  const codexItems = () => [
    { type: "message", role: "developer", content: [{ type: "input_text", text: "instructions" }] },
    { type: "compaction", encrypted_content: "x" },
    { type: "message", role: "user", content: [{ type: "input_text", text: "next" }] },
  ];
  const claudeMessages = (asString: boolean, system: boolean) => [
    { role: "user", content: asString ? "summary" : [text("summary"), text("<system-reminder>x</system-reminder>")] },
    ...(system ? [{ role: "system", content: "s" }] : []),
    { role: "assistant", content: [text("ok")] },
    { role: "user", content: [text("next")] },
  ];
  for (const lang of ["zh", "en"] as const)
    for (const auto of [false, true]) {
      const splits = subsets(images).map((sent) => ({ listed: images, sent }));
      out[`codex compaction ${lang} auto=${auto}`] = hash(splits.map(({ listed, sent }) => addCodexCompacted(codexItems(), listed, sent.map((image) => ({ image, url: url(red) })), { lang, auto })));
      for (const asString of [false, true])
        for (const system of [false, true])
          out[`claude compaction ${lang} auto=${auto} string=${asString} system=${system}`] = hash(splits.map(({ listed, sent }) => addCompacted(claudeMessages(asString, system), "summary", listed, sent.map((one) => ({ image: one, block: image(pngA) })), { lang, auto })));
    }
  return out;
}

test("rewrite: every combination gives what it gave before the split", () => {
  const now = { ...codexGroups(), ...claudeGroups(), ...compactionGroups() };
  if (process.env.CAM_WRITE_GOLDEN === "1") writeFileSync(GOLDEN, `${JSON.stringify(now, null, 1)}\n`);
  const golden = JSON.parse(readFileSync(GOLDEN, "utf8")) as Record<string, string>;
  assert.deepEqual(Object.keys(now).sort(), Object.keys(golden).sort(), "the same groups");
  assert.deepEqual(Object.entries(now).filter(([group, value]) => golden[group] !== value).map(([group]) => group), [], "groups that changed");
});
