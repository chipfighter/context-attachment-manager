// Purpose: v0.13 — the plugin keeps itself up to date (plugin/src/core/update.ts, adapters/codex/update.ts,
// adapters/claude/update.ts): which installs it touches, when it checks, what it records, how it reads GitHub's answer
// and how it moves Codex's marketplace to a release. The platforms' command lines are stood in for here; the real ones
// were run by hand against throwaway Codex and Claude Code homes (docs/design.md section 11).
// Input: temporary folders, a local HTTP server. Output: Node test assertions only.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { changeUpdate, compareVersions, due, isOurRepo, latestRelease, parseVersion, readUpdateState, releaseFromLocation, updateOnce, updateView, DAY_MS, RETRY_MS, type Installed, type Platform, type Release } from "../../plugin/src/core/update.ts";
import { setMarketplaceRef } from "../../plugin/src/adapters/codex/update.ts";
import { cliEnv, findClaudeCli } from "../../plugin/src/adapters/claude/update.ts";

const root = () => mkdtempSync(join(tmpdir(), "cam-update-"));
const NOW = Date.parse("2026-11-23T08:00:00Z");

test("only installs from this repository on GitHub count, under its current or its old name", () => {
  for (const source of ["chipfighter/context-attachment-manager", "https://github.com/chipfighter/context-attachment-manager.git", "git@github.com:chipfighter/context-attachment-manager.git", "https://github.com/chipfighter/codex-attachment-manager", "chipfighter/Context-Attachment-Manager/"]) assert.equal(isOurRepo(source), true, source);
  for (const source of ["D:\\work\\codex-attachment-manager", "someone/context-attachment-manager", "https://gitlab.com/chipfighter/context-attachment-manager", undefined]) assert.equal(isOurRepo(source), false, String(source));
});

test("versions: x.y.z with or without v; pre-releases and dev builds are not versions here", () => {
  assert.deepEqual(parseVersion("v0.13.0"), [0, 13, 0]);
  assert.equal(parseVersion("0.10.0-dev.1793616777484"), null);
  assert.ok(compareVersions("0.13.0", "0.12.9") > 0);
  assert.ok(compareVersions("0.12.0", "0.12.1") < 0);
  assert.equal(compareVersions("1.0.0", "v1.0.0"), 0);
});

test("GitHub's redirect for the latest release names its tag; anything else is no answer", () => {
  assert.deepEqual(releaseFromLocation("https://github.com/chipfighter/context-attachment-manager/releases/tag/v0.12.0"), { tag: "v0.12.0", version: "0.12.0" });
  assert.equal(releaseFromLocation("https://github.com/chipfighter/context-attachment-manager/releases"), null);
  assert.equal(releaseFromLocation(undefined), null);
});

