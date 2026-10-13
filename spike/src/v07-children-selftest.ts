// Purpose: v0.7 — subagents and side chats end to end (docs/v0.7/plan.md §5). A side chat's requests leave out the
// images of the task it came from, and the model there fetches one from that task when the answer needs it; a subagent
// started without history has the images of its earlier turns left out and fetches one back; with the task's switch for
// them off, their requests go out as they are; the task's panel lists them.
// Set up like v03-auto-selftest.ts: a test engine of this checkout (its own port and data folder), this checkout's
// plugin server attached to the test app-server for cam_view_image, Codex's multi_agent_v2 on (spawn_agent's
// fork_turns), the tools that act on the machine off, a read-only sandbox, and the tasks archived at the end (their
// subagents go with them; a side chat is kept in memory only). The side chat is opened as Codex opens one (an ephemeral
// fork), with a short instruction like the one Codex gives it.
// Thread S: a side chat asks a text question, then about a detail of an image. Thread C: a subagent views an image in
// its first turn and is asked about a detail of it in its second, which the main task gives it with followup_task
// (Codex takes no input for a multi_agent_v2 subagent from the app-server). Thread O: the same with the switch off.
// Input: [--label name] [--lang zh|en] [--port 17898] [--threads S,C,O]; CAM_TEST_MODEL, CAM_TEST_EFFORT.
// Output: local/v07/children-<label>.json (synthetic images only).

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { AppServer, findBundledCodex } from "./appserver.ts";
import { codexHome } from "../../plugin/src/codexconfig.ts";
import { engineHealth } from "../../plugin/src/engine.ts";
import { languageFileOf, rememberLang, type Lang } from "../../plugin/src/language.ts";
import { loadPanelState } from "../../plugin/src/panel-state.ts";
import { requestStatsDirOf, selectionDirOf } from "../../plugin/src/paths.ts";
import { readRequestStats } from "../../plugin/src/request-stats.ts";
import { writeSelection } from "../../plugin/src/selection.ts";
import { loadThreadIndex, threadsStartedSince } from "../../plugin/src/thread-index.ts";
import { archiveThreads, CORNER_IMAGES, runTurn, says, TEST_EFFORT, TEST_MODEL, text } from "./testkit.ts";

type Json = Record<string, any>;
const here = dirname(fileURLToPath(import.meta.url));
const localRoot = join(resolve(here, "../.."), "local");

const SCRIPT = {
  zh: {
    name: (label: string, thread: string) => `[CAM测试] 子代理和旁聊自测 ${thread} ${label}`,
    uploadTwo: "这是两张测试图。分别用一句话说说它们的背景色和中间的主要形状，只说这两样，不要提角落里的东西。",
    sideNote: "这是从主任务分出来的旁聊，用来问一个小问题。在这之前的内容都是从主任务继承来的，只作参考，不要接着做里面的事。只回答在这之后提的问题。",
    sideText: "用一句话总结我们刚才在做什么。",
    detail: "a.png 右下角的数字是几？",
    // The full path: GPT-6 Luna's subagent did not find "a.png in the current folder" (2026-10-13).
    spawn: (path: string) => `用 spawn_agent 开一个子代理，fork_turns 设为 "none"，交给它这个任务：“用 view_image 工具查看 ${path}，然后用一句话说说它的背景色和中间的主要形状，只说这两样，不要提角落里的东西。”等它做完，把它的回答原样告诉我。`,
    followup: "用 followup_task 给你刚才开的那个子代理发一个后续任务：“a.png 右下角的数字是几？”等它答完，把它的回答原样告诉我。",
  },
  en: {
    name: (label: string, thread: string) => `[CAM test] subagents and side chats ${thread} ${label}`,
    uploadTwo: "Here are two test images. In one sentence each, give their background color and the main shape in the middle. Only those two things: don't mention anything in the corners.",
    sideNote: "This is a side chat forked from the main task for a quick question. Everything before this point is inherited from the main task and is for reference only; do not continue anything in it. Answer only what is asked after this point.",
    sideText: "In one sentence, sum up what we were just doing.",
    detail: "What is the number in the bottom-right corner of a.png?",
    spawn: (path: string) => `Use spawn_agent to start one subagent with fork_turns set to "none" and this task: "Use the view_image tool on ${path}, then give its background color and the main shape in the middle in one sentence. Only those two things: don't mention anything in the corners." Wait until it finishes, then tell me its answer as it is.`,
    followup: "Use followup_task to give the subagent you just started a follow-up task: \"What is the number in the bottom-right corner of a.png?\" Wait until it answers, then tell me its answer as it is.",
  },
};

