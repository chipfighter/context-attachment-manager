// Purpose: v0.10 — after Codex compacts a task, the images its compaction did not keep (opened with the image viewer)
// come back in the request as one line each, with the feature lines and ratings the model noted (docs/v0.10/plan.md,
// gates 5 and 7). Does the model take the right one by its line, and fetch it when it needs to look?
// Set up like v08-features-selftest.ts: a test engine of this checkout (its own port and data folder, --dump-requests for
// the bodies it sent), this checkout's plugin server attached to the test app-server for cam_view_image, the tools that
// act on the machine off, a read-only sandbox, the task archived at the end. Automatic selection is on by default.
// Thread V: a character's medium shot (an upload, which the compaction keeps); two scene images opened with the image
// viewer (tool outputs, which it does not); the user's ratings of the two; a compaction; which scene the user called
// good (from the list, no tools); the digit in that scene's corner (only the original shows it: a fetch).
// Input: [--label name] [--lang zh|en] [--port 17911]; CAM_TEST_MODEL, CAM_TEST_EFFORT.
// Output: local/v10/compaction-<label>.json (synthetic images only).

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { AppServer, findBundledCodex } from "./appserver.ts";
import { codexHome } from "../../plugin/src/adapters/codex/codexconfig.ts";
import { engineHealth } from "../../plugin/src/engine.ts";
import { languageFileOf, rememberLang, type Lang } from "../../plugin/src/language.ts";
import { loadThreadIndex } from "../../plugin/src/adapters/codex/thread-index.ts";
import { archiveThreads, CORNER_IMAGES, png, runTurn, says, TEST_EFFORT, TEST_MODEL, text } from "./testkit.ts";

type Json = Record<string, any>;
const here = dirname(fileURLToPath(import.meta.url));
const localRoot = join(resolve(here, "../.."), "local");

// A character's medium shot: a face over a blue shirt.
const medium = () => png(512, 512, (x, y) => {
  const r = (cx: number, cy: number, radius: number) => (x - cx) ** 2 + (y - cy) ** 2 < radius ** 2;
  if (r(236, 150, 6) || r(276, 150, 6)) return [30, 30, 30];
  if (r(256, 150, 55)) return y < 122 ? [60, 40, 30] : [235, 190, 160];
  if (y >= 215 && Math.abs(x - 256) < 70 + (y - 215) * 0.35) return [40, 90, 170];
  return [200, 215, 230];
});

const SCRIPT = {
  zh: {
    name: (label: string) => `[CAM测试] 压缩放回自测 ${label}`,
    character: "这是女主的设定图，简单描述一下。",
    view: "请用看图工具分别打开当前目录下的 a.png 和 b.png，这是两张场景图，简单描述一下。",
    rate: "a.png 那张场景的颜色很好，b.png 太暗了。",
    which: "压缩之前我让你看过两张场景图。我说颜色很好的是哪一张？说出它的编号和文件名，不要调用任何工具。",
    digit: "颜色很好的那张场景图，角落里有一个数字，是几？",
    putBack: /这个任务压缩过对话/,
  },
  en: {
    name: (label: string) => `[CAM test] compaction put-back self-test ${label}`,
    character: "This is the main character's reference sheet. Describe it briefly.",
    view: "Open a.png and b.png in the current folder with your image viewer; they are two scene images. Describe them briefly.",
    rate: "The colors of the a.png scene are good; b.png is too dark.",
    which: "Before the compaction I had you look at two scene images. Which one did I say has good colors? Give its ID and file name, and do not call any tools.",
    digit: "The scene image with the good colors has a number in one corner. What is it?",
    putBack: /this task's conversation was compacted/,
  },
};

