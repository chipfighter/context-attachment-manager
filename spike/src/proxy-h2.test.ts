// v0.12: the engine's HTTP/2 way to the services (plugin/src/core/engine/upstream.ts), against a real engine and a
// loopback HTTP/2 upstream. The child fixture replaces only the outbound TLS handshake (it agrees on "h2"); no remote
// service or model is contacted.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import http from "node:http";
import http2 from "node:http2";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { fileURLToPath } from "node:url";
import { engineTestPort } from "./proxy-test-ports.ts";

const { NGHTTP2_REFUSED_STREAM, NGHTTP2_CANCEL } = http2.constants;

async function bounded<T>(promise: Promise<T>, message: string, ms = 3000): Promise<T> {
  let timer: NodeJS.Timeout;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })]);
  } finally { clearTimeout(timer!); }
}

type Seen = { sessions: number; pings: number; streams: Array<{ headers: http2.IncomingHttpHeaders; body: Buffer }> };

async function fixture(t: TestContext, handler: (stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders, seen: Seen) => void, env: Record<string, string> = {}) {
  const root = mkdtempSync(join(tmpdir(), "cam-h2-"));
  const seen: Seen = { sessions: 0, pings: 0, streams: [] };
  const upstream = http2.createServer();
  upstream.on("session", (session) => { seen.sessions++; session.on("ping", () => { seen.pings++; }); session.on("error", () => {}); });
  upstream.on("stream", (stream, headers) => {
    stream.on("error", () => {});
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => {
      seen.streams.push({ headers, body: Buffer.concat(chunks) });
      handler(stream, headers, seen);
    });
  });
  await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const upstreamPort = (upstream.address() as { port: number }).port;
  const port = await engineTestPort("h2");
  const child = spawn(process.execPath, [fileURLToPath(new URL("./proxy-http-fixture.ts", import.meta.url))], {
    env: { ...process.env, CAM_DATA_DIR: root, CAM_TEST_PROXY_PORT: String(port), CAM_TEST_UPSTREAM_PORT: String(upstreamPort), CAM_TEST_UPSTREAM_H2: "1", NO_PROXY: "*", no_proxy: "*", ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stderr.on("data", (chunk) => { output += chunk; });
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  t.after(async () => {
    child.kill();
    await bounded(exited, "synthetic engine did not exit");
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
  return { port, seen, root };
}

function post(port: number, body: string, onClient?: (client: http.ClientRequest) => void) {
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }>((resolve, reject) => {
    const client = http.request({ hostname: "127.0.0.1", port, path: "/backend-api/codex/responses", method: "POST", agent: false, headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body), "chatgpt-account-id": "synthetic" } }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("error", reject);
      response.on("end", () => resolve({ status: response.statusCode ?? 0, headers: response.headers, body: Buffer.concat(chunks) }));
    });
    client.on("error", reject);
    onClient?.(client);
    client.end(body);
  });
}

const logLines = (root: string) => readdirSync(join(root, "proxy")).filter((name) => name.endsWith(".jsonl")).flatMap((name) => readFileSync(join(root, "proxy", name), "utf8").trim().split("\n")).map((line) => JSON.parse(line));

test("requests share one HTTP/2 connection, with status, headers and bytes as they were", async (t) => {
  const answer = Buffer.from([0, 255, 10, 128, 42]);
  const { port, seen, root } = await fixture(t, (stream) => { stream.respond({ ":status": 201, "content-type": "application/octet-stream", "x-synthetic": "unchanged" }); stream.end(answer); });
  const first = await bounded(post(port, JSON.stringify({ input: [], n: 1 })), "first request did not finish");
  const second = await bounded(post(port, JSON.stringify({ input: [], n: 2 })), "second request did not finish");
  for (const result of [first, second]) {
    assert.equal(result.status, 201);
    assert.equal(result.headers["x-synthetic"], "unchanged");
    assert.deepEqual(result.body, answer);
  }
  assert.equal(seen.sessions, 1, "both requests went over one connection");
  assert.deepEqual(seen.streams.map(({ body }) => JSON.parse(String(body)).n), [1, 2]);
  const headers = seen.streams[0].headers;
  assert.equal(headers[":authority"], "chatgpt.com");
  assert.equal(headers[":path"], "/backend-api/codex/responses");
  assert.equal(headers["content-length"], String(seen.streams[0].body.length));
  assert.equal(headers.connection, undefined);
  // The log says how each went out.
  await new Promise((resolve) => setTimeout(resolve, 200));
  const sent = logLines(root).filter((line) => line.path === "/backend-api/codex/responses");
  assert.deepEqual(sent.map((line) => [line.proto, line.reused]), [["h2", false], ["h2", true]]);
  assert.ok(sent.every((line) => typeof line.ttfbMs === "number" && typeof line.connectMs === "number"));
});

