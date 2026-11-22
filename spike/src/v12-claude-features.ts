// Purpose: v0.12 gate 1 on Claude (docs/v0.12/plan.md §5; user 2026-11-22: Codex's quota was used up, so the gate runs
// on Claude, and the user tries Codex by hand). Do the models write the new feature lines: one of five categories and a
// name, the characters in the picture, the user's ratings, and nothing about it in the reply?
// Claude Code's command line with a copy of this checkout's plugin, its own engine and the eval's own configuration
// (eval-long-setup.ts), one session; the user's words never name a category. Turns: a heroine's three views and her cat;
// a keyframe of both in the study (its file name and the words carry a shot number); four screenshots of a settings
// page, one step apart; a scanned contract page; a palette; a rating of the keyframe.
// Input: [--label name] [--lang zh|en] [--model haiku|sonnet] [--effort low] [--port 17941]; CAM_EVAL_CLAUDE_CONFIG (the
// signed-in configuration, e.g. the main checkout's from a worktree), CAM_CLAUDE_BIN.
// Output: local/v12/claude-features-<label>.json and a console summary. Synthetic images only.

import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addNotes, lineParts, type Notes } from "../../plugin/src/core/notes.ts";
import { Session } from "./claude-session.ts";
import { claudeConfigDir, preparePlugin, repo, startEngine } from "./eval-long-setup.ts";
import { CATEGORY_IMAGES } from "./testkit.ts";

type Json = Record<string, any>;
const MODELS: Record<string, string> = { sonnet: "claude-sonnet-5-5", haiku: "claude-haiku-5-5" };
const FETCH_TOOL = "mcp__plugin_codex-attachment-manager_codex_attachment_manager__cam_view_image";
const TURN_TIMEOUT = 6 * 60_000;

const SCRIPT = {
  zh: {
    heroine: "林夏", pet: "阿橘",
    turns: [
      { say: "这是女主角林夏的三视图，还有她养的猫，叫阿橘。简单看一下。", images: ["linxia_sheet.png", "cat.png"] },
      { say: "第一镜：林夏抱着阿橘站在书房窗边。这是生成的关键帧，简单看一下。", images: ["shot01.png"] },
      { say: "我在电脑的系统设置里调网络，这是一步步操作的四张截图，最后停在哪一步？", images: ["settings_1.png", "settings_2.png", "settings_3.png", "settings_4.png"] },
      { say: "这是租房合同扫描件的第 3 页，红章盖在哪里？", images: ["contract_p3.png"] },
      { say: "这是这部片子的色板，简单看一下。", images: ["palette.png"] },
      { say: "刚才第一镜那张关键帧，林夏的脸太暗了。", images: [] },
    ],
    notPlace: /\d|场|镜|帧|线稿|草图|检查|参考|版/,
    talksAboutIt: /记录|记下|记住|已记|之后会参考|以后会参考|后续参考|会按这|特征行|cam\b|\[\/\/\]/,
  },
  en: {
    heroine: "Lin Xia", pet: "Mochi",
    turns: [
      { say: "These are the three views of the heroine, Lin Xia, and her cat, Mochi. Take a quick look.", images: ["linxia_sheet.png", "cat.png"] },
      { say: "Shot 1: Lin Xia holds Mochi by the window of the study. This is the generated keyframe; take a quick look.", images: ["shot01.png"] },
      { say: "I was changing the network in my computer's settings; these are four screenshots, one per step. Which step did I stop at?", images: ["settings_1.png", "settings_2.png", "settings_3.png", "settings_4.png"] },
      { say: "This is page 3 of the scanned lease. Where is the red stamp?", images: ["contract_p3.png"] },
      { say: "This is the color palette of the film. Take a quick look.", images: ["palette.png"] },
      { say: "In the shot 1 keyframe, Lin Xia's face is too dark.", images: [] },
    ],
    notPlace: /\d|scene|shot|frame|sketch|draft|check|reference|version|\bv\d/i,
    talksAboutIt: /\bnot(?:e|ing)\b.*\b(?:line|feature|record)|feature line|record line|\bnoted\b|\bin mind\b|\bremember|refer to (?:this|it|these|them) later|\bcam\b|\[\/\/\]/i,
  },
};
// A line in the new form starts with one of the five categories (core/notes.ts).
const NEW_FORM = /^\s*(?:角色|场景|界面|文档|其他|character|place|screen|document|other)\s*[:：]/i;
const RECORD = /\[\/\/\]:[ \t]*#[ \t]*\(cam[^)\n]*\)/g;
const visible = (reply: string) => reply.replace(RECORD, "").replace(/\n{3,}/g, "\n\n").trim();
const endsWithRecord = (reply: string) => /\[\/\/\]:[ \t]*#[ \t]*\(cam[^)\n]*\)\s*$/.test(reply);

