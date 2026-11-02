// Purpose: v0.11 — platforms that use the core alone, without a panel (docs/v0.11/plan.md 3.8): the engine's rewrite
// of their requests in each format (automatic selection always on, ids that stay from request to request, a fetched copy
// sent in its own turn only), the session a request belongs to, the model's fetch tool, the registry and routes.
// Input: synthetic requests in a temporary data folder. Output: test results.
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { formatOf, rewritePlatformRequest, sessionOfRequest } from "../../plugin/src/adapters/protocols/any.ts";
import { workbuddy } from "../../plugin/src/adapters/workbuddy/platform.ts";
import { latestSession } from "../../plugin/src/core/request-index.ts";
import { readRoute, registerRoute } from "../../plugin/src/core/routes.ts";
import { corePlatformOf, isPlatform } from "../../plugin/src/platforms.ts";
import { callPlatformTool } from "../../plugin/src/plugin-server.ts";
import { forwardHeaders } from "../../plugin/src/proxy.ts";
import { png } from "./testkit.ts";

type Json = Record<string, any>;
const red = png(4, 4, () => [255, 0, 0]).toString("base64");
const blue = png(4, 4, () => [0, 0, 255]).toString("base64");
const green = png(4, 4, () => [0, 255, 0]).toString("base64");
const root = () => mkdtempSync(join(tmpdir(), "cam-platforms-"));
const send = (platform: string, path: string, body: Json, data: string, session: string | null = "conv-1") => {
  const out = rewritePlatformRequest(platform, path, Buffer.from(JSON.stringify(body)), undefined, session, data, "en");
  return { json: JSON.parse(out.body.toString("utf8")) as Json, report: out.report, session: out.session };
};
const texts = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(texts);
  if (!value || typeof value !== "object") return [];
  const node = value as Json;
  return [...(typeof node.text === "string" ? [node.text] : []), ...Object.values(node).flatMap(texts)];
};

// Chat Completions, as WorkBuddy sends it.
const chatUrl = (data: string) => ({ type: "image_url", image_url: { url: `data:image/png;base64,${data}` } });
const chatTurns = (n: number): Json[] => {
  const turns: Json[][] = [
    [{ role: "user", content: [{ type: "text", text: "first look" }, chatUrl(red)] }, { role: "assistant", content: "a red square" }],
    [{ role: "user", content: [{ type: "text", text: "and this" }, chatUrl(blue)] }, { role: "assistant", content: "a blue square" }],
    [{ role: "user", content: [{ type: "text", text: "compare with the first" }] }, { role: "assistant", content: null, tool_calls: [{ id: "f1", type: "function", function: { name: "cam_view_image", arguments: "{\"ids\":[\"IMG-001\"]}" } }] },
      { role: "tool", tool_call_id: "f1", content: [{ type: "text", text: "[Image IMG-001 fetched original | user upload | turn 1 | 4×4]" }, chatUrl(red)] }, { role: "assistant", content: "same red" }],
    [{ role: "user", content: [{ type: "text", text: "thanks" }, chatUrl(green)] }],
  ];
  return [{ role: "system", content: "rules" }, ...turns.slice(0, n).flat()];
};
const chat = (n: number) => ({ model: "m", stream: true, tools: [{ type: "function", function: { name: "cam_view_image" } }], messages: chatTurns(n) });

test("the format is told by the path", () => {
  assert.equal(formatOf("/v2/chat/completions"), "openai-chat");
  assert.equal(formatOf("/v1/messages"), "anthropic-messages");
  assert.equal(formatOf("/v1/responses"), "openai-responses");
  assert.equal(formatOf("/v1beta/models/gemini-3-pro:streamGenerateContent"), "gemini");
  assert.equal(formatOf("/v1internal:generateContent"), "gemini");
  assert.equal(formatOf("/v1/models"), null);
});

