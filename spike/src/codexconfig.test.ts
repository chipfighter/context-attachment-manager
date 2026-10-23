// Purpose: P1-1/P2/P3 — the managed config.toml settings (proxy blocks and the panel's MCP server table) and the
// .env NO_PROXY block are inserted and removed without touching anything else.
// Input: synthetic config texts; output: Node test assertions only.

import assert from "node:assert/strict";
import test from "node:test";
import { coversLoopback, disableMcpServer, disableProxy, enableMcpServer, enableNoProxy, enableProxy, noProxyStatus, noProxyValue, proxyStatus } from "../../plugin/src/codexconfig.ts";

const URL = "http://localhost:17891/backend-api/codex";
const withFeatures = 'model = "gpt-6-sol"\n\n[features]\nview_image = true\n\n[mcp_servers.demo]\ncommand = "node"\n';
const withoutFeatures = 'model = "gpt-6-sol"\n\n[mcp_servers.demo]\ncommand = "node"\n';

function topLevelKeys(text: string): string[] {
  const keys: string[] = [];
  for (const line of text.replace(/^﻿/, "").split(/\r?\n/)) {
    if (/^\s*\[/.test(line)) break;
    const key = /^\s*([A-Za-z0-9_.-]+)\s*=/.exec(line)?.[1];
    if (key) keys.push(key);
  }
  return keys;
}

function tableKeys(text: string, table: string): string[] {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `[${table}]`);
  const keys: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\s*\[/.test(line)) break;
    const key = /^\s*([A-Za-z0-9_.-]+)\s*=/.exec(line)?.[1];
    if (key) keys.push(key);
  }
  return keys;
}

test("enable puts openai_base_url at top level, before every table", () => {
  const { text, changed } = enableProxy(withFeatures, URL);
  assert.equal(changed, true);
  assert.deepEqual(topLevelKeys(text), ["openai_base_url", "model"]);
  assert.match(text, /openai_base_url = "http:\/\/localhost:17891\/backend-api\/codex"/);
});

test("respect_system_proxy goes into an existing [features] table", () => {
  const { text } = enableProxy(withFeatures, URL);
  assert.deepEqual(tableKeys(text, "features"), ["respect_system_proxy", "view_image"]);
  assert.equal(proxyStatus(text).respectSystemProxy, "managed");
});

test("without a [features] table it becomes a top-level dotted key", () => {
  const { text } = enableProxy(withoutFeatures, URL);
  assert.deepEqual(topLevelKeys(text), ["openai_base_url", "features.respect_system_proxy", "model"]);
  assert.doesNotMatch(text, /^\[features\]/m);
});

test("enable then disable restores the file byte for byte", () => {
  const samples = [withFeatures, withoutFeatures, "", "﻿" + withFeatures.replaceAll("\n", "\r\n"), "# only a comment\n"];
  for (const sample of samples) assert.equal(disableProxy(enableProxy(sample, URL).text).text, sample);
});

test("CRLF files get CRLF blocks and keep their BOM", () => {
  const crlf = "﻿" + withFeatures.replaceAll("\n", "\r\n");
  const { text } = enableProxy(crlf, URL);
  assert.ok(text.startsWith("﻿# >>>"));
  assert.doesNotMatch(text.replaceAll("\r\n", ""), /\n/, "no bare LF introduced");
});

test("enabling twice is a no-op, and a new URL only replaces the managed setting", () => {
  const once = enableProxy(withFeatures, URL).text;
  assert.deepEqual(enableProxy(once, URL), { text: once, changed: false });
  const moved = enableProxy(once, "http://localhost:18000/backend-api/codex");
  assert.equal(moved.changed, true);
  assert.equal(proxyStatus(moved.text).url, "http://localhost:18000/backend-api/codex");
  assert.equal(disableProxy(moved.text).text, withFeatures);
});

test("a user's own top-level openai_base_url is never overwritten", () => {
  const mine = 'openai_base_url = "https://example.test/v1"\n' + withFeatures;
  assert.throws(() => enableProxy(mine, URL), /already sets openai_base_url/);
  assert.equal(proxyStatus(mine).conflict, true);
});

