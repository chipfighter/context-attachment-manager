// Purpose: v0.11 — installing on a platform that uses the core alone (docs/v0.11/plan.md 3.8): which platform a shell
// runs in, what `cam connect --apply` writes to the platform's settings and what `cam disconnect` puts back, and what
// each platform's entry reads from its settings.
// Input: temporary folders and environments. Output: test results.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { geminiCli } from "../../plugin/src/adapters/gemini-cli/platform.ts";
import { opencode } from "../../plugin/src/adapters/opencode/platform.ts";
import { pi } from "../../plugin/src/adapters/pi/platform.ts";
import { workbuddy } from "../../plugin/src/adapters/workbuddy/platform.ts";
import { applyEdits, undoEdits } from "../../plugin/src/core/config-edit.ts";
import { detectPlatform } from "../../plugin/src/platforms.ts";

const temp = () => mkdtempSync(join(tmpdir(), "cam-connect-"));
const json = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const info = { url: "http://127.0.0.1:17892/__cam/routes/" + "a".repeat(32), mcp: { command: "node", args: ["/x/plugin-server.ts"], env: { CAM_HOST: "test" } } };

test("which platform a shell command runs in, from the variables each one sets", () => {
  assert.deepEqual(detectPlatform({ GEMINI_CLI: "1" }), { platform: "gemini-cli", matches: ["gemini-cli"] });
  assert.equal(detectPlatform({ OPENCODE: "1" }).platform, "opencode");
  assert.equal(detectPlatform({ PI_SESSION_ID: "s", PI_PROVIDER: "anthropic" }).platform, "pi");
  assert.equal(detectPlatform({ DSH_SHELL: "1" }).platform, "dsh");
  assert.equal(detectPlatform({ CLAUDECODE: "1" }).platform, "claude");
  assert.equal(detectPlatform({ CODEX_THREAD_ID: "t" }).platform, "codex");
  assert.equal(detectPlatform({ CODEBUDDY: "1", WORKBUDDY_EXTRA_PATHS: "x" }).platform, "workbuddy");
  assert.equal(detectPlatform({ CODEBUDDY: "1", CODEBUDDY_NODE_BIN: "E:\\Tools\\WorkBuddy\\WorkBuddy.exe" }).platform, "workbuddy");
  assert.deepEqual(detectPlatform({ CODEBUDDY: "1" }), { platform: null, matches: ["codebuddy"] }, "CodeBuddy without WorkBuddy's marks: ask");
  assert.deepEqual(detectPlatform({}), { platform: null, matches: [] });
  assert.deepEqual(detectPlatform({ CLAUDECODE: "1", CODEX_THREAD_ID: "t" }).platform, null, "one agent started from another's shell: ask");
});

test("connect writes JSON values, list items and env lines with a backup; disconnect puts back what was there", () => {
  const dir = temp();
  const data = temp();
  const settings = join(dir, "settings.json");
  const env = join(dir, ".env");
  writeFileSync(settings, JSON.stringify({ keep: true, env: { BASE: "https://relay.example" }, extensions: ["mine.ts"] }));
  writeFileSync(env, "KEY=secret\r\nBASE=https://old.example\r\n");
  const edits = [
    { file: settings, json: ["env", "BASE"], value: info.url },
    { file: settings, json: ["mcpServers", "cam"], value: { command: "node" } },
    { file: settings, add: ["extensions"], value: "/x/extension.ts" },
    { file: env, env: "BASE", value: info.url },
    { file: env, env: "NEW", value: "1" },
  ];
  applyEdits("workbuddy", edits, data);
  assert.deepEqual(json(settings), { keep: true, env: { BASE: info.url }, extensions: ["mine.ts", "/x/extension.ts"], mcpServers: { cam: { command: "node" } } });
  assert.equal(readFileSync(env, "utf8"), `KEY=secret\r\nBASE=${info.url}\r\nNEW=1\r\n`, "line endings kept, the key untouched");
  assert.equal(readdirSync(join(data, "config-backup", "workbuddy")).length, 2);
  applyEdits("workbuddy", edits, data); // a second connect remembers what was there before the first
  undoEdits("workbuddy", data);
  assert.deepEqual(json(settings), { keep: true, env: { BASE: "https://relay.example" }, extensions: ["mine.ts"], mcpServers: {} });
  assert.equal(readFileSync(env, "utf8"), "KEY=secret\r\nBASE=https://old.example\r\n");
});

