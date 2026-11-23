// Purpose: v0.13 — PDFs in a real Claude Code session (docs/design.md §14). Claude Code's command line with a copy of this
// checkout's plugin and its own engine (eval-long-setup.ts), one session in a folder holding two PDFs: a report of four
// pages with text, and a scan of two pages (images only). Turns: read the report, one sentence; a detail of its third
// page (the PDF is a placeholder by then, so the model fetches the page); read the scan, one sentence; a detail of its
// first page; a closing turn. The engine's log says what each request did with the PDFs.
// The documents are made once with a Chromium browser from the pages below (makeDocuments), when the folder does not
// have them yet: Chinese text needs the fonts a browser embeds, and the scan is two pictures printed as a PDF.
// Input: [--label name] [--model haiku|sonnet] [--effort low] [--port 17942] [--kind pdf|image] [--pdfs <folder>,
// default local/v13-pdf] [--documents-only]; CAM_EVAL_CLAUDE_CONFIG (the signed-in configuration), CAM_CLAUDE_BIN,
// CAM_BROWSER (default: Edge on Windows, else google-chrome or chromium).
// Output: local/v13/claude-pdf-<label>.json and a console summary. Synthetic documents only.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Session } from "./claude-session.ts";
import { claudeConfigDir, preparePlugin, repo, startEngine } from "./eval-long-setup.ts";

// A brief of four pages (the facts the turns ask about are on pages 3 and 1 of the two documents), two handwritten-
// looking notes, and the pictures of both for `--kind image`.
const PAGE_STYLE = "body{font-family:\"Microsoft YaHei\",\"Noto Sans CJK SC\",sans-serif;margin:0}";
const PAGES = [
  ["极光计划 · 项目简报", "本简报共四页，介绍极光计划的概况、预算、时间安排和风险。", "第 1 页：概况。极光计划要在杭州建一座面向中学生的天文科普馆，面积约 2400 平方米。"],
  ["第 2 页 · 预算", "总预算 1,860 万元：土建 1,120 万元，展陈 540 万元，其余 200 万元留作不可预见费。"],
  ["第 3 页 · 时间安排", "开工日期：2027 年 4 月 6 日。主体完工：2028 年 1 月 20 日。", "项目负责人：沈知夏；技术顾问：顾北辰。"],
  ["第 4 页 · 风险", "主要风险是穹顶投影设备进口周期长，最长可能拖到 9 个月；备选方案是改用国产设备，成本增加约 6%。"],
];
const pagesHtml = (section: string) => `<!doctype html><html lang="zh"><head><meta charset="utf-8"><style>${PAGE_STYLE}${section}h1{font-size:28px}p{font-size:19px;line-height:1.6}</style></head><body>${PAGES.map(([title, ...lines]) => `<section><h1>${title}</h1>${lines.map((line) => `<p>${line}</p>`).join("")}</section>`).join("")}</body></html>`;
const REPORT = pagesHtml("section{height:100vh;page-break-after:always;padding:60px;box-sizing:border-box}");
const REPORT_PICTURE = pagesHtml("section{height:560px;padding:30px 50px;box-sizing:border-box;border-bottom:2px dashed #bbb}");
const note = (background: string, lines: string[]) => `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:${background};font-family:"KaiTi","STKaiti","AR PL UKai CN",serif}div{padding:50px 60px;font-size:34px;line-height:1.9;color:#2a2622}</style></head><body><div>${lines.join("<br>")}</div></body></html>`;
const NOTES: Array<[string, string]> = [
  ["note.png", note("#f4efe3", ["库房盘点记录（手写扫描）", "日期：十一月十二日", "青瓷花瓶　　十七件", "铜制香炉　　五件", "樟木箱子　　三只（其中一只锁坏）", "盘点人：许青禾"])],
  ["note2.png", note("#efe9da", ["出库单（手写扫描）", "日期：十一月十九日", "青瓷花瓶　　借出两件，送往苏州展览", "经手人：许青禾", "预计归还：十二月二十八日"])],
];
const SCAN = "<!doctype html><html><head><meta charset=\"utf-8\"><style>@page{margin:0}body{margin:0}img{display:block;width:100%;page-break-after:always}</style></head><body><img src=\"note.png\"><img src=\"note2.png\"></body></html>";
const SCAN_PICTURE = "<!doctype html><html><head><meta charset=\"utf-8\"><style>body{margin:0}img{display:block;width:900px}</style></head><body><img src=\"note.png\"><img src=\"note2.png\"></body></html>";

