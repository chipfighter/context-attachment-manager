// Purpose: eval — a long keyframe task in Claude Code, with and without the plugin. The scene, the
// questions and the scoring are in eval-long-scene.ts; the plugin copies, the engine and the eval's own Claude Code
// configuration in eval-long-setup.ts.
// One run: one arm (no plugin, v0.9.1, v0.10) with one model. Claude Code's command line runs as Claude Desktop
// runs it: one process per session, messages in and events out as JSON lines. Each turn says which images to look at
// (the model reads them with Read, as it looks at what a tool made) or sends sketches with the message. At two points
// the session is compacted (/compact, as a user types it; automatic compaction is off so every arm compacts at the same
// place) and questions follow; at the end the session is forked (--resume … --fork-session, a new session that carries
// the old one's history, as Claude Desktop does when an earlier message is edited) and a few more are asked there.
// Only Read and cam_view_image are allowed; the folder the model works in is outside this repository, so no CLAUDE.md
// of ours reaches it.
// Input: [--label name] [--runs arm/model,…] [--parallel 3] [--port 17931] [--effort low] [--stop-at 0.9]
// [--draw] [--quick];
// CAM_CLAUDE_BIN (default: claude on PATH). Output: local/eval-long/<label>/<run>.json and a console summary.
// Needs the eval's configuration signed in once (eval-long-setup.ts).

import { spawn, type ChildProcess } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { draw, scene, score, type Image, type Question, type Step } from "./eval-long-scene.ts";
import { claudeConfigDir, evalRoot, preparePlugin, startEngine, type Arm } from "./eval-long-setup.ts";

type Json = Record<string, any>;
const MODELS: Record<string, string> = { sonnet: "claude-sonnet-5-5", haiku: "claude-haiku-5-5" };
const FETCH_TOOL = "mcp__plugin_codex-attachment-manager_codex_attachment_manager__cam_view_image";
const TURN_TIMEOUT = 15 * 60_000;
const QUESTION_TIMEOUT = 6 * 60_000;
type Run = { arm: Arm; model: string; name: string };
// The account's usage as Claude Code last reported it (rate_limit_event): a run stops before its next step once the
// weekly share reaches --stop-at, so the eval never uses up the account it runs on.
// Near the end of the five-hour window it waits for the window to start again instead.
const quota = { fiveHour: null as number | null, weekly: null as number | null, fiveHourResets: null as number | null };
let stopAt = 0.9;
const overQuota = () => quota.weekly !== null && quota.weekly >= stopAt;
async function waitForWindow(note: (step: Json) => void, refused = false): Promise<void> {
  if (!refused && (quota.fiveHour === null || quota.fiveHour < 0.95)) return;
  const until = (quota.fiveHourResets ?? Date.now() / 1000 + 15 * 60) * 1000 + 60_000;
  note({ step: "paused", kind: "paused", reason: `five-hour usage ${quota.fiveHour}${refused ? ", a request refused" : ""}`, until: new Date(until).toISOString() });
  await sleep(Math.max(0, until - Date.now()));
  quota.fiveHour = 0;
}

// ---- Images ----

// Drawn once into a folder of their own, then copied into each run's working folder.
const imageDir = join(tmpdir(), "cam-eval-long", "images");
function drawImages(): Image[] {
  const { images } = scene();
  mkdirSync(imageDir, { recursive: true });
  for (const image of images) {
    const file = join(imageDir, "file" in image ? image.file : `${image.key}.png`);
    if (!existsSync(file)) writeFileSync(file, draw(image, images));
  }
  return images;
}

// ---- A Claude Code session ----

class Session {
  readonly child: ChildProcess;
  private buffer = "";
  readonly events: Json[] = [];
  sessionId: string | null = null;
  private waiting: ((event: Json) => void) | null = null;
  exited: number | null = null;
  private log: string;

