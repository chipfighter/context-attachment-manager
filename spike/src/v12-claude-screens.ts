// Purpose: v0.12 gate 2 on Claude (docs/v0.12/plan.md §5): within one turn of computer use, the older screenshots
// become placeholders in batches (core/session.ts inTurnOut). Does Anthropic accept every request, how much thinking
// does the engine leave out, does the cache keep reading, and does the model still finish the task?
// Claude Code's command line with a copy of this checkout's plugin, its own engine and the eval's configuration
// (eval-long-setup.ts), and v12-screen-server.ts as an MCP server: turn 1 pages through a 25-page wizard with next_page
// (a screenshot per call) and asks which page had the red warning box (page 9, a placeholder by the end); turn 2 asks
// how far page 3's progress bar was (an earlier turn's image: fetch it, or answer from what was noted).
// Input: [--label name] [--lang zh|en] [--model sonnet|haiku] [--effort medium] [--port 17945]; CAM_EVAL_CLAUDE_CONFIG,
// CAM_CLAUDE_BIN. Output: local/v12/claude-screens-<label>.json and a console summary. Synthetic images only.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Session } from "./claude-session.ts";
import { claudeConfigDir, preparePlugin, repo, startEngine } from "./eval-long-setup.ts";

type Json = Record<string, any>;
const here = dirname(fileURLToPath(import.meta.url));
const MODELS: Record<string, string> = { sonnet: "claude-sonnet-5-5", haiku: "claude-haiku-5-5" };
const FETCH_TOOL = "mcp__plugin_codex-attachment-manager_codex_attachment_manager__cam_view_image";
const PAGE_TOOL = "mcp__screens__next_page";
const TURN_TIMEOUT = 15 * 60_000;
const SCRIPT = {
  zh: {
    pages: "设置向导一共 25 页。用 next_page 工具一页一页往下翻，每次调用会显示下一页的截图，一页都不要跳，也不要一次调用好几个。翻完 25 页以后，告诉我哪一页上有红色的警告框。",
    third: "第 3 页底部的蓝色进度条走到哪了？大概占整条的几分之几？",
  },
  en: {
    pages: "The setup wizard has 25 pages. Go through them one at a time with the next_page tool: each call shows a screenshot of the next page. Do not skip any, and call it once at a time. After all 25 pages, tell me which page had the red warning box.",
    third: "On page 3, how far did the blue progress bar at the bottom go? About what fraction of the whole bar?",
  },
};

