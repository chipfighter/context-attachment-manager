// Panel-only localization: the host selects en/zh/ja; Claude reads its own desktop setting, never Codex's language.
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const page = readFileSync(new URL("../../plugin/src/panel.html", import.meta.url), "utf8");
const texts = JSON.parse(/<script type="application\/json" id="messages">([\s\S]*?)<\/script>/.exec(page)![1]);

test("the panel recognizes Japanese host locales without changing the model language parser", async () => {
  const expression = /const langOf = ([^;]+);/.exec(page)![1];
  const panelLangOf = new Function(`return (${expression})`)();
  assert.deepEqual(["en-US", "zh-CN", "zh-TW", "ja", "ja-JP", "fr-FR"].map(panelLangOf), ["en", "zh", "zh", "ja", "ja", "en"]);
  const { langOf } = await import("../../plugin/src/language.ts");
  assert.equal(langOf("ja-JP"), "en", "Japanese panel support must not extend the model's existing language contract");
});

test("every Japanese panel label exists and keeps the same interpolation values", () => {
  assert.ok(texts.ja, "a Japanese text table is required");
  const base = (table: Record<string,string>) => Object.keys(table).filter(k => !k.endsWith("_one")).sort();
  const values = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
  assert.deepEqual(base(texts.ja), base(texts.zh));
  for (const key of base(texts.zh)) assert.deepEqual(values(texts.ja[key]), values(texts.zh[key]), key);
  assert.equal(texts.ja["auto.label"], "自動選択");
});

test("Claude's fallback pane also has a complete Japanese interface", () => {
  const mod = readFileSync(new URL("../../hooks/register.js", import.meta.url), "utf8");
  const words = new Function(`return (${/const WORDS = (\{[\s\S]*?\n\})/.exec(mod)![1]})`)();
  assert.ok(words.ja, "the fallback pane must not fall back to Chinese for Japanese users");
  assert.deepEqual(Object.keys(words.ja).sort(), Object.keys(words.en).sort());
  assert.deepEqual(Object.keys(words.ja.routing).sort(), Object.keys(words.en.routing).sort());
  assert.equal(words.ja.copy, "リンクをコピー");
});

test("Claude uses its own locale, rereads changes, and leaves the settings read-only", async () => {
  const { claudePanelLanguage } = await import("../../plugin/src/panel-language.ts");
  const root = mkdtempSync(join(tmpdir(), "cam-panel-locale-"));
  const config = join(root, "config.json");
  const options = { settingsFiles: [config], env: { LANG: "en_US.UTF-8", CAM_LANG: "zh" }, home: root };
  const set = (locale: unknown) => writeFileSync(config, JSON.stringify({ locale, unrelated: "preserve" }));
  set("ja-JP");
  const original = readFileSync(config, "utf8");
  assert.equal(claudePanelLanguage(options), "ja");
  assert.equal(readFileSync(config, "utf8"), original);
  set("zh-CN"); assert.equal(claudePanelLanguage(options), "zh");
  set("en-US"); assert.equal(claudePanelLanguage(options), "en");
  set("fr-FR"); assert.equal(claudePanelLanguage(options), "en");
  writeFileSync(config, "{partial"); assert.equal(claudePanelLanguage(options), "en");
  set(null); assert.equal(claudePanelLanguage(options), "en");
});

test("Claude desktop settings are located for Windows, macOS and Linux", async () => {
  const { claudePanelLanguage } = await import("../../plugin/src/panel-language.ts");
  const home = mkdtempSync(join(tmpdir(), "cam-desktop-locale-"));
  const local = join(home, "local"), roaming = join(home, "roaming"), xdg = join(home, "xdg");
  const cases = [
    { platform: "win32", env: { LOCALAPPDATA: local, APPDATA: roaming }, path: join(local, "Claude-Data", "claude_testpublisher", "config.json") },
    { platform: "darwin", env: {}, path: join(home, "Library", "Application Support", "Claude", "config.json") },
    { platform: "linux", env: { XDG_CONFIG_HOME: xdg }, path: join(xdg, "Claude", "config.json") },
  ] as const;
  for (const item of cases) {
    mkdirSync(join(item.path, ".."), {recursive: true});
    writeFileSync(item.path, JSON.stringify({locale: "ja-JP"}));
    assert.equal(claudePanelLanguage({...item, home}), "ja", item.platform);
  }
});
