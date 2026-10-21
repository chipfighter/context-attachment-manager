// Purpose: v0.8 — feature lines end to end (docs/v0.8/plan.md §5). Does the model write a feature line for each new image
// and note the user's ratings, with the right ids, at the start of its reply and without mentioning it? Does a new image
// have its id from its own turn's first request on? After a compaction, does the model take the right image by its
// feature line (the user's case: a medium shot first, a close-up later called the best, then a reference for the face),
// and can it still say what an image from before the compaction looks like?
// Set up like v03-auto-selftest.ts: a test engine of this checkout (its own port and data folder, --dump-requests for
// the bodies it sent), this checkout's plugin server attached to the test app-server for cam_view_image, the tools that
// act on the machine off, a read-only sandbox, the tasks archived at the end. Automatic selection is on by default
// (v0.6), so no switch is set. The compaction is Codex's own (thread/compact/start), as p3-selftest.ts does it.
// Thread F: an upload; an upload and an image opened with the image viewer; the user's ratings; a question about all
// three, answered from their placeholders. Thread K: a character's medium shot; two other assets; the close-up the user
// calls the best; a compaction; which image to take for the facial features; what the other two look like.
// Thread P (user 2026-10-21): uploads whose file names and the user's words carry a scene number, a version and what the
// image is for ("03场_书房_首帧_v2.png"), as in a user's MV task where GPT-6 copied them into the scene; the first part of
// each feature line must be the place alone, the same place for the two images of the study.
// Input: [--label name] [--lang zh|en] [--port 17893] [--threads F,K,P]; CAM_TEST_MODEL, CAM_TEST_EFFORT.
// Output: local/v08/features-<label>.json (synthetic images only).

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { AppServer, findBundledCodex } from "./appserver.ts";
import { codexHome } from "../../plugin/src/codexconfig.ts";
import { engineHealth } from "../../plugin/src/engine.ts";
import { languageFileOf, rememberLang, type Lang } from "../../plugin/src/language.ts";
import { sceneOf } from "../../plugin/src/notes.ts";
import { loadThreadIndex } from "../../plugin/src/thread-index.ts";
import { archiveThreads, CORNER_IMAGES, png, runTurn, TEST_EFFORT, TEST_MODEL, text } from "./testkit.ts";

type Json = Record<string, any>;
const here = dirname(fileURLToPath(import.meta.url));
const localRoot = join(resolve(here, "../.."), "local");

// The same character twice: a medium shot (waist up, small head) and a close-up (the face fills the frame).
const SKIN = [235, 190, 160], HAIR = [60, 40, 30], SHIRT = [40, 90, 170], BACK = [200, 215, 230], DARK = [30, 30, 30], LIPS = [150, 60, 60];
const inCircle = (x: number, y: number, cx: number, cy: number, r: number) => (x - cx) ** 2 + (y - cy) ** 2 < r * r;
const medium = () => png(512, 512, (x, y) => {
  if (inCircle(x, y, 236, 150, 6) || inCircle(x, y, 276, 150, 6)) return DARK as any;
  if (x >= 240 && x < 272 && y >= 176 && y < 181) return LIPS as any;
  if (inCircle(x, y, 256, 150, 55)) return (y < 122 ? HAIR : SKIN) as any;
  if (x >= 238 && x < 274 && y >= 200 && y < 218) return SKIN as any;
  if (y >= 215 && Math.abs(x - 256) < 70 + (y - 215) * 0.35) return SHIRT as any;
  return BACK as any;
});
const closeUp = () => png(512, 512, (x, y) => {
  if (inCircle(x, y, 180, 260, 18) || inCircle(x, y, 332, 260, 18)) return DARK as any;
  if (inCircle(x, y, 180, 260, 38) || inCircle(x, y, 332, 260, 38)) return [255, 255, 255] as any;
  if (x >= 200 && x < 312 && y >= 380 && y < 400) return LIPS as any;
  if (x >= 248 && x < 264 && y >= 290 && y < 345) return [215, 165, 135] as any;
  if (inCircle(x, y, 256, 280, 215)) return (y < 150 ? HAIR : SKIN) as any;
  return BACK as any;
});

