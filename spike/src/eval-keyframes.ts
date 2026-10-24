// Purpose: eval — the plugin against no plugin on one short keyframe task of a short drama (eval/README.md).
// Nine synthetic keyframes (1024×1536, grain added so they weigh what generated images weigh) are uploaded over six turns.
// The user says once what the two leads look like, then where each scene takes place ("scene 3, on the beach at dusk,
// two of them") but never which image is which, and rates by position ("the first one last turn is too dark"): which of
// a scene's images shows whom, how close, is only in the model's own replies, which a compaction turns into a summary
// (Codex keeps the user's messages as they were). try1 had the user describe every image, so the questions after the
// compaction could be answered from the user's words alone; try3 never named the places, and the model did not take the
// synthetic beach (an orange sky over blue lines) and bamboo (green stripes) for what they were.
// Then questions with known answers: six ask for a file by what it shows or by what the user said, two ask for a digit
// hidden in a corner (only the original shows it), one needs no image.
// Arms, each with a test engine (its own port and data folder) and its own app-server:
// - off: Codex as it is. The engine only relays: every thread counts as older than automatic selection, so nothing is
//   rewritten and the WebSocket stays as Codex opens it; the engine logs how many bytes went up. No plugin server.
// - on: this checkout's plugin with automatic selection, on by default for a new task, and its plugin server for
//   cam_view_image.
// - v07: the same from the v0.7.1 release, before feature lines (v0.8): placeholders carry the id, name, source, turn and
//   size only. Its plugin folder comes from `git archive v0.7.1 plugin` into local/eval/v0.7.1.
// Threads per arm: X — the six turns, five of the find questions and the rest, then app-server restarts and the task is
// resumed (a new connection sends the whole conversation again) for the sixth; Y — the six turns, a compaction
// (thread/compact/start), all the questions. A step that fails or runs out of time ends its thread.
// Set up like v08-features-selftest.ts: the tools that act on the machine off, the installed plugin off, a read-only
// sandbox, the tasks archived at the end.
// Input: [--label name] [--arms off,on,v07] [--threads X,Y] [--port 17905] [--draw (write the images and stop)];
// CAM_TEST_MODEL, CAM_TEST_EFFORT. Output: local/eval/<label>/<arm>.json and a console summary (synthetic images only).

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { AppServer, findBundledCodex } from "./appserver.ts";
import { codexHome } from "../../plugin/src/codexconfig.ts";
import { engineHealth } from "../../plugin/src/engine.ts";
import { languageFileOf, rememberLang } from "../../plugin/src/language.ts";
import { selectionDirOf } from "../../plugin/src/paths.ts";
import { loadThreadIndex } from "../../plugin/src/thread-index.ts";
import { archiveThreads, png, TEST_EFFORT, TEST_MODEL, text } from "./testkit.ts";

type Json = Record<string, any>;
type Rgb = [number, number, number];
const here = dirname(fileURLToPath(import.meta.url));
const localRoot = join(resolve(here, "../.."), "local");
const STEP_TIMEOUT = 10 * 60_000;
// A question sends no image: try1 answered each in 30 s or less. Without the plugin, the one after a restart or a
// compaction resends the whole conversation (42.4 MB), refused every time, a retry a minute, each one uploading 32 MB
// through the user's proxy: a few refusals show it.
const QUESTION_TIMEOUT = 3 * 60_000;

// ---- The keyframes ----

