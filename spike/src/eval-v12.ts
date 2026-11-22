// Purpose: eval — v0.12's eval (docs/v0.12/plan.md §6): the short film of eval-v12-scene.ts in Claude Code, without the
// plugin and with this checkout's, on Sonnet 5.5. Each arm runs the 16 turns in one session; whenever its context passes
// the threshold (from the API's usage), the session is compacted (/compact, as a user types it; Claude Code's own
// compaction is off, so the threshold decides), and once more after the last turn. Then the session is forked (--resume
// … --fork-session) as many times as asked, and each fork asks the same questions: what the pictures showed, what the
// user said about them, two about files on disk (the control), and one action (generate a new version from the final
// one: the reference passed to the tool decides).
// The account's usage is watched (Claude Code's rate_limit_event): a run stops before its next step once the weekly
// share has risen by --budget since it started (user 2026-11-22: an eval may use at most 20% of a week), or reached
// 90%; near the end of the five-hour window it waits for the next one.
// Input: [--label name] [--arms off,v0.12] [--model sonnet] [--effort medium] [--threshold 100000] [--forks 2]
// [--budget 0.15] [--port 17951] [--quick]; CAM_EVAL_CLAUDE_CONFIG (the signed-in configuration), CAM_CLAUDE_BIN.
// Output: local/eval-v12/<label>/<arm>.json and a console summary. Synthetic images only.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { Session } from "./claude-session.ts";
import { draw, score, visible } from "./eval-long-scene.ts";
import { claudeConfigDir, preparePlugin, repo, startEngine } from "./eval-long-setup.ts";
import { v12Scene, type V12Question } from "./eval-v12-scene.ts";

type Json = Record<string, any>;
const here = dirname(fileURLToPath(import.meta.url));
const MODELS: Record<string, string> = { sonnet: "claude-sonnet-5-5", haiku: "claude-haiku-5-5" };
const FETCH_TOOL = "mcp__plugin_codex-attachment-manager_codex_attachment_manager__cam_view_image";
const GEN_TOOL = "mcp__gen__generate_shot";
const TURN_TIMEOUT = 15 * 60_000;
const SCALE = 2;