async function main(): Promise<void> {
  const option = (name: string, fallback: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
  const label = option("--label", "run1");
  const lang: Lang = option("--lang", "zh") === "en" ? "en" : "zh";
  const port = Number(option("--port", "17898"));
  const only = option("--threads", "S,C,O").split(",");
  const words = SCRIPT[lang];
  const root = join(localRoot, "v07");
  const data = join(root, `data-${label}`);
  const work = join(root, "work", label);
  mkdirSync(work, { recursive: true });
  for (const name of ["a.png", "c.png"]) writeFileSync(join(work, name), CORNER_IMAGES[name]());
  rememberLang(lang, "codex", languageFileOf(data));
  const sessionsDir = join(codexHome(), "sessions");
  const startedMs = Date.now() - 5_000;

  const engine = spawn(process.execPath, [join(here, "..", "..", "plugin", "src", "proxy.ts"), "--port", String(port), "--stay"], { env: { ...process.env, CAM_DATA_DIR: data }, stdio: "ignore", windowsHide: true });
  for (let i = 0; i < 50 && !(await engineHealth(port)); i++) await sleep(200);
  // The plugin installed in the user's Codex too: its cam_view_image is another copy of the tool, and an older one may
  // not know side chats (the model's first fetch in a side chat went there and failed, 2026-10-14).
  const off = ["computer-use@openai-bundled", "unified-computer-use@openai-bundled", "chrome@openai-bundled", "browser@openai-bundled", "codex-app-tools@openai-bundled", "codex-attachment-manager@codex-attachment-manager"]
    .flatMap((plugin) => ["-c", `plugins.${plugin}.enabled=false`]);
  const env = { CODEX_HOME: codexHome(), CAM_DATA_DIR: data, CAM_NO_ENGINE: "1" };
  const plugin = [
    "-c", `mcp_servers.cam_dev.command=${JSON.stringify(process.execPath)}`,
    "-c", `mcp_servers.cam_dev.args=${JSON.stringify([join(here, "..", "..", "plugin", "src", "plugin-server.ts")])}`,
    "-c", `mcp_servers.cam_dev.env={ ${Object.entries(env).map(([name, value]) => `${name} = ${JSON.stringify(value)}`).join(", ")} }`,
    "-c", `mcp_servers.cam_dev.default_tools_approval_mode="approve"`,
    "-c", "mcp_servers.cam_dev.startup_timeout_sec=20",
  ];
  const server = new AppServer(findBundledCodex(), ["-c", `openai_base_url="http://localhost:${port}/backend-api/codex"`, "-c", "features.respect_system_proxy=true", "-c", "features.multi_agent_v2=true", "-c", "notify=[]", "-c", "mcp_servers.node_repl.enabled=false", ...off, ...plugin], { NO_PROXY: undefined, no_proxy: undefined }, join(root, `appserver-${label}.log`));
  const result: Json = { createdAt: new Date().toISOString(), label, lang, model: TEST_MODEL, effort: TEST_EFFORT, threads: {} };
  const created: string[] = [];
  // What the engine did to a thread's last full request, and how it went out.
  const lastOf = (threadId: string) => {
    const stats = readRequestStats(threadId, requestStatsDirOf(data));
    const rewrite = stats?.lastHttp?.rewrite ?? null;
    return { transport: stats?.latest?.transport ?? null, images: stats?.lastHttp?.images ?? null, rewrite: rewrite && { auto: rewrite.auto ?? false, sideChatOf: rewrite.sideChatOf ?? null, off: rewrite.off ?? false, replaced: (rewrite.replaced ?? []).map((r: Json) => r.id), skipped: rewrite.skipped ?? null } };
  };
  // The fetches the plugin server answered (its log), for a thread or the task a side chat came from.
  const fetches = () => {
    const file = join(data, "plugin-server.jsonl");
    if (!existsSync(file)) return [];
    return readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)).filter((entry) => entry.event === "fetch");
  };
  const subagentsOf = (threadId: string) => threadsStartedSince(sessionsDir, startedMs).filter((entry) => entry.meta?.source?.subagent?.thread_spawn?.parent_thread_id === threadId).map((entry) => entry.threadId);
  try {
    await server.initialize();
    const start = async (name: string) => {
      const { thread } = await server.request<{ thread: Json }>("thread/start", { model: TEST_MODEL, cwd: work, approvalPolicy: "never", sandbox: "read-only", ephemeral: false });
      created.push(thread.id);
      await server.request("thread/name/set", { threadId: thread.id, name: words.name(label, name) });
      return thread.id as string;
    };
    // The engine records a request once its response has ended, which can be just after the turn completes.
    const turn = async (threadId: string, prompt: string, images: string[] = []) => {
      const done = await runTurn(server, threadId, [text(prompt), ...images.map((file) => ({ type: "localImage", path: join(work, file) }))]);
      await sleep(1500);
      return { ...done, last: lastOf(threadId) };
    };
    const sideChat = async (threadId: string) => (await server.request<{ thread: Json }>("thread/fork", { threadId, ephemeral: true, excludeTurns: true, developerInstructions: words.sideNote })).thread.id as string;
    const threads: Record<string, () => Promise<Json>> = {
      S: async () => {
        const id = await start("S");
        const turns: Json = { upload: await turn(id, words.uploadTwo, ["a.png", "c.png"]) };
        const side = await sideChat(id);
        turns.sideText = await turn(side, words.sideText);
        turns.sideDetail = await turn(side, words.detail);
        return { threadId: id, side, turns, fetches: fetches().filter((entry) => entry.threadId === side) };
      },
      C: async () => {
        const id = await start("C");
        const turns: Json = { spawn: await turn(id, words.spawn(join(work, "a.png"))) };
        const [child] = subagentsOf(id);
        if (!child) return { threadId: id, turns, error: "no subagent started" };
        turns.childFirst = lastOf(child);
        // The subagent's second turn.
        turns.followup = await turn(id, words.followup);
        turns.childSecond = lastOf(child);
        return { threadId: id, child, turns, childImages: loadThreadIndex(sessionsDir, child).images.map((image) => image.id), fetches: fetches().filter((entry) => entry.threadId === child) };
      },
      O: async () => {
        const id = await start("O");
        const turns: Json = { upload: await turn(id, words.uploadTwo, ["a.png", "c.png"]) };
        // As the panel's switch does.
        writeSelection({ threadId: id, unchecked: {}, childrenAuto: false }, selectionDirOf(data));
        await sleep(2500);
        const side = await sideChat(id);
        turns.sideText = await turn(side, words.sideText);
        turns.spawn = await turn(id, words.spawn(join(work, "a.png")));
        const [child] = subagentsOf(id);
        if (child) turns.followup = await turn(id, words.followup);
        return { threadId: id, side, child: child ?? null, turns, childLast: child ? lastOf(child) : null };
      },
    };
    for (const name of only) if (threads[name]) result.threads[name] = await threads[name]();
    // What each task's panel lists (as the panel would read it).
    for (const thread of Object.values(result.threads) as Json[]) {
      thread.panel = loadPanelState(thread.threadId, { sessionsDir, dataRoot: data }).children.map((child) => ({ kind: child.kind, name: child.name, auto: child.auto, images: child.images, replaced: child.last?.replaced ?? null }));
    }
  } finally {
    result.notArchived = await archiveThreads(server, created);
    await server.stop();
    engine.kill();
  }

  const S = result.threads.S ?? null;
  const C = result.threads.C ?? null;
  const O = result.threads.O ?? null;
  const fetched = (thread: Json | null, id: string) => (thread?.fetches ?? []).some((entry: Json) => (entry.found ?? []).includes(id));
  result.checks = {
    ...(S ? {
      // The side chat's text question: both of the task's images left out, as placeholders.
      sideLeavesOut: S.turns.sideText.last.rewrite?.sideChatOf === S.threadId && ["IMG-001", "IMG-002"].every((id) => S.turns.sideText.last.rewrite?.replaced.includes(id)),
      sideTextNoFetch: !S.turns.sideText.tools.some((tool: string) => tool.startsWith("mcpToolCall")),
      sideFetches: fetched(S, "IMG-001") && (S.fetches ?? []).every((entry: Json) => entry.from === S.threadId),
      sideAnswers: says(S.turns.sideDetail.reply, 7),
      sideListed: S.panel.some((child: Json) => child.kind === "side" && child.auto),
    } : {}),
    ...(C ? {
      childAuto: C.turns.childSecond?.rewrite?.auto === true,
      childLeavesOut: (C.childImages ?? []).length > 0 && !!C.turns.childSecond?.rewrite?.replaced?.includes(C.childImages[0]),
      childFetches: fetched(C, C.childImages?.[0] ?? "IMG-001"),
      childAnswers: says(C.turns.followup?.reply ?? "", 7),
      childListed: C.panel.some((child: Json) => child.kind === "subagent" && child.auto),
    } : {}),
    ...(O ? {
      offSideAsIs: !O.turns.sideText.last.rewrite?.replaced?.length && !O.turns.sideText.last.rewrite?.auto,
      offChildAsIs: !!O.childLast && (O.childLast.images ?? 1) > 0 && !O.childLast.rewrite?.replaced?.length && !O.childLast.rewrite?.auto,
      offListed: O.panel.length > 0 && O.panel.every((child: Json) => !child.auto),
    } : {}),
  };
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, `children-${label}.json`), JSON.stringify(result, null, 2));
  const brief = (t: Json) => (t && "reply" in t ? { status: t.status, tools: t.tools, reply: String(t.reply).slice(0, 120), last: t.last } : t);
  console.log(JSON.stringify({
    label, lang, model: TEST_MODEL, notArchived: result.notArchived, checks: result.checks,
    turns: Object.fromEntries(Object.entries(result.threads as Record<string, Json>).map(([name, thread]) => [name, Object.fromEntries(Object.entries(thread.turns as Record<string, Json>).map(([key, t]) => [key, brief(t)]))])),
    panels: Object.fromEntries(Object.entries(result.threads as Record<string, Json>).map(([name, thread]) => [name, thread.panel])),
  }, null, 2));
}

await main();