const W = 1024, H = 1536;
type Scene = "study" | "rain" | "beach" | "bamboo";
type Keyframe = { key: string; file: string; scene: Scene; who: "her" | "him" | null; shot: "medium" | "close" | "wide"; dark?: boolean; digit: string; corner: "tl" | "tr" | "bl" | "br" };
// File names say nothing of the picture, so the model has to tell them apart by what it saw and what the user said.
const KEYFRAMES: Keyframe[] = [
  { key: "S1", file: "hqkm.png", scene: "study", who: "her", shot: "medium", digit: "4", corner: "tl" },
  { key: "S2", file: "wdfa.png", scene: "study", who: "him", shot: "medium", digit: "6", corner: "br" },
  { key: "R1", file: "pvrs.png", scene: "rain", who: "her", shot: "close", dark: true, digit: "9", corner: "tr" },
  { key: "R2", file: "cnlo.png", scene: "rain", who: null, shot: "wide", digit: "2", corner: "bl" },
  { key: "R3", file: "mtgb.png", scene: "rain", who: "her", shot: "close", digit: "8", corner: "br" },
  { key: "B1", file: "zrue.png", scene: "beach", who: "him", shot: "medium", digit: "3", corner: "tl" },
  { key: "B2", file: "fxai.png", scene: "beach", who: "her", shot: "close", digit: "5", corner: "tr" },
  { key: "Z1", file: "jbwe.png", scene: "bamboo", who: "her", shot: "medium", digit: "0", corner: "bl" },
  { key: "Z2", file: "tyop.png", scene: "bamboo", who: "him", shot: "close", digit: "7", corner: "br" },
];
const fileOf = (key: string) => KEYFRAMES.find((frame) => frame.key === key)!.file;

const FONT: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};
const SCALE = 10, MARGIN = 48;
const digitAt = (frame: Keyframe) => {
  const left = frame.corner.endsWith("l") ? MARGIN : W - MARGIN - 5 * SCALE;
  const top = frame.corner.startsWith("t") ? MARGIN : H - MARGIN - 7 * SCALE;
  return (x: number, y: number) => {
    const col = Math.floor((x - left) / SCALE), row = Math.floor((y - top) / SCALE);
    return x >= left && y >= top && col < 5 && row < 7 && FONT[frame.digit][row][col] === "1";
  };
};

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const inCircle = (x: number, y: number, cx: number, cy: number, r: number) => (x - cx) ** 2 + (y - cy) ** 2 < r * r;

function background(scene: Scene, x: number, y: number): Rgb {
  switch (scene) {
    case "study": {
      // A warm wall and a bookshelf: rows of coloured spines.
      if (y < 160 || y > 1150) return [150, 105, 70];
      const row = (y - 160) % 200;
      if (row < 18) return [90, 55, 30];
      const spines: Rgb[] = [[170, 40, 40], [40, 90, 140], [200, 170, 60], [60, 120, 70], [120, 80, 140]];
      return x % 44 < 4 ? [90, 55, 30] : spines[Math.floor(x / 44 + Math.floor((y - 160) / 200) * 2) % spines.length];
    }
    case "rain": {
      // Night: dark blue, a street lamp's glow.
      const base = mix([15, 20, 45], [40, 45, 75], y / H);
      const glow = Math.max(0, 1 - Math.hypot(x - 840, y - 280) / 260);
      return mix(base, [235, 205, 120], glow * glow);
    }
    case "beach": {
      // Sunset: an orange sky, the sun on the horizon, the sea.
      if (y >= 940) return (y - 940) % 60 < 6 ? [90, 130, 170] : [40, 80, 130];
      if (inCircle(x, y, 512, 940, 170)) return [255, 222, 130];
      return mix([240, 120, 80], [252, 196, 150], y / 940);
    }
    case "bamboo": {
      // Green stalks with darker joints.
      const stalk = x % 170 < 38;
      if (!stalk) return [80, 140, 80];
      return y % 230 < 12 ? [25, 70, 30] : [40, 100, 45];
    }
  }
}

const SKIN: Rgb = [235, 195, 165], EYE: Rgb = [30, 25, 25], WHITE: Rgb = [248, 248, 248], LIPS: Rgb = [170, 70, 70];
const LOOK = { her: { hair: [25, 20, 20] as Rgb, outfit: [190, 30, 40] as Rgb, long: true }, him: { hair: [75, 48, 25] as Rgb, outfit: [40, 70, 150] as Rgb, long: false } };