  constructor(args: string[], env: NodeJS.ProcessEnv, cwd: string, log: string) {
    this.log = log;
    this.child = spawn(process.env.CAM_CLAUDE_BIN || "claude", args, { cwd, env, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    this.child.stdout!.setEncoding("utf8");
    this.child.stdout!.on("data", (chunk: string) => {
      this.buffer += chunk;
      for (let at = this.buffer.indexOf("\n"); at >= 0; at = this.buffer.indexOf("\n")) {
        const line = this.buffer.slice(0, at).trim();
        this.buffer = this.buffer.slice(at + 1);
        if (!line) continue;
        let event: Json;
        try { event = JSON.parse(line); } catch { appendFileSync(this.log, `?? ${line.slice(0, 500)}\n`); continue; }
        // Image data stays out of the log.
        appendFileSync(this.log, `${JSON.stringify(event, (key, value) => (key === "data" && typeof value === "string" && value.length > 200 ? `<${value.length} chars>` : value))}\n`);
        if (event.session_id) this.sessionId = event.session_id;
        const windows = event.type === "rate_limit_event" ? event.rate_limit_info?.unifiedWindows : null;
        if (windows) {
          quota.fiveHour = windows.five_hour?.utilization ?? quota.fiveHour;
          quota.fiveHourResets = windows.five_hour?.resetsAt ?? quota.fiveHourResets;
          quota.weekly = windows.seven_day?.utilization ?? quota.weekly;
        }
        this.events.push(event);
        if (event.type === "result" && this.waiting) { const done = this.waiting; this.waiting = null; done(event); }
      }
    });
    this.child.stderr!.setEncoding("utf8");
    this.child.stderr!.on("data", (chunk: string) => appendFileSync(this.log, `stderr ${chunk}`));
    this.child.on("exit", (code) => {
      this.exited = code ?? -1;
      if (this.waiting) { const done = this.waiting; this.waiting = null; done({ type: "exit", code }); }
    });
  }

  // One user message; resolves with the turn's events once Claude Code reports the turn's result.
  async send(content: Json[], timeoutMs: number): Promise<{ events: Json[]; result: Json | null; ms: number; timedOut: boolean }> {
    const from = this.events.length;
    const started = Date.now();
    if (this.exited !== null) return { events: [], result: null, ms: 0, timedOut: false };
    const done = new Promise<Json>((resolve) => { this.waiting = resolve; });
    this.child.stdin!.write(`${JSON.stringify({ type: "user", message: { role: "user", content } })}\n`);
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); });
    const result = await Promise.race([done, timeout]);
    clearTimeout(timer);
    if (result === null) this.waiting = null;
    return { events: this.events.slice(from), result: result?.type === "result" ? result : null, ms: Date.now() - started, timedOut: result === null };
  }

  async close(): Promise<void> {
    if (this.exited !== null) return;
    this.child.stdin!.end();
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => { this.child.kill(); resolve(); }, 30_000);
      this.child.on("exit", () => { clearTimeout(timer); resolve(); });
    });
  }
}

// ---- What a turn cost and did ----

const blocksOf = (event: Json): Json[] => (Array.isArray(event.message?.content) ? event.message.content : []);

function turnOf(events: Json[]): Json {
  // One API response can come as several assistant events (one per content block): count it once.
  const requests = new Map<string, Json>();
  const reads: string[] = [];
  const fetchCalls: string[][] = [];
  const fetchCallIds = new Set<string>();
  const fetched: string[] = [];
  let compacted = false;
  for (const event of events) {
    if (event.type === "system" && event.subtype === "compact_boundary") compacted = true;
    if (event.type === "assistant") {
      const usage = event.message?.usage;
      if (usage && event.message?.id) requests.set(event.message.id, { input: usage.input_tokens ?? 0, cacheRead: usage.cache_read_input_tokens ?? 0, cacheWrite: usage.cache_creation_input_tokens ?? 0, output: usage.output_tokens ?? 0 });
      for (const block of blocksOf(event)) {
        if (block.type !== "tool_use") continue;
        if (block.name === "Read") reads.push(String(block.input?.file_path ?? "").split(/[\\/]/).pop() ?? "");
        else if (String(block.name).endsWith("__cam_view_image")) { fetchCalls.push(([] as unknown[]).concat(block.input?.ids ?? block.input?.id ?? []).map(String)); fetchCallIds.add(block.id); }
      }
    }
    if (event.type === "user") {
      for (const block of blocksOf(event)) {
        if (block.type !== "tool_result" || !fetchCallIds.has(block.tool_use_id)) continue;
        const texts = (Array.isArray(block.content) ? block.content : [{ type: "text", text: String(block.content ?? "") }]).filter((part: Json) => part.type === "text").map((part: Json) => part.text);
        for (const text of texts) for (const match of text.matchAll(/[\w-]+\.png/g)) fetched.push(match[0]);
      }
    }
  }
  return { requests: [...requests.values()], reads, fetchCalls, fetched: [...new Set(fetched)], compacted };
}

// ---- One run ----