const option = (name: string, fallback: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const label = option("--label", "run1");
const arms = option("--arms", "off,v0.12").split(",").filter((arm) => arm === "off" || arm === "v0.12");
const model = MODELS[option("--model", "sonnet")] ?? MODELS.sonnet;
const effort = option("--effort", "medium");
const threshold = Number(option("--threshold", "100000"));
const forks = Number(option("--forks", "2"));
const budget = Number(option("--budget", "0.15"));
const port = Number(option("--port", "17951"));
const quick = process.argv.includes("--quick");
const { images, turns, questions } = v12Scene(quick);

// ---- The account's usage ----
const quota = { weekly: null as number | null, start: null as number | null, fiveHour: null as number | null, fiveStart: null as number | null, resets: null as number | null };
function readQuota(events: Json[]): void {
  for (const event of events) {
    const windows = event.type === "rate_limit_event" ? event.rate_limit_info?.unifiedWindows : null;
    if (!windows) continue;
    quota.weekly = windows.seven_day?.utilization ?? quota.weekly;
    quota.fiveHour = windows.five_hour?.utilization ?? quota.fiveHour;
    quota.resets = windows.five_hour?.resetsAt ?? quota.resets;
    if (quota.start === null && quota.weekly !== null) quota.start = quota.weekly;
    if (quota.fiveStart === null && quota.fiveHour !== null) quota.fiveStart = quota.fiveHour;
  }
}
const overBudget = () => quota.weekly !== null && quota.start !== null && (quota.weekly - quota.start >= budget || quota.weekly >= 0.9);
async function waitForWindow(note: (entry: Json) => void): Promise<void> {
  if (quota.fiveHour === null || quota.fiveHour < 0.95) return;
  const until = (quota.resets ?? Date.now() / 1000 + 15 * 60) * 1000 + 60_000;
  note({ step: "paused", until: new Date(until).toISOString(), fiveHour: quota.fiveHour });
  await sleep(Math.max(0, until - Date.now()));
  quota.fiveHour = 0;
}

// ---- The images: drawn once, twice as large as eval-long's ----
const root = join(tmpdir(), "cam-eval-v12", `x${SCALE}`);
const genDir = join(root, "generated"), pastedDir = join(root, "pasted"), fileDir = join(root, "files");
function drawAll(): void {
  for (const dir of [genDir, pastedDir, fileDir]) mkdirSync(dir, { recursive: true });
  for (const image of images) {
    const name = "file" in image ? image.file : `${image.key}.png`;
    const target = join(image.source === "generated" ? genDir : image.source === "file" ? fileDir : pastedDir, name);
    if (!existsSync(target)) writeFileSync(target, draw(image, images, SCALE));
  }
  // The new version made from a reference (the action): a copy of that shot's last version.
  for (const [shot, last] of [[1, 2], [3, 3]]) {
    const extra = join(genDir, `extra_s0${shot}_v${last + 1}.png`);
    if (!existsSync(extra)) cpSync(join(genDir, `s0${shot}_v${last}.png`), extra);
  }
}
const pasted = (key: string) => ({ type: "image", source: { type: "base64", media_type: "image/png", data: readFileSync(join(pastedDir, `${key}.png`)).toString("base64") } });

// ---- What a turn did ----
function turnOf(events: Json[]): Json {
  const usage = new Map<string, Json>();
  const tools: Json[] = [];
  let compacted = false;
  for (const event of events) {
    if (event.type === "system" && event.subtype === "compact_boundary") compacted = true;
    if (event.type !== "assistant") continue;
    const u = event.message?.usage;
    if (u && event.message?.id) usage.set(event.message.id, { input: u.input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0, output: u.output_tokens ?? 0 });
    for (const block of event.message?.content ?? []) if (block.type === "tool_use") tools.push({ name: block.name, input: block.input });
  }
  const requests = [...usage.values()];
  const last = requests.at(-1);
  return {
    requests, compacted, context: last ? last.input + last.cacheRead + last.cacheWrite : null,
    reads: tools.filter((tool) => tool.name === "Read").length,
    generated: tools.filter((tool) => tool.name === GEN_TOOL).map((tool) => tool.input),
    fetched: tools.filter((tool) => tool.name === FETCH_TOOL).map((tool) => tool.input?.ids ?? tool.input?.id ?? null),
  };
}

async function runArm(arm: "off" | "v0.12"): Promise<Json> {
  const runDir = join(repo, "local", "eval-v12", label, arm);
  mkdirSync(runDir, { recursive: true });
  const work = join(tmpdir(), "cam-eval-v12", label, arm);
  mkdirSync(work, { recursive: true });
  for (const image of images) if (image.source === "file" && "file" in image) cpSync(join(fileDir, image.file), join(work, image.file));
  const data = join(runDir, "data");
  const plugin = arm === "v0.12" ? preparePlugin("v0.10", port, data, "zh") : null;
  const engine = plugin ? await startEngine(plugin, port, data, "zh") : null;
  const env: NodeJS.ProcessEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(CLAUDE|ANTHROPIC)/i.test(name)));
  Object.assign(env, { CLAUDE_CONFIG_DIR: claudeConfigDir, DISABLE_AUTO_COMPACT: "1" });
  const mcpFor = (name: string, done: boolean) => {
    const file = join(runDir, `mcp-${name}.json`);
    writeFileSync(file, JSON.stringify({ mcpServers: { gen: { command: process.execPath, args: [join(here, "eval-v12-gen-server.ts")], env: { CAM_GEN_DIR: genDir, CAM_GEN_LOG: join(runDir, `gen-${name}.jsonl`), ...(done ? { CAM_GEN_DONE: "1" } : {}) } } } }));
    return file;
  };
  const args = (mcp: string, more: string[] = []) => ["-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--model", model, "--effort", effort, "--tools", "Read", "--mcp-config", mcp, "--allowedTools", "Read", GEN_TOOL, FETCH_TOOL, ...(plugin ? ["--plugin-dir", plugin] : []), ...more];
  const result: Json = { arm, model, effort, threshold, scale: SCALE, quick, startedAt: new Date().toISOString(), turns: [], compactions: [], forks: [] };
  const save = () => writeFileSync(join(repo, "local", "eval-v12", label, `${arm}.json`), JSON.stringify(result, null, 2));
  const note = (entry: Json) => { result.notes = [...(result.notes ?? []), entry]; save(); };
  let session = new Session(args(mcpFor("main", false)), env, work, join(runDir, "events-main.jsonl"));
  let sessionId: string | null = null;
  const send = async (content: Json[]) => {
    await waitForWindow(note);
    const sent = await session.send(content, TURN_TIMEOUT);
    readQuota(sent.events);
    sessionId = sent.events.find((event) => event.session_id)?.session_id ?? sessionId;
    return sent;
  };
  const compact = async (why: string, before: number | null) => {
    const sent = await send([{ type: "text", text: "/compact" }]);
    result.compactions.push({ why, before, afterTurn: result.turns.length, ok: !sent.result?.is_error, costUsd: sent.result?.total_cost_usd ?? null, ...turnOf(sent.events) });
    save();
  };
  try {
    for (const [at, turn] of turns.entries()) {
      if (overBudget()) { note({ step: "stopped", reason: `weekly ${quota.weekly} from ${quota.start}` }); break; }
      const sent = await send([...turn.paste.map(pasted), { type: "text", text: turn.say }]);
      const done = turnOf(sent.events);
      result.turns.push({ turn: at + 1, error: sent.result?.is_error ?? (sent.result ? false : "no result"), reply: visible(String(sent.result?.result ?? "")).slice(0, 400), costUsd: sent.result?.total_cost_usd ?? null, ...done });
      save();
      if (done.context !== null && done.context > threshold && at < turns.length - 1) await compact("threshold", done.context);
    }
    if (!overBudget()) await compact("before the questions", result.turns.at(-1)?.context ?? null);
    await session.close();
    for (let fork = 1; fork <= forks && sessionId && !overBudget(); fork++) {
      session = new Session(args(mcpFor(`fork${fork}`, true), ["--resume", sessionId, "--fork-session"]), env, work, join(runDir, `events-fork${fork}.jsonl`));
      const answers: Json[] = [];
      for (const question of questions as V12Question[]) {
        if (overBudget()) { note({ step: "stopped", reason: `weekly ${quota.weekly} from ${quota.start}` }); break; }
        const sent = await send([{ type: "text", text: question.say }]);
        const reply = String(sent.result?.result ?? "");
        const done = turnOf(sent.events);
        let verdict: Json;
        if (question.kind === "action") {
          const references = done.generated.map((input: Json) => String(input?.reference ?? "")).filter(Boolean);
          verdict = { verdict: !references.length ? "none" : references.some((reference: string) => reference.includes(question.reference!)) && references.length === 1 ? "right" : "wrong", said: references.join(",") || null };
        } else verdict = score(question, reply);
        answers.push({ key: question.key, kind: question.kind, needsOriginal: question.needsOriginal, expected: question.answer || question.reference, ...verdict, reply: visible(reply).slice(0, 300), error: sent.result?.is_error ?? false, ...done });
        result.forks[fork - 1] = { fork, answers, costUsd: sent.result?.total_cost_usd ?? null };
        save();
      }
      await session.close();
    }
  } finally {
    await session.close();
    engine?.kill();
    result.quota = { ...quota };
    result.finishedAt = new Date().toISOString();
    save();
  }
  return result;
}