test("chat completions: earlier turns' images become placeholders; this turn's stay; the ids stay from request to request", () => {
  const data = root();
  const one = send("workbuddy", "/v2/chat/completions", chat(1), data);
  assert.deepEqual(one.report.replaced, [], "nothing earlier yet");
  assert.equal(JSON.stringify(one.json), JSON.stringify(chat(1)), "the request goes out as it came");
  const two = send("workbuddy", "/v2/chat/completions", chat(2), data);
  assert.deepEqual(two.report.replaced.map((entry: Json) => entry.id), ["IMG-001"]);
  const turn1 = two.json.messages[1].content;
  assert.ok(turn1.every((part: Json) => part.type === "text"), "the red image is gone");
  assert.ok(turn1.some((part: Json) => /IMG-001/.test(part.text) && /omitted/.test(part.text)), "its placeholder names it");
  assert.ok(turn1.some((part: Json) => /cam_view_image/.test(part.text)), "the note says how to fetch it");
  assert.equal(two.json.messages[3].content[1].type, "image_url", "this turn's image is sent");
  const four = send("workbuddy", "/v2/chat/completions", chat(4), data);
  assert.deepEqual(four.report.replaced.map((entry: Json) => entry.id), ["IMG-001", "IMG-002"], "the same ids as before");
  assert.deepEqual(four.report.copies, ["IMG-001"], "the copy fetched in turn 3 is a short note now");
  const tool = four.json.messages.find((message: Json) => message.role === "tool");
  assert.ok(tool.content.every((part: Json) => part.type === "text"), "no image left in the tool result");
  assert.equal(four.json.messages.at(-1).content[1].type, "image_url", "the new green image is sent");
});

test("chat completions: a copy the model fetched is sent in its own turn", () => {
  const data = root();
  send("workbuddy", "/v2/chat/completions", chat(2), data);
  const three = send("workbuddy", "/v2/chat/completions", chat(3), data);
  const tool = three.json.messages.find((message: Json) => message.role === "tool");
  assert.equal(tool.content[1].type, "image_url", "the fetched copy goes out");
  assert.deepEqual(three.report.replaced.map((entry: Json) => entry.id), ["IMG-001", "IMG-002"]);
});

