// Purpose: v0.13 — PDFs in Claude Code sessions (docs/design.md §14): the index numbers the PDFs a session read; a PDF
// read in an earlier turn goes out as a placeholder with a note under automatic selection; the fetch tool's marker
// becomes the pages asked for in that call's own turn and a short note in a later one; the tool itself.
// Input: synthetic transcripts, requests and PDFs in temporary folders; output: Node test assertions only.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildClaudeIndex } from "../../plugin/src/adapters/claude/claude-index.ts";
import { rewriteClaudeBody } from "../../plugin/src/adapters/claude/engine.ts";
import { pdfFacts } from "../../plugin/src/core/pdf.ts";
import { writeSelection } from "../../plugin/src/core/selection.ts";
import { pdfMarker } from "../../plugin/src/core/words.ts";
import { callClaudeTool, claudeToolsFor, platformToolsFor } from "../../plugin/src/plugin-server.ts";
import { text, transcript } from "./claude-fixtures.ts";
import { labelsIn, pdfFile } from "./pdf-fixtures.ts";

process.env.CAM_LANG = "zh";
type Json = Record<string, any>;

const contract = pdfFile({ pages: 4 }).toString("base64");
const scan = pdfFile({ pages: 2, scanned: true }).toString("base64");
const doc = (data: string, extra: Json = {}) => ({ type: "document", source: { type: "base64", media_type: "application/pdf", data }, ...extra });
const readLine = "PDF file read: C:\\w\\合同.pdf (1.2KB)";
const FETCH = "mcp__plugin_codex-attachment-manager_codex_attachment_manager__cam_view_image";
const session = "11111111-2222-4333-8444-5555555555f1";