test("a request waiting for a slow answer keeps its HTTP/2 connection busy with PINGs", async (t) => {
  const { port, seen } = await fixture(t, (stream) => setTimeout(() => { stream.respond({ ":status": 200 }); stream.end("done"); }, 900), { CAM_H2_PING_MS: "150" });
  const result = await bounded(post(port, "{}"), "slow request did not finish");
  assert.equal(String(result.body), "done");
  assert.ok(seen.pings >= 3, `only ${seen.pings} PINGs while the answer was pending`);
});

test("a stream the service refuses is sent again, and the client sees the answer", async (t) => {
  const { port, seen } = await fixture(t, (stream, _headers, state) => {
    if (state.streams.length === 1) { stream.close(NGHTTP2_REFUSED_STREAM); return; }
    stream.respond({ ":status": 200 });
    stream.end("second try");
  });
  const result = await bounded(post(port, JSON.stringify({ input: [] })), "refused request did not finish");
  assert.equal(result.status, 200);
  assert.equal(String(result.body), "second try");
  assert.equal(seen.streams.length, 2);
  assert.deepEqual(seen.streams[0].body, seen.streams[1].body, "the same body went out again");
});

test("a client going away cancels its HTTP/2 stream upstream", async (t) => {
  let cancelled!: (code: number) => void;
  const closed = new Promise<number>((resolve) => { cancelled = resolve; });
  const { port } = await fixture(t, (stream) => {
    stream.respond({ ":status": 200, "content-type": "text/event-stream" });
    stream.write("data: synthetic\n\n");
    stream.once("close", () => cancelled(stream.rstCode));
  });
  await new Promise<void>((resolve) => {
    const client = http.request({ hostname: "127.0.0.1", port, path: "/backend-api/codex/responses", method: "POST", agent: false, headers: { "content-type": "application/json", "content-length": 2 } }, (response) => {
      response.on("error", () => {});
      response.once("data", () => { client.destroy(); resolve(); });
    });
    client.on("error", () => {});
    client.end("{}");
  });
  assert.equal(await bounded(closed, "upstream stream stayed open after the client left"), NGHTTP2_CANCEL);
});

// A stream reset with an error, and the whole connection dropped (as a proxy cutting it would). Node's stream.close()
// would end the body cleanly before its reset, so the server breaks off with destroy().
for (const [how, breakOff] of [
  ["reset", (stream: http2.ServerHttp2Stream) => stream.destroy(new Error("synthetic reset"))],
  ["dropped connection", (stream: http2.ServerHttp2Stream) => stream.session?.destroy()],
] as const) test(`an HTTP/2 answer that breaks off (${how}) closes the client stream`, async (t) => {
  const { port } = await fixture(t, (stream) => {
    stream.respond({ ":status": 200, "content-type": "text/event-stream" });
    stream.write("data: incomplete\n\n");
    setTimeout(() => breakOff(stream), 50);
  });
  const outcome = await bounded(new Promise<string>((resolve) => {
    const client = http.request({ hostname: "127.0.0.1", port, path: "/backend-api/codex/responses", method: "POST", agent: false, headers: { "content-type": "application/json", "content-length": 2 } }, (response) => {
      response.on("error", () => resolve("error"));
      response.on("end", () => resolve("ended as if complete"));
      response.on("close", () => resolve(response.complete ? "ended as if complete" : "closed"));
      response.resume();
    });
    client.on("error", () => resolve("error"));
    client.end("{}");
  }), "client hung after the upstream answer broke");
  assert.notEqual(outcome, "ended as if complete");
});
