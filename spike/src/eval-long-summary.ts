// Purpose: eval — sums up the runs of eval-long.ts for the report (kept in local/eval-long/report until it goes into
// eval/): per run, how many questions were answered right before and after the compactions and in the fork, how many
// images the model fetched or read again, the feature lines it wrote, and what the requests cost. The summary keeps
// the replies (synthetic content) without session ids or local paths.
// Input: --label name [--out <dir>]. Output: a console summary; with --out, <dir>/summary.json.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { evalRoot } from "./eval-long-setup.ts";

type Json = Record<string, any>;
const option = (name: string, fallback: string | null) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const label = option("--label", "run1")!;
const out = option("--out", null);
const dir = join(evalRoot, label);
// A run is its file: a run done again keeps the earlier one under another name (v0.10-haiku.before-wording.json).
const runs: Json[] = readdirSync(dir).filter((name) => name.endsWith(".json")).map((name) => ({ ...JSON.parse(readFileSync(join(dir, name), "utf8")), file: name.replace(/\.json$/, "") }));
// What Claude Code reports a session cost at API prices (total_cost_usd, a running total that a fork carries on).
function costOf(run: Json): number | null {
  const last = (file: string) => {
    if (!existsSync(file)) return null;
    const totals = readFileSync(file, "utf8").split("\n").flatMap((line) => { try { const event = JSON.parse(line); return event.type === "result" && typeof event.total_cost_usd === "number" ? [event.total_cost_usd] : []; } catch { return []; } });
    return totals.at(-1) ?? null;
  };
  const total = last(join(dir, run.file, "events-fork.jsonl")) ?? last(join(dir, run.file, "events-main.jsonl"));
  return total === null ? null : Math.round(total * 10000) / 10000;
}

// Tokens a request carried: new input, read from the cache, written to the cache.
const context = (request: Json | undefined) => (request ? request.input + request.cacheRead + request.cacheWrite : null);
// Calibrated on Claude's own output (docs/v0.10/plan.md, gate 6): a Han character ~1.3 tokens, any other ~0.45.
const listTokens = (list: Json | null) => (list ? Math.round(list.han * 1.3 + (list.chars - list.han) * 0.45) : null);
const strip = (text: string) => text.replace(/[A-Za-z]:\\[^\s"'）)]*|\/(?:Users|home|tmp)\/[^\s"'）)]*/g, "<path>");

function summarize(run: Json): Json {
  const steps: Json[] = run.steps;
  const questions = steps.filter((step) => step.kind === "question");
  const block = (prefix: string) => {
    const mine = questions.filter((step) => step.step.startsWith(prefix));
    return { asked: mine.length, right: mine.filter((step) => step.verdict === "right").length, wrong: mine.filter((step) => step.verdict === "wrong").length, none: mine.filter((step) => step.verdict === "none").length };
  };
  const turns = steps.filter((step) => step.kind === "turn");
  const requests = steps.flatMap((step) => step.requests as Json[]);
  // The first request after each compaction: the next step's first.
  const afterCompaction = steps.flatMap((step, at) => (step.kind === "compact" ? [{ compaction: step.step, tokens: context(steps[at + 1]?.requests?.[0]) }] : []));
  // Lists the engine put back, in order: the first after each compaction.
  const lists = ((run.engine as Json[] | undefined) ?? []).filter((entry) => entry.list);
  const firstLists: Json[] = [];
  for (const entry of lists) if (!firstLists.some((seen) => seen.compacted.listed === entry.compacted.listed && seen.session === entry.session)) firstLists.push(entry);
  const featureLines = new Set(turns.flatMap((step) => [...String(step.reply).matchAll(/\[\/\/\]:\s*#\s*\(cam (IMG-\d+)/g)].map((match) => match[1])));
  return {
    run: run.file, arm: run.arm, model: run.model, effort: run.effort, images: run.images, startedAt: run.startedAt, finishedAt: run.finishedAt,
    turnsDone: turns.length, turnsFailed: turns.filter((step) => step.timedOut || step.error).length,
    questions: { mid: block("M"), end: block("Q"), fork: block("K"), all: block("") },
    fetches: { calls: questions.reduce((sum, step) => sum + step.fetchCalls.length, 0), images: questions.reduce((sum, step) => sum + step.fetched.length, 0), reads: questions.reduce((sum, step) => sum + step.reads.length, 0) },
    featureLines: featureLines.size, costUsd: costOf(run),
    // Images the model read in each turn (a turn that names files and reads none did not look at them).
    turnReads: turns.map((step) => step.reads.length),
    tokens: { requests: requests.length, input: requests.reduce((sum, r) => sum + r.input, 0), cacheRead: requests.reduce((sum, r) => sum + r.cacheRead, 0), cacheWrite: requests.reduce((sum, r) => sum + r.cacheWrite, 0), output: requests.reduce((sum, r) => sum + r.output, 0), largest: Math.max(0, ...requests.map((r) => context(r) ?? 0)) },
    afterCompaction: afterCompaction.map((item, at) => {
      const list = firstLists[at] ?? null;
      const tokens = listTokens(list?.list ?? null);
      return { ...item, listed: list?.compacted?.listed ?? null, listTokens: tokens, listShare: tokens && item.tokens ? Math.round((tokens / item.tokens) * 1000) / 10 : null };
    }),
    answers: questions.map((step) => ({ q: step.step, verdict: step.verdict, said: step.said, expected: step.expected, needsOriginal: step.needsOriginal, fetched: step.fetched, reads: step.reads.length, seconds: Math.round(step.ms / 1000), reply: strip(String(step.reply)).slice(0, 600) })),
  };
}

const summary = runs.map(summarize).sort((a, b) => a.run.localeCompare(b.run));
for (const run of summary) {
  console.log(`\n== ${run.run}: ${run.images} images, ${run.turnsDone} turns (${run.turnsFailed} failed), ${run.featureLines} feature lines`);
  console.table({ mid: run.questions.mid, end: run.questions.end, fork: run.questions.fork, all: run.questions.all });
  console.log("fetches", run.fetches, "tokens", run.tokens);
  console.table(run.afterCompaction);
  console.table(run.answers.map(({ reply, ...rest }: Json) => ({ ...rest, fetched: rest.fetched.join(",") })));
}
if (out) {
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(`\nwrote ${join(out, "summary.json")}`);
}
