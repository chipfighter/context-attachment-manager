// Real engine, fake credentials and loopback upstreams only.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { fileURLToPath } from "node:url";
import { image, pngA, pngB, text, transcript } from "./claude-fixtures.ts";
import { assistant, line, red, turn, upload, THREAD } from "./testfixtures.ts";
import { writeSelection } from "../../plugin/src/selection.ts";
import { engineTestPort } from "./proxy-test-ports.ts";

async function bounded<T>(value: Promise<T>, ms = 8000): Promise<T> {
  let timer: NodeJS.Timeout;
  try { return await Promise.race([value, new Promise<never>((_, fail) => { timer = setTimeout(() => fail(new Error("synthetic request timed out")), ms); })]); }
  finally { clearTimeout(timer!); }
}
async function engine(t: TestContext) {
  const root = mkdtempSync(join(tmpdir(), "cam-provider-http-"));
  const seen: { url?: string; headers: http.IncomingHttpHeaders; body: string }[] = [];
  const upstream = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => { seen.push({ url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() }); res.end("{}"); });
  });
  await new Promise<void>(ok => upstream.listen(0, "127.0.0.1", ok));
  const upstreamPort = (upstream.address() as net.AddressInfo).port;
  const port = await engineTestPort();
  const child = spawn(process.execPath, [fileURLToPath(new URL("./proxy-http-fixture.ts", import.meta.url))], {
    env: { ...process.env, CAM_DATA_DIR: root, CODEX_HOME: join(root, "codex"), CLAUDE_CONFIG_DIR: join(root, "claude"), LOCALAPPDATA: join(root, "empty-appdata"), CAM_TEST_PROXY_PORT: String(port), CAM_TEST_UPSTREAM_PORT: String(upstreamPort), NO_PROXY: "*", no_proxy: "*" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  const exited = new Promise<void>(ok => child.once("exit", () => ok()));
  t.after(async () => { child.kill(); await bounded(exited); upstream.closeAllConnections(); await new Promise<void>(ok => upstream.close(() => ok())); });
  await bounded(new Promise<void>((ok, fail) => {
    child.on("error", fail);
    child.on("exit", code => fail(new Error(`engine exited ${code}: ${output}`)));
    child.stderr.on("data", chunk => { output += chunk; });
    child.stdout.on("data", chunk => { output += chunk; if (output.includes(`http://127.0.0.1:${port}/`)) ok(); });
  }));
  const request = (path: string, headers: Record<string, string> = {}, body?: unknown, overridePort?: number) => bounded(new Promise<{ status: number; body: string }>((ok, fail) => {
    const data = body === undefined ? "" : JSON.stringify(body);
    const req = http.request({ hostname: "127.0.0.1", port: overridePort ?? (path.startsWith("/__cam/routes/") ? port + 1 : port), path, method: body === undefined ? "GET" : "POST", agent: false, headers: { ...(body === undefined ? {} : { "content-type": "application/json", "content-length": String(Buffer.byteLength(data)) }), ...headers } }, res => {
      const chunks: Buffer[] = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("error", fail);
      res.on("end", () => ok({ status: res.statusCode!, body: Buffer.concat(chunks).toString() }));
    });
    req.on("error", fail); req.end(data);
  }));
  const register = async (platform: string, baseUrl: string) => {
    const result = await request("/__cam/routes", { "x-cam-panel": "1" }, { platform, baseUrl });
    assert.equal(result.status, 200, result.body);
    return new URL(JSON.parse(result.body).baseUrl).pathname;
  };
  return { root, port, upstream, upstreamPort, seen, request, register };
}

test("two registered providers retain destinations, credentials and native bodies over HTTP", async t => {
  const e = await engine(t);
  const codex = await e.register("codex", `http://127.0.0.1:${e.upstreamPort}/gateway/v1?tenant=one`);
  const claude = await e.register("claude", "https://claude-relay.example:9443/anthropic");
  const cbody = { input: [], model: "synthetic-vision" };
  const abody = { messages: [{ role: "user", content: "synthetic" }], model: "synthetic-vision" };
  assert.equal((await e.request(`${codex}/responses?beta=1`, { authorization: "Bearer synthetic-codex", "x-api-key": "synthetic-relay" }, cbody)).status, 200);
  assert.equal((await e.request(`${claude}/v1/messages`, { authorization: "Bearer synthetic-claude", "x-api-key": "synthetic-anthropic", "anthropic-version": "2023-06-01" }, abody)).status, 200);
  assert.equal(e.seen[0].url, "/gateway/v1/responses?tenant=one&beta=1");
  assert.equal(e.seen[0].headers.host, `127.0.0.1:${e.upstreamPort}`);
  assert.equal(e.seen[0].headers["x-api-key"], "synthetic-relay");
  assert.deepEqual(JSON.parse(e.seen[0].body), cbody);
  assert.equal(e.seen[1].url, "/anthropic/v1/messages");
  assert.equal(e.seen[1].headers.host, "claude-relay.example:9443");
  assert.equal(e.seen[1].headers.authorization, "Bearer synthetic-claude");
  assert.deepEqual(JSON.parse(e.seen[1].body), abody);
  assert.equal((await e.request(`${claude}/future-endpoint`, { "x-api-key": "synthetic-anthropic" })).status, 200);
  assert.equal(e.seen.at(-1)?.headers.host, "claude-relay.example:9443");
});

test("unknown, contradictory and recursive routes are refused without forwarding credentials", async t => {
  const e = await engine(t);
  const codex = await e.register("codex", `http://127.0.0.1:${e.upstreamPort}/v1`);
  const claude = await e.register("claude", "https://claude-relay.example");
  assert.equal((await e.request("/unknown", { "x-api-key": "synthetic", "chatgpt-account-id": "mixed" })).status, 421);
  assert.equal((await e.request(`/__cam/routes/${"0".repeat(32)}/v1/messages`, { authorization: "Bearer synthetic" })).status, 421);
  assert.equal((await e.request(`${codex}/responses`, { "x-claude-code-session-id": "synthetic" })).status, 421);
  assert.equal((await e.request(`${claude}/v1/messages`, { "chatgpt-account-id": "synthetic" })).status, 421);
  assert.equal((await e.request("/__cam/routes", { "x-cam-panel": "1" }, { platform: "claude", baseUrl: `http://localhost:${e.port}` })).status, 400);
  assert.equal((await e.request("/__cam/routes", { origin: "https://evil.example", "x-cam-panel": "1" }, { platform: "claude", baseUrl: "https://relay.example" })).status, 403);
  assert.equal((await e.request("/__cam/routes", {}, { platform: "claude", baseUrl: "https://relay.example" })).status, 403);
  assert.equal((await e.request(`${codex}/responses`, { authorization: "Bearer synthetic" }, undefined, e.port)).status, 421, "registered requests cannot use a port shared with old engines");
  assert.equal((await e.request("/backend-api/codex/responses", { authorization: "Bearer synthetic" }, undefined, e.port + 1)).status, 421, "legacy requests cannot enter a registered route");
  assert.equal(e.seen.length, 0);
});

test("registered Codex WebSocket upgrades preserve their destination without carrying internal headers", async t => {
  const e = await engine(t);
  const codex = await e.register("codex", `http://127.0.0.1:${e.upstreamPort}/v1`);
  const seen = new Promise<http.IncomingMessage>(ok => e.upstream.once("upgrade", (req, socket) => { socket.on("error", () => {}); socket.end("HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\n\r\n"); ok(req); }));
  const socket = net.connect(e.port + 1, "127.0.0.1");
  socket.on("error", () => {}); t.after(() => socket.destroy());
  socket.write([`GET ${codex}/responses HTTP/1.1`, `Host: 127.0.0.1:${e.port}`, "Authorization: Bearer synthetic-key", "X-Cam-Panel: 1", "Connection: Upgrade", "Upgrade: websocket", "Sec-WebSocket-Version: 13", "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==", "", ""].join("\r\n"));
  const got = await bounded(seen);
  assert.equal(got.url, "/v1/responses");
  assert.equal(got.headers.host, `127.0.0.1:${e.upstreamPort}`);
  assert.equal(got.headers.authorization, "Bearer synthetic-key");
  assert.equal(got.headers["x-cam-panel"], undefined);
});

test("both custom providers still rewrite unchecked images using their native protocol", async t => {
  const e = await engine(t);
  const codex = await e.register("codex", `http://127.0.0.1:${e.upstreamPort}/gateway/v1`);
  const claude = await e.register("claude", "https://claude-relay.example/anthropic");
  const session = "11111111-2222-4333-8444-555555555555";
  const cdir = join(e.root, "codex", "sessions", "2026", "09", "24");
  mkdirSync(cdir, { recursive: true });
  const message = JSON.parse(upload("msg_1", "t1", [["a.png", red]])).payload;
  writeFileSync(join(cdir, `rollout-2026-09-24T10-00-00-${THREAD}.jsonl`), line("session_meta", { id: THREAD }) + turn("t1") + line("response_item", message) + assistant("synthetic", "t1"));
  writeSelection({ threadId: THREAD, unchecked: { "msg_1#0": { id: "IMG-001", at: "2026-09-24T10:00:00Z" } }, auto: false }, join(e.root, "selection"));
  assert.equal((await e.request(`${codex}/responses`, { authorization: "Bearer synthetic-codex", "x-codex-turn-metadata": JSON.stringify({ thread_id: THREAD, turn_id: "t2" }) }, { model: "synthetic", input: [message] })).status, 200);
  assert.doesNotMatch(e.seen[0].body, new RegExp(red.toString("base64").slice(30, 80)));
  assert.match(e.seen[0].body, /IMG-001/);
  assert.equal(e.seen[0].url, "/gateway/v1/responses");
  const history = transcript();
  const first = history.prompt([image(pngA), image(pngB), text("synthetic")]);
  history.assistant(text("synthetic"));
  const adir = join(e.root, "claude", "projects", "synthetic");
  mkdirSync(adir, { recursive: true });
  writeFileSync(join(adir, `${session}.jsonl`), history.records.map(value => JSON.stringify(value)).join("\n") + "\n");
  writeSelection({ threadId: session, unchecked: { [`${first}#0`]: { id: "IMG-001", at: "2026-09-24T10:00:00Z" } }, auto: false }, join(e.root, "claude", "selection"));
  const body = { model: "synthetic", messages: [{ role: "user", content: [image(pngA), image(pngB), text("synthetic")] }, { role: "assistant", content: [text("synthetic")] }, { role: "user", content: [text("next")] }] };
  assert.equal((await e.request(`${claude}/v1/messages`, { "x-claude-code-session-id": session, "x-api-key": "synthetic" }, body)).status, 200);
  assert.ok(!e.seen[1].body.includes(pngA));
  assert.ok(e.seen[1].body.includes(pngB));
  assert.match(e.seen[1].body, /IMG-001/);
  assert.equal(e.seen[1].url, "/anthropic/v1/messages");
  const logs = readdirSync(join(e.root, "proxy")).map(name => readFileSync(join(e.root, "proxy", name), "utf8")).join("");
  assert.ok(!logs.includes("synthetic-codex") && !logs.includes(pngA));
});
