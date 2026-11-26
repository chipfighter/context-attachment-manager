// Real loopback HTTP tests for the engine's cancellation and broken-response handling.
// The child fixture replaces only the outbound TLS handshake; no remote service or model is contacted.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { engineTestPort } from "./proxy-test-ports.ts";

async function bounded<T>(promise: Promise<T>, message: string, ms = 2000): Promise<T> {
  let timer: NodeJS.Timeout;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })]);
  } finally { clearTimeout(timer!); }
}

async function fixture(t: TestContext, handler: http.RequestListener, connectDelay = 0, engineArgs: string[] = [], memoryPressure?: "replace" | "failed-start") {
  const root = mkdtempSync(join(tmpdir(), "cam-http-lifecycle-"));
  const upstream = http.createServer(handler);
  await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const upstreamPort = (upstream.address() as { port: number }).port;
  const port = await engineTestPort();
  const pressureFile = join(root, "memory-pressure");
  const preload = join(root, "memory-pressure.mjs");
  if (memoryPressure) writeFileSync(preload, [
    'import { existsSync } from "node:fs";',
    "const usage = process.memoryUsage;",
    `process.memoryUsage = Object.assign(() => ({ ...usage(), rss: existsSync(${JSON.stringify(pressureFile)}) ? 3 * 1024 ** 3 : usage.rss() }), { rss: usage.rss });`,
    ...(memoryPressure === "failed-start" ? [
      "const executable = process.execPath;",
      `Object.defineProperty(process, "execPath", { get: () => existsSync(${JSON.stringify(pressureFile)}) ? ${JSON.stringify(join(root, "missing-executable"))} : executable });`,
    ] : []),
  ].join("\n"));
  const nodeArgs = memoryPressure ? ["--import", pathToFileURL(preload).href] : [];
  const child = spawn(process.execPath, [...nodeArgs, fileURLToPath(new URL("./proxy-http-fixture.ts", import.meta.url))], {
    env: { ...process.env, CAM_DATA_DIR: root, CODEX_HOME: join(root, "codex"), CLAUDE_CONFIG_DIR: join(root, "claude"), LOCALAPPDATA: join(root, "empty-appdata"), CAM_ENGINE_START: "child", CAM_TEST_PROXY_PORT: String(port), CAM_TEST_UPSTREAM_PORT: String(upstreamPort), CAM_TEST_CONNECT_DELAY: String(connectDelay), CAM_TEST_ENGINE_ARGS: engineArgs.join(" "), NO_PROXY: "*", no_proxy: "*" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stderr.on("data", (chunk) => { output += chunk; });
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  t.after(async () => {
    child.kill();
    await bounded(exited, "synthetic engine did not exit");
    upstream.closeAllConnections();
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
    rmSync(root, { recursive: true, force: true });
  });
  await bounded(new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => reject(new Error(`synthetic engine exited (${code}): ${output}`)));
    child.stdout.on("data", (chunk) => {
      output += chunk;
      if (output.includes(`http://127.0.0.1:${port}/`)) resolve();
    });
  }), "synthetic engine did not start", 10000);
  return { root, port, upstream, pressureFile, child, exited };
}

function request(port: number) {
  const body = JSON.stringify({ input: [] });
  const client = http.request({ hostname: "127.0.0.1", port, path: "/backend-api/codex/responses", method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) } });
  // A cancelled stream is allowed to surface as a reset. Individual tests assert its observable lifecycle.
  client.on("error", () => {});
  client.end(body);
  return client;
}

