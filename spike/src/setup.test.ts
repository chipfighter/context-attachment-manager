// Purpose: v0.1-5 — switching Codex between the engine and a direct connection: 启用 writes the settings with a
// backup, 停用 gives back the very same files; only the panel may switch, never the model; and the plugin counts as
// gone only on clear signs (no folder in Codex's cache, or turned off in config.toml).
// Input: a temporary Codex home and data folder; output: Node test assertions only.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { callTool, resetSetupBaseline } from "../../plugin/src/plugin-server.ts";
import { connectDirectly, pluginGone, useEngine, usesEngine } from "../../plugin/src/setup.ts";
import * as setup from "../../plugin/src/setup.ts";
import { sampleSessions, THREAD } from "./testfixtures.ts";

// These tests check the Chinese wording: the language is fixed, so neither the system's language nor one a panel
// reported on this machine decides it (v0.1-14).
process.env.CAM_LANG = "zh";

const CONFIG = 'model = "gpt-6-sol"\n\n[features]\nview_image = true\n\n[plugins."codex-attachment-manager@codex-attachment-manager"]\nenabled = true\n';

function tempHome(t: TestContext): { home: string; data: string } {
  const home = mkdtempSync(join(tmpdir(), "cam-setup-home-"));
  const data = mkdtempSync(join(tmpdir(), "cam-setup-data-"));
  const saved = { CODEX_HOME: process.env.CODEX_HOME, CAM_DATA_DIR: process.env.CAM_DATA_DIR };
  process.env.CODEX_HOME = home;
  process.env.CAM_DATA_DIR = data;
  t.after(() => {
    for (const [name, value] of Object.entries(saved)) if (value === undefined) delete process.env[name]; else process.env[name] = value;
  });
  return { home, data };
}

