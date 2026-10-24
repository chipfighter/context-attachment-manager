// Purpose: eval — sum up runs of eval-keyframes.ts for eval/README.md: accuracy before and after a compaction per arm,
// what was fetched, what could not be sent, tokens; a compact copy of each run; a chart of request sizes per step.
// Input: --runs label,label,… (local/eval/<label>/<arm>.json) --out <folder> [--chart-run label].
// Output: <folder>/runs/<label>-<arm>.json, <folder>/summary.json, <folder>/request-size-{en,zh}.svg, and the tables in
// Markdown on the console.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { codexHome } from "../../plugin/src/codexconfig.ts";
import { loadThreadIndex } from "../../plugin/src/thread-index.ts";

type Json = Record<string, any>;
const localRoot = join(resolve(dirname(fileURLToPath(import.meta.url)), "../.."), "local");
const ARMS = ["off", "on", "v07"] as const;
const MB = (bytes: number | null | undefined) => (typeof bytes === "number" ? Math.round(bytes / 10_000) / 100 : null);
const visible = (reply: string) => String(reply ?? "").replace(/\[\/\/\]:[ \t]*#[ \t]*\(cam[^)\n]*\)/g, "").trim();

// The largest request of a step: as Codex built it (full) and as it went out (sent), both uncompressed JSON.
const sizes = (step: Json) => {
  const requests: Json[] = step.requests ?? [];
  const full = Math.max(0, ...requests.map((r) => r.before ?? r.decoded ?? 0)) || null;
  const sent = Math.max(0, ...requests.map((r) => r.after ?? r.decoded ?? 0)) || null;
  return { full, sent };
};

// What a run keeps for readers: no thread ids, replies without the record lines.
function compact(run: Json): Json {
  const threads: Json = {};
  for (const [name, thread] of Object.entries(run.threads as Record<string, Json>)) {
    threads[name] = (thread.steps as Json[]).map((step) => ({
      step: step.name, status: step.status, seconds: Math.round((step.ms ?? 0) / 1000),
      ...(step.question ? { question: step.question, expected: step.expected, said: step.said, verdict: step.verdict } : {}),
      reply: visible(step.reply ?? "").slice(0, 300) || undefined,
      fetched: step.fetched?.length ? step.fetched : undefined,
      tokens: step.usage ? { total: step.usage.total, last: step.usage.last } : undefined,
      // After a 200, "client closed before the response ended" is Codex closing once it has what it needs.
      requestMB: (step.requests ?? []).map((r: Json) => ({ status: r.status, fullMB: MB(r.before ?? r.decoded), sentMB: MB(r.after ?? r.decoded), sentWireMB: MB(r.wireAfter ?? r.wire), error: r.status === 200 ? undefined : r.error ?? undefined })),
      reconnects: step.retries?.length ? step.retries.map((r: Json) => r.message) : undefined,
    }));
  }
  return { arm: run.arm, model: run.model, effort: run.effort, createdAt: run.createdAt, threads };
}

type Tally = { right: number; wrong: number; none: number; unsent: number; fetchedImages: number; asked: number };
const tally = (): Tally => ({ right: 0, wrong: 0, none: 0, unsent: 0, fetchedImages: 0, asked: 0 });

function main(): void {
  const option = (name: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);
  const labels = (option("--runs") ?? "").split(",").filter(Boolean);
  const out = resolve(option("--out") ?? "eval/results");
  if (!labels.length) throw new Error("usage: eval-summary.ts --runs a,b,c --out <folder> [--chart-run a]");
  mkdirSync(join(out, "runs"), { recursive: true });

  // Per arm: find questions before the compaction (thread X, F6 after a restart) and after it (thread Y); details; the
  // question that needs no image; steps that could not be sent; tokens of thread X up to N1 (the same steps everywhere).
  const sum: Json = {};
  for (const arm of ARMS) sum[arm] = { before: tally(), after: tally(), detail: tally(), none: tally(), unsent: [] as string[], tokens: [] as Json[] };
  for (const label of labels) {
    for (const arm of ARMS) {
      const file = join(localRoot, "eval", label, `${arm}.json`);
      if (!existsSync(file)) continue;
      const run = JSON.parse(readFileSync(file, "utf8"));
      // What each step fetched, from the task's own record (archived tasks are read too): early runs counted it for
      // one arm only.
      if (arm !== "off") for (const thread of Object.values(run.threads as Record<string, Json>)) {
        const index = loadThreadIndex(join(codexHome(), "sessions"), thread.threadId);
        const names = new Map(index.images.map((image) => [image.id, image.name]));
        for (const step of thread.steps as Json[]) {
          const number = step.turnId ? index.turnNumbers.get(step.turnId) ?? null : null;
          step.fetched = [...new Set([...index.copies.values()].filter((copy) => copy.turn === number).map((copy) => names.get(copy.of) ?? copy.of))];
        }
      }
      writeFileSync(join(out, "runs", `${label}-${arm}.json`), JSON.stringify(compact(run), null, 2));
      for (const [name, thread] of Object.entries(run.threads as Record<string, Json>)) {
        const steps: Json[] = thread.steps;
        const compacted = steps.some((step) => step.name === "compact");
        for (const step of steps) {
          if (step.status !== "completed" && step.name !== "compact") sum[arm].unsent.push(`${label} ${name} ${step.name}`);
          if (!step.kind) continue;
          const bucket: Tally = step.kind === "find" ? sum[arm][compacted ? "after" : "before"] : step.kind === "detail" ? sum[arm].detail : sum[arm].none;
          bucket.asked++;
          if (step.status !== "completed") { bucket.unsent++; continue; }
          bucket[step.verdict as "right" | "wrong" | "none"]++;
          bucket.fetchedImages += step.fetched?.length ?? 0;
        }
        if (name === "X") {
          const n1 = steps.findIndex((step) => step.name === "N1");
          const upTo = n1 >= 0 ? steps.slice(0, n1 + 1) : [];
          const last = upTo.filter((step) => step.usage).at(-1)?.usage;
          if (last) sum[arm].tokens.push({ run: label, input: last.total.inputTokens, cached: last.total.cachedInputTokens, output: last.total.outputTokens, lastContext: last.last.inputTokens });
        }
      }
    }
  }
  writeFileSync(join(out, "summary.json"), JSON.stringify({ runs: labels, arms: sum }, null, 2));

  const cell = (t: Tally) => (t.asked ? `${t.right}/${t.asked}` + (t.wrong ? `, ${t.wrong} wrong` : "") + (t.none ? `, ${t.none} no answer` : "") + (t.unsent ? `, ${t.unsent} not sent` : "") : "–");
  console.log("| arm | find before compaction | find after compaction | detail | no image needed |\n|---|---|---|---|---|");
  for (const arm of ARMS) console.log(`| ${arm} | ${cell(sum[arm].before)} | ${cell(sum[arm].after)} | ${cell(sum[arm].detail)} | ${cell(sum[arm].none)} |`);
  console.log("\n| arm | images fetched: find before / after / detail / no image |\n|---|---|");
  for (const arm of ARMS) console.log(`| ${arm} | ${sum[arm].before.fetchedImages} / ${sum[arm].after.fetchedImages} / ${sum[arm].detail.fetchedImages} / ${sum[arm].none.fetchedImages} |`);
  console.log("\n| arm | runs | input tokens (mean) | cached | uncached | output | context of the last request |\n|---|---|---|---|---|---|---|");
  for (const arm of ARMS) {
    const rows: Json[] = sum[arm].tokens;
    if (!rows.length) continue;
    const mean = (key: string) => Math.round(rows.reduce((total, row) => total + row[key], 0) / rows.length);
    console.log(`| ${arm} | ${rows.length} | ${mean("input")} | ${mean("cached")} | ${mean("input") - mean("cached")} | ${mean("output")} | ${mean("lastContext")} |`);
  }
  console.log("\nnot sent:", JSON.stringify(Object.fromEntries(ARMS.map((arm) => [arm, sum[arm].unsent]))));

  // The chart: thread Y of one run of the plugin, step by step; and where the run without the plugin stopped.
  const chartRun = option("--chart-run") ?? labels[0];
  const on = JSON.parse(readFileSync(join(localRoot, "eval", chartRun, "on.json"), "utf8"));
  const off = existsSync(join(localRoot, "eval", chartRun, "off.json")) ? JSON.parse(readFileSync(join(localRoot, "eval", chartRun, "off.json"), "utf8")) : null;
  const stuck = new Set(((off?.threads.Y?.steps ?? []) as Json[]).filter((step) => step.status !== "completed" && step.name !== "compact").map((step) => step.name));
  const points = (on.threads.Y.steps as Json[]).map((step) => ({ step: step.name as string, ...sizes(step), stuck: stuck.has(step.name) }));
  for (const lang of ["en", "zh"] as const) writeFileSync(join(out, `request-size-${lang}.svg`), chart(points, lang));
  console.log(`\nchart from ${chartRun}:`, JSON.stringify(points.map((p) => [p.step, MB(p.full), MB(p.sent), p.stuck])));
}

// Grouped columns, one axis in MB: the conversation as Codex built it, and what the plugin sent. Colors from the
// dataviz reference palette (slots 1 and 2, validated light and dark); text in text tokens.
function chart(points: Array<{ step: string; full: number | null; sent: number | null; stuck: boolean }>, lang: "en" | "zh"): string {
  const words = lang === "zh"
    ? { title: "每一步最大的那次请求（MB，未压缩）", full: "完整对话（不装插件时要发的）", sent: "装插件后实际发出的", stuck: (full: string, sent: string) => `不装插件：${full} MB，发不出去；装插件：${sent} MB`, compact: "压缩", axis: "MB", note: "任务二：6 轮传图，压缩，再问 9 个问题。D1、D2 要看角落的数字，插件当轮取回了那一张原图。" }
    : { title: "Largest request of each step (MB, uncompressed)", full: "Whole conversation (what Codex sends without the plugin)", sent: "Sent with the plugin", stuck: (full: string, sent: string) => `Without the plugin: ${full} MB, could not be sent. With it: ${sent} MB`, compact: "compact", axis: "MB", note: "Task 2: six turns of uploads, a compaction, nine questions. D1 and D2 need a corner digit: the plugin fetched that one original for the turn." };
  const W = 860, H = 420, left = 56, right = 16, top = 78, bottom = 92;
  const plotW = W - left - right, plotH = H - top - bottom;
  const max = 60e6;
  const y = (bytes: number) => top + plotH - (bytes / max) * plotH;
  const band = plotW / points.length;
  const bar = Math.min(14, (band - 8) / 2);
  const ticks = [0, 10, 20, 30, 40, 50, 60];
  const label = (step: string) => (step === "compact" ? words.compact : step);
  const column = (x: number, value: number, cls: string, text: string) => {
    const h = Math.max(1, (value / max) * plotH), r = Math.min(4, h, bar / 2), x2 = x + bar, base = top + plotH, t = base - h;
    return `<path class="${cls}" d="M${x},${base} V${t + r} Q${x},${t} ${x + r},${t} H${x2 - r} Q${x2},${t} ${x2},${t + r} V${base} Z"><title>${text}</title></path>`;
  };
  const parts: string[] = [];
  parts.push(`<text class="title" x="${left}" y="24">${words.title}</text>`);
  // Legend: a swatch beside each name, text in ink.
  parts.push(`<rect class="full" x="${left}" y="38" width="10" height="10" rx="2"/><text class="legend" x="${left + 16}" y="47">${words.full}</text>`);
  const second = left + 16 + (lang === "zh" ? 210 : 360);
  parts.push(`<rect class="sent" x="${second}" y="38" width="10" height="10" rx="2"/><text class="legend" x="${second + 16}" y="47">${words.sent}</text>`);
  for (const tick of ticks) parts.push(`<line class="grid" x1="${left}" x2="${W - right}" y1="${y(tick * 1e6)}" y2="${y(tick * 1e6)}"/><text class="tick" x="${left - 8}" y="${y(tick * 1e6) + 4}" text-anchor="end">${tick}</text>`);
  parts.push(`<text class="tick" x="${left - 8}" y="${top - 10}" text-anchor="end">${words.axis}</text>`);
  points.forEach((point, i) => {
    const center = left + band * i + band / 2;
    if (point.full) parts.push(column(center - bar - 1, point.full, "full", `${label(point.step)}: ${(point.full / 1e6).toFixed(2)} MB`));
    if (point.sent) parts.push(column(center + 1, point.sent, "sent", `${label(point.step)}: ${(point.sent / 1e6).toFixed(2)} MB`));
    parts.push(`<text class="tick" x="${center}" y="${top + plotH + 18}" text-anchor="middle">${label(point.step)}</text>`);
    // The one step the story is about carries its values: the plugin's columns there are too short to read.
    // Above every column (the tallest is 52.4 MB), with a leader down to this one, so no column crosses the text.
    if (point.stuck && point.full) parts.push(`<line class="leader" x1="${center}" x2="${center}" y1="${y(56e6)}" y2="${y(point.full) - 12}"/><path class="stuck-mark" d="M${center - 5},${y(point.full) - 12} l5,8 l5,-8 z"/><text class="stuck" x="${center + 6}" y="${y(57e6) + 4}">${words.stuck((point.full / 1e6).toFixed(1), ((point.sent ?? 0) / 1e6).toFixed(2))}</text>`);
  });
  parts.push(`<line class="base" x1="${left}" x2="${W - right}" y1="${top + plotH}" y2="${top + plotH}"/>`);
  parts.push(`<text class="note" x="${left}" y="${H - 40}">${words.note}</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${words.title}">
<style>
  svg { --surface:#fcfcfb; --ink:#0b0b0b; --ink2:#52514e; --muted:#898781; --grid:#e1e0d9; --base:#c3c2b7; --s1:#2a78d6; --s2:#eb6834; }
  @media (prefers-color-scheme: dark) { svg { --surface:#1a1a19; --ink:#f0efec; --ink2:#c3c2b7; --muted:#898781; --grid:#2c2c2a; --base:#383835; --s1:#3987e5; --s2:#d95926; } }
  .bg { fill: var(--surface); }
  text { font-family: system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif; }
  .title { font-size: 15px; font-weight: 600; fill: var(--ink); }
  .legend { font-size: 12px; fill: var(--ink2); }
  .tick { font-size: 11px; fill: var(--muted); font-variant-numeric: tabular-nums; }
  .note { font-size: 12px; fill: var(--ink2); }
  .stuck { font-size: 11px; fill: var(--ink); }
  .stuck-mark { fill: var(--ink2); }
  .leader { stroke: var(--ink2); stroke-width: 1; }
  .grid { stroke: var(--grid); stroke-width: 1; }
  .base { stroke: var(--base); stroke-width: 1; }
  .full { fill: var(--s1); }
  .sent { fill: var(--s2); }
</style>
<rect class="bg" width="${W}" height="${H}" rx="8"/>
${parts.join("\n")}
</svg>
`;
}

main();