const SCRIPT = {
  zh: {
    name: (label: string, thread: string) => `[CAM测试] 特征行自测 ${thread} ${label}`,
    first: "这是第一张参考图，请简单描述一下。",
    second: "这是第二张图。另外请用看图工具打开当前目录下的 c.png，然后把这两张一起简单描述一下。",
    rate: "第一张颜色太暗了，第二张的构图不错。",
    recall: "到目前为止我给你看过哪几张图？各是什么样的？不要调用任何工具。",
    recallWords: [/红/, /蓝/, /紫/],
    character: "这是角色的第一张参考图，简单描述一下。",
    assets: "这两张是别的素材，简单描述一下。",
    best: "这是同一个角色的另一张，这张最好。简单描述一下。",
    face: "接下来要给这个角色做五官参考，之前哪张图最合适？说出它的编号和理由。",
    others: "压缩之前我给过你两张别的素材，各是什么样的？不要调用任何工具。",
    otherWords: [/红/, /蓝/],
    // Thread P: the file names and the words that bait a scene number, a version and a purpose into the place.
    baitFiles: ["03场_书房_首帧_v2.png", "03场_书房_线稿_v3.png", "03场_咖啡店外_尾帧_v1.png"],
    studyFrame: "这是第三场书房的首帧 v2，简单看一下。",
    sketchAndStreet: "这是同一场书房的线稿 v3，还有咖啡店外的尾帧 v1，简单看一下。",
    notPlace: /\d|场|帧|线稿|草图|检查|参考|版/,
    // An acknowledgement such as "记下了" (sol, 2026-10-19) counts as mentioning the noting.
    talksAboutIt: /记录|记下|记住|已记|之后会参考|以后会参考|后续参考|会按这|特征行|cam\b|\[\/\/\]/,
  },
  en: {
    name: (label: string, thread: string) => `[CAM test] feature line self-test ${thread} ${label}`,
    first: "This is my first reference image. Please describe it briefly.",
    second: "Here is the second one. Also open c.png in the current folder with your image viewer, then describe both briefly.",
    rate: "The first one is too dark; the composition of the second one is good.",
    recall: "Which images have I shown you so far, and what does each look like? Do not call any tools.",
    recallWords: [/red/i, /blue/i, /purple/i],
    character: "This is the first reference image of the character. Describe it briefly.",
    assets: "These two are other assets. Describe them briefly.",
    best: "This is another one of the same character; this one is the best. Describe it briefly.",
    face: "Next I want a reference for the character's facial features. Which earlier image fits best? Give its ID and why.",
    others: "Before the compaction I gave you two other assets. What does each look like? Do not call any tools.",
    otherWords: [/red/i, /blue/i],
    baitFiles: ["scene03_study_first-frame_v2.png", "scene03_study_sketch_v3.png", "scene03_cafe-exterior_last-frame_v1.png"],
    studyFrame: "This is the first frame of scene 3, in the study, version 2. Take a quick look.",
    sketchAndStreet: "Here is the sketch of the same study scene, version 3, and the last frame outside the café, version 1. Take a quick look.",
    notPlace: /\d|scene|frame|sketch|draft|check|reference|version|\bv\d/i,
    talksAboutIt: /\bnot(?:e|ing)\b.*\b(?:line|feature|record)|feature line|record line|\bnoted\b|\bin mind\b|\bremember|refer to (?:this|it|these|them) later|\bcam\b|\[\/\/\]/i,
  },
};

// The record lines, wherever they stand: a turn's messages come joined with a space (testkit).
const RECORD = /\[\/\/\]:[ \t]*#[ \t]*\(cam[^)\n]*\)/g;
const visible = (reply: string) => reply.replace(RECORD, "").replace(/\n{3,}/g, "\n\n").trim();
const endsWithRecord = (reply: string) => /\[\/\/\]:[ \t]*#[ \t]*\(cam[^)\n]*\)\s*$/.test(reply);

