// Purpose: eval — sums up the runs of eval-long.ts for the report (kept in local/eval-long/report until it goes into
// eval/): per run, how many questions were answered right before and after the compactions and in the fork, how the
// detail questions were answered (an original fetched, the file read again, or what the model had noted), the
// feature lines it wrote, and what the session cost. The summary keeps the replies (synthetic content) without
// session ids or local paths.
// Answers are scored again here with the scene's current rules (eval-long-scene.ts, strict: one answer, the right
// one), so older runs count the same way; replies that take an earlier answer back are listed for a look by hand.
// Tokens and cost are Claude Code's own totals for the session (the last result's modelUsage and total_cost_usd,
// running totals a fork carries on; compactions included). Per request, from the stream's first event, only the input
// side is final: what was read from the cache and written to it, for the requests that read only the system prompt.
// Input: --label name [--out <dir>]. Output: a console summary; with --out, <dir>/summary.json.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { scene, score } from "./eval-long-scene.ts";
import { evalRoot } from "./eval-long-setup.ts";

type Json = Record<string, any>;
const option = (name: string, fallback: string | null) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const label = option("--label", "run1")!;
const out = option("--out", null);
const dir = join(evalRoot, label);
const questionsByKey = new Map(scene().questions.map((question) => [question.key, question]));
// A run is its file: a run done again keeps the earlier one under another name (v0.10-haiku.before-wording.json).
const runs: Json[] = readdirSync(dir).filter((name) => name.endsWith(".json")).map((name) => ({ ...JSON.parse(readFileSync(join(dir, name), "utf8")), file: name.replace(/\.json$/, "") }));

// The session's last result event: the fork's when there is one.
function lastResult(run: Json): Json | null {
  const last = (file: string) => {
    if (!existsSync(file)) return null;
    const results = readFileSync(file, "utf8").split("\n").flatMap((line) => { try { const event = JSON.parse(line); return event.type === "result" ? [event] : []; } catch { return []; } });
    return results.at(-1) ?? null;
  };
  return last(join(dir, run.file, "events-fork.jsonl")) ?? last(join(dir, run.file, "events-main.jsonl"));
}
function sessionTotals(run: Json): Json | null {
  const result = lastResult(run);
  if (!result) return null;
  const sum = (field: string) => Object.values(result.modelUsage ?? {}).reduce((total: number, usage: any) => total + (usage?.[field] ?? 0), 0);
  const input = sum("inputTokens"), cacheRead = sum("cacheReadInputTokens"), cacheWrite = sum("cacheCreationInputTokens");
  return { input, cacheRead, cacheWrite, output: sum("outputTokens"), fromCache: Math.round((cacheRead / (input + cacheRead + cacheWrite)) * 1000) / 10, costUsd: Math.round((result.total_cost_usd ?? 0) * 10000) / 10000 };
}