test("openai_base_url inside a table is not a top-level conflict", () => {
  const scoped = withFeatures + '\n[profiles.work]\nopenai_base_url = "https://example.test/v1"\n';
  assert.equal(enableProxy(scoped, URL).changed, true);
});

test("a user's own respect_system_proxy is respected", () => {
  const on = withFeatures.replace("[features]\n", "[features]\nrespect_system_proxy = true\n");
  const enabled = enableProxy(on, URL).text;
  assert.deepEqual(tableKeys(enabled, "features"), ["respect_system_proxy", "view_image"], "not duplicated");
  assert.equal(proxyStatus(enabled).respectSystemProxy, "user");
  assert.equal(disableProxy(enabled).text, on);
  const off = withFeatures.replace("[features]\n", "[features]\nrespect_system_proxy = false\n");
  assert.throws(() => enableProxy(off, URL), /turns respect_system_proxy off/);
});

test("disable without managed settings changes nothing", () => {
  assert.deepEqual(disableProxy(withFeatures), { text: withFeatures, changed: false });
});

const LOOP = "localhost,127.0.0.1,::1";

test(".env: the NO_PROXY block goes first and disable restores the file byte for byte", () => {
  const samples = ["", "OPENAI_API_KEY=not-a-real-key\n", "\uFEFFA=1\r\nB=2\r\n", "# only a comment"];
  for (const sample of samples) {
    const { text, changed } = enableNoProxy(sample, LOOP);
    assert.equal(changed, true);
    assert.equal(noProxyStatus(text).value, LOOP);
    assert.match(text.replace(/^\uFEFF/, ""), /^# >>> codex-attachment-manager/);
    assert.equal(disableProxy(text).text, sample);
  }
  assert.equal(disableProxy(enableNoProxy("", LOOP).text).text, "", "a file that only held the block becomes empty");
});

test(".env: enabling twice changes nothing, and a user's own NO_PROXY is never overridden", () => {
  const once = enableNoProxy("A=1\n", LOOP).text;
  assert.deepEqual(enableNoProxy(once, LOOP), { text: once, changed: false });
  for (const own of ["NO_PROXY=corp.example\n", "no_proxy = x\n", "export NO_PROXY=y\n"]) {
    assert.throws(() => enableNoProxy(own, LOOP), /already sets NO_PROXY/);
    assert.equal(noProxyStatus(own).conflict, true);
  }
  assert.equal(noProxyStatus("# NO_PROXY=commented out\n").conflict, false);
});

test("NO_PROXY keeps the user's entries and adds only the missing loopback hosts", () => {
  assert.equal(noProxyValue(null), LOOP);
  assert.equal(noProxyValue(".corp.example, localhost"), ".corp.example,localhost,127.0.0.1,::1");
  assert.equal(coversLoopback(LOOP), true);
  assert.equal(coversLoopback("*"), true);
  assert.equal(coversLoopback("localhost,127.0.0.1"), false);
  assert.equal(coversLoopback(null), false);
});

const NODE = "C:\\Program Files\\nodejs\\node.exe";
const SCRIPT = "D:\\tools\\cam\\panel-probe.ts";

test("MCP server: the table goes at the end with Windows paths escaped, and disable restores the file byte for byte", () => {
  const { text, changed } = enableMcpServer(withFeatures, "cam_probe", NODE, [SCRIPT]);
  assert.equal(changed, true);
  assert.ok(text.startsWith(withFeatures), "everything before the block is untouched");
  assert.match(text, /\[mcp_servers\.cam_probe\]\ncommand = "C:\\\\Program Files\\\\nodejs\\\\node\.exe"\nargs = \["D:\\\\tools\\\\cam\\\\panel-probe\.ts"\]\ndefault_tools_approval_mode = "approve"\n# <<< codex-attachment-manager <<<\n$/);
  for (const sample of [withFeatures, withoutFeatures, "", "\uFEFF" + withFeatures.replaceAll("\n", "\r\n")]) {
    assert.equal(disableMcpServer(enableMcpServer(sample, "cam_probe", NODE, [SCRIPT]).text).text, sample);
  }
});

test("MCP server block and proxy blocks are switched independently", () => {
  const both = enableMcpServer(enableProxy(withFeatures, URL).text, "cam_probe", NODE, [SCRIPT]).text;
  assert.equal(enableProxy(both, URL).changed, false, "re-enabling the proxy keeps the MCP block");
  assert.equal(disableProxy(both).text, enableMcpServer(withFeatures, "cam_probe", NODE, [SCRIPT]).text);
  assert.equal(disableMcpServer(both).text, enableProxy(withFeatures, URL).text);
  assert.equal(disableMcpServer(disableProxy(both).text).text, withFeatures);
});

test("MCP server: a user's own table with the same name is never overwritten", () => {
  const mine = withFeatures + "\n[mcp_servers.cam_probe]\ncommand = \"python\"\n";
  assert.throws(() => enableMcpServer(mine, "cam_probe", NODE, [SCRIPT]), /already defines mcp_servers\.cam_probe/);
  assert.equal(enableMcpServer(mine, "other", NODE, [SCRIPT]).changed, true);
});

// v0.9: keep the user's provider and credentials; only its endpoint gets a local route.
test("a custom top-level endpoint is routed and restored in place without changing its formatting", () => {
  const original = "\uFEFFopenai_base_url = 'https://relay.example:444/prefix/v1' # my endpoint\r\nmodel = \"other-model\"\r\n[features]\r\nview_image = true";
  const seen: string[] = [];
  let result: ReturnType<typeof enableProxy>;
  assert.doesNotThrow(() => { result = enableProxy(original, URL, (upstream: string) => { seen.push(upstream); return "http://localhost:17891/__cam/routes/relay"; }); });
  assert.deepEqual(seen, ["https://relay.example:444/prefix/v1"]);
  assert.match(result!.text, /^openai_base_url = "http:\/\/localhost:17891\/__cam\/routes\/relay"/m);
  assert.equal(result!.text.match(/^openai_base_url\s*=/gm)?.length, 1);
  assert.doesNotMatch(result!.text.replaceAll("\r\n", ""), /\n/);
  assert.equal(proxyStatus(result!.text).url, "http://localhost:17891/__cam/routes/relay");
  assert.equal(proxyStatus(result!.text).conflict, false);
  assert.equal(disableProxy(result!.text).text, original);
});

test("provider base URLs have independent routes and keep authentication, headers, queries and model selection", () => {
  const original = 'model_provider = "work.relay"\nmodel = "vision-model"\n\n[model_providers."work.relay"]\nname = "Work"\nbase_url = "https://first.example/prefix/v1"\nwire_api = "responses"\nenv_key = "RELAY_KEY"\nhttp_headers = { "x-provider" = "work" }\nquery_params = { version = "1" }\n\n[model_providers.local]\nbase_url = \'http://127.0.0.1:9123/api/v1\'\n\n[mcp_servers.other]\nbase_url = "https://unrelated.example"\n';
  const endpoints: string[] = [];
  const route = (upstream: string) => { endpoints.push(upstream); return `http://localhost:17891/__cam/routes/${upstream.startsWith("https:") ? "first" : "local"}`; };
  const result = enableProxy(original, URL, route);
  assert.deepEqual(endpoints, ["https://first.example/prefix/v1", "http://127.0.0.1:9123/api/v1"]);
  assert.match(result.text, /^base_url = "http:\/\/localhost:17891\/__cam\/routes\/first"$/m);
  assert.match(result.text, /^base_url = "http:\/\/localhost:17891\/__cam\/routes\/local"$/m);
  for (const line of ['model_provider = "work.relay"', 'env_key = "RELAY_KEY"', 'http_headers = { "x-provider" = "work" }', 'query_params = { version = "1" }', 'base_url = "https://unrelated.example"']) assert.ok(result.text.includes(line));
  assert.equal(disableProxy(result.text).text, original);
  assert.deepEqual(enableProxy(result.text, URL, route), { text: result.text, changed: false });
});

test("uninstall keeps an endpoint the user changed after installation, and re-enable binds that new endpoint", () => {
  const original = 'model_provider = "relay"\n[model_providers.relay]\nbase_url = "https://old.example/v1" # existing\n';
  const route = () => "http://localhost:17891/__cam/routes/relay";
  const installed = enableProxy(original, URL, route).text;
  const changed = installed.replace(/^base_url = .*$/m, 'base_url = "https://new.example/v2" # changed by user');
  assert.equal(disableProxy(changed).text, original.replace('base_url = "https://old.example/v1" # existing', 'base_url = "https://new.example/v2" # changed by user'));
  const targets: string[] = [];
  enableProxy(changed, URL, (target: string) => { targets.push(target); return route(); });
  assert.deepEqual(targets, ["https://new.example/v2"]);
});

test("dotted provider keys are routed, and provider-looking text inside multiline strings is untouched", () => {
  const original = 'model_providers.relay.base_url = "https://relay.example/v1"\ninstructions = """\n[model_providers.fake]\nbase_url = "https://not-a-setting.example"\n"""\n';
  const targets: string[] = [];
  const result = enableProxy(original, URL, (target: string) => { targets.push(target); return "http://localhost:17891/__cam/routes/dotted"; });
  assert.deepEqual(targets, ["https://relay.example/v1"]);
  assert.match(result.text, /^model_providers\.relay\.base_url = "http:\/\/localhost:17891\/__cam\/routes\/dotted"$/m);
  assert.ok(result.text.includes('base_url = "https://not-a-setting.example"'));
  assert.equal(disableProxy(result.text).text, original);
});

test("a multiline instruction does not hide a later top-level endpoint, and array tables end provider scope", () => {
  const original = 'instructions = """\n[fake.table]\n"""\nopenai_base_url = "https://top.example/v1"\n[model_providers.relay]\nbase_url = "https://relay.example/v1"\n[[unrelated]]\nbase_url = "https://unrelated.example"\n';
  const targets: string[] = [];
  const result = enableProxy(original, URL, (target: string) => { targets.push(target); return `http://localhost:17891/__cam/routes/${targets.length}`; });
  assert.deepEqual(targets, ["https://top.example/v1", "https://relay.example/v1"]);
  assert.equal(result.text.match(/^openai_base_url\s*=/gm)?.length, 1);
  assert.equal(disableProxy(result.text).text, original);
});

test("quoted top-level keys report the routed endpoint, and comments added inside its block survive uninstall", () => {
  const original = '\"openai_base_url\" = "https://relay.example/v1"\n';
  const local = "http://localhost:17891/__cam/routes/quoted";
  const installed = enableProxy(original, URL, () => local).text;
  assert.equal(proxyStatus(installed).url, local);
  const edited = installed.replace(/^"openai_base_url" = .*$/m, '# added by user\n"openai_base_url" = "' + local + '"');
  assert.equal(disableProxy(edited).text, '# added by user\n' + original);
});

test("unsupported endpoint syntax fails before enabling or registering any provider", () => {
  for (const original of [
    'openai_base_url = """https://relay.example/v1"""\n',
    '[model_providers.relay]\nbase_url = \'\'\'https://relay.example/v1\'\'\'\n',
    'model_provider = "relay"\nmodel_providers = { relay = { base_url = "https://relay.example/v1", name = "Relay" } }\n',
    '[model_providers]\nrelay = { base_url = "https://relay.example/v1", name = "Relay" }\n',
    'model_providers.relay = { base_url = "https://relay.example/v1", name = "Relay" }\n',
    '[model_providers.good]\nbase_url = "https://good.example/v1"\n[model_providers.bad]\nbase_url = """https://bad.example/v1"""\n',
  ]) {
    const targets: string[] = [];
    assert.throws(() => enableProxy(original, URL, (target) => { targets.push(target); return "http://localhost:17891/__cam/routes/example"; }), (error: any) => error.key === "conflict.endpointSyntax");
    assert.deepEqual(targets, []);
    assert.equal(proxyStatus(original).enabled, false);
  }
});