async function main(): Promise<void> {
  const option = (name: string, fallback: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
  const label = option("--label", "run1");
  const lang = option("--lang", "zh") === "en" ? "en" : "zh";
  const model = MODELS[option("--model", "haiku")] ?? MODELS.haiku;
  const effort = option("--effort", "low");
  const port = Number(option("--port", "17941"));
  const words = SCRIPT[lang];
  const root = join(repo, "local", "v12");
  const runDir = join(root, `claude-features-${label}`);
  mkdirSync(runDir, { recursive: true });
  const work = join(tmpdir(), "cam-v12-features", label);
  mkdirSync(work, { recursive: true });
  const images = Object.fromEntries(Object.entries(CATEGORY_IMAGES).map(([name, draw]) => [name, draw()]));
  const upload = (name: string) => ({ type: "image", source: { type: "base64", media_type: "image/png", data: images[name].toString("base64") } });
  // The images are numbered in the order they first appear.
  const order = words.turns.flatMap((turn) => turn.images);
  const idOf = (name: string) => `IMG-${String(order.indexOf(name) + 1).padStart(3, "0")}`;

  const data = join(runDir, "data");
  const plugin = preparePlugin("v0.10", port, data, lang);
  const engine = await startEngine(plugin, port, data, lang);
  // This process may itself run inside Claude Code: none of its session's variables (its engine's URL included) go on.
  const env: NodeJS.ProcessEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(CLAUDE|ANTHROPIC)/i.test(name)));
  Object.assign(env, { CLAUDE_CONFIG_DIR: claudeConfigDir });
  const args = ["-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--model", model, "--effort", effort, "--tools", "Read", "--allowedTools", "Read", FETCH_TOOL, "--plugin-dir", plugin];
  const session = new Session(args, env, work, join(runDir, "events.jsonl"));
  const result: Json = { createdAt: new Date().toISOString(), label, lang, model, effort, turns: [] as Json[] };
  const notes = new Map<string, Notes>();
  try {
    for (const [at, turn] of words.turns.entries()) {
      const sent = await session.send([...turn.images.map(upload), { type: "text", text: turn.say }], TURN_TIMEOUT);
      const texts = sent.events.filter((event) => event.type === "assistant").flatMap((event) => (event.message?.content ?? []).filter((block: Json) => block.type === "text").map((block: Json) => String(block.text)));
      for (const text of texts) addNotes(notes, text, at + 1);
      const reply = String(sent.result?.result ?? "");
      const usage = sent.result?.usage ?? null;
      result.turns.push({ say: turn.say, error: sent.result?.is_error ?? (sent.result ? false : "no result"), reply, visible: visible(reply), usage, costUsd: sent.result?.total_cost_usd ?? null });
    }
  } finally {
    await session.close();
    engine.kill();
  }

  const partsOf = (name: string) => lineParts(notes.get(idOf(name))?.line ?? null);
  const named = (name: string, wanted: string) => String(partsOf(name)?.name ?? "").includes(wanted);
  const shot = partsOf("shot01.png");
  result.lines = Object.fromEntries(order.map((name) => [name, { id: idOf(name), ...(notes.get(idOf(name)) ?? { line: null, ratings: [] }) }]));
  result.checks = {
    linesForAll: order.every((name) => !!notes.get(idOf(name))?.line),
    newForm: order.every((name) => NEW_FORM.test(notes.get(idOf(name))?.line ?? "")),
    sheetIsCharacter: partsOf("linxia_sheet.png")?.category === "character" && named("linxia_sheet.png", words.heroine),
    catIsCharacter: partsOf("cat.png")?.category === "character" && named("cat.png", words.pet),
    shotIsPlace: shot?.category === "place" && !!shot.name && !words.notPlace.test(shot.name),
    shotLists: [words.heroine, words.pet].every((name) => (shot?.characters ?? []).some((listed) => listed.includes(name))),
    screens: ["settings_1.png", "settings_2.png", "settings_3.png", "settings_4.png"].every((name) => partsOf(name)?.category === "screen"),
    document: partsOf("contract_p3.png")?.category === "document",
    palette: partsOf("palette.png")?.category === "other",
    ratedShot: (notes.get(idOf("shot01.png"))?.ratings ?? []).length > 0,
    noRatingElsewhere: [...notes].every(([id, entry]) => id === idOf("shot01.png") || !entry.ratings.length),
    quiet: result.turns.every((turn: Json) => !words.talksAboutIt.test(turn.visible)),
    recordsFirst: result.turns.every((turn: Json) => !endsWithRecord(turn.reply)),
  };
  // Claude Code reports the session's cost so far with each result.
  result.costUsd = result.turns.at(-1)?.costUsd ?? null;
  writeFileSync(join(root, `claude-features-${label}.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ label, lang, model, effort, checks: result.checks, lines: Object.fromEntries(Object.entries(result.lines as Json).map(([name, entry]) => [name, [entry.line, ...(entry.ratings ?? []).map((rating: Json) => `rated: ${rating.text}`)].filter(Boolean).join(" / ")])), replies: result.turns.map((turn: Json) => (turn.error ? `ERROR ${turn.reply}` : turn.visible).slice(0, 140)), costUsd: result.costUsd }, null, 2));
}

await main();