test("the fetch tool returns the image by id from the session sent last", () => {
  const data = root();
  send("workbuddy", "/v2/chat/completions", chat(2), data);
  assert.ok(latestSession("workbuddy", data));
  const result = callPlatformTool("workbuddy", "cam_view_image", { ids: ["IMG-001", "img-002", "IMG-009"], lang: "en" }, data);
  assert.equal(result.isError, false);
  const images = result.content.filter((part: Json) => part.type === "image");
  assert.deepEqual(images.map((part: Json) => part.data), [red, blue]);
  assert.ok(/^\[Image IMG-001 fetched original/.test(result.content[0].text), "each after the line naming it, so the next request knows it as a copy");
  assert.ok(result.content.some((part: Json) => part.type === "text" && /IMG-009/.test(part.text)), "an unknown id is said so");
  assert.throws(() => callPlatformTool("opencode", "cam_view_image", { ids: ["IMG-001"] }, data), "another platform has no session there");
});

test("a request without tools (a side request) does not move the session a fetch is about", () => {
  const data = root();
  send("workbuddy", "/v2/chat/completions", chat(2), data, "conv-1");
  const before = latestSession("workbuddy", data);
  send("workbuddy", "/v2/chat/completions", { model: "m", messages: chatTurns(1) }, data, "conv-2");
  assert.equal(latestSession("workbuddy", data), before);
});

test("sessions: named by the platform's header, else by the first prompt", () => {
  assert.equal(workbuddy.sessionOf!({ "x-conversation-id": "0199-abc" }), "0199-abc");
  assert.equal(workbuddy.sideRequest!({ "x-agent-type": "auxiliary" }), true);
  assert.equal(workbuddy.sideRequest!({ "x-agent-type": "main" }), false);
  assert.notEqual(sessionOfRequest("workbuddy", "a", ""), sessionOfRequest("opencode", "a", ""), "each platform its own");
  assert.equal(sessionOfRequest("opencode", null, "hello"), sessionOfRequest("opencode", null, "hello"));
  assert.notEqual(sessionOfRequest("opencode", null, "hello"), sessionOfRequest("opencode", null, "other"));
  assert.equal(sessionOfRequest("opencode", null, "  "), null);
  const data = root();
  const first = send("opencode", "/v1/chat/completions", chat(2), data, null);
  const later = send("opencode", "/v1/chat/completions", chat(4), data, null);
  assert.equal(first.session, later.session, "the same conversation, longer");
});

// Gemini, as Gemini CLI sends it (and wrapped in `request` when signed in with Google).
const inline = (data: string) => ({ inlineData: { mimeType: "image/png", data } });
const gemini = () => ({
  contents: [
    { role: "user", parts: [{ text: "first look" }, inline(red)] },
    { role: "model", parts: [{ text: "a red square" }, { functionCall: { name: "read", args: {} } }] },
    { role: "user", parts: [{ functionResponse: { name: "read", response: { ok: true } } }, inline(blue)] },
    { role: "model", parts: [{ text: "and a blue one" }] },
    { role: "user", parts: [{ text: "which was first?" }] },
  ],
  tools: [{ functionDeclarations: [{ name: "read" }] }],
});

test("gemini: the images of turn 1, a tool's one included, become placeholders in turn 2; Code Assist's wrapping too", () => {
  for (const wrap of [(body: Json) => body, (body: Json) => ({ model: "m", project: "p", request: body })]) {
    const data = root();
    const out = send("gemini-cli", "/v1beta/models/gemini-3-pro:streamGenerateContent", wrap(gemini()), data);
    assert.deepEqual(out.report.replaced.map((entry: Json) => entry.id), ["IMG-001", "IMG-002"]);
    const contents = out.json.contents ?? out.json.request.contents;
    assert.equal(contents.flatMap((content: Json) => content.parts).filter((part: Json) => part.inlineData).length, 0);
    assert.ok(contents[2].parts[0].functionResponse, "the function response stays first");
  }
});

test("anthropic messages and responses: the same rule on a platform without a panel", () => {
  const data = root();
  const image = (b64: string) => ({ type: "image", source: { type: "base64", media_type: "image/png", data: b64 } });
  const messages = { model: "m", tools: [{ name: "t" }], messages: [
    { role: "user", content: [{ type: "text", text: "look" }, image(red)] },
    { role: "assistant", content: [{ type: "text", text: "red" }] },
    { role: "user", content: [{ type: "text", text: "and now" }, image(blue)] },
  ] };
  const m = send("opencode", "/v1/messages", messages, data, "s1");
  assert.deepEqual(m.report.replaced.map((entry: Json) => entry.id), ["IMG-001"]);
  assert.equal(m.json.messages.filter((message: Json) => message.role !== "system").at(-1).content[1].type, "image");
  const url = (b64: string) => `data:image/png;base64,${b64}`;
  const responses = { model: "m", tools: [{ type: "function", name: "t" }], input: [
    { type: "message", role: "user", content: [{ type: "input_text", text: "look" }, { type: "input_image", image_url: url(red) }] },
    { type: "message", role: "assistant", content: [{ type: "output_text", text: "red" }] },
    { type: "message", role: "user", content: [{ type: "input_text", text: "and now" }, { type: "input_image", image_url: url(blue) }] },
  ] };
  const r = send("pi", "/v1/responses", responses, data, "s2");
  assert.deepEqual(r.report.replaced.map((entry: Json) => entry.id), ["IMG-001"]);
});

test("registry, routes and headers for a platform without a panel", () => {
  assert.equal(isPlatform("workbuddy"), true);
  assert.equal(isPlatform("codex"), true);
  assert.equal(isPlatform("antigravity"), false);
  assert.equal(corePlatformOf("codex"), null, "Codex has its own adapter");
  const data = root();
  const route = registerRoute({ platform: "workbuddy", baseUrl: "https://www.workbuddy.cn/v2" }, data);
  assert.equal(readRoute(route.id, data)?.platform, "workbuddy");
  assert.throws(() => registerRoute({ platform: "Not A Name", baseUrl: "https://x.example" }, data));
  const headers = forwardHeaders({ "anthropic-version": "2023-06-01", "x-api-key": "k", "x-cam-session": "s", "x-conversation-id": "c" }, "api.anthropic.com", "opencode");
  assert.equal(headers["anthropic-version"], "2023-06-01", "kept: the platform's provider may need it");
  assert.equal(headers["x-api-key"], "k");
  assert.equal(headers["x-cam-session"], undefined, "the engine's own header stops here");
  assert.equal(headers["x-conversation-id"], "c");
});