// Tokens a request carried: new input, read from the cache, written to the cache.
const context = (request: Json | undefined) => (request ? request.input + request.cacheRead + request.cacheWrite : null);
// Calibrated on Claude's own output (docs/v0.10/plan.md, gate 6): a Han character ~1.3 tokens, any other ~0.45.
const listTokens = (list: Json | null) => (list ? Math.round(list.han * 1.3 + (list.chars - list.han) * 0.45) : null);
const strip = (text: string) => text.replace(/[A-Za-z]:\\[^\s"'）)]*|\/(?:Users|home|tmp)\/[^\s"'）)]*/g, "<path>");
const visible = (reply: string) => reply.replace(/\[\/\/\]:[ \t]*#[ \t]*\(cam[^)\n]*\)/g, "").trim();
// A reply that takes back something said before.
const TAKES_BACK = /更正|撤回|不可靠|收回|之前.{0,12}(?:错|不对)|I was wrong|retract|correction/i;

function summarize(run: Json): Json {
  const steps: Json[] = run.steps;
  const questions = steps.filter((step) => step.kind === "question").map((step) => {
    const question = questionsByKey.get(step.step.replace(/^K-/, ""));
    return question ? { ...step, ...score(question, String(step.reply ?? "")) } : step;
  });
  const block = (prefix: string) => {
    const mine = questions.filter((step) => step.step.startsWith(prefix));
    const count = (verdict: string) => mine.filter((step) => step.verdict === verdict).length;
    return { asked: mine.length, right: count("right"), wrong: count("wrong"), ambiguous: count("ambiguous"), none: count("none") };
  };
  const turns = steps.filter((step) => step.kind === "turn");
  const requests = steps.flatMap((step) => (step.requests as Json[]) ?? []);
  // The first request after each compaction: the next step's first.
  const afterCompaction = steps.flatMap((step, at) => (step.kind === "compact" ? [{ compaction: step.step, tokens: context(steps[at + 1]?.requests?.[0]) }] : []));
  // Lists the engine put back, in order: the first after each compaction.
  const lists = ((run.engine as Json[] | undefined) ?? []).filter((entry) => entry.list);
  const firstLists: Json[] = [];
  for (const entry of lists) if (!firstLists.some((seen) => seen.compacted.listed === entry.compacted.listed && seen.session === entry.session)) firstLists.push(entry);
  const featureLines = new Set(turns.flatMap((step) => [...String(step.reply).matchAll(/\[\/\/\]:\s*#\s*\(cam (IMG-\d+)/g)].map((match) => match[1])));
  // How a question whose answer is in the original only was answered: the original fetched, the file read again
  // (Read), or neither: from what the model had written before (a feature line, its reply).
  const howAnswered = (step: Json) => {
    if (!step.needsOriginal) return null;
    const file = step.target ? `${step.target}.png` : null;
    if (file && step.fetched?.includes(file)) return "fetched";
    if (file && step.reads?.some((read: string) => read === file)) return "read again";
    return "from notes";
  };
  return {
    run: run.file, arm: run.arm, model: run.model, effort: run.effort, images: run.images, startedAt: run.startedAt, finishedAt: run.finishedAt,
    turnsDone: turns.length, turnsFailed: turns.filter((step) => step.timedOut || step.error).length,
    questions: { mid: block("M"), end: block("Q"), fork: block("K"), all: block("") },
    fetches: { calls: questions.reduce((sum, step) => sum + step.fetchCalls.length, 0), images: questions.reduce((sum, step) => sum + step.fetched.length, 0), reads: questions.reduce((sum, step) => sum + step.reads.length, 0) },
    featureLines: featureLines.size,
    session: sessionTotals(run),
    requests: { count: requests.length, onlySystem: requests.filter((request) => request.cacheRead <= 4300 && (context(request) ?? 0) > 8000).length, largest: Math.max(0, ...requests.map((request) => context(request) ?? 0)) },
    // Images the model read in each turn (a turn that names files and reads none did not look at them).
    turnReads: turns.map((step) => step.reads.length),
    afterCompaction: afterCompaction.map((item, at) => {
      const list = firstLists[at] ?? null;
      const tokens = listTokens(list?.list ?? null);
      return { ...item, listed: list?.compacted?.listed ?? null, listTokens: tokens, listShare: tokens && item.tokens ? Math.round((tokens / item.tokens) * 1000) / 10 : null };
    }),
    takesBack: questions.filter((step) => TAKES_BACK.test(visible(String(step.reply ?? "")))).map((step) => step.step),
    answers: questions.map((step) => ({ q: step.step, verdict: step.verdict, said: step.said, expected: step.expected, needsOriginal: step.needsOriginal, how: howAnswered(step), fetched: step.fetched, reads: step.reads.length, seconds: Math.round(step.ms / 1000), reply: strip(String(step.reply)).slice(0, 600) })),
  };
}

const summary = runs.map(summarize).sort((a, b) => a.run.localeCompare(b.run));
for (const run of summary) {
  console.log(`\n== ${run.run}: ${run.images} images, ${run.turnsDone} turns (${run.turnsFailed} failed), ${run.featureLines} feature lines; takes back in ${run.takesBack.join(",") || "none"}`);
  console.table({ mid: run.questions.mid, end: run.questions.end, fork: run.questions.fork, all: run.questions.all });
  console.log("session", run.session, "requests", run.requests, "fetches", run.fetches);
  console.table(run.afterCompaction);
  console.table(run.answers.map(({ reply, ...rest }: Json) => ({ ...rest, fetched: rest.fetched.join(",") })));
}
if (out) {
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(`\nwrote ${join(out, "summary.json")}`);
}
