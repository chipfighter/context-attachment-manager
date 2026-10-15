// Real loopback HTTP tests for the engine's cancellation and broken-response handling.
// The child fixture replaces only the outbound TLS handshake; no remote service or model is contacted.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { fileURLToPath } from "node:url";

async function bounded<T>(promise: Promise<T>, message: string, ms = 2000): Promise<T> {
  let timer: NodeJS.Timeout;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })]);
  } finally { clearTimeout(timer!); }
}

async function fixture(t: TestContext, handler: http.RequestListener) {
  const root = mkdtempSync(join(tmpdir(), "cam-http-lifecycle-"));
  const upstream = http.createServer(handler);
  await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const upstreamPort = (upstream.address() as { port: number }).port;
  const reservation = http.createServer();
  await new Promise<void>((resolve) => reservation.listen(0, "127.0.0.1", resolve));
  const port = (reservation.address() as { port: number }).port;
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  const child = spawn(process.execPath, [fileURLToPath(new URL("./proxy-http-fixture.ts", import.meta.url))], {
    env: { ...process.env, CAM_DATA_DIR: root, CAM_TEST_PROXY_PORT: String(port), CAM_TEST_UPSTREAM_PORT: String(upstreamPort), NO_PROXY: "*", no_proxy: "*" },
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
  return { port };
}

function request(port: number) {
  const body = JSON.stringify({ input: [] });
  const client = http.request({ hostname: "127.0.0.1", port, path: "/backend-api/codex/responses", method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) } });
  // A cancelled stream is allowed to surface as a reset. Individual tests assert its observable lifecycle.
  client.on("error", () => {});
  client.end(body);
  return client;
}

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