async function main(): Promise<void> {
  const option = (name: string, fallback: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
  const label = option("--label", "run1");
  const lang: Lang = option("--lang", "zh") === "en" ? "en" : "zh";
  const port = Number(option("--port", "17911"));
  const words = SCRIPT[lang];
  const root = join(localRoot, "v10");
  const data = join(root, `data-${label}`);
  const work = join(root, "work", label);
  mkdirSync(work, { recursive: true });
  for (const name of ["a.png", "b.png"]) writeFileSync(join(work, name), CORNER_IMAGES[name]());
  writeFileSync(join(work, "m.png"), medium());
  rememberLang(lang, "codex", languageFileOf(data));
  const sessionsDir = join(codexHome(), "sessions");
  // What the engine did to each HTTP request of the thread since a moment.
  const logged = (threadId: string, since: string): Json[] => {
    const dir = join(data, "proxy");
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter((name) => name.endsWith(".jsonl")).flatMap((name) => readFileSync(join(dir, name), "utf8").split("\n"))
      .flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } })
      .filter((entry) => entry.threadId === threadId && entry.at >= since && /\/responses$/.test(entry.path ?? "") && entry.transport !== "websocket")
      .map((entry) => ({ at: entry.at, compacted: entry.rewrite?.compacted ?? null, replaced: (entry.rewrite?.replaced ?? []).map((r: Json) => r.id) }));
  };
  // The developer messages the engine put after the compaction item, in the first body it sent since a moment.
  const putBackSince = (since: string): string[] => {
    const dir = join(data, "p2", "requests");
    const first = existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith(".sent.json") && name >= since.replace(/:/g, "-")).sort()[0] : undefined;
    if (!first) return [];
    const input = JSON.parse(readFileSync(join(dir, first), "utf8")).body.input as Json[];
    const at = input.findIndex((item) => item.type === "compaction");
    return at < 0 ? [] : input.slice(at + 1).filter((item) => item.role === "developer").map((item) => item.content.map((part: Json) => part.text).join("\n"));
  };
  // The plugin server's fetches (cam_view_image), from its log in the test data folder.
  const fetches = (threadId: string, since: string): string[][] => {
    const file = join(data, "plugin-server.jsonl");
    if (!existsSync(file)) return [];
    return readFileSync(file, "utf8").split("\n").flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } })
      .filter((entry) => entry.event === "fetch" && entry.threadId === threadId && entry.at >= since).map((entry) => entry.ids ?? []);
  };

  const engine = spawn(process.execPath, [join(here, "..", "..", "plugin", "src", "proxy.ts"), "--port", String(port), "--stay", "--dump-requests"], { env: { ...process.env, CAM_DATA_DIR: data }, stdio: "ignore", windowsHide: true });
  for (let i = 0; i < 50 && !(await engineHealth(port)); i++) await sleep(200);
  const off = ["computer-use@openai-bundled", "unified-computer-use@openai-bundled", "chrome@openai-bundled", "browser@openai-bundled", "codex-app-tools@openai-bundled"]
    .flatMap((plugin) => ["-c", `plugins.${plugin}.enabled=false`]);
  const env = { CODEX_HOME: codexHome(), CAM_DATA_DIR: data, CAM_NO_ENGINE: "1" };
  const plugin = [
    "-c", `mcp_servers.cam_dev.command=${JSON.stringify(process.execPath)}`,
    "-c", `mcp_servers.cam_dev.args=${JSON.stringify([join(here, "..", "..", "plugin", "src", "plugin-server.ts")])}`,
    "-c", `mcp_servers.cam_dev.env={ ${Object.entries(env).map(([name, value]) => `${name} = ${JSON.stringify(value)}`).join(", ")} }`,
    "-c", `mcp_servers.cam_dev.default_tools_approval_mode="approve"`,
    "-c", "mcp_servers.cam_dev.startup_timeout_sec=20",
  ];
  const server = new AppServer(findBundledCodex(), ["-c", `openai_base_url="http://localhost:${port}/backend-api/codex"`, "-c", "features.respect_system_proxy=true", "-c", "notify=[]", "-c", "mcp_servers.node_repl.enabled=false", ...off, ...plugin], { NO_PROXY: undefined, no_proxy: undefined }, join(root, `appserver-${label}.log`));
  const result: Json = { createdAt: new Date().toISOString(), label, lang, model: TEST_MODEL, effort: TEST_EFFORT };
  const created: string[] = [];
  try {
    await server.initialize();
    const { thread } = await server.request<{ thread: Json }>("thread/start", { model: TEST_MODEL, cwd: work, approvalPolicy: "never", sandbox: "read-only", ephemeral: false });
    const id = thread.id as string;
    created.push(id);
    await server.request("thread/name/set", { threadId: id, name: words.name(label) });
    const turn = async (prompt: string, images: string[] = []) => {
      const since = new Date().toISOString();
      const done = await runTurn(server, id, [text(prompt), ...images.map((file) => ({ type: "localImage", path: join(work, file) }))]);
      await sleep(1500);
      return { ...done, requests: logged(id, since), fetched: fetches(id, since), since };
    };
    const turns: Json = {};
    turns.character = await turn(words.character, ["m.png"]);
    turns.view = await turn(words.view);
    turns.rate = await turn(words.rate);
    const before = server.notifications.length;
    const known = new Set(Object.values(turns).map((t: Json) => t.turnId));
    await server.request("thread/compact/start", { threadId: id });
    const isNew = (n: { params: Json }) => server.notifications.indexOf(n as any) >= before && n.params?.threadId === id && !known.has(n.params.turn?.id);
    const compactTurn = await server.waitFor((n) => n.method === "turn/started" && isNew(n), 60_000).then((n) => n.params.turn.id as string, () => null);
    result.compaction = compactTurn ? await server.waitFor((n) => n.method === "turn/completed" && n.params.turn?.id === compactTurn, 5 * 60_000).then((n) => n.params.turn.status, () => "timeout") : "no compaction turn";
    await sleep(1500);
    turns.which = await turn(words.which);
    turns.digit = await turn(words.digit);
    result.turns = turns;
    result.putBack = putBackSince(turns.which.since);
    const index = loadThreadIndex(sessionsDir, id);
    result.images = index.images.map((image) => ({ id: image.id, kind: image.kind, name: image.name, turn: image.turn, compacted: !!image.compacted }));
    result.notes = Object.fromEntries(index.notes);
  } finally {
    result.notArchived = await archiveThreads(server, created);
    await server.stop();
    engine.kill();
  }

  const idOf = (name: string) => (result.images ?? []).find((image: Json) => image.name === name)?.id ?? null;
  const a = idOf("a.png");
  const b = idOf("b.png");
  const list = (result.putBack ?? []).join("\n");
  result.checks = {
    compacted: result.compaction === "completed",
    // The two scenes opened with the viewer were left out by the compaction; the upload was kept.
    viewedCompacted: !!a && !!b && (result.images as Json[]).filter((image) => image.compacted).map((image) => image.id).sort().join() === [a, b].sort().join(),
    // The first request after it carries them as lines, with what the model noted.
    putBack: words.putBack.test(list) && !!a && !!b && list.includes(`${a}${lang === "zh" ? "｜" : " | "}a.png`) && list.includes(`${b}${lang === "zh" ? "｜" : " | "}b.png`),
    putBackRated: !!a && new RegExp(`${a}[^\\n]*(评价|rated)`).test(list),
    loggedPutBack: (result.turns?.which?.requests ?? []).some((request: Json) => request.compacted?.listed === 2),
    // Which one the user called good, from the list alone.
    picksFromList: !!a && String(result.turns?.which?.reply ?? "").includes(a) && !(result.turns?.which?.tools ?? []).some((tool: string) => /mcp/i.test(tool)),
    // Its corner digit needs the original: fetched by its id.
    fetchesIt: !!a && (result.turns?.digit?.fetched ?? []).some((ids: string[]) => ids.includes(a)),
    answersDigit: says(String(result.turns?.digit?.reply ?? ""), 7),
  };
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, `compaction-${label}.json`), JSON.stringify(result, null, 2));
  const brief = (t: Json) => ({ status: t?.status, tools: t?.tools, fetched: t?.fetched, reply: String(t?.reply ?? "").slice(0, 200) });
  console.log(JSON.stringify({ label, lang, model: TEST_MODEL, notArchived: result.notArchived, checks: result.checks, images: result.images, which: brief(result.turns?.which), digit: brief(result.turns?.digit), putBack: list.slice(0, 1200) }, null, 2));
}

await main();
