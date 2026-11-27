import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { writeDiagnosticLog } from "../../plugin/src/core/diagnostic-log.ts";

const at = (second: number) => new Date(Date.UTC(2026, 10, 26, 0, 0, second));
const row = (n: number) => ({ event: "test", n });
const line = (n: number) => `${JSON.stringify(row(n))}\n`;
const bytes = Buffer.byteLength(line(0));

function testDir(t: TestContext): string {
  const dir = mkdtempSync(join(tmpdir(), "cam-diagnostic-log-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test("proxy logs rotate at their active limit and retain only their archive budget", (t) => {
  const dir = testDir(t);
  const retired = join(dir, "2026-11-24.jsonl");
  writeFileSync(retired, line(0));
  const old = new Date("2026-11-24T00:00:00Z");
  utimesSync(retired, old, old);
  const report = join(dir, "reports", "2026-11-23.jsonl");
  mkdirSync(join(dir, "reports"));
  writeFileSync(report, "keep the report");
  const unrelated = join(dir, "notes.jsonl");
  writeFileSync(unrelated, "keep the notes");

  for (let n = 1; n <= 4; n++) writeDiagnosticLog(dir, "proxy", row(n), at(n), { activeBytes: bytes, archiveBytes: 2 * bytes });

  const active = "2026-11-26.jsonl";
  assert.equal(readFileSync(join(dir, active), "utf8"), line(4));
  assert.equal(existsSync(retired), false);
  const archives = readdirSync(dir).filter((name) => name.startsWith("2026-11-26.") && name !== active);
  assert.equal(archives.length, 2);
  assert.equal(archives.reduce((total, name) => total + statSync(join(dir, name)).size, 0), 2 * bytes);
  for (const archive of archives) assert.equal(JSON.parse(readFileSync(join(dir, archive), "utf8")).event, "test");
  assert.equal(readFileSync(report, "utf8"), "keep the report");
  assert.equal(readFileSync(unrelated, "utf8"), "keep the notes");
});

test("plugin service keeps a fixed JSONL path and logging failures stay local", (t) => {
  const dir = testDir(t);
  const limits = { activeBytes: bytes, archiveBytes: bytes };
  for (let n = 1; n <= 3; n++) writeDiagnosticLog(dir, "plugin-server", row(n), at(n), limits);
  writeDiagnosticLog(dir, "plugin-server", { content: "large".repeat(bytes) }, at(4), limits);
  assert.equal(readFileSync(join(dir, "plugin-server.jsonl"), "utf8"), line(3));
  const archives = readdirSync(dir).filter((name) => name.startsWith("plugin-server.") && name !== "plugin-server.jsonl");
  assert.equal(archives.length, 1);
  assert.equal(statSync(join(dir, archives[0])).size, bytes);
  const blocked = join(dir, "not-a-directory");
  writeFileSync(blocked, "keep this file");
  assert.doesNotThrow(() => writeDiagnosticLog(blocked, "plugin-server", row(5), at(5), limits));
  assert.equal(readFileSync(blocked, "utf8"), "keep this file");
});