// A person in a red dress with long black hair, or in blue with short brown hair; a medium shot or a close-up.
function person(frame: Keyframe, x: number, y: number): Rgb | null {
  if (!frame.who || frame.shot === "wide") return null;
  const look = LOOK[frame.who];
  const close = frame.shot === "close";
  const [cx, cy, r] = close ? [512, 700, 380] : [512, 600, 105];
  if (inCircle(x, y, cx, cy, r)) {
    const eyeY = cy + r * 0.05, eyeX = r * 0.38;
    for (const ex of [cx - eyeX, cx + eyeX]) {
      if (inCircle(x, y, ex, eyeY, r * 0.07)) return EYE;
      if (close && inCircle(x, y, ex, eyeY, r * 0.13)) return WHITE;
    }
    if (Math.abs(x - cx) < r * 0.28 && y > cy + r * 0.45 && y < cy + r * 0.53) return LIPS;
    if (y < cy - r * (look.long ? 0.35 : 0.45)) return look.hair;
    return SKIN;
  }
  const neckTop = cy + r * 0.85, shoulders = cy + r * (close ? 1.25 : 1.35);
  // Long hair: around the head, then down both sides, leaving the neck and the dress in front.
  const off = Math.abs(x - cx);
  if (look.long && off < r * 1.3 && y > cy - r * 0.9 && (y < cy + r * 0.5 || (off > r * 0.6 && y < cy + r * (close ? 1.6 : 2.6)))) return look.hair;
  if (!look.long && inCircle(x, y, cx, cy - r * 0.1, r * 1.08) && y < cy - r * 0.2) return look.hair;
  if (Math.abs(x - cx) < r * 0.3 && y >= neckTop && y < shoulders) return SKIN;
  if (y >= shoulders && Math.abs(x - cx) < r * 1.4 + (y - shoulders) * (close ? 0.8 : 0.3)) return look.outfit;
  return null;
}

function draw(frame: Keyframe): Buffer {
  let state = 0x9e3779b9 ^ frame.file.split("").reduce((sum, ch) => sum * 31 + ch.charCodeAt(0), 7);
  const grain = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return ((state >>> 0) % 17) - 8; };
  const isDigit = digitAt(frame);
  const light = frame.scene === "study" || frame.scene === "beach";
  return png(W, H, (x, y) => {
    let rgb = person(frame, x, y) ?? background(frame.scene, x, y);
    // Rain falls in front of everything.
    if (frame.scene === "rain" && (x + Math.floor(y * 0.3)) % 37 < 2 && y % 90 < 60) rgb = mix(rgb, [170, 180, 210], 0.6);
    if (frame.dark) rgb = [rgb[0] * 0.38, rgb[1] * 0.38, rgb[2] * 0.38];
    if (isDigit(x, y)) rgb = light ? [15, 15, 15] : [245, 245, 245];
    return [rgb[0], rgb[1], rgb[2]].map((value) => Math.max(0, Math.min(255, Math.round(value + grain())))) as Rgb;
  });
}

// ---- The conversation ----

// The user's words say where each scene takes place, never which image is which; ratings go by position.
const SCRIPT: Array<{ prompt: string; images: string[] }> = [
  { prompt: "这部短剧的女主穿红衣、黑色长发，男主穿蓝衣、棕色短发。第一场在书房，这是两张关键帧，先简单看一下，一两句话就行。", images: ["S1", "S2"] },
  { prompt: "第二场在雨夜的街上，两张，简单看一下。", images: ["R1", "R2"] },
  { prompt: "上一轮第一张太暗了，这是重出的一版。简单看一下。", images: ["R3"] },
  { prompt: "第三场在黄昏的海边，两张，简单看一下。", images: ["B1", "B2"] },
  { prompt: "上一轮第二张，脸是目前最好的。", images: [] },
  { prompt: "第四场在竹林，两张，简单看一下。", images: ["Z1", "Z2"] },
];

// Find questions name a scene and what the image shows (or what the user said), never a position: picking among a
// scene's images takes remembering them. No question touches an image another one asks about, so one answer gives
// nothing away for the next.
type Question = { key: string; kind: "find" | "detail" | "none"; prompt: string; answer: string; needs?: string };
const FIND: Question[] = [
  { key: "F1", kind: "find", prompt: "雨夜街上、画面里没有人的那张空镜，是哪个文件？只回答文件名。", answer: fileOf("R2") },
  { key: "F2", kind: "find", prompt: "我说过脸最好的是哪张？只回答文件名。", answer: fileOf("B2") },
  { key: "F3", kind: "find", prompt: "雨夜里女主的近景有两版，我要用重出的那一版，是哪个文件？只回答文件名。", answer: fileOf("R3") },
  { key: "F4", kind: "find", prompt: "书房里男主的中景是哪个文件？只回答文件名。", answer: fileOf("S2") },
  { key: "F5", kind: "find", prompt: "海边男主的中景是哪个文件？只回答文件名。", answer: fileOf("B1") },
  { key: "F6", kind: "find", prompt: "竹林里女主的中景是哪个文件？只回答文件名。", answer: fileOf("Z1") },
];
const REST: Question[] = [
  { key: "D1", kind: "detail", prompt: "竹林里男主的近景，角落里有一个数字，是几？只回答数字。", answer: "7", needs: "Z2" },
  { key: "D2", kind: "detail", prompt: "书房里女主的中景，角落里有一个数字，是几？只回答数字。", answer: "4", needs: "S1" },
  { key: "N1", kind: "none", prompt: "把“今天天气很好”翻译成英文。", answer: "weather" },
];
// Thread X asks F6 after app-server restarts; thread Y asks them all after the compaction.
const BEFORE_RESTART = [...FIND.slice(0, 5), ...REST];
const AFTER_RESTART = FIND[5];
const AFTER_COMPACTION = [...FIND, ...REST];