function browser(): string {
  const named = process.env.CAM_BROWSER?.trim();
  if (named) return named;
  const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  if (process.platform === "win32" && existsSync(edge)) return edge;
  for (const name of ["google-chrome", "chromium", "chromium-browser"]) if (spawnSync(name, ["--version"], { stdio: "ignore" }).status === 0) return name;
  throw new Error("no Chromium browser found: set CAM_BROWSER");
}

// Each file the folder does not have yet, from its page.
function makeDocuments(dir: string): void {
  mkdirSync(dir, { recursive: true });
  const make = (out: string, page: string, html: string, args: string[]) => {
    if (existsSync(join(dir, out))) return;
    writeFileSync(join(dir, page), html);
    spawnSync(browser(), ["--headless=new", "--disable-gpu", ...args, pathToFileURL(join(dir, page)).href], { stdio: "ignore", timeout: 120_000 });
    if (!existsSync(join(dir, out))) throw new Error(`the browser did not make ${out}`);
  };
  const pdf = (out: string) => ["--no-pdf-header-footer", `--print-to-pdf=${join(dir, out)}`];
  const picture = (out: string, height: number) => ["--hide-scrollbars", `--window-size=900,${height}`, `--screenshot=${join(dir, out)}`];
  make("report.pdf", "report.html", REPORT, pdf("report.pdf"));
  for (const [out, html] of NOTES) make(out, out.replace(".png", ".html"), html, picture(out, 700));
  make("scan.pdf", "scan.html", SCAN, pdf("scan.pdf"));
  make("report.png", "report-picture.html", REPORT_PICTURE, picture("report.png", 2240));
  make("scan.png", "scan-picture.html", SCAN_PICTURE, picture("scan.png", 1400));
}

type Json = Record<string, any>;
const MODELS: Record<string, string> = { sonnet: "claude-sonnet-5-5", haiku: "claude-haiku-5-5" };
const FETCH_TOOL = "mcp__plugin_codex-attachment-manager_codex_attachment_manager__cam_view_image";
const TURN_TIMEOUT = 6 * 60_000;
const RETRACTED = /更正|没有依据|不能采信|不要采信|不应当作|编造|没有真正看到|并没有返回|没有返回正文|只返回了|不可靠|没有核实|没有查看|没有看到/;
// What the answers must hold (the facts sit on the pages named). `--kind image` runs the same turns on pictures of the
// same pages (report.png, scan.png), under the images' own rules, for comparison.
const turnsFor = (ext: string): Array<{ say: string; expect?: RegExp[] }> => [
  { say: `读一下 report.${ext}，用一句话告诉我它讲的是什么。` },
  { say: "这份简报第 3 页写的开工日期和项目负责人是什么？", expect: [/2027/, /4\s*月\s*6|04-06|4\/6/, /沈知夏/] },
  { say: `再读一下 scan.${ext}，用一句话说它是什么。` },
  { say: "盘点记录里铜制香炉有几件？盘点人是谁？", expect: [/5|五/, /许青禾/] },
  { say: "好的，谢谢。" },
];

