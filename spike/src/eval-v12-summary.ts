// Purpose: eval — the report of a v0.12 eval run (eval-v12.ts): per arm, how often the context forced a compaction,
// the answers by kind (images only in the conversation, files on disk, the action) over all forks, the largest
// request, the input per turn, the share read from the cache, the cost, and the account's usage it took; per question,
// every fork's verdict; and the context after each turn, for the curve. Reads only the run's JSON files.
// Input: --label name [--out folder]. Output: a Markdown table on stdout, and summary.json in --out when given.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repo } from "./eval-long-setup.ts";

type Json = Record<string, any>;
const option = (name: string, fallback: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const label = option("--label", "run1");
const out = option("--out", "");
const dir = join(repo, "local", "eval-v12", label);
const arms = ["off", "v0.12"].filter((arm) => existsSync(join(dir, `${arm}.json`))).map((arm) => JSON.parse(readFileSync(join(dir, `${arm}.json`), "utf8")) as Json);

const total = (u: Json) => u.input + u.cacheRead + u.cacheWrite;
function summary(run: Json): Json {
  const requests: Json[] = [...run.turns.flatMap((turn: Json) => turn.requests), ...run.compactions.flatMap((c: Json) => c.requests ?? [])];
  const forkRequests: Json[] = (run.forks ?? []).flatMap((fork: Json) => (fork.answers ?? []).flatMap((answer: Json) => answer.requests ?? []));
  const all = [...requests, ...forkRequests];
  const answers: Json[] = (run.forks ?? []).flatMap((fork: Json) => fork.answers ?? []);
  const right = (kind: string) => ({ right: answers.filter((a) => a.kind === kind && a.verdict === "right").length, of: answers.filter((a) => a.kind === kind).length });
  const input = all.reduce((sum, u) => sum + total(u), 0);
  // Each Claude Code process reports its own session's cost so far: the main session's last, plus each fork's last.
  const main = Math.max(run.turns.at(-1)?.costUsd ?? 0, ...run.compactions.map((c: Json) => c.costUsd ?? 0));
  const cost = main + (run.forks ?? []).reduce((sum: number, fork: Json) => sum + (fork.costUsd ?? 0), 0);
  return {
    arm: run.arm,
    forced: run.compactions.filter((c: Json) => c.why === "threshold").length,
    compactions: run.compactions.map((c: Json) => ({ why: c.why, afterTurn: c.afterTurn, before: c.before })),
    conversation: right("conversation"), file: right("file"), action: right("action"),
    largest: Math.max(0, ...requests.map(total)),
    perTurn: Math.round(run.turns.reduce((sum: number, turn: Json) => sum + (turn.context ?? 0), 0) / Math.max(1, run.turns.length)),
    cacheShare: input ? Math.round((all.reduce((sum, u) => sum + u.cacheRead, 0) / input) * 1000) / 10 : null,
    costUsd: Math.round(cost * 1000) / 1000,
    weekly: run.quota ? { start: run.quota.start, end: run.quota.weekly } : null,
    fiveHour: run.quota ? { start: run.quota.fiveStart, end: run.quota.fiveHour } : null,
    curve: run.turns.map((turn: Json) => turn.context),
    fetches: answers.filter((a) => (a.fetched ?? []).length).length,
  };
}
const rows = arms.map(summary);
const lines = [
  `| | ${rows.map((row) => row.arm).join(" | ")} |`,
  `|---|${rows.map(() => "---").join("|")}|`,
  `| 门槛触发的压缩 | ${rows.map((row) => row.forced).join(" | ")} |`,
  `| 只在对话里的图，答对 | ${rows.map((row) => `${row.conversation.right}/${row.conversation.of}`).join(" | ")} |`,
  `| 磁盘上的图，答对 | ${rows.map((row) => `${row.file.right}/${row.file.of}`).join(" | ")} |`,
  `| 行动题，参考图对 | ${rows.map((row) => `${row.action.right}/${row.action.of}`).join(" | ")} |`,
  `| 最大一次请求（token） | ${rows.map((row) => row.largest.toLocaleString("en-US")).join(" | ")} |`,
  `| 平均每轮的上下文（token） | ${rows.map((row) => row.perTurn.toLocaleString("en-US")).join(" | ")} |`,
  `| 从缓存读的比例 | ${rows.map((row) => `${row.cacheShare}%`).join(" | ")} |`,
  `| 花费（按 API 价格） | ${rows.map((row) => `$${row.costUsd}`).join(" | ")} |`,
  `| 周额度 | ${rows.map((row) => (row.weekly ? `${row.weekly.start} → ${row.weekly.end}` : "—")).join(" | ")} |`,
  `| 5 小时额度 | ${rows.map((row) => (row.fiveHour ? `${row.fiveHour.start} → ${row.fiveHour.end}` : "—")).join(" | ")} |`,
];
const keys = [...new Set(arms.flatMap((run) => (run.forks ?? []).flatMap((fork: Json) => (fork.answers ?? []).map((a: Json) => a.key))))];
const perQuestion = [
  `| 题 | ${arms.map((run) => run.arm).join(" | ")} |`,
  `|---|${arms.map(() => "---").join("|")}|`,
  ...keys.map((key) => `| ${key} | ${arms.map((run) => (run.forks ?? []).map((fork: Json) => { const a = (fork.answers ?? []).find((x: Json) => x.key === key); return !a ? "·" : a.verdict === "right" ? "✓" : a.verdict === "ambiguous" ? "～" : `✗${a.said ? ` ${a.said}` : ""}`; }).join(" ")).join(" | ")} |`),
];
console.log([...lines, "", ...perQuestion, "", ...rows.map((row) => `${row.arm} 每轮上下文：${row.curve.join(", ")}`)].join("\n"));
// The context after each turn, both arms on one axis (the same unit), with the threshold and where a compaction cut
// it: a static SVG for the report, readable on GitHub's light and dark pages (its own light surface). Colors are the
// reference palette's first two categorical slots; each line is also labeled directly at its end.
function chart(lang: "zh" | "en"): string {
  const W = 960, H = 440, left = 76, right = 150, top = 64, bottom = 56;
  const plotW = W - left - right, plotH = H - top - bottom, max = 120_000;
  const turns = Math.max(...rows.map((row) => row.curve.length));
  const x = (turn: number) => left + ((turn - 1) / (turns - 1)) * plotW;
  const y = (tokens: number) => top + plotH - (tokens / max) * plotH;
  const words = lang === "zh"
    ? { title: "每轮结束时的上下文（token）", sub: "Sonnet 5.5，同一段 16 轮的短片任务；超过 10 万就压缩", threshold: "压缩门槛 10 万", compact: "压缩", turn: (n: number) => `第 ${n} 轮`, arm: { off: "不装插件", "v0.12": "装插件 0.12" } as Record<string, string> }
    : { title: "Context at the end of each turn (tokens)", sub: "Sonnet 5.5, the same 16-turn short-film task; compacted above 100K", threshold: "compaction threshold 100K", compact: "compacted", turn: (n: number) => `turn ${n}`, arm: { off: "no plugin", "v0.12": "plugin 0.12" } as Record<string, string> };
  const color: Record<string, string> = { "v0.12": "#2a78d6", off: "#eb6834" };
  const k = (tokens: number) => `${Math.round(tokens / 1000)}K`;
  const parts: string[] = [];
  parts.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="#fcfcfb" stroke="#e1e0d9"/>`);
  parts.push(`<text x="${left}" y="30" font-size="17" font-weight="600" fill="#0b0b0b">${words.title}</text>`);
  parts.push(`<text x="${left}" y="50" font-size="13" fill="#52514e">${words.sub}</text>`);
  for (const tick of [0, 25_000, 50_000, 75_000, 100_000]) {
    parts.push(`<line x1="${left}" x2="${left + plotW}" y1="${y(tick)}" y2="${y(tick)}" stroke="#e1e0d9" stroke-width="1"/>`);
    parts.push(`<text x="${left - 10}" y="${y(tick) + 4}" font-size="12" fill="#898781" text-anchor="end">${k(tick)}</text>`);
  }
  parts.push(`<line x1="${left}" x2="${left + plotW}" y1="${y(100_000)}" y2="${y(100_000)}" stroke="#898781" stroke-width="1.5" stroke-dasharray="5 4"/>`);
  parts.push(`<text x="${left + 8}" y="${y(100_000) - 8}" font-size="12" fill="#52514e">${words.threshold}</text>`);
  for (const turn of [1, 4, 8, 12, 16].filter((t) => t <= turns)) parts.push(`<text x="${x(turn)}" y="${top + plotH + 24}" font-size="12" fill="#898781" text-anchor="middle">${words.turn(turn)}</text>`);
  // The end labels (name, then value) kept at least two lines apart.
  const labelY = new Map<string, number>();
  for (const row of [...rows].sort((a, b) => y(a.curve.at(-1)) - y(b.curve.at(-1)))) {
    const wanted = y(row.curve.at(-1)) + 4;
    const above = Math.max(-Infinity, ...[...labelY.values()]);
    labelY.set(row.arm, Math.max(wanted, above + 34));
  }
  for (const row of rows) {
    const points = row.curve.map((tokens: number, at: number) => `${x(at + 1).toFixed(1)},${y(tokens).toFixed(1)}`).join(" ");
    parts.push(`<polyline points="${points}" fill="none" stroke="${color[row.arm]}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`);
    const last = row.curve.length;
    parts.push(`<circle cx="${x(last)}" cy="${y(row.curve[last - 1])}" r="4" fill="${color[row.arm]}" stroke="#fcfcfb" stroke-width="2"/>`);
    parts.push(`<text x="${x(last) + 10}" y="${labelY.get(row.arm)}" font-size="13" font-weight="600" fill="#0b0b0b">${words.arm[row.arm]}</text>`);
    parts.push(`<text x="${x(last) + 10}" y="${labelY.get(row.arm)! + 16}" font-size="12" fill="#52514e">${k(row.curve[last - 1])}</text>`);
    // Where a compaction cut the context: the turn it came after.
    for (const compaction of run(row.arm)?.compactions ?? []) {
      if (compaction.why !== "threshold") continue;
      const at = compaction.afterTurn;
      parts.push(`<circle cx="${x(at)}" cy="${y(row.curve[at - 1])}" r="5" fill="#fcfcfb" stroke="${color[row.arm]}" stroke-width="2.5"/>`);
      parts.push(`<text x="${x(at) - 10}" y="${y(row.curve[at - 1]) - 12}" font-size="12" fill="#52514e" text-anchor="end">${words.compact} ${k(row.curve[at - 1])}</text>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="-apple-system, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" role="img" aria-label="${words.title}">\n${parts.join("\n")}\n</svg>\n`;
}
function run(arm: string): Json | undefined { return arms.find((entry) => entry.arm === arm); }

if (out) {
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "context-zh.svg"), chart("zh"));
  writeFileSync(join(out, "context-en.svg"), chart("en"));
  writeFileSync(join(out, "summary.json"), JSON.stringify({ label, rows, arms: arms.map((run) => ({ arm: run.arm, model: run.model, effort: run.effort, threshold: run.threshold, compactions: run.compactions.map((c: Json) => ({ why: c.why, afterTurn: c.afterTurn, before: c.before })), answers: (run.forks ?? []).map((fork: Json) => (fork.answers ?? []).map((a: Json) => ({ key: a.key, kind: a.kind, expected: a.expected, verdict: a.verdict, said: a.said, fetched: a.fetched, reads: a.reads, reply: a.reply }))) })) }, null, 2));
}