// The model's record lines ([//]: # (cam …)) are not part of what the user sees.
const visible = (reply: string) => reply.replace(/\[\/\/\]:[ \t]*#[ \t]*\(cam[^)\n]*\)/g, "").trim();
const CN_DIGITS: Record<string, string> = { 零: "0", 一: "1", 二: "2", 三: "3", 四: "4", 五: "5", 六: "6", 七: "7", 八: "8", 九: "9" };

// right, wrong (another file or digit), or none (no file or digit in the answer: "I can't tell" and the like).
function score(question: Question, reply: string): { verdict: "right" | "wrong" | "none"; said: string | null } {
  const shown = visible(reply);
  if (question.kind === "find") {
    const said = /\b([a-z]{4})\.png\b/i.exec(shown)?.[0].toLowerCase() ?? null;
    return { verdict: said === null ? "none" : said === question.answer ? "right" : "wrong", said };
  }
  if (question.kind === "detail") {
    const clean = shown.replace(/\b[a-z]{4}\.png\b/gi, "").replace(/IMG-\d{3}/g, "");
    const match = /(?<![0-9])[0-9](?![0-9])|[零一二三四五六七八九]/.exec(clean)?.[0] ?? null;
    const said = match === null ? null : CN_DIGITS[match] ?? match;
    return { verdict: said === null ? "none" : said === question.answer ? "right" : "wrong", said };
  }
  return { verdict: /weather/i.test(shown) ? "right" : "wrong", said: shown.slice(0, 80) };
}

// ---- Running it ----

const megabytes = (bytes: number | null | undefined) => (typeof bytes === "number" ? Math.round(bytes / 10_000) / 100 : null);
// An HTTP request as the engine logged it: bytes on the wire and uncompressed, before and after a rewrite.
const requestOf = (entry: Json) => ({
  path: entry.path.replace(/^.*\/responses/, "responses"), status: entry.status, wire: entry.requestBytes, decoded: entry.decodedBytes, images: entry.images ?? null, error: entry.error,
  ...(entry.rewrite ? { before: entry.rewrite.decodedBefore ?? null, after: entry.rewrite.decodedAfter ?? null, wireAfter: entry.rewrite.encodedAfter ?? null, replaced: (entry.rewrite.replaced ?? []).length } : {}),
});

type Arm = "off" | "on" | "v07";
// Where each arm's engine and plugin server come from.
const pluginSrc = (arm: Arm) => (arm === "v07" ? join(localRoot, "eval", "v0.7.1", "plugin", "src") : join(here, "..", "..", "plugin", "src"));

async function runArm(arm: Arm, label: string, port: number, only: string[], work: string): Promise<Json> {
  const root = join(localRoot, "eval", label);
  const data = join(root, `data-${arm}`);
  const selections = selectionDirOf(data);
  mkdirSync(selections, { recursive: true });
  // off: every thread counts as started before automatic selection existed, so the engine rewrites nothing.
  if (arm === "off") writeFileSync(join(selections, "auto-default.json"), JSON.stringify({ since: "2999-01-01T00:00:00.000Z" }, null, 2));
  rememberLang("zh", "codex", languageFileOf(data));
  const sessionsDir = join(codexHome(), "sessions");
  const engineLog = (): Json[] => {
    const dir = join(data, "proxy");
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter((name) => name.endsWith(".jsonl")).flatMap((name) => readFileSync(join(dir, name), "utf8").split("\n"))
      .flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } });
  };

  const engine = spawn(process.execPath, [join(pluginSrc(arm), "proxy.ts"), "--port", String(port), "--stay", ...(arm === "off" ? [] : ["--dump-requests"])], { env: { ...process.env, CAM_DATA_DIR: data }, stdio: "ignore", windowsHide: true });
  for (let i = 0; i < 50 && !(await engineHealth(port)); i++) await sleep(200);
  // Nothing that acts on the machine, and not the installed plugin: the test engine and plugin server stand in for it.
  const off = ["computer-use@openai-bundled", "unified-computer-use@openai-bundled", "chrome@openai-bundled", "browser@openai-bundled", "codex-app-tools@openai-bundled", "codex-attachment-manager@codex-attachment-manager"]
    .flatMap((plugin) => ["-c", `plugins.${plugin}.enabled=false`]);
  const env = { CODEX_HOME: codexHome(), CAM_DATA_DIR: data, CAM_NO_ENGINE: "1" };
  const plugin = arm === "off" ? [] : [
    "-c", `mcp_servers.cam_dev.command=${JSON.stringify(process.execPath)}`,
    "-c", `mcp_servers.cam_dev.args=${JSON.stringify([join(pluginSrc(arm), "plugin-server.ts")])}`,
    "-c", `mcp_servers.cam_dev.env={ ${Object.entries(env).map(([name, value]) => `${name} = ${JSON.stringify(value)}`).join(", ")} }`,
    "-c", `mcp_servers.cam_dev.default_tools_approval_mode="approve"`,
    "-c", "mcp_servers.cam_dev.startup_timeout_sec=20",
  ];
  const args = ["-c", `openai_base_url="http://localhost:${port}/backend-api/codex"`, "-c", "features.respect_system_proxy=true", "-c", "notify=[]", "-c", "mcp_servers.node_repl.enabled=false", ...off, ...plugin];
  const newServer = () => new AppServer(findBundledCodex(), args, { NO_PROXY: undefined, no_proxy: undefined }, join(root, `appserver-${arm}.log`));
  let server = newServer();
  const result: Json = { arm, createdAt: new Date().toISOString(), model: TEST_MODEL, effort: TEST_EFFORT, threads: {} };
  const created: string[] = [];

  // A turn with what it cost: the thread's token counts after it, the HTTP requests the engine saw, what was fetched.
  const step = async (threadId: string, name: string, prompt: string, images: string[] = [], timeoutMs = STEP_TIMEOUT): Promise<Json> => {
    const since = new Date().toISOString();
    const started = Date.now();
    const before = server.notifications.length;
    let turnId: string | null = null;
    let status = "failed to start";
    let error: unknown = null;
    try {
      const { turn } = await server.request<{ turn: Json }>("turn/start", { threadId, input: [text(prompt), ...images.map((key) => ({ type: "localImage", path: join(work, fileOf(key)) }))], effort: TEST_EFFORT }, 120_000);
      turnId = turn.id;
      const done = await server.waitFor((n) => n.method === "turn/completed" && n.params.turn?.id === turnId, timeoutMs);
      status = done.params.turn.status;
      error = done.params.turn.error ?? null;
    } catch (thrown) {
      error = String(thrown);
      if (turnId) {
        status = "timeout";
        try { await server.request("turn/interrupt", { threadId, turnId }, 30_000); } catch { /* the turn may be gone */ }
      }
    }
    // The engine records a request once its response has ended, which can be just after the turn completes.
    await sleep(1500);
    const mine = server.notifications.slice(before).filter((n) => turnId && (n.params?.turnId === turnId || n.params?.turn?.id === turnId));
    const items = mine.filter((n) => n.method === "item/completed").map((n) => n.params.item);
    const usage = mine.filter((n) => n.method === "thread/tokenUsage/updated").map((n) => n.params.tokenUsage).at(-1) ?? null;
    let fetched: string[] = [];
    if (arm !== "off" && turnId) {
      const index = loadThreadIndex(sessionsDir, threadId);
      const number = index.turnNumbers.get(turnId) ?? null;
      const names = new Map(index.images.map((image) => [image.id, image.name]));
      fetched = [...new Set([...index.copies.values()].filter((copy) => copy.turn === number).map((copy) => names.get(copy.of) ?? copy.of))];
    }
    const requests = engineLog().filter((entry) => entry.threadId === threadId && entry.at >= since && entry.transport === "http" && /\/responses(\/compact)?$/.test(entry.path ?? ""))
      .map(requestOf);
    return {
      name, turnId, status, error, ms: Date.now() - started,
      reply: items.filter((item) => item.type === "agentMessage").map((item) => item.text).join(" "),
      tools: items.filter((item) => !["agentMessage", "reasoning", "userMessage"].includes(item.type)).map((item) => [item.type, item.server, item.tool].filter(Boolean).join(":")),
      fetched,
      retries: mine.filter((n) => n.method === "error").map((n) => ({ message: String(n.params.error?.message ?? "error").slice(0, 200), willRetry: n.params.willRetry ?? null })),
      usage, requests,
    };
  };
  const ask = async (threadId: string, question: Question) => {
    const done = await step(threadId, question.key, question.prompt, [], QUESTION_TIMEOUT);
    return { ...done, question: question.key, kind: question.kind, expected: question.answer, ...score(question, done.reply), needed: question.needs ? fileOf(question.needs) : null };
  };
  const ok = (done: Json) => done.status === "completed";
  const start = async (thread: string) => {
    const { thread: fresh } = await server.request<{ thread: Json }>("thread/start", { model: TEST_MODEL, cwd: work, approvalPolicy: "never", sandbox: "read-only", ephemeral: false });
    created.push(fresh.id);
    await server.request("thread/name/set", { threadId: fresh.id, name: `[CAM测试] 评测 ${thread} ${arm} ${label}` });
    return fresh.id as string;
  };
  const script = async (threadId: string, steps: Json[]) => {
    for (const [i, { prompt, images }] of SCRIPT.entries()) {
      const done = await step(threadId, `T${i + 1}`, prompt, images);
      steps.push(done);
      if (!ok(done)) return false;
    }
    return true;
  };
  const questions = async (threadId: string, steps: Json[], list: Question[]) => {
    for (const question of list) {
      const done = await ask(threadId, question);
      steps.push(done);
      if (!ok(done)) return false;
    }
    return true;
  };

  try {
    await server.initialize();
    if (only.includes("X")) {
      const id = await start("X");
      const steps: Json[] = [];
      let alive = await script(id, steps) && await questions(id, steps, BEFORE_RESTART);
      if (alive) {
        // A new connection: Codex sends the whole conversation, where a WebSocket kept open only sends what is new.
        await server.stop();
        server = newServer();
        await server.initialize();
        const restarted = Date.now();
        try { await server.request("thread/resume", { threadId: id, approvalPolicy: "never", sandbox: "read-only" }, 300_000); }
        catch (thrown) { steps.push({ name: "resume", status: "failed", error: String(thrown), ms: Date.now() - restarted }); alive = false; }
        if (alive) steps.push(await ask(id, AFTER_RESTART));
      }
      result.threads.X = { threadId: id, steps };
    }
    if (only.includes("Y")) {
      const id = await start("Y");
      const steps: Json[] = [];
      if (await script(id, steps)) {
        // The compaction runs as a turn of its own: find it, wait for it to end.
        const before = server.notifications.length;
        const since = new Date().toISOString();
        const started = Date.now();
        const known = new Set(steps.map((done) => done.turnId));
        let compaction = "failed to start";
        let turnId: string | null = null;
        try {
          await server.request("thread/compact/start", { threadId: id });
          const isNew = (n: { params: Json }) => server.notifications.indexOf(n as any) >= before && n.params?.threadId === id && !known.has(n.params.turn?.id);
          turnId = await server.waitFor((n) => n.method === "turn/started" && isNew(n), 60_000).then((n) => n.params.turn.id as string, () => null);
          compaction = turnId ? await server.waitFor((n) => n.method === "turn/completed" && n.params.turn?.id === turnId, STEP_TIMEOUT).then((n) => n.params.turn.status, () => "timeout") : "no compaction turn";
        } catch (thrown) { compaction = `failed: ${String(thrown)}`; }
        await sleep(1500);
        const usage = server.notifications.slice(before).filter((n) => turnId && n.method === "thread/tokenUsage/updated" && n.params?.turnId === turnId).map((n) => n.params.tokenUsage).at(-1) ?? null;
        const requests = engineLog().filter((entry) => entry.threadId === id && entry.at >= since && entry.transport === "http")
          .map(requestOf);
        steps.push({ name: "compact", turnId, status: compaction, ms: Date.now() - started, usage, requests });
        if (compaction === "completed") await questions(id, steps, AFTER_COMPACTION);
      }
      result.threads.Y = { threadId: id, steps };
    }
  } finally {
    result.notArchived = await archiveThreads(server, created);
    await server.stop();
    // The engine logs a WebSocket when it closes: by now every connection of this arm has.
    await sleep(1500);
    engine.kill();
  }
  result.websockets = engineLog().filter((entry) => entry.transport === "websocket")
    .map((entry) => ({ at: entry.at, threadId: entry.threadId ?? null, event: entry.event ?? null, declined: entry.declined ?? null, up: entry.upBytes ?? null, down: entry.downBytes ?? null, ms: entry.ms ?? null, error: entry.error ?? null }));
  return result;
}

