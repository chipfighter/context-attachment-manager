// v0.12: what keeps the engine up and its requests moving: telling a busy engine from a missing one, a connection
// setup that cannot hang, and bookkeeping that never throws. Loopback servers and temporary folders only.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test, { type TestContext } from "node:test";
import { buildOf, ENGINE_SERVICE, ensureEngine, probeEngine, watchForClients } from "../../plugin/src/engine.ts";
import { connectUpstream, log } from "../../plugin/src/core/engine/transport.ts";
import { recordRequest } from "../../plugin/src/core/request-stats.ts";

async function listening(server: net.Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return (server.address() as net.AddressInfo).port;
}
const closing = (server: net.Server) => new Promise<void>((resolve) => server.close(() => resolve()));

test("the probe tells a missing engine, a busy one, a starting one and another program apart", async (t) => {
  // Accepts connections and never answers: an engine whose own work holds it up.
  const held: net.Socket[] = [];
  const busy = net.createServer((socket) => { held.push(socket); socket.on("error", () => {}); });
  const busyPort = await listening(busy);
  const starting = http.createServer((_req, res) => res.writeHead(503).end());
  const startingPort = await listening(starting);
  const other = http.createServer((_req, res) => { res.writeHead(404, { "content-type": "application/json" }); res.end("{\"error\":\"not here\"}"); });
  const otherPort = await listening(other);
  const engine = http.createServer((_req, res) => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: true, service: "codex-attachment-manager", pid: 4242 })); });
  const enginePort = await listening(engine);
  t.after(async () => {
    for (const socket of held) socket.destroy();
    await Promise.all([busy, starting, other, engine].map(closing));
  });
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(await probeEngine(busyPort, 300), { kind: "busy" });
  assert.deepEqual(await probeEngine(startingPort, 300), { kind: "busy" });
  assert.deepEqual(await probeEngine(otherPort, 300), { kind: "other" });
  assert.equal((await probeEngine(enginePort, 300)).kind, "engine");
  // A port that was free a moment ago: nothing listens there.
  const freeServer = net.createServer();
  const freePort = await listening(freeServer);
  await closing(freeServer);
  assert.deepEqual(await probeEngine(freePort, 300), { kind: "free" });
});

test("a busy engine is left alone instead of a second one being started", async (t) => {
  const held: net.Socket[] = [];
  const busy = net.createServer((socket) => { held.push(socket); socket.on("error", () => {}); });
  const port = await listening(busy);
  t.after(async () => { for (const socket of held) socket.destroy(); await closing(busy); });
  const started = Date.now();
  const result = await ensureEngine({ port, patienceMs: 300, waitMs: 2000 });
  assert.equal(result.state, "busy");
  assert.equal(result.health, null);
  assert.ok(Date.now() - started < 1800, "no engine was started and waited for");
});

async function startupFixture(t: TestContext) {
  const free = net.createServer();
  const port = await listening(free);
  await closing(free);
  const root = mkdtempSync(join(tmpdir(), "cam-racing-start-"));
  const env = { CAM_DATA_DIR: process.env.CAM_DATA_DIR, CAM_ENGINE_START: process.env.CAM_ENGINE_START };
  t.after(() => {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    rmSync(root, { recursive: true, force: true });
  });
  process.env.CAM_DATA_DIR = root;
  process.env.CAM_ENGINE_START = "child";
  const dir = join(root, "src");
  const manifest = join(root, ".codex-plugin");
  const startedPid = join(root, "started-pid");
  const version = "1.0.0";
  mkdirSync(dir);
  mkdirSync(manifest);
  writeFileSync(join(manifest, "plugin.json"), JSON.stringify({ version }));
  writeFileSync(join(dir, "proxy.ts"), [
    'import { writeFileSync } from "node:fs";',
    `writeFileSync(${JSON.stringify(startedPid)}, String(process.pid));`,
  ].join("\n"));
  return { port, dir, lock: join(root, "state", "engine-start.lock"), startedPid, version };
}

test("an engine that appears before we take the start lock is reused", async (t) => {
  const { port, dir, lock, startedPid, version } = await startupFixture(t);
  const health = { ok: true, service: ENGINE_SERVICE, pid: 4242, port, build: buildOf(dir), version };
  let probes = 0;
  t.mock.method(globalThis, "fetch", async () => {
    if (++probes === 1) throw new Error("no engine yet");
    assert.ok(existsSync(lock), "the peer is discovered under the start lock");
    return Response.json(health);
  });

  const result = await ensureEngine({ port, dir });
  assert.equal(result.state, "running");
  assert.deepEqual(result.health, health);
  assert.equal(existsSync(startedPid), false);
  assert.equal(existsSync(lock), false, "the lock is released on reuse");
});