// quick (to check the harness): the first three turns, the first compaction, four questions about those turns' images,
// then the fork and one of them again.
const QUICK = ["M1", "M3", "Q2", "Q7"];
async function runOne(run: Run, label: string, port: number, effort: string, quick = false): Promise<Json> {
  const { arm, model } = run;
  const root = join(evalRoot, label);
  const runDir = join(root, run.name);
  mkdirSync(runDir, { recursive: true });
  const images = drawImages();
  const full = scene();
  const steps: Step[] = quick ? [...full.steps.filter((step) => step.type === "turn").slice(0, 3), { type: "compact", label: "mid" }, { type: "ask", block: "mid" }, { type: "ask", block: "fork" }] : full.steps;
  const picked = full.questions.filter((question) => QUICK.includes(question.key));
  const questions: Question[] = quick ? [...picked.map((question) => ({ ...question, block: "mid" as const })), { ...picked.at(-1)!, key: `K-${picked.at(-1)!.key}`, block: "fork" }] : full.questions;
  const work = join(tmpdir(), "cam-eval-long", label, run.name);
  mkdirSync(work, { recursive: true });
  for (const image of images) if ("file" in image) cpSync(join(imageDir, image.file), join(work, image.file));
  const upload = (key: string) => {
    const image = images.find((candidate) => candidate.key === key)!;
    return { type: "image", source: { type: "base64", media_type: "image/png", data: readFileSync(join(imageDir, "file" in image ? image.file : `${image.key}.png`)).toString("base64") } };
  };

  let engine: ChildProcess | null = null;
  let plugin: string | null = null;
  const data = join(runDir, "data");
  if (arm !== "off") {
    plugin = preparePlugin(arm, port, data);
    engine = await startEngine(plugin, port, data);
  }
  // This process may itself run inside Claude Code: none of its session's variables (its engine's URL included) go on.
  const env: NodeJS.ProcessEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(CLAUDE|ANTHROPIC)/i.test(name)));
  Object.assign(env, { CLAUDE_CONFIG_DIR: claudeConfigDir, DISABLE_AUTO_COMPACT: "1" });
  const args = (resume: string[] = []) => [
    "-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose",
    "--model", MODELS[model], "--effort", effort, "--tools", "Read", "--allowedTools", "Read", FETCH_TOOL,
    ...(plugin ? ["--plugin-dir", plugin] : []), ...resume,
  ];
  const result: Json = { run: run.name, arm, model: MODELS[model], effort, images: images.length, startedAt: new Date().toISOString(), steps: [] };
  let session = new Session(args(), env, work, join(runDir, "events-main.jsonl"));
  const record = (step: Json) => { result.steps.push(step); writeFileSync(join(root, `${run.name}.json`), JSON.stringify(result, null, 2)); };
  // An API error that is not the account's limit (the network, the upstream): the same step once more a minute later;
  // twice in a row ends the run, whose further steps would only fail too (2026-11-01: 36 steps of 502s).
  let broken = false;
  const sendStep = async (content: Json[], timeoutMs: number) => {
    const apiError = (sent: Awaited<ReturnType<Session["send"]>>) => !!sent.result?.is_error && /API Error/i.test(String(sent.result.result)) && !/limit/i.test(String(sent.result.result));
    let sent = await session.send(content, timeoutMs);
    if (apiError(sent)) { await sleep(60_000); sent = await session.send(content, timeoutMs); broken = apiError(sent); }
    return sent;
  };
  const ask = async (question: Question) => {
    const sent = await sendStep([{ type: "text", text: question.say }], QUESTION_TIMEOUT);
    const reply = sent.result?.result ?? "";
    record({ step: question.key, kind: "question", ms: sent.ms, timedOut: sent.timedOut, error: sent.result?.is_error ?? null, reply, ...score(question, reply), expected: question.answer, target: question.target, needsOriginal: question.needsOriginal, ...turnOf(sent.events) });
    return sent.result !== null && !broken;
  };

  result.quotaAtStart = { ...quota };
  try {
    let turnNo = 0;
    for (const step of steps) {
      if (overQuota()) { record({ step: "stopped", kind: "stopped", reason: `weekly usage ${quota.weekly} ≥ ${stopAt}` }); break; }
      await waitForWindow(record);
      if (step.type === "turn") {
        turnNo++;
        const content = [{ type: "text", text: step.say }, ...step.upload.map(upload)];
        let sent = await sendStep(content, TURN_TIMEOUT);
        // Refused for the account's limit: the same turn again once the window has started again.
        if (sent.result?.is_error && /limit/i.test(String(sent.result.result))) { await waitForWindow(record, true); sent = await session.send(content, TURN_TIMEOUT); }
        record({ step: `T${turnNo}`, kind: "turn", ms: sent.ms, timedOut: sent.timedOut, error: sent.result?.is_error ?? null, reply: sent.result?.result ?? "", ...turnOf(sent.events) });
        if (!sent.result || broken) break;
      } else if (step.type === "compact") {
        const sent = await sendStep([{ type: "text", text: "/compact" }], TURN_TIMEOUT);
        record({ step: `compact-${step.label}`, kind: "compact", ms: sent.ms, timedOut: sent.timedOut, error: sent.result?.is_error ?? null, ...turnOf(sent.events) });
        if (!sent.result || broken) break;
      } else if (step.block === "fork") {
        const from = session.sessionId;
        await session.close();
        if (!from) break;
        session = new Session(args(["--resume", from, "--fork-session"]), env, work, join(runDir, "events-fork.jsonl"));
        result.forkedFrom = from;
        for (const question of questions.filter((candidate) => candidate.block === "fork")) if (!(await ask(question))) break;
        result.forkSession = session.sessionId;
      } else {
        let alive = true;
        for (const question of questions.filter((candidate) => candidate.block === step.block)) if (!(alive = await ask(question))) break;
        if (!alive) break;
      }
      if (!result.session) result.session = session.sessionId;
    }
    if (broken) record({ step: "stopped", kind: "stopped", reason: "API errors twice in a row" });
  } finally {
    await session.close();
    engine?.kill();
  }
  result.finishedAt = new Date().toISOString();
  result.quotaAtEnd = { ...quota };
  if (arm !== "off") result.engine = engineRequests(data, [result.session, result.forkSession].filter(Boolean));
  writeFileSync(join(root, `${run.name}.json`), JSON.stringify(result, null, 2));
  return result;
}