async function main(): Promise<void> {
  const option = (name: string, fallback: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
  const label = option("--label", "run1");
  const lang = option("--lang", "zh") === "en" ? "en" : "zh";
  const model = MODELS[option("--model", "sonnet")] ?? MODELS.sonnet;
  const effort = option("--effort", "medium");
  const port = Number(option("--port", "17945"));
  const words = SCRIPT[lang];
  const runDir = join(repo, "local", "v12", `claude-screens-${label}`);
  mkdirSync(runDir, { recursive: true });
  const work = join(tmpdir(), "cam-v12-screens", label);
  mkdirSync(work, { recursive: true });
  const data = join(runDir, "data");
  const plugin = preparePlugin("v0.10", port, data, lang);
  const engine = await startEngine(plugin, port, data, lang);
  const mcp = join(runDir, "mcp.json");
  writeFileSync(mcp, JSON.stringify({ mcpServers: { screens: { command: process.execPath, args: [join(here, "v12-screen-server.ts")] } } }));
  const env: NodeJS.ProcessEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(CLAUDE|ANTHROPIC)/i.test(name)));
  Object.assign(env, { CLAUDE_CONFIG_DIR: claudeConfigDir });
  const args = ["-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--model", model, "--effort", effort, "--tools", "Read", "--mcp-config", mcp, "--allowedTools", "Read", PAGE_TOOL, FETCH_TOOL, "--plugin-dir", plugin];
  const session = new Session(args, env, work, join(runDir, "events.jsonl"));
  const result: Json = { createdAt: new Date().toISOString(), label, lang, model, effort, turns: [] as Json[] };
  try {
    for (const say of [words.pages, words.third]) {
      const sent = await session.send([{ type: "text", text: say }], TURN_TIMEOUT);
      const tools = sent.events.filter((event) => event.type === "assistant").flatMap((event) => (event.message?.content ?? []).filter((block: Json) => block.type === "tool_use").map((block: Json) => String(block.name)));
      // One API response can come as several assistant events (one per content block): count it once.
      const usage = new Map<string, Json>();
      for (const event of sent.events) if (event.type === "assistant" && event.message?.id && event.message?.usage) usage.set(event.message.id, event.message.usage);
      result.turns.push({
        say, error: sent.result?.is_error ?? (sent.result ? false : "no result"), reply: String(sent.result?.result ?? ""),
        pageCalls: tools.filter((name) => name === PAGE_TOOL).length, fetchCalls: tools.filter((name) => name === FETCH_TOOL).length,
        requests: [...usage.values()].map((u) => ({ input: u.input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0, output: u.output_tokens ?? 0 })),
        costUsd: sent.result?.total_cost_usd ?? null,
      });
    }
  } finally {
    await session.close();
    engine.kill();
  }
  // What the engine did to each request (its log): the status, how many images went out and were left out, the thinking
  // it had to leave out, and where the cache marks went.
  const logDir = join(data, "proxy");
  const logged = existsSync(logDir) ? readdirSync(logDir).filter((name) => name.endsWith(".jsonl")).flatMap((name) => readFileSync(join(logDir, name), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line))).filter((entry) => entry.path === "/v1/messages") : [];
  result.engine = logged.map((entry) => ({ status: entry.status, images: entry.rewrite?.images ?? 0, replaced: (entry.rewrite?.replaced ?? []).length, thinking: entry.rewrite?.thinking ?? null, retry: entry.rewrite?.retry ?? null, fallback: entry.rewrite?.fallback ?? null, marks: entry.rewrite?.cacheMarks ?? null }));
  const first = result.turns[0] ?? {};
  const requests: Json[] = first.requests ?? [];
  result.checks = {
    allAccepted: result.engine.every((entry: Json) => entry.status >= 200 && entry.status < 300),
    noFallback: result.engine.every((entry: Json) => !entry.fallback),
    pagedThrough: first.pageCalls === 25,
    foundWarning: /(?:第\s*9\s*页|page\s*9\b|\b9\b)/i.test(first.reply ?? ""),
    // At most KEEP_IN_TURN + BATCH_IN_TURN - 1 screenshots of the turn went out as originals at a time.
    originalsCapped: result.engine.every((entry: Json) => entry.images - entry.replaced <= 14 + 1),
    secondTurnOk: !(result.turns[1]?.error),
  };
  result.thinkingLeftOut = result.engine.reduce((sum: number, entry: Json) => sum + (entry.thinking?.left ?? 0), 0);
  // Requests of turn 1 that read little from the cache (less than half their input), after the first two.
  result.cacheMisses = requests.slice(2).filter((u) => u.cacheRead < (u.input + u.cacheRead + u.cacheWrite) / 2).length;
  result.costUsd = result.turns.at(-1)?.costUsd ?? null;
  writeFileSync(join(repo, "local", "v12", `claude-screens-${label}.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ label, model, effort, checks: result.checks, thinkingLeftOut: result.thinkingLeftOut, cacheMisses: result.cacheMisses, costUsd: result.costUsd,
    turns: result.turns.map((turn: Json) => ({ pageCalls: turn.pageCalls, fetchCalls: turn.fetchCalls, reply: turn.reply.slice(0, 240) })),
    perRequest: result.engine.map((entry: Json) => `${entry.status}:${entry.images}/${entry.replaced}${entry.thinking ? `/t${entry.thinking.left}` : ""}`).join(" ") }, null, 2));
}

await main();