for (const waitForPeer of [false, true]) {
  const observation = waitForPeer ? "while waiting for the start lock" : "after taking the start lock";
  test(`a forced install replaces a different build it discovers ${observation}`, async (t) => {
    const { port, dir, lock, startedPid, version } = await startupFixture(t);
    const old = { ok: true, service: ENGINE_SERVICE, pid: 123_456_789, port, build: "old-build", version };
    const build = buildOf(dir);
    let probes = 0;
    let retired = false;
    const kill = t.mock.method(process, "kill", () => false);
    if (waitForPeer) {
      mkdirSync(dirname(lock));
      writeFileSync(lock, String(process.pid));
    }
    t.mock.method(globalThis, "fetch", async (input: string) => {
      if (new URL(input).pathname === "/__cam/retire") {
        assert.ok(existsSync(lock), "replacement is decided under the start lock");
        retired = true;
        return Response.json({ retiring: true });
      }
      if (++probes === 1) throw new Error("no engine yet");
      if (!retired) {
        if (waitForPeer && probes === 2) rmSync(lock);
        return Response.json(old);
      }
      if (!existsSync(startedPid)) throw new Error("replacement not started yet");
      const pid = Number(readFileSync(startedPid, "utf8"));
      if (!pid) throw new Error("replacement not ready yet");
      return Response.json({ ...old, pid, build });
    });

    const result = await ensureEngine({ port, dir, force: true });
    assert.equal(retired, true);
    assert.equal(result.state, "replaced");
    assert.deepEqual(result.replaced, old);
    assert.equal(result.health?.build, build);
    assert.equal(result.health?.pid, Number(readFileSync(startedPid, "utf8")));
    assert.equal(kill.mock.callCount(), 0);
    assert.equal(existsSync(lock), false, "the lock is released after replacement");
  });
}

test("an expired start lock still belongs to its live owner", async (t) => {
  const { port, dir, lock, startedPid, version } = await startupFixture(t);
  const health = { ok: true, service: ENGINE_SERVICE, pid: 4242, port, build: buildOf(dir), version };
  const owner = String(process.pid);
  mkdirSync(dirname(lock));
  writeFileSync(lock, owner);
  const past = new Date(Date.now() - 60_000);
  utimesSync(lock, past, past);
  let probes = 0;
  t.mock.method(globalThis, "fetch", async () => {
    if (++probes === 1) throw new Error("no engine yet");
    assert.equal(readFileSync(lock, "utf8"), owner);
    return Response.json(health);
  });

  const result = await ensureEngine({ port, dir });
  assert.equal(result.state, "running");
  assert.deepEqual(result.health, health);
  assert.equal(existsSync(startedPid), false);
  assert.equal(readFileSync(lock, "utf8"), owner, "waiting did not clear the peer's lock");
});

test("a slow process poll cannot overlap or exit an engine after the watch stops", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  let finish!: (count: number) => void;
  const pending = new Promise<number>((resolve) => { finish = resolve; });
  let checks = 0;
  let exits = 0;
  const stop = watchForClients(() => { exits++; }, {
    intervalMs: 5,
    misses: 1,
    count: () => { checks++; return pending; },
  });
  t.mock.timers.tick(5);
  t.mock.timers.tick(5);
  t.mock.timers.tick(5);
  stop();
  finish(0);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual({ checks, exits }, { checks: 1, exits: 0 });
});

test("a connection the outbound proxy never answers fails after the timeout, and the socket is closed", async (t) => {
  let proxySide: net.Socket | null = null;
  // It reads what comes (so it notices the connection closing) and never answers.
  const silent = net.createServer((socket) => { proxySide = socket; socket.on("error", () => {}); socket.resume(); });
  const port = await listening(silent);
  t.after(() => closing(silent));
  const started = Date.now();
  await assert.rejects(connectUpstream({ host: "127.0.0.1", port }, "chatgpt.com", undefined, 443, true, ["h2", "http/1.1"], 300), /timed out/);
  assert.ok(Date.now() - started < 2000);
  const side = proxySide as net.Socket | null;
  assert.ok(side, "the proxy saw the connection");
  if (!side.destroyed) await new Promise<void>((resolve) => side.once("close", () => resolve()));
});

test("cancelling after the connection is up leaves it open (it may serve other requests)", async (t) => {
  const server = net.createServer((socket) => socket.on("error", () => {}));
  const port = await listening(server);
  t.after(() => closing(server));
  const controller = new AbortController();
  const socket = await connectUpstream(null, "127.0.0.1", controller.signal, port, false);
  controller.abort();
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
  assert.equal(socket.destroyed, false);
  socket.destroy();
});

test("cancelling during the setup closes the half-made connection", async (t) => {
  let accepted: net.Socket | null = null;
  const silent = net.createServer((socket) => { accepted = socket; socket.on("error", () => {}); socket.resume(); });
  const port = await listening(silent);
  t.after(() => closing(silent));
  const controller = new AbortController();
  const pending = connectUpstream({ host: "127.0.0.1", port }, "chatgpt.com", controller.signal);
  await new Promise<void>((resolve) => { const wait = () => (accepted ? resolve() : setTimeout(wait, 10)); wait(); });
  const closed = new Promise<void>((resolve) => accepted!.once("close", () => resolve()));
  controller.abort();
  await assert.rejects(pending, /cancelled/);
  await closed;
});

test("the log and the request statistics never throw, even when nothing can be written", () => {
  const root = mkdtempSync(join(tmpdir(), "cam-stability-"));
  const blocked = join(root, "a-file");
  writeFileSync(blocked, "not a folder");
  const before = process.env.CAM_DATA_DIR;
  try {
    process.env.CAM_DATA_DIR = blocked;
    assert.doesNotThrow(() => log({ event: "synthetic" }));
    assert.doesNotThrow(() => recordRequest("0f0e0d0c-0b0a-4908-8706-050403020100", { transport: "http" }, join(blocked, "requests")));
  } finally {
    if (before === undefined) delete process.env.CAM_DATA_DIR; else process.env.CAM_DATA_DIR = before;
    rmSync(root, { recursive: true, force: true });
  }
});
