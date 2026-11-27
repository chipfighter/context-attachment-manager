// Compare two checkouts using independent Node processes and identical synthetic transcripts.
// node spike/src/bench-history-memory.ts <repository-root> <claude|codex> <sessions> <images-per-session>
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const [repository, adapter, sessions, images, fixture] = process.argv.slice(2);
const count = Number(images);
const ids = Array.from({ length: Number(sessions) }, (_, i) => `01234567-1234-7123-8123-${String(i).padStart(12, "0")}`);
const source = (i: number) => {
  // Uncompressed 768x768 24-bit BMP. The bytes differ for every image.
  const bytes = Buffer.alloc(54 + 768 * 768 * 3, i);
  bytes.fill(0, 0, 54); bytes.write("BM"); bytes.writeUInt32LE(bytes.length, 2);
  bytes.writeUInt32LE(54, 10); bytes.writeUInt32LE(40, 14); bytes.writeInt32LE(768, 18);
  bytes.writeInt32LE(768, 22); bytes.writeUInt16LE(1, 26); bytes.writeUInt16LE(24, 28);
  return bytes.toString("base64");
};
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
if (!fixture) {
  const home = mkdtempSync(join(tmpdir(), "cam-history-bench-"));
  try {
    const project = join(home, "projects", "fixture");
    mkdirSync(project, { recursive: true });
    for (const id of ids) {
      const file = adapter === "claude" ? join(project, id + ".jsonl") : join(home, `rollout-2026-11-25T00-00-00-${id}.jsonl`);
      if (adapter === "codex") appendFileSync(file, JSON.stringify({ type: "session_meta", payload: { id } }) + "\n");
      for (let i = 0; i < count; i++) {
        const data = source(i);
        const entry = adapter === "claude"
          ? { type: "user", uuid: "message-" + i, parentUuid: i ? "message-" + (i - 1) : null, message: { role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/bmp", data } }] } }
          : { type: "response_item", payload: { type: "message", id: "message-" + i, role: "user", content: [{ type: "input_image", image_url: "data:image/bmp;base64," + data }] } };
        appendFileSync(file, JSON.stringify(entry) + "\n");
      }
    }
    execFileSync(process.execPath, ["--expose-gc", ...process.argv.slice(1), home], { stdio: "inherit" });
  } finally { rmSync(home, { recursive: true, force: true }); }
} else {
  assert.ok(adapter === "claude" || adapter === "codex");
  const dir = resolve(repository, "plugin/src/adapters", adapter);
  const lib = await import(pathToFileURL(join(dir, adapter === "claude" ? "claude-index.ts" : "thread-index.ts")).href);
  const load = (id: string) => adapter === "claude" ? lib.loadClaudeIndex(id, fixture) : lib.loadThreadIndex(fixture, id);
  const expected = Array.from({ length: count }, (_, i) => digest(source(i)));
  const gc = (globalThis as { gc?: () => void }).gc!;
  gc(); gc();
  let start = performance.now();
  for (const id of ids) assert.deepEqual(load(id).images.map((image: {contentId: string}) => image.contentId), expected);
  const coldMs = Math.round(performance.now() - start);
  start = performance.now();
  for (const id of ids) assert.equal(load(id).images.length, count);
  const warmMs = Math.round(performance.now() - start);
  gc(); gc();
  const usage = process.memoryUsage();
  const peakMiB = Math.round(process.resourceUsage().maxRSS / 1024);
  for (const id of ids) {
    const index = load(id);
    for (const [i, image] of index.images.entries()) {
      assert.equal(image.id, "IMG-" + String(i + 1).padStart(3, "0"));
      assert.equal(digest(adapter === "claude" ? lib.claudeImageData(index, image) : lib.imageData(index.items, image)), expected[i]);
    }
  }
  console.log(JSON.stringify({ adapter, sessions: ids.length, images: count, coldMs, warmMs, peakMiB,
    idleRssMiB: Math.round(usage.rss / 1048576), idleHeapMiB: Math.round(usage.heapUsed / 1048576) }));
}