test("the latest release is read from one request; a page without a redirect is an error; CAM_UPDATE_LATEST pins it", async (t) => {
  let location: string | null = "/chipfighter/context-attachment-manager/releases/tag/v0.13.2";
  const seen: string[] = [];
  const server = createServer((req, res) => {
    seen.push(`${req.method} ${req.url} ${req.headers["user-agent"]}`);
    if (location) res.writeHead(302, { location }); else res.writeHead(200);
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const port = (server.address() as { port: number }).port;
  assert.deepEqual(await latestRelease({ host: "127.0.0.1", port, secure: false, env: {} }), { tag: "v0.13.2", version: "0.13.2" });
  assert.equal(seen[0], "HEAD /chipfighter/context-attachment-manager/releases/latest context-attachment-manager-update", "one HEAD request, a plain user agent");
  location = null;
  await assert.rejects(latestRelease({ host: "127.0.0.1", port, secure: false, env: {} }), /GitHub answered 200/);
  assert.deepEqual(await latestRelease({ env: { CAM_UPDATE_LATEST: "v0.14.0" } }), { tag: "v0.14.0", version: "0.14.0" });
});

test("Codex's marketplace is moved to a release by its ref, and put back as it was", () => {
  const config = "model = \"gpt-6-sol\"\r\n\r\n[marketplaces.codex-attachment-manager]\r\nsource_type = \"git\"\r\nsource = \"https://github.com/chipfighter/context-attachment-manager.git\"\r\n\r\n[plugins.\"codex-attachment-manager@codex-attachment-manager\"]\r\nenabled = true\r\n";
  const added = setMarketplaceRef(config, "codex-attachment-manager", "v0.13.0");
  assert.equal(added.found, true);
  assert.equal(added.previous, null);
  assert.match(added.text, /source = "https:\/\/github\.com\/chipfighter\/context-attachment-manager\.git"\r\nref = "v0\.13\.0"\r\n\r\n\[plugins\./, "after the table's last line, with the file's line endings");
  const moved = setMarketplaceRef(added.text, "codex-attachment-manager", "v0.13.1");
  assert.equal(moved.previous, "v0.13.0");
  assert.equal(moved.text.match(/^ref = /gm)?.length, 1, "replaced, not added twice");
  assert.equal(setMarketplaceRef(moved.text, "codex-attachment-manager", null).text, config, "removed: the file as it was");
  const quoted = setMarketplaceRef("[marketplaces.\"codex-attachment-manager\"]\nref = 'v0.12.0' # pinned\n", "codex-attachment-manager", "v0.13.0");
  assert.equal(quoted.previous, "v0.12.0");
  assert.equal(quoted.text, "[marketplaces.\"codex-attachment-manager\"]\nref = \"v0.13.0\"\n");
  assert.equal(setMarketplaceRef("[marketplaces.other]\nref = \"x\"\n", "codex-attachment-manager", "v1.0.0").found, false, "another marketplace's ref is not touched");
});

test("about once a day; again after six hours when the last check failed or could not install yet", () => {
  const status = (result: any, ago: number) => ({ checkedAt: new Date(NOW - ago).toISOString(), result });
  assert.equal(due(undefined, NOW), true);
  assert.equal(due(status("up-to-date", DAY_MS - 60_000), NOW), false);
  assert.equal(due(status("up-to-date", DAY_MS), NOW), true);
  assert.equal(due(status("updated", RETRY_MS), NOW), false);
  assert.equal(due(status("failed", RETRY_MS - 60_000), NOW), false);
  assert.equal(due(status("failed", RETRY_MS), NOW), true);
  assert.equal(due(status("waiting", RETRY_MS), NOW), true);
  assert.equal(due({ checkedAt: "not a date", result: "up-to-date" }, NOW), true);
});

// A platform whose installs and command line are stood in for.
function fake(installed: Installed, after?: (release: Release) => string | Error): Platform & { applied: Release[] } {
  const applied: Release[] = [];
  return {
    host: "codex",
    applied,
    inspect: async () => installed,
    async apply(release) {
      applied.push(release);
      const result = after ? after(release) : release.version;
      if (result instanceof Error) throw result;
      return result;
    },
  };
}
const latest = (version: string) => async () => ({ tag: `v${version}`, version });

test("a different release is installed and recorded; the same one is not touched; a lower one too (a rollback)", async () => {
  const dir = root();
  const platform = fake({ eligible: true, version: "0.12.0" });
  const outcome = await updateOnce(platform, { root: dir, env: {}, now: () => NOW, latest: latest("0.13.0") });
  assert.deepEqual(platform.applied, [{ tag: "v0.13.0", version: "0.13.0" }]);
  assert.deepEqual(outcome, { ran: true, status: { checkedAt: new Date(NOW).toISOString(), result: "updated", latest: "0.13.0", installed: "0.13.0", from: "0.12.0", to: "0.13.0", updatedAt: new Date(NOW).toISOString() } });
  assert.equal(readUpdateState(dir).hosts?.codex?.result, "updated");
  const same = fake({ eligible: true, version: "0.13.0" });
  assert.equal(((await updateOnce(same, { root: root(), env: {}, now: () => NOW, latest: latest("0.13.0") })) as any).status.result, "up-to-date");
  assert.equal(same.applied.length, 0);
  const rollback = fake({ eligible: true, version: "0.13.1" });
  await updateOnce(rollback, { root: root(), env: {}, now: () => NOW, latest: latest("0.13.0") });
  assert.deepEqual(rollback.applied.map((release) => release.version), ["0.13.0"], "the latest release is followed, also when it is older");
});

test("a local install is left alone, the switch and CAM_AUTO_UPDATE=0 stop it, and a check is not repeated before it is due", async () => {
  const local = fake({ eligible: false, reason: "installed from a local folder", version: "0.13.0" });
  const dir = root();
  const outcome = await updateOnce(local, { root: dir, env: {}, now: () => NOW, latest: latest("0.14.0") });
  assert.equal((outcome as any).status.result, "skipped");
  assert.equal(local.applied.length, 0);
  assert.deepEqual(await updateOnce(local, { root: dir, env: {}, now: () => NOW + 60_000, latest: latest("0.14.0") }), { ran: false, why: "not-due" });
  const off = root();
  changeUpdate("codex", { auto: false }, off);
  assert.deepEqual(await updateOnce(fake({ eligible: true, version: "0.12.0" }), { root: off, env: {}, latest: latest("0.13.0") }), { ran: false, why: "off" });
  assert.deepEqual(await updateOnce(fake({ eligible: true, version: "0.12.0" }), { root: root(), env: { CAM_AUTO_UPDATE: "0" }, latest: latest("0.13.0") }), { ran: false, why: "off" });
});

test("a failed install is recorded with its reason and tried again later; one that installed nothing new waits", async () => {
  const dir = root();
  const broken = fake({ eligible: true, version: "0.12.0" }, () => new Error("codex plugin marketplace upgrade failed (1): offline"));
  const outcome = await updateOnce(broken, { root: dir, env: {}, now: () => NOW, latest: latest("0.13.0") });
  assert.deepEqual((outcome as any).status, { checkedAt: new Date(NOW).toISOString(), result: "failed", reason: "codex plugin marketplace upgrade failed (1): offline" });
  // The lock is free again: the next due check runs.
  assert.equal((await updateOnce(broken, { root: dir, env: {}, now: () => NOW + RETRY_MS, latest: latest("0.13.0") })).ran, true);
  const lagging = fake({ eligible: true, version: "0.12.0" }, () => "0.12.0");
  assert.equal(((await updateOnce(lagging, { root: root(), env: {}, now: () => NOW, latest: latest("0.13.0") })) as any).status.result, "waiting");
  const offline = fake({ eligible: true, version: "0.12.0" });
  const answer = await updateOnce(offline, { root: root(), env: {}, now: () => NOW, latest: async () => { throw new Error("no answer from GitHub"); } });
  assert.equal((answer as any).status.result, "failed");
  assert.equal(offline.applied.length, 0);
});

test("one check at a time on the machine; a lock left over for a quarter of an hour is taken over", async () => {
  const dir = root();
  mkdirSync(join(dir, "state"), { recursive: true });
  writeFileSync(join(dir, "state", "update.lock"), "1");
  assert.deepEqual(await updateOnce(fake({ eligible: true, version: "0.12.0" }), { root: dir, env: {}, latest: latest("0.13.0") }), { ran: false, why: "busy" });
  const { utimesSync } = await import("node:fs");
  const old = new Date(Date.now() - 16 * 60_000);
  utimesSync(join(dir, "state", "update.lock"), old, old);
  assert.equal((await updateOnce(fake({ eligible: true, version: "0.12.0" }), { root: dir, env: {}, latest: latest("0.13.0") })).ran, true);
});

test("the panel: the version, a new one waiting for a restart, the updated note until seen, and the switch", async () => {
  const dir = root();
  await updateOnce(fake({ eligible: true, version: "0.12.0" }), { root: dir, env: {}, now: () => NOW, latest: latest("0.13.0") });
  const waiting = updateView("codex", "0.12.0", dir, {});
  assert.equal(waiting.pending, "0.13.0", "installed, waiting for the next start");
  assert.equal(waiting.notes, "https://github.com/chipfighter/context-attachment-manager/releases/tag/v0.12.0");
  changeUpdate("codex", { seen: "0.12.0" }, dir);
  const restarted = updateView("codex", "0.13.0", dir, {});
  assert.deepEqual([restarted.pending, restarted.updated], [null, "0.13.0"]);
  changeUpdate("codex", { seen: "0.13.0" }, dir);
  assert.equal(updateView("codex", "0.13.0", dir, {}).updated, null, "noted once");
  assert.equal(updateView("claude", "0.13.0", dir, {}).pending, null, "each platform for itself");
  changeUpdate("codex", { auto: false }, dir);
  assert.equal(updateView("claude", "0.13.0", dir, {}).auto, false, "one switch for both platforms");
  changeUpdate("codex", { seen: "not a version" }, dir);
  assert.equal(readUpdateState(dir).seen?.codex, "0.13.0");
});

test("Claude Code's command line: the one named, and it runs outside the session the service belongs to", () => {
  const dir = root();
  const exe = join(dir, "claude.exe");
  writeFileSync(exe, "");
  assert.equal(findClaudeCli({ CAM_CLAUDE_CLI: exe }), exe);
  assert.equal(findClaudeCli({ CAM_CLAUDE_CLI: join(dir, "missing.exe") }), null);
  const env = cliEnv({ CLAUDECODE: "1", CLAUDE_CODE_SESSION_ID: "x", CLAUDE_CODE_ENTRYPOINT: "claude-desktop", CLAUDE_PID: "1", CLAUDE_AGENT_SDK_VERSION: "0.3", CAM_HOST: "claude", CLAUDE_CONFIG_DIR: "C:\\c", CLAUDE_CODE_GIT_BASH_PATH: "C:\\git\\bash.exe", DISABLE_AUTOUPDATER: "1", PATH: "p" });
  assert.deepEqual(Object.keys(env).sort(), ["CLAUDE_CODE_GIT_BASH_PATH", "CLAUDE_CONFIG_DIR", "DISABLE_AUTOUPDATER", "PATH"]);
});

// v0.13: Claude Code clones a "github" source over SSH wherever the user's GitHub key works, and SSH straight to GitHub
// stalled where HTTPS went through a proxy (2026-11-23): the plugin is named by its HTTPS address, at its own release.
test("Claude's marketplace names the plugin by its HTTPS address, at the plugin's own version", async () => {
  const { readFileSync } = await import("node:fs");
  const repoRoot = join(import.meta.dirname, "..", "..");
  const entry = JSON.parse(readFileSync(join(repoRoot, ".claude-plugin", "marketplace.json"), "utf8")).plugins.find((plugin: any) => plugin.name === "codex-attachment-manager");
  const version = JSON.parse(readFileSync(join(repoRoot, ".claude-plugin", "plugin.json"), "utf8")).version;
  assert.deepEqual(entry.source, { source: "url", url: "https://github.com/chipfighter/context-attachment-manager.git", ref: `v${version}` });
  assert.equal(entry.version, version);
});

test("the lock stays fresh while its holder works, so a long check is not taken over; let go, it is gone", async () => {
  const { statSync, utimesSync, existsSync } = await import("node:fs");
  const { takeLock, LOCK_STALE_MS } = await import("../../plugin/src/core/update.ts");
  const dir = root();
  const unlock = takeLock(dir, 20)!;
  assert.ok(unlock);
  const file = join(dir, "state", "update.lock");
  const old = new Date(Date.now() - LOCK_STALE_MS - 60_000);
  utimesSync(file, old, old);
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.ok(Date.now() - statSync(file).mtimeMs < 60_000, "touched again by its holder");
  assert.equal(takeLock(dir), null, "still held");
  unlock();
  assert.equal(existsSync(file), false);
  const again = takeLock(dir);
  assert.ok(again, "free again");
  again!();
});

test("a command still running at its time limit is stopped with what it started", async () => {
  const { readFileSync, existsSync } = await import("node:fs");
  const { runCommand } = await import("../../plugin/src/core/update.ts");
  const dir = root();
  const pidFile = join(dir, "grandchild.pid");
  // A command that starts another program (as claude starts git and ssh), which runs on. On Windows Node puts the
  // programs it starts in a job that ends with it, which Claude Code's git and ssh are not: the second program leaves
  // it (detached), so stopping only the command would leave it running there too (checked by hand, 2026-11-23).
  const grandchild = `require("fs").writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); setInterval(() => {}, 1000);`;
  const command = `require("child_process").spawn(process.execPath, ["-e", ${JSON.stringify(grandchild)}], { stdio: "ignore", detached: process.platform === "win32" }); setInterval(() => {}, 1000);`;
  const ran = await runCommand(process.execPath, ["-e", command], { timeoutMs: 2000 });
  assert.equal(ran.ok, false);
  assert.match(ran.stderr, /timed out/);
  assert.ok(existsSync(pidFile), "the second program had started");
  const pid = Number(readFileSync(pidFile, "utf8"));
  const alive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
  for (let wait = 0; wait < 50 && alive(); wait++) await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(alive(), false, "stopped with the command");
});