drawAll();
const results: Json[] = [];
for (const arm of arms as Array<"off" | "v0.12">) {
  if (overBudget()) break;
  results.push(await runArm(arm));
}
// A first look; eval-v12-summary.ts writes the report.
console.log(JSON.stringify(results.map((r) => {
  const answers = (r.forks ?? []).flatMap((fork: Json) => fork.answers ?? []);
  const right = (kind: string) => `${answers.filter((a: Json) => a.kind === kind && a.verdict === "right").length}/${answers.filter((a: Json) => a.kind === kind).length}`;
  const requests = [...r.turns.flatMap((turn: Json) => turn.requests)];
  const input = requests.reduce((sum: number, u: Json) => sum + u.input + u.cacheRead + u.cacheWrite, 0);
  return {
    arm: r.arm, compactions: r.compactions.map((c: Json) => `${c.why}@${c.afterTurn}:${c.before}`), conversation: right("conversation"), file: right("file"), action: right("action"),
    largest: Math.max(0, ...requests.map((u: Json) => u.input + u.cacheRead + u.cacheWrite)), cacheShare: input ? Math.round((requests.reduce((sum: number, u: Json) => sum + u.cacheRead, 0) / input) * 1000) / 10 : null,
    costUsd: r.forks?.at(-1)?.costUsd ?? r.turns.at(-1)?.costUsd ?? null, quota: r.quota,
  };
}), null, 2));