// Turn 1 reads the contract; turn 2 asks about page 3 and, once `fetched`, has called the fetch tool; `turn3` adds a
// third turn.
function conversation(options: { fetched?: boolean; turn3?: boolean; pages?: string } = {}) {
  const marker = pdfMarker({ id: "PDF-001", name: "合同.pdf", turn: 1, pages: null, textPages: null }, options.pages ?? "3", "zh");
  const t = transcript();
  t.prompt("读一下合同");
  t.assistant({ type: "tool_use", id: "toolu_read", name: "Read", input: { file_path: "C:\\w\\合同.pdf" } });
  t.toolResult("toolu_read", [text(readLine), doc(contract)], { toolUseResult: { type: "pdf", file: { filePath: "C:\\w\\合同.pdf" } } });
  t.assistant(text("合同一共四页。"));
  t.prompt("第3页写了什么？");
  const messages: Json[] = [
    { role: "user", content: [text("读一下合同")] },
    { role: "assistant", content: [{ type: "tool_use", id: "toolu_read", name: "Read", input: { file_path: "C:\\w\\合同.pdf" } }] },
    { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_read", content: [text(readLine), doc(contract, { cache_control: { type: "ephemeral" } })] }] },
    { role: "assistant", content: [text("合同一共四页。")] },
    { role: "user", content: [text("第3页写了什么？")] },
  ];
  if (options.fetched) {
    const input = { ids: ["PDF-001"], ...(options.pages === "" ? {} : { pages: options.pages ?? "3" }) };
    t.assistant({ type: "tool_use", id: "toolu_fetch", name: FETCH, input });
    t.toolResult("toolu_fetch", [text(marker)]);
    messages.push({ role: "assistant", content: [{ type: "tool_use", id: "toolu_fetch", name: FETCH, input }] });
    messages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_fetch", content: [text(marker)] }] });
  }
  if (options.turn3) {
    t.assistant(text("第3页是付款条款。"));
    t.prompt("好的");
    messages.push({ role: "assistant", content: [text("第3页是付款条款。")] }, { role: "user", content: [text("好的")] });
  }
  return { t, messages };
}

function setup(records: Json[], auto = true) {
  const home = mkdtempSync(join(tmpdir(), "cam-pdf-"));
  const dir = mkdtempSync(join(tmpdir(), "cam-pdf-sel-"));
  mkdirSync(join(home, "projects", "D--work"), { recursive: true });
  writeFileSync(join(home, "projects", "D--work", `${session}.jsonl`), records.map((record) => JSON.stringify(record)).join("\n") + "\n");
  writeSelection({ threadId: session, unchecked: {}, auto, autoAt: "2026-11-23T00:00:00Z", ...(auto ? { autoSince: "2026-11-23T00:00:00Z" } : {}) }, dir);
  return { home, dir };
}

const send = (messages: Json[], home: string, dir: string) => {
  const body = Buffer.from(JSON.stringify({ model: "claude-sonnet-5-5", tools: [{ name: "Read", input_schema: { type: "object" } }], messages }));
  const out = rewriteClaudeBody(body, undefined, session, dir, home, {}, null, [], "zh");
  return { sent: JSON.parse(out.body.toString("utf8")).messages as Json[], report: out.report };
};
const docsIn = (messages: Json[]) => messages.flatMap((message) => (Array.isArray(message.content) ? message.content : [])).flatMap((block: Json) => (block.type === "tool_result" && Array.isArray(block.content) ? block.content : [block])).filter((block: Json) => block.type === "document");

test("Claude PDFs: the index numbers each content once, with its name and the turn of each read", () => {
  const { t } = conversation();
  t.assistant({ type: "tool_use", id: "toolu_again", name: "Read", input: { file_path: "C:\\w\\合同.pdf" } });
  t.toolResult("toolu_again", [text(readLine), doc(contract)]);
  t.assistant({ type: "tool_use", id: "toolu_scan", name: "Read", input: { file_path: "C:\\w\\scan.pdf" } });
  t.toolResult("toolu_scan", [text("PDF file read: C:\\w\\scan.pdf (75KB)"), doc(scan)]);
  const index = buildClaudeIndex(session, t.records);
  assert.deepEqual(index.pdfs.map((pdf) => [pdf.id, pdf.name, pdf.turn]), [["PDF-001", "合同.pdf", 1], ["PDF-002", "scan.pdf", 2]]);
  assert.deepEqual([...index.pdfReads].map(([key, read]) => [key, read.pdf.id, read.turn]), [["tool:toolu_read#0", "PDF-001", 1], ["tool:toolu_again#0", "PDF-001", 2], ["tool:toolu_scan#0", "PDF-002", 2]]);
  // PDFs are not images.
  assert.equal(index.images.length, 0);
});

test("Claude PDFs: kept in their own turn, a placeholder with a note in a later one (automatic selection)", () => {
  const { t, messages } = conversation();
  // Turn 1's own request: as it is.
  const first = buildClaudeIndex(session, t.records.slice(0, 3));
  assert.equal(first.turns, 1);
  const own = setup(t.records.slice(0, 3));
  const early = send(messages.slice(0, 3), own.home, own.dir);
  assert.equal(docsIn(early.sent).length, 1);
  assert.equal(early.report.pdfs, undefined);
  // Turn 2: a placeholder in place of the file, the mark it carried kept, then a note naming it.
  const { home, dir } = setup(t.records);
  const { sent, report } = send(messages, home, dir);
  assert.equal(docsIn(sent).length, 0);
  const result = sent[2].content[0];
  assert.equal(result.content[0].text, readLine);
  // With the start of the reply that ended the turn it was read in: no tool result holds what was said after it.
  assert.match(result.content[1].text, /^\[PDF PDF-001 已省略｜合同\.pdf｜第 1 轮读取｜4 页，文字版\]\n你当时读完它的回答开头：“合同一共四页。”\n需要再看时，调用 cam_view_image，ids 传“PDF-001”/);
  assert.deepEqual(result.content[1].cache_control, { type: "ephemeral" });
  assert.equal(sent[3].role, "system");
  // The first message holding one: the full note, then the short one naming it.
  assert.match(sent[3].content, /^上下文管理说明（来自用户安装的上下文素材管理工具）：为了节省上下文，之前各轮读进来的 PDF 不再随每次请求重复发送，/);
  assert.match(sent[3].content, /\n上下文管理说明：上面这条消息里的 PDF-001（合同\.pdf），当时就是完整的内容，你当时看过/);
  assert.equal(sent[4].role, "assistant");
  assert.deepEqual(report.pdfs.replaced, ["PDF-001"]);
  assert.equal(report.pdfs.replacedChars, contract.length);
  // Claude Code sent the turn's first request before its prompt reached the transcript (2026-11-23): the request
  // itself shows the new turn.
  const lagging = setup(t.records.slice(0, -1));
  assert.equal(buildClaudeIndex(session, t.records.slice(0, -1)).turns, 1);
  assert.deepEqual(send(messages, lagging.home, lagging.dir).report.pdfs.replaced, ["PDF-001"]);
});

test("Claude PDFs: the pages fetched go in, and stay there in later turns", () => {
  const fetched = conversation({ fetched: true });
  const now = setup(fetched.t.records);
  const { sent, report } = send(fetched.messages, now.home, now.dir);
  const result = sent.at(-1)!.content[0];
  assert.equal(result.tool_use_id, "toolu_fetch");
  assert.equal(result.content[0].text, "[PDF PDF-001 取回的页面｜合同.pdf｜原文件第 3 页（共 4 页），按顺序排在下面这份 PDF 里｜其余页你在第 1 轮读过完整内容，之前说过的仍然有效]");
  const pages = Buffer.from(result.content[1].source.data, "base64");
  assert.deepEqual(pdfFacts(pages), { pages: 1, textPages: 1 });
  assert.deepEqual(labelsIn(pages), ["PAGE-3"]);
  assert.deepEqual(report.pdfs.fetched, [{ id: "PDF-001", pages: [3] }]);
  // A call not recorded yet goes in too.
  const late = setup(fetched.t.records.slice(0, -2));
  assert.equal(docsIn(send(fetched.messages, late.home, late.dir).sent).length, 1);
  // The next turn: the same pages in the same place (a line there was read as all the tool had returned).
  const later = conversation({ fetched: true, turn3: true });
  const next = setup(later.t.records);
  const again = send(later.messages, next.home, next.dir);
  const at = again.sent.findIndex((message) => message.role === "user" && message.content.some((block: Json) => block.tool_use_id === "toolu_fetch"));
  assert.deepEqual(again.sent[at].content[0].content, result.content);
  assert.equal(again.sent[at + 1].role, "assistant", "no note after it");
  assert.equal(docsIn(again.sent).length, 1);
  // Without pages, or with all of them: the whole file.
  for (const pages of ["", "1-4"]) {
    const whole = conversation({ fetched: true, pages });
    const where = setup(whole.t.records);
    const out = send(whole.messages, where.home, where.dir).sent.at(-1)!.content[0].content;
    assert.ok(out[0].text.endsWith("｜整份 4 页]"), out[0].text);
    assert.equal(out[1].source.data, contract);
  }
});

test("Claude PDFs: with automatic selection off a PDF stays, and pages fetched still go in", () => {
  const { t, messages } = conversation({ fetched: true });
  const { home, dir } = setup(t.records, false);
  const { sent, report } = send(messages, home, dir);
  const documents = docsIn(sent);
  assert.equal(documents.length, 2);
  assert.equal(documents[0].source.data, contract);
  assert.deepEqual(labelsIn(Buffer.from(documents[1].source.data, "base64")), ["PAGE-3"]);
  assert.equal(report.pdfs.replaced, undefined);
});

test("Claude PDFs: the fetch tool marks a PDF's pages for the engine, in either mode, and says which ids are not there", () => {
  const { t } = conversation();
  for (const auto of [true, false]) {
    const { home } = setup(t.records, auto);
    const options = { home, dataRoot: mkdtempSync(join(tmpdir(), "cam-pdf-root-")) };
    // The tool reads the selection from the data root's own folder.
    writeSelection({ threadId: session, unchecked: {}, auto, autoAt: "2026-11-23T00:00:00Z", ...(auto ? { autoSince: "2026-11-23T00:00:00Z" } : {}) }, join(options.dataRoot, "claude", "selection"));
    const out = callClaudeTool("cam_view_image", { sessionId: session, ids: ["pdf-1", "PDF-009"], pages: "3", lang: "zh" }, options);
    assert.equal(out.isError, false);
    assert.equal(out.content[0].text, "[PDF PDF-001 取回的页面｜合同.pdf｜第 3 页]");
    assert.equal(out.content[1].text, "这个任务里没有 PDF-009。");
    if (!auto) assert.equal(callClaudeTool("cam_view_image", { sessionId: session, ids: ["IMG-001"], lang: "zh" }, options).isError, true);
  }
  // Under Claude Code the tool takes pages; on other platforms it does not.
  assert.ok(claudeToolsFor("zh")[0].inputSchema.properties.pages);
  assert.match(claudeToolsFor("en")[0].description, /PDF-xxx omitted/);
  assert.equal((platformToolsFor("zh")[0].inputSchema.properties as Json).pages, undefined);
});
