import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { routeOf } from "../../plugin/src/proxy.ts";

test("registered providers retain their platform, origin, port, base path and query without exposing the target in the local URL", async () => {
  const routes = await import("../../plugin/src/routes.ts").catch(() => null);
  assert.ok(routes, "persistent provider routes are available");
  const root = mkdtempSync(join(tmpdir(), "cam-routes-"));
  const codex = routes.registerRoute({ platform: "codex", baseUrl: "http://127.0.0.1:12345/provider/v1?tenant=one" }, root);
  const claude = routes.registerRoute({ platform: "claude", baseUrl: "https://relay.example/anthropic" }, root);
  assert.notEqual(codex.id, claude.id);
  assert.deepEqual(routes.registerRoute({ platform: "codex", baseUrl: codex.baseUrl }, root), codex);
  const script = `import { registerRoute } from ${JSON.stringify(new URL("../../plugin/src/routes.ts", import.meta.url).href)}; process.stdout.write(registerRoute(${JSON.stringify({ platform: "codex", baseUrl: codex.baseUrl })}, ${JSON.stringify(root)}).id);`;
  assert.equal(execFileSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" }), codex.id, "a fresh process uses the existing binding after an engine replacement");
  assert.match(routes.routeBaseUrl(17891, codex.id), /^http:\/\/localhost:17892\/__cam\/routes\/[a-f0-9]{32}$/, "registered traffic uses a port older engines never listen on");
  const forwarded = routeOf(`/__cam/routes/${codex.id}/responses?beta=1`, { "x-api-key": "synthetic-relay-key" }, root);
  assert.equal(forwarded?.host, "127.0.0.1");
  assert.equal(forwarded?.port, 12345);
  assert.equal(forwarded?.protocol, "http:");
  assert.equal(forwarded?.url, "/provider/v1/responses?tenant=one&beta=1");
  assert.equal(forwarded?.platform, "codex");
  assert.equal(routeOf(`/__cam/routes/${codex.id}/responses`, { authorization: "Bearer sk-ant-synthetic-relay" }, root)?.platform, "codex", "a relay's key format does not select its client platform");
  const other = routeOf(`/__cam/routes/${claude.id}/new-endpoint`, { "x-claude-code-session-id": "s" }, root);
  assert.equal(other?.host, "relay.example");
  assert.equal(other?.url, "/anthropic/new-endpoint");
  assert.equal(other?.platform, "claude");
  assert.equal(routeOf(`/__cam/routes/${codex.id}/responses`, { "x-claude-code-session-id": "s" }, root), null);
  assert.equal(routeOf(`/__cam/routes/${claude.id}/v1/messages`, { "chatgpt-account-id": "a" }, root), null);
  assert.equal(routeOf(`/__cam/routes/${"0".repeat(32)}/v1/messages`, {}, root), null);
  for (const name of readdirSync(join(root, "routes"))) {
    assert.ok(!readFileSync(join(root, "routes", name), "utf8").includes("synthetic-relay-key"));
  }
});

test("route registration refuses non-HTTP targets, embedded credentials and recursive engine routes", async () => {
  const routes = await import("../../plugin/src/routes.ts").catch(() => null);
  assert.ok(routes, "persistent provider routes are available");
  const root = mkdtempSync(join(tmpdir(), "cam-routes-"));
  for (const baseUrl of ["file:///etc/passwd", "https://user:secret@relay.example/v1", "https://relay.example/v1#fragment", "http://localhost:17891/__cam/routes/abc", "https://relay.example/\r\nx"]) {
    assert.throws(() => routes.registerRoute({ platform: "claude", baseUrl }, root));
  }
  assert.equal(routes.readRoute("../outside", root), null);
});