test("memory pressure replaces the engine while an in-flight HTTP stream drains", { timeout: 35_000 }, async (t) => {
  let finish!: () => void;
  const { port, pressureFile, child, exited } = await fixture(t, (req, res) => {
    req.resume();
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write("data: first\n\n");
    finish = () => res.end("data: last\n\n");
  }, 0, [], "replace");
  const client = request(port);
  t.after(() => { client.destroy(); });
  let received!: () => void;
  const firstChunk = new Promise<void>(resolve => { received = resolve; });
  const complete = new Promise<string>((resolve, reject) => {
    client.on("error", reject);
    client.once("response", response => {
      let body = "";
      response.on("data", chunk => { body += chunk; received(); });
      response.on("error", reject);
      response.on("end", () => resolve(body));
    });
  });
  void complete.catch(() => {}); // Assert the stream after the replacement is ready.
  await bounded(firstChunk, "the old engine did not start the stream");
  writeFileSync(pressureFile, "");

  const deadline = Date.now() + 19_000;
  let replacement: number | undefined;
  while (Date.now() < deadline) {
    try {
      const result = await fetch(`http://127.0.0.1:${port}/__cam/health`, { signal: AbortSignal.timeout(500) });
      if (result.ok) {
        const { pid } = await result.json();
        if (pid !== child.pid) { replacement = pid; break; }
      }
    } catch { /* the listener is changing hands */ }
    await sleep(100);
  }
  assert.ok(replacement, "no replacement engine became healthy");
  t.after(() => { try { process.kill(replacement); } catch { /* already exited */ } });
  assert.equal(child.exitCode, null, "the old engine must stay alive until the stream ends");
  finish();
  assert.equal(await bounded(complete, "stream did not finish"), "data: first\n\ndata: last\n\n");
  await bounded(exited, "the old engine did not exit after draining");
});

test("the old engine resumes serving if replacement cannot start", { timeout: 35_000 }, async (t) => {
  const { root, port, pressureFile, child } = await fixture(t, () => {}, 0, [], "failed-start");
  const log = join(root, "proxy", new Date().toISOString().slice(0, 10) + ".jsonl");
  writeFileSync(pressureFile, "");
  const deadline = Date.now() + 19_000;
  while (Date.now() < deadline && !readFileSync(log, "utf8").includes('"event":"engine-memory-resumed"')) await sleep(100);
  assert.match(readFileSync(log, "utf8"), /"event":"engine-memory-resumed"/);
  const response = await fetch(`http://127.0.0.1:${port}/__cam/health`, { signal: AbortSignal.timeout(500) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).pid, child.pid);
});

test("HTTP cancellation during the upstream handshake closes the pending socket", async (t) => {
  const { port, upstream } = await fixture(t, () => assert.fail("cancelled request must not reach the upstream"), 10000);
  const connected = new Promise<import("node:net").Socket>((resolve) => upstream.once("connection", resolve));
  const client = request(port);
  t.after(() => client.destroy());
  const socket = await bounded(connected, "synthetic handshake did not start");
  const closed = new Promise<void>((resolve) => socket.once("close", () => resolve()));
  client.destroy();
  await bounded(closed, "pending upstream socket stayed open after cancellation");
});

test("HTTP client cancellation closes the upstream response", async (t) => {
  let upstreamClosed!: () => void;
  const closed = new Promise<void>((resolve) => { upstreamClosed = resolve; });
  const { port } = await fixture(t, (req, res) => {
    req.resume();
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write("data: synthetic\n\n");
    res.once("close", upstreamClosed);
  });
  const client = request(port);
  t.after(() => client.destroy());
  await bounded(new Promise<void>((resolve) => {
    client.once("response", (response) => {
      response.once("data", () => { response.destroy(); client.destroy(); resolve(); });
    });
  }), "client did not receive synthetic data");
  await bounded(closed, "upstream stayed open after client cancellation");
});

test("a truncated upstream HTTP response closes the client stream", async (t) => {
  let drop!: () => void;
  const { port } = await fixture(t, (req, res) => {
    req.resume();
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write("data: incomplete\n\n");
    drop = () => res.destroy();
  });
  const client = request(port);
  t.after(() => client.destroy());
  await bounded(new Promise<void>((resolve) => {
    client.once("response", (response) => {
      response.on("error", () => {});
      response.once("close", resolve);
      response.once("data", () => drop());
    });
  }), "client hung after the upstream response broke");
});

test("a complete HTTP response keeps its status, headers, and bytes", async (t) => {
  const expected = Buffer.from([0, 255, 10, 128, 42]);
  const { port } = await fixture(t, (req, res) => {
    req.resume();
    res.writeHead(201, { "content-type": "application/octet-stream", "x-synthetic": "unchanged" });
    res.end(expected);
  });
  const client = request(port);
  const result = await bounded(new Promise<{ status: number; header: unknown; body: Buffer }>((resolve, reject) => {
    client.once("response", (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("error", reject);
      response.on("end", () => resolve({ status: response.statusCode!, header: response.headers["x-synthetic"], body: Buffer.concat(chunks) }));
    });
  }), "complete response did not finish");
  assert.deepEqual(result, { status: 201, header: "unchanged", body: expected });
});