async function main(): Promise<void> {
  const option = (name: string, fallback: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
  const label = option("--label", "run1");
  const lang: Lang = option("--lang", "zh") === "en" ? "en" : "zh";
  const port = Number(option("--port", "17893"));
  const only = option("--threads", "F,K,P").split(",");
  const words = SCRIPT[lang];
  const root = join(localRoot, "v08");
  const data = join(root, `data-${label}`);
  // A folder per run, so runs side by side never rewrite an image another one is uploading.
  const work = join(root, "work", label);
  mkdirSync(work, { recursive: true });
  for (const [name, draw] of Object.entries(CORNER_IMAGES)) writeFileSync(join(work, name), draw());
  writeFileSync(join(work, "m.png"), medium());
  writeFileSync(join(work, "f.png"), closeUp());
  // Thread P: three different images under the bait names (the same bytes twice would be a duplicate).
  [medium(), closeUp(), CORNER_IMAGES["a.png"]()].forEach((bytes, i) => writeFileSync(join(work, words.baitFiles[i]), bytes));
  // What the panel would have told the plugin: Codex shows this language.
  rememberLang(lang, "codex", languageFileOf(data));
  const sessionsDir = join(codexHome(), "sessions");
  // What the engine did to each HTTP request of a thread since a moment (a declined WebSocket carries no body).
  const logged = (threadId: string, since: string): Json[] => {
    const dir = join(data, "proxy");
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter((name) => name.endsWith(".jsonl")).flatMap((name) => readFileSync(join(dir, name), "utf8").split("\n"))
      .flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } })
      .filter((entry) => entry.threadId === threadId && entry.at >= since && /\/responses(\/compact)?$/.test(entry.path ?? "") && entry.transport !== "websocket")
      .map((entry) => ({ at: entry.at, unknown: entry.rewrite?.unknown ?? 0, labeled: entry.rewrite?.labeled ?? 0, featureAt: entry.rewrite?.featureAt ?? null, replaced: (entry.rewrite?.replaced ?? []).map((r: Json) => r.id) }));
  };
  // The placeholders in the first body the engine sent since a moment.
  const placeholdersSince = (since: string): string[] => {
    const dir = join(data, "p2", "requests");
    const first = existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith(".sent.json") && name >= since.replace(/:/g, "-")).sort()[0] : undefined;
    if (!first) return [];
    const body = JSON.parse(readFileSync(join(dir, first), "utf8")).body;
    return (body.input as Json[]).flatMap((item) => (item.content ?? (Array.isArray(item.output) ? item.output : [])).filter((part: Json) => typeof part?.text === "string" && /^\[(?:图片|Image) IMG-/.test(part.text)).map((part: Json) => String(part.text).slice(0, 300)));
  };

  const engine = spawn(process.execPath, [join(here, "..", "..", "plugin", "src", "proxy.ts"), "--port", String(port), "--stay", "--dump-requests"], { env: { ...process.env, CAM_DATA_DIR: data }, stdio: "ignore", windowsHide: true });
  for (let i = 0; i < 50 && !(await engineHealth(port)); i++) await sleep(200);
  // Nothing that acts on the machine: no computer use, browsers or app tools, no notify program.
  const off = ["computer-use@openai-bundled", "unified-computer-use@openai-bundled", "chrome@openai-bundled", "browser@openai-bundled", "codex-app-tools@openai-bundled"]
    .flatMap((plugin) => ["-c", `plugins.${plugin}.enabled=false`]);
  // This checkout's plugin server, for cam_view_image; it reads the same data folder as the test engine.
  const env = { CODEX_HOME: codexHome(), CAM_DATA_DIR: data, CAM_NO_ENGINE: "1" };
  const plugin = [
    "-c", `mcp_servers.cam_dev.command=${JSON.stringify(process.execPath)}`,
    "-c", `mcp_servers.cam_dev.args=${JSON.stringify([join(here, "..", "..", "plugin", "src", "plugin-server.ts")])}`,
    "-c", `mcp_servers.cam_dev.env={ ${Object.entries(env).map(([name, value]) => `${name} = ${JSON.stringify(value)}`).join(", ")} }`,
    "-c", `mcp_servers.cam_dev.default_tools_approval_mode="approve"`,
    "-c", "mcp_servers.cam_dev.startup_timeout_sec=20",
  ];
  const server = new AppServer(findBundledCodex(), ["-c", `openai_base_url="http://localhost:${port}/backend-api/codex"`, "-c", "features.respect_system_proxy=true", "-c", "notify=[]", "-c", "mcp_servers.node_repl.enabled=false", ...off, ...plugin], { NO_PROXY: undefined, no_proxy: undefined }, join(root, `appserver-${label}.log`));
  const result: Json = { createdAt: new Date().toISOString(), label, lang, model: TEST_MODEL, effort: TEST_EFFORT, threads: {} };
  const created: string[] = [];
  try {
    await server.initialize();
    const start = async (name: string) => {
      const { thread } = await server.request<{ thread: Json }>("thread/start", { model: TEST_MODEL, cwd: work, approvalPolicy: "never", sandbox: "read-only", ephemeral: false });
      created.push(thread.id);
      await server.request("thread/name/set", { threadId: thread.id, name: words.name(label, name) });
      return thread.id as string;
    };
    const turn = async (threadId: string, prompt: string, images: string[] = []) => {
      const since = new Date().toISOString();
      const done = await runTurn(server, threadId, [text(prompt), ...images.map((file) => ({ type: "localImage", path: join(work, file) }))]);
      // The engine records a request once its response has ended, which can be just after the turn completes.
      await sleep(1500);
      return { ...done, visible: visible(done.reply), requests: logged(threadId, since), since };
    };
    const notesOf = (threadId: string) => {
      const index = loadThreadIndex(sessionsDir, threadId);
      return { images: index.images.map((image) => ({ id: image.id, kind: image.kind, name: image.name, turn: image.turn })), notes: Object.fromEntries(index.notes) };
    };
    const threads: Record<string, () => Promise<Json>> = {
      F: async () => {
        const id = await start("F");
        const turns: Json = {};
        turns.first = await turn(id, words.first, ["a.png"]);
        turns.second = await turn(id, words.second, ["b.png"]);
        turns.rate = await turn(id, words.rate);
        turns.recall = await turn(id, words.recall);
        return { threadId: id, turns, ...notesOf(id) };
      },
      K: async () => {
        const id = await start("K");
        const turns: Json = {};
        turns.character = await turn(id, words.character, ["m.png"]);
        turns.assets = await turn(id, words.assets, ["a.png", "b.png"]);
        turns.best = await turn(id, words.best, ["f.png"]);
        // The compaction runs as a turn of its own: find it, wait for it to end.
        const before = server.notifications.length;
        const known = new Set(Object.values(turns).map((t: Json) => t.turnId));
        await server.request("thread/compact/start", { threadId: id });
        const isNew = (n: { params: Json }) => server.notifications.indexOf(n as any) >= before && n.params?.threadId === id && !known.has(n.params.turn?.id);
        const compactTurn = await server.waitFor((n) => n.method === "turn/started" && isNew(n), 60_000).then((n) => n.params.turn.id as string, () => null);
        const compaction = compactTurn ? await server.waitFor((n) => n.method === "turn/completed" && n.params.turn?.id === compactTurn, 5 * 60_000).then((n) => n.params.turn.status, () => "timeout") : "no compaction turn";
        await sleep(1500);
        turns.face = await turn(id, words.face);
        turns.others = await turn(id, words.others);
        return { threadId: id, turns, compaction, facePlaceholders: placeholdersSince(turns.face.since), ...notesOf(id) };
      },
      P: async () => {
        const id = await start("P");
        const turns: Json = {};
        turns.studyFrame = await turn(id, words.studyFrame, [words.baitFiles[0]]);
        turns.sketchAndStreet = await turn(id, words.sketchAndStreet, words.baitFiles.slice(1));
        return { threadId: id, turns, ...notesOf(id) };
      },
    };
    for (const name of only) if (threads[name]) result.threads[name] = await threads[name]();
  } finally {
    result.notArchived = await archiveThreads(server, created);
    await server.stop();
    engine.kill();
  }

  const F = result.threads.F ?? null;
  const K = result.threads.K ?? null;
  const P = result.threads.P ?? null;
  const idOf = (thread: Json, name: string) => (thread.images ?? []).find((image: Json) => image.name === name)?.id ?? null;
  const lined = (thread: Json, id: string | null) => !!id && !!thread.notes?.[id]?.line;
  const rated = (thread: Json, id: string | null) => !!id && (thread.notes?.[id]?.ratings ?? []).length > 0;
  const replies = (thread: Json) => Object.values(thread.turns as Record<string, Json>);
  result.checks = {
    ...(F ? {
      // Feature lines for both uploads and the viewed image; the ratings on the two the user meant, and on no other.
      linesForAll: ["a.png", "b.png", "c.png"].every((name) => lined(F, idOf(F, name))),
      ratedFirst: rated(F, idOf(F, "a.png")),
      ratedSecond: rated(F, idOf(F, "b.png")),
      noRatingElsewhere: Object.entries(F.notes ?? {}).every(([id, notes]: [string, any]) => [idOf(F, "a.png"), idOf(F, "b.png")].includes(id) || !notes.ratings.length),
      // The replies say nothing of the noting, and none ends with a record line (Claude Desktop shows one there).
      quiet: replies(F).every((t) => !words.talksAboutIt.test(t.visible ?? "")),
      recordsFirst: replies(F).every((t) => !endsWithRecord(String(t.reply ?? ""))),
      // An image new in a turn has its id from that turn's first request on.
      newUploadKnown: F.turns.first.requests[0]?.unknown === 0 && (F.turns.first.requests[0]?.labeled ?? 0) >= 1,
      newImagesKnown: (F.turns.second.requests ?? []).every((request: Json) => request.unknown === 0),
      // All three are placeholders in the last turn; the answer comes from what the model noted.
      recallFromNotes: !F.turns.recall.tools.length && words.recallWords.every((pattern) => pattern.test(F.turns.recall.visible ?? "")),
    } : {}),
    ...(K ? {
      kLinesForAll: ["m.png", "a.png", "b.png", "f.png"].every((name) => lined(K, idOf(K, name))),
      kRatedCloseUp: rated(K, idOf(K, "f.png")),
      compacted: K.compaction === "completed",
      // After the compaction every earlier image is still in the request, as a placeholder with its feature line.
      placeholdersCarryFeatures: ["m.png", "a.png", "b.png", "f.png"].every((name) => (K.facePlaceholders ?? []).some((text: string) => text.includes(idOf(K, name) ?? "?") && /特征：|Features: /.test(text))),
      picksCloseUp: !!idOf(K, "f.png") && (K.turns.face.visible ?? "").includes(idOf(K, "f.png")),
      recallsOthers: words.otherWords.every((pattern) => pattern.test(K.turns.others.visible ?? "")),
    } : {}),
    ...(P ? {
      pLinesForAll: words.baitFiles.every((name) => lined(P, idOf(P, name))),
      // The place alone: no scene number, version or purpose from the file names or the user's words.
      placesClean: words.baitFiles.every((name) => { const place = sceneOf(P.notes?.[idOf(P, name) ?? ""]?.line ?? null); return !!place && !words.notPlace.test(place); }),
      samePlace: sceneOf(P.notes?.[idOf(P, words.baitFiles[0]) ?? ""]?.line ?? null) === sceneOf(P.notes?.[idOf(P, words.baitFiles[1]) ?? ""]?.line ?? null),
    } : {}),
  };
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, `features-${label}.json`), JSON.stringify(result, null, 2));
  const brief = (t: Json) => ({ status: t.status, tools: t.tools, reply: String(t.reply).slice(0, 160) });
  console.log(JSON.stringify({
    label, lang, model: TEST_MODEL, notArchived: result.notArchived, checks: result.checks,
    turns: Object.fromEntries(Object.entries(result.threads as Record<string, Json>).map(([name, thread]) => [name, Object.fromEntries(Object.entries(thread.turns as Record<string, Json>).map(([key, t]) => [key, brief(t)]))])),
    notes: Object.fromEntries(Object.entries(result.threads as Record<string, Json>).map(([name, thread]) => [name, thread.notes])),
  }, null, 2));
}

await main();