function summarize(result: Json): void {
  console.log(`\n== ${result.arm} (${result.model}, ${result.effort})`);
  for (const [name, thread] of Object.entries(result.threads as Record<string, Json>)) {
    let previous: Json | null = null;
    const rows = (thread.steps as Json[]).map((done) => {
      const total = done.usage?.total ?? null;
      const row = {
        step: done.name, status: done.status, s: Math.round((done.ms ?? 0) / 1000),
        inTok: total && previous ? total.inputTokens - previous.inputTokens : total?.inputTokens ?? null,
        cachedTok: total && previous ? total.cachedInputTokens - previous.cachedInputTokens : total?.cachedInputTokens ?? null,
        context: done.usage?.last?.inputTokens ?? null,
        fullMB: megabytes(Math.max(0, ...(done.requests ?? []).map((r: Json) => r.before ?? r.decoded ?? 0)) || null),
        sentMB: megabytes(Math.max(0, ...(done.requests ?? []).map((r: Json) => r.after ?? r.decoded ?? 0)) || null),
        answer: done.verdict ? `${done.verdict} ${done.said ?? ""}`.trim() : "",
        fetched: (done.fetched ?? []).join(","),
      };
      if (total) previous = total;
      return row;
    });
    console.log(`-- thread ${name}`);
    console.table(rows);
  }
  const sockets = (result.websockets as Json[]).filter((socket) => socket.up !== null);
  if (sockets.length) console.table(sockets.map((socket) => ({ at: socket.at, thread: String(socket.threadId ?? "").slice(-6), upMB: megabytes(socket.up), downMB: megabytes(socket.down), s: Math.round((socket.ms ?? 0) / 1000) })));
  const declined = (result.websockets as Json[]).filter((socket) => socket.declined);
  if (declined.length) console.log(`websockets declined: ${declined.length} (${[...new Set(declined.map((socket) => socket.declined))].join(", ")})`);
}

async function main(): Promise<void> {
  const option = (name: string, fallback: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
  const label = option("--label", "run1");
  const arms = option("--arms", "off,on,v07").split(",") as Arm[];
  const only = option("--threads", "X,Y").split(",");
  const port = Number(option("--port", "17905"));
  const root = join(localRoot, "eval", label);
  const work = join(root, "work");
  mkdirSync(work, { recursive: true });
  for (const frame of KEYFRAMES) writeFileSync(join(work, frame.file), draw(frame));
  console.log(KEYFRAMES.map((frame) => `${frame.key} ${frame.file} ${megabytes(statSync(join(work, frame.file)).size)} MB`).join("\n"));
  if (process.argv.includes("--draw")) return;
  // Each arm its own engine; the second sits two ports up (an engine also takes the next port for its routes).
  for (const [i, arm] of arms.entries()) {
    const result = await runArm(arm, label, port + i * 2, only, work);
    result.images = KEYFRAMES.map((frame) => ({ ...frame, bytes: statSync(join(work, frame.file)).size }));
    writeFileSync(join(root, `${arm}.json`), JSON.stringify(result, null, 2));
    summarize(result);
  }
}

await main();