async function main(): Promise<void> {
  const option = (name: string, fallback: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
  const label = option("--label", "run1");
  const model = MODELS[option("--model", "haiku")] ?? MODELS.haiku;
  const effort = option("--effort", "low");
  const port = Number(option("--port", "17942"));
  const pdfs = option("--pdfs", join(repo, "local", "v13-pdf"));
  makeDocuments(pdfs);
  if (process.argv.includes("--documents-only")) { console.log(`documents in ${pdfs}`); return; }
  const ext = option("--kind", "pdf") === "image" ? "png" : "pdf";
  const TURNS = turnsFor(ext);
  const root = join(repo, "local", "v13");
  const runDir = join(root, `claude-pdf-${label}`);
  mkdirSync(runDir, { recursive: true });
  const work = join(tmpdir(), "cam-v13-pdf", label);
  mkdirSync(work, { recursive: true });
  for (const name of [`report.${ext}`, `scan.${ext}`]) {
    if (!existsSync(join(pdfs, name))) throw new Error(`${name} not found in ${pdfs}`);
    copyFileSync(join(pdfs, name), join(work, name));
  }
  const data = join(runDir, "data");
  const plugin = preparePlugin("v0.10", port, data, "zh");
  const engine = await startEngine(plugin, port, data, "zh");
  // This process may itself run inside Claude Code: none of its session's variables (its engine's URL included) go on.
  const env: NodeJS.ProcessEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(CLAUDE|ANTHROPIC)/i.test(name)));
  Object.assign(env, { CLAUDE_CONFIG_DIR: claudeConfigDir, CAM_AUTO_UPDATE: "0" });
  const args = ["-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--model", model, "--effort", effort, "--tools", "Read", "--allowedTools", "Read", FETCH_TOOL, "--plugin-dir", plugin];
  const session = new Session(args, env, work, join(runDir, "events.jsonl"));
  const result: Json = { createdAt: new Date().toISOString(), label, model, effort, turns: [] as Json[] };
  try {
    for (const turn of TURNS) {
      const sent = await session.send([{ type: "text", text: turn.say }], TURN_TIMEOUT);
      const calls = sent.events.filter((event) => event.type === "assistant").flatMap((event) => (event.message?.content ?? []).filter((block: Json) => block.type === "tool_use").map((block: Json) => ({ name: String(block.name).replace(/^mcp__.*__/, ""), input: block.input })));
      const reply = String(sent.result?.result ?? "");
      result.turns.push({ say: turn.say, error: sent.result?.is_error ?? (sent.result ? false : "no result"), calls, reply, answered: turn.expect ? turn.expect.every((pattern) => pattern.test(reply)) : null, usage: sent.result?.usage ?? null, costUsd: sent.result?.total_cost_usd ?? null });
    }
  } finally {
    await session.close();
    engine.kill();
  }
  // What the engine did with the session's requests (its log, the conversation's requests only).
  const logDir = join(data, "proxy");
  const entries: Json[] = existsSync(logDir) ? readdirSync(logDir).flatMap((name) => readFileSync(join(logDir, name), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line))) : [];
  const requests = entries.filter((entry) => entry.path === "/v1/messages" && entry.tools > 0);
  result.requests = requests.map((entry) => ({ status: entry.status, pdfs: entry.rewrite?.pdfs ?? null, replaced: (entry.rewrite?.replaced ?? []).map((image: Json) => image.id), copies: entry.rewrite?.copies ?? [], thinking: entry.rewrite?.thinking ?? null, fallback: entry.rewrite?.fallback ?? null }));
  result.kind = ext;
  const pdfReports = requests.map((entry) => entry.rewrite?.pdfs).filter(Boolean);
  const fetched = (id: string, page?: number) => pdfReports.some((pdf: Json) => (pdf.fetched ?? []).some((one: Json) => one.id === id && (page === undefined || one.pages === null || one.pages.includes(page))));
  result.checks = {
    allSent: requests.length > 0 && requests.every((entry) => entry.status === 200),
    reportLeftOut: pdfReports.some((pdf: Json) => (pdf.replaced ?? []).includes("PDF-001")),
    reportPageFetched: fetched("PDF-001", 3),
    reportCut: pdfReports.some((pdf: Json) => (pdf.fetched ?? []).some((one: Json) => one.id === "PDF-001" && Array.isArray(one.pages) && one.pages.length < 4)),
    reportAnswered: result.turns[1].answered,
    // Pages fetched stay in the later requests.
    reportPagesKept: !fetched("PDF-001") || pdfReports.filter((pdf: Json) => (pdf.fetched ?? []).some((one: Json) => one.id === "PDF-001")).length >= 2,
    scanLeftOut: pdfReports.some((pdf: Json) => (pdf.replaced ?? []).includes("PDF-002")),
    scanAnswered: result.turns[3].answered,
    // The page came back through the fetch tool, not by reading the whole file again.
    reportNotReread: !result.turns[1].calls.some((call: Json) => call.name === "Read" && /report\.pdf$/i.test(String(call.input?.file_path ?? ""))),
    // No earlier answer taken back for seeing a placeholder where the file was (Haiku 5.5 did, 2026-11-23, before the
    // full note).
    keptAnswers: result.turns.every((turn: Json) => !RETRACTED.test(String(turn.reply))),
  };
  result.costUsd = result.turns.at(-1)?.costUsd ?? null;
  writeFileSync(join(root, `claude-pdf-${label}.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ label, model, effort, checks: result.checks, turns: result.turns.map((turn: Json) => ({ calls: turn.calls, reply: String(turn.reply).slice(0, 160), error: turn.error })), requests: result.requests, costUsd: result.costUsd }, null, 2));
}

await main();