test("启用 points Codex at the engine with a backup first; 停用 gives back the very same files", (t) => {
  const { home, data } = tempHome(t);
  writeFileSync(join(home, "config.toml"), CONFIG);
  writeFileSync(join(home, ".env"), "OTHER=1\n");
  useEngine(17891);
  assert.equal(usesEngine(), true);
  assert.match(readFileSync(join(home, "config.toml"), "utf8"), /^# >>> codex-attachment-manager[^\n]*\nopenai_base_url = "http:\/\/localhost:17891\/backend-api\/codex"/);
  assert.equal(readdirSync(join(data, "config-backup")).length, 1, "config.toml was copied before the change");
  connectDirectly();
  assert.equal(usesEngine(), false);
  assert.equal(readFileSync(join(home, "config.toml"), "utf8"), CONFIG);
  assert.equal(readFileSync(join(home, ".env"), "utf8"), "OTHER=1\n");
  assert.equal(existsSync(join(home, "config.toml.cam-tmp")), false, "no temporary file is left behind");
});

test("only the panel may switch the setting; a call from the model is refused; switching back needs no restart", (t) => {
  const { home } = tempHome(t);
  writeFileSync(join(home, "config.toml"), CONFIG);
  resetSetupBaseline();
  const { sessionsDir } = sampleSessions();
  const panelMeta = { threadId: THREAD };
  const modelMeta = { "x-codex-turn-metadata": { thread_id: THREAD, turn_id: "t9" } };
  assert.throws(() => callTool("cam_setup", { enable: true }, modelMeta, sessionsDir), /只有用户能启用或停用/);
  assert.equal(usesEngine(), false);
  const on = callTool("cam_setup", { enable: true }, panelMeta, sessionsDir).structuredContent;
  assert.deepEqual(on.setup, { usesEngine: true, changed: "enabled" });
  assert.equal(on.totals.images, 3, "the panel state comes along");
  const off = callTool("cam_setup", { enable: false }, panelMeta, sessionsDir).structuredContent;
  assert.deepEqual(off.setup, { usesEngine: false, changed: null }, "back to what Codex loaded: no restart due");
  // Starting from a Codex that goes through the engine, 停用插件 is what waits for the restart.
  useEngine(17891);
  resetSetupBaseline();
  assert.deepEqual(callTool("cam_setup", { enable: false }, panelMeta, sessionsDir).structuredContent.setup, { usesEngine: false, changed: "disabled" });
  assert.equal(readFileSync(join(home, "config.toml"), "utf8"), CONFIG);
});

test("the plugin counts as gone only when its cache folder is missing or config.toml turns it off", (t) => {
  const { home } = tempHome(t);
  writeFileSync(join(home, "config.toml"), CONFIG);
  assert.equal(pluginGone(), "removed");
  mkdirSync(join(home, "plugins", "cache", "codex-attachment-manager", "codex-attachment-manager", "0.1.0"), { recursive: true });
  assert.equal(pluginGone(), null);
  writeFileSync(join(home, "config.toml"), CONFIG.replace("enabled = true", "enabled = false"));
  assert.equal(pluginGone(), "disabled");
  writeFileSync(join(home, "config.toml"), 'model = "gpt-6-sol"\n');
  assert.equal(pluginGone(), null, "an entry written some other way is not taken as a removal");
});

test("custom provider setup persists its target before pointing Codex at the local route", (t) => {
  const { home, data } = tempHome(t);
  const original = 'model_provider = "relay"\n[model_providers.relay]\nbase_url = "https://relay.example:8443/prefix/v1"\nenv_key = "RELAY_API_KEY"\nwire_api = "responses"\n';
  writeFileSync(join(home, "config.toml"), original);
  useEngine(17891);
  const installed = readFileSync(join(home, "config.toml"), "utf8");
  assert.match(installed, /^base_url = "http:\/\/localhost:17892\/__cam\/routes\/[a-zA-Z0-9_-]+"$/m);
  const routes = join(data, "routes");
  assert.equal(existsSync(routes), true, "the upstream binding is already persisted when the config is written");
  const records = readdirSync(routes).filter((file) => file.endsWith(".json")).map((file) => JSON.parse(readFileSync(join(routes, file), "utf8")));
  assert.ok(records.some((record) => record.platform === "codex" && record.baseUrl === "https://relay.example:8443/prefix/v1"));
  assert.equal(useEngine(17891).configChanged, false);
  connectDirectly();
  assert.equal(readFileSync(join(home, "config.toml"), "utf8"), original);
});

test("unsupported provider syntax leaves config and env unchanged and creates no backup", (t) => {
  const { home, data } = tempHome(t);
  for (const original of [
    'openai_base_url = """https://relay.example/v1"""\n',
    'model_provider = "relay"\nmodel_providers = { relay = { base_url = "https://relay.example/v1", name = "Relay" } }\n',
  ]) {
    writeFileSync(join(home, "config.toml"), original);
    writeFileSync(join(home, ".env"), "OTHER=unchanged\n");
    assert.throws(() => useEngine(17891), (error: any) => error.key === "conflict.endpointSyntax");
    assert.equal(readFileSync(join(home, "config.toml"), "utf8"), original);
    assert.equal(readFileSync(join(home, ".env"), "utf8"), "OTHER=unchanged\n");
    assert.equal(existsSync(join(data, "config-backup")), false);
    assert.equal(existsSync(join(data, "routes")), false);
  }
});

test("setup rejects a provider pointing back at the engine on any path without changing files", (t) => {
  const { home, data } = tempHome(t);
  for (const target of ["http://localhost:17891/v1", "http://127.0.0.1:17891/other", "http://[::1]:17891/api", "https://localhost:17891/prefix", "http://localhost:17892/v1"]) {
    const original = `[model_providers.relay]\nbase_url = "${target}"\n`;
    writeFileSync(join(home, "config.toml"), original);
    assert.throws(() => useEngine(17891), (error: any) => error.key === "conflict.proxyLoop");
    assert.equal(readFileSync(join(home, "config.toml"), "utf8"), original);
    assert.equal(existsSync(join(data, "config-backup")), false);
    assert.equal(existsSync(join(data, "routes")), false);
  }
});

test("engine preflight plans custom routes without writing config, route records or backups", (t) => {
  const { home, data } = tempHome(t);
  const original = 'openai_base_url = "https://relay.example:8443/prefix/v1"\n';
  writeFileSync(join(home, "config.toml"), original);
  writeFileSync(join(home, ".env"), "OTHER=unchanged\n");
  const plan = setup.planEngine(17891);
  assert.equal(plan.configChanged, true);
  assert.match(plan.configText, /^openai_base_url = "http:\/\/localhost:17892\/__cam\/routes\/0{32}"$/m);
  assert.equal(readFileSync(join(home, "config.toml"), "utf8"), original);
  assert.equal(readFileSync(join(home, ".env"), "utf8"), "OTHER=unchanged\n");
  assert.deepEqual(readdirSync(data), []);
});

test("engine preflight rejects unsafe configuration without creating route data", (t) => {
  const { home, data } = tempHome(t);
  for (const [original, key] of [
    ['openai_base_url = """https://relay.example/v1"""\n', "conflict.endpointSyntax"],
    ['openai_base_url = "http://localhost:17891/v1"\n', "conflict.proxyLoop"],
  ]) {
    writeFileSync(join(home, "config.toml"), original);
    assert.throws(() => setup.planEngine(17891), (error: any) => error.key === key);
    assert.equal(readFileSync(join(home, "config.toml"), "utf8"), original);
    assert.deepEqual(readdirSync(data), []);
  }
});
