// Purpose: v0.11 — the contract every request-format translator keeps (docs/v0.11/plan.md 3.4, 3.6), checked the same
// way for each: nothing left out gives the very same request back; an image left out is gone and its id is in the
// text that took its place; fields the translator does not know stay as they were; the same input gives the same
// output; the feature line note goes in once. A new translator adds an entry to TRANSLATORS with a sample request.
// Input: synthetic requests. Output: test results.
import assert from "node:assert/strict";
import test from "node:test";
import { imageBlocks, rewriteBlocks, type RequestImage } from "../../plugin/src/adapters/protocols/anthropic-messages/rewrite.ts";
import { findImages, type ImageRef } from "../../plugin/src/adapters/protocols/openai-responses/images.ts";
import { rewriteItems } from "../../plugin/src/adapters/protocols/openai-responses/rewrite.ts";
import type { RewriteReport } from "../../plugin/src/core/plan.ts";
import { featureNote, type Described } from "../../plugin/src/core/words.ts";
import { image, pngA, pngB, text, usualRequest } from "./claude-fixtures.ts";
import { png } from "./testkit.ts";

type Json = Record<string, any>;
type Options = { lang: "zh" | "en"; features: boolean };
// sample: a request with known images. keys: the index keys of its images, in order. rewrite: the translator with an
// index giving each key IMG-001, IMG-002, … in that order. images: how many images the request still carries.
type Translator = { name: string; sample: () => Json[]; keys: (body: Json[]) => string[]; rewrite: (body: Json[], leaveOut: Set<string>, options: Options) => { body: Json[]; report: RewriteReport }; images: (body: Json[]) => number };

const describedBy = (keys: string[], base: (key: string) => Omit<Described, "id" | "turn">) => (key: string | null): Described | undefined => {
  const at = key === null ? -1 : keys.indexOf(key);
  return at < 0 ? undefined : { id: `IMG-${String(at + 1).padStart(3, "0")}`, turn: 1, ...base(key!) };
};
const walk = (value: unknown, visit: (node: Json) => void): void => {
  if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
  else if (value && typeof value === "object") { visit(value as Json); for (const child of Object.values(value)) walk(child, visit); }
};
const count = (body: Json[], is: (node: Json) => boolean) => { let n = 0; walk(body, (node) => { if (is(node)) n++; }); return n; };
const texts = (body: Json[]) => { const out: string[] = []; walk(body, (node) => { if (typeof node.text === "string") out.push(node.text); if (typeof node.content === "string") out.push(node.content); }); return out; };

const url = (bytes: Buffer) => `data:image/png;base64,${bytes.toString("base64")}`;
const red = png(4, 4, () => [255, 0, 0]);
const blue = png(4, 4, () => [0, 0, 255]);

const TRANSLATORS: Translator[] = [
  {
    name: "openai-responses",
    sample: () => [
      { type: "message", id: "msg_dev", role: "developer", content: [{ type: "input_text", text: "instructions" }] },
      { type: "message", id: "msg_1", role: "user", content: [{ type: "input_text", text: "两张图" }, { type: "input_text", text: '<image name=[Image #1] path="C:\\work\\a.png">' }, { type: "input_image", image_url: url(red), detail: "high" }, { type: "input_text", text: "</image>" }, { type: "input_image", image_url: url(blue) }] },
      { type: "message", id: "msg_2", role: "assistant", content: [{ type: "output_text", text: "收到" }] },
      { type: "custom_tool_call", call_id: "c1", name: "exec", input: "await tools.other()" },
      { type: "custom_tool_call_output", id: "ctco_1", call_id: "c1", output: [{ type: "input_text", text: "done" }, { type: "input_image", image_url: url(png(4, 4, () => [9, 9, 9])) }] },
    ],
    keys: (body) => findImages(body).map((ref) => ref.key),
    rewrite: (body, leaveOut, { lang, features }) => {
      const refs = findImages(body);
      const describe = describedBy(refs.map((ref) => ref.key), (key) => { const ref = refs.find((one) => one.key === key)!; return { name: ref.name, label: ref.label, kind: ref.kind, width: ref.width, height: ref.height }; });
      const out = rewriteItems(body, (ref: ImageRef) => describe(ref.key), leaveOut, () => null, { lang, features });
      return { body: out.items, report: out.report };
    },
    images: (body) => count(body, (node) => node.type === "input_image" || node.type === "output_image"),
  },
  {
    name: "anthropic-messages",
    sample: () => [...usualRequest(), { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_2", content: [text("two"), image(pngB), image(pngA)] }] }],
    // The platform matches pasted images to its records; here, in order.
    keys: (body) => imageBlocks(body).map((ref, at) => ref.key ?? `pasted#${at}`),
    rewrite: (body, leaveOut, { lang, features }) => {
      const refs = imageBlocks(body).map((ref, at) => ({ ...ref, key: ref.key ?? `pasted#${at}` }));
      const describe = describedBy(refs.map((ref) => ref.key), (key) => { const ref = refs.find((one) => one.key === key)!; return { name: null, label: null, kind: ref.kind, width: ref.width, height: ref.height }; });
      const out = rewriteBlocks(body, refs, (ref: RequestImage) => describe(ref.key), leaveOut, () => null, { lang, features });
      return { body: out.messages, report: out.report };
    },
    images: (body) => count(body, (node) => node.type === "image"),
  },
];

for (const translator of TRANSLATORS) {
  const all = (body: Json[]) => new Set(translator.keys(body));
  test(`${translator.name}: nothing left out and no feature lines give the very same request back`, () => {
    const body = translator.sample();
    assert.equal(translator.rewrite(body, new Set(), { lang: "zh", features: false }).body, body);
  });

  test(`${translator.name}: an image left out is gone, and its id is in the text that took its place`, () => {
    const body = translator.sample();
    const keys = translator.keys(body);
    assert.ok(keys.length >= 3, "the sample has a few images");
    for (const key of keys) {
      const { body: out, report } = translator.rewrite(translator.sample(), new Set([key]), { lang: "en", features: false });
      assert.equal(translator.images(out), translator.images(body) - 1, key);
      const id = report.replaced[0]?.id;
      assert.ok(id && texts(out).some((line) => line.includes(id) && /omitted|not repeated/.test(line)), `${key}: a placeholder names ${id}`);
    }
    const { body: none } = translator.rewrite(translator.sample(), all(body), { lang: "zh", features: false });
    assert.equal(translator.images(none), 0);
  });

  test(`${translator.name}: fields the translator does not know stay as they were`, () => {
    const marked = () => translator.sample().map((entry) => ({ ...entry, x_unknown: { kept: true } }));
    const { body: out } = translator.rewrite(marked(), all(marked()), { lang: "en", features: true });
    const original = marked();
    for (const entry of original) {
      const same = out.find((candidate) => JSON.stringify({ ...candidate, content: null, output: null }) === JSON.stringify({ ...entry, content: null, output: null }));
      assert.ok(same, "every entry is still there with its other fields");
    }
  });

  test(`${translator.name}: the same input gives the same output, and the feature line note goes in once`, () => {
    const first = translator.rewrite(translator.sample(), all(translator.sample()), { lang: "zh", features: true });
    const second = translator.rewrite(translator.sample(), all(translator.sample()), { lang: "zh", features: true });
    assert.equal(JSON.stringify(first.body), JSON.stringify(second.body));
    assert.equal(texts(first.body).filter((line) => line.includes(featureNote("zh"))).length, 1);
  });
}