test("disconnect leaves a setting the user changed since; connect refuses a file that is not plain JSON and writes nothing", () => {
  const dir = temp();
  const data = temp();
  const settings = join(dir, "settings.json");
  applyEdits("pi", [{ file: settings, json: ["providers", "anthropic", "baseUrl"], value: info.url }], data);
  writeFileSync(settings, JSON.stringify({ providers: { anthropic: { baseUrl: "https://mine.example" } } }));
  const undone = undoEdits("pi", data);
  assert.equal(undone.kept.length, 1);
  assert.equal(json(settings).providers.anthropic.baseUrl, "https://mine.example");
  const commented = join(dir, "opencode.jsonc");
  writeFileSync(commented, '{\n  // mine\n  "model": "anthropic/x"\n}\n');
  const other = join(dir, "other.json");
  assert.throws(() => applyEdits("opencode", [{ file: other, json: ["a"], value: 1 }, { file: commented, json: ["b"], value: 2 }], data), /not plain JSON/);
  assert.equal(existsSync(other), false, "checked before anything is written");
});

test("each platform reads where its requests go now and what to write", () => {
  const home = temp();
  mkdirSync(join(home, ".workbuddy"));
  writeFileSync(join(home, ".workbuddy", "settings.json"), JSON.stringify({ env: { CODEBUDDY_BASE_URL: "https://relay.example/v2" } }));
  const wb = workbuddy.setup!({ home, env: {}, provider: null });
  assert.equal(wb.current, "https://relay.example/v2", "a relay set before is kept as the destination");
  assert.deepEqual(wb.edits(info).map((edit) => edit.file.split(/[\\/]/).slice(-2).join("/")), [".workbuddy/settings.json", ".workbuddy/.mcp.json"]);

  mkdirSync(join(home, ".gemini"));
  writeFileSync(join(home, ".gemini", "settings.json"), JSON.stringify({ security: { auth: { selectedType: "gemini-api-key" } } }));
  const gemini = geminiCli.setup!({ home, env: {}, provider: null });
  assert.equal(gemini.fallback, "https://generativelanguage.googleapis.com");
  assert.deepEqual(gemini.edits(info)[0], { file: join(home, ".gemini", ".env"), env: "GOOGLE_GEMINI_BASE_URL", value: info.url });
  writeFileSync(join(home, ".gemini", "settings.json"), JSON.stringify({ security: { auth: { selectedType: "vertex-ai" } } }));
  assert.throws(() => geminiCli.setup!({ home, env: {}, provider: null }), /vertex-ai/);

  mkdirSync(join(home, ".config", "opencode"), { recursive: true });
  writeFileSync(join(home, ".config", "opencode", "opencode.json"), JSON.stringify({ model: "openai/gpt-x" }));
  const oc = opencode.setup!({ home, env: {}, provider: null });
  assert.equal(oc.fallback, "https://api.openai.com/v1", "the provider of the configured model");
  assert.deepEqual((oc.edits(info)[0] as { json: string[] }).json, ["provider", "openai", "options", "baseURL"]);

  assert.throws(() => pi.setup!({ home, env: {}, provider: null }), /name the provider/);
  const p = pi.setup!({ home, env: { PI_PROVIDER: "anthropic" }, provider: null });
  assert.equal(p.fallback, "https://api.anthropic.com", "the provider pi uses now, from its shell");
});
