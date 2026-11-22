// v0.12: what keeps the engine up and its requests moving: telling a busy engine from a missing one, a connection
// setup that cannot hang, and bookkeeping that never throws. Loopback servers and temporary folders only.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ensureEngine, probeEngine } from "../../plugin/src/engine.ts";
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