// The main-loop requests as the engine logged them, and for those after a compaction, how long the list it put back
// was (from the request as sent, which stays in the local data folder).
function engineRequests(data: string, sessions: string[]): Json[] {
  const dir = join(data, "proxy");
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir).filter((name) => name.endsWith(".jsonl")).flatMap((name) => readFileSync(join(dir, name), "utf8").split("\n"))
    .flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } })
    .filter((entry) => entry.kind === "messages" && sessions.includes(entry.claudeSessionId) && entry.tools > 0);
  const dumps = join(data, "p2", "requests");
  return entries.map((entry) => {
    let list: Json | null = null;
    if (entry.rewrite?.compacted) {
      const sent = join(dumps, readdirSync(dumps).find((name) => name.endsWith(`-${entry.id}.sent.json`)) ?? "-");
      if (existsSync(sent)) {
        const dump = JSON.parse(readFileSync(sent, "utf8"));
        const body = typeof dump.body === "string" ? JSON.parse(dump.body) : dump.body ?? dump;
        const texts = (body.messages ?? []).flatMap((message: Json) => (Array.isArray(message.content) ? message.content : [])).filter((block: Json) => block.type === "text").map((block: Json) => String(block.text));
        const text = texts.find((candidate: string) => candidate.includes("压缩之前的图片")) ?? null;
        if (text) list = { chars: text.length, han: (text.match(/[一-鿿]/g) ?? []).length, lines: text.split("\n").length };
      }
    }
    return { at: entry.at, session: entry.claudeSessionId, status: entry.status, bytes: entry.decodedBytes, images: entry.images, sent: entry.rewrite ? entry.images - (entry.rewrite.replaced?.length ?? 0) : entry.images, compacted: entry.rewrite?.compacted ?? null, list };
  });
}

function summarize(result: Json): void {
  const questions = (result.steps as Json[]).filter((step) => step.kind === "question");
  const right = questions.filter((step) => step.verdict === "right").length;
  console.log(`\n== ${result.run} (${result.model}, ${result.effort}, ${result.images} images): ${right}/${questions.length} right`);
  console.table(questions.map((step) => ({ q: step.step, verdict: step.verdict, said: step.said, expected: step.expected, fetched: step.fetched.join(","), reads: step.reads.length, s: Math.round(step.ms / 1000) })));
}

async function main(): Promise<void> {
  const option = (name: string, fallback: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
  const label = option("--label", "run1");
  const effort = option("--effort", "low");
  const port = Number(option("--port", "17931"));
  const parallel = Number(option("--parallel", "3"));
  stopAt = Number(option("--stop-at", "0.9"));
  const defaults = ["off/haiku", "v0.9.1/haiku", "v0.10/haiku"];
  const runs: Run[] = option("--runs", defaults.join(",")).split(",").map((spec) => {
    const [arm, model] = spec.split("/");
    if (!["off", "v0.9.1", "v0.10"].includes(arm) || !MODELS[model]) throw new Error(`bad run ${spec}`);
    return { arm: arm as Arm, model, name: `${arm}-${model}` };
  });
  console.log(`${drawImages().length} images in ${imageDir}`);
  if (process.argv.includes("--draw")) return;
  // Each run its own engine; ports two apart (an engine also takes the next port for its routes).
  let next = 0;
  const worker = async () => {
    for (let at = next++; at < runs.length && !overQuota(); at = next++) {
      // A run that fails is reported; the others go on.
      try { summarize(await runOne(runs[at], label, port + at * 2, effort, process.argv.includes("--quick"))); }
      catch (error) { console.error(`\n== ${runs[at].name} failed: ${(error as Error).stack ?? error}`); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, runs.length) }, worker));
}

await main();