// 2026-10-19: Node leaves an upgraded socket without an 'error' listener of its own. Codex resetting the connection
// the engine had just declined with 426 threw there and stopped the engine (four probe engines at once).
test("a declined WebSocket upgrade that the client resets leaves the engine running", async (t) => {
  const { port } = await fixture(t, () => assert.fail("a declined upgrade must not reach the upstream"), 0, ["--force-http"]);
  for (let i = 0; i < 5; i++) {
    const socket = net.connect(port, "127.0.0.1");
    socket.on("error", () => {});
    const answer = await bounded(new Promise<string>((resolve) => {
      socket.once("data", (chunk) => { resolve(String(chunk)); socket.resetAndDestroy(); });
      socket.write(["GET /backend-api/codex/responses HTTP/1.1", `Host: 127.0.0.1:${port}`, "Connection: Upgrade", "Upgrade: websocket", "Sec-WebSocket-Version: 13", "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==", "", ""].join("\r\n"));
    }), `upgrade ${i + 1} got no answer`);
    assert.match(answer, /^HTTP\/1\.1 426 /);
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
  const status = await bounded(new Promise<number>((resolve, reject) => {
    http.get({ hostname: "127.0.0.1", port, path: "/__cam/health" }, (response) => { response.resume(); resolve(response.statusCode ?? 0); }).on("error", reject);
  }), "the engine did not answer after the resets");
  assert.equal(status, 200);
});

// 2026-10-22: Codex logged in with an API key sends its key through the plugin's base URL; the engine passes it on
// to api.openai.com/v1, where Codex would send it without the plugin. A ChatGPT login still goes to chatgpt.com.
test("Codex's API-key requests reach api.openai.com/v1, over HTTP and WebSocket", async (t) => {
  const seen: { host?: string; url?: string; auth?: string }[] = [];
  const { port, upstream } = await fixture(t, (req, res) => {
    req.resume();
    seen.push({ host: req.headers.host, url: req.url, auth: req.headers.authorization });
    res.writeHead(200, { "content-type": "application/json" });
    res.end("{}");
  });
  const post = (headers: Record<string, string>) => bounded(new Promise<number>((resolve, reject) => {
    const body = JSON.stringify({ input: [] });
    const client = http.request({ hostname: "127.0.0.1", port, path: "/backend-api/codex/responses", method: "POST", agent: false, headers: { "content-type": "application/json", "content-length": String(Buffer.byteLength(body)), ...headers } }, (response) => { response.resume(); response.on("end", () => resolve(response.statusCode ?? 0)); });
    client.on("error", reject);
    client.end(body);
  }), "request did not finish");
  assert.equal(await post({ authorization: "Bearer sk-test-not-a-real-key" }), 200);
  assert.equal(await post({ authorization: "Bearer eyJ.synthetic.token", "chatgpt-account-id": "acct" }), 200);
  assert.deepEqual(seen, [
    { host: "api.openai.com", url: "/v1/responses", auth: "Bearer sk-test-not-a-real-key" },
    { host: "chatgpt.com", url: "/backend-api/codex/responses", auth: "Bearer eyJ.synthetic.token" },
  ]);
  const upgraded = new Promise<{ host?: string; url?: string }>((resolve) => upstream.once("upgrade", (req, socket) => {
    socket.on("error", () => {});
    resolve({ host: req.headers.host, url: req.url });
    socket.end("HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\n\r\n");
  }));
  const socket = net.connect(port, "127.0.0.1");
  socket.on("error", () => {});
  t.after(() => socket.destroy());
  socket.write(["GET /backend-api/codex/responses HTTP/1.1", `Host: 127.0.0.1:${port}`, "Authorization: Bearer sk-test-not-a-real-key", "Connection: Upgrade", "Upgrade: websocket", "Sec-WebSocket-Version: 13", "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==", "", ""].join("\r\n"));
  assert.deepEqual(await bounded(upgraded, "upgrade did not reach the upstream"), { host: "api.openai.com", url: "/v1/responses" });
});
