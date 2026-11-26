import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { cachedFile, pruneDiskCaches } from "../../plugin/src/core/disk-cache.ts";

test("disk LRU counts allocation blocks and only evicts recognized cache files", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "cam-disk-cache-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const old = new Date(Date.now() - 120_000);
  const put = (file: string) => {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, "-");
    utimesSync(file, old, old);
    return file;
  };
  const digest = "a".repeat(64);
  const pixel = put(join(root, "cache", "pixels", "aa", digest));
  const hot = put(join(root, "cache", "pixels", "bb", "b".repeat(64)));
  const wrongShard = put(join(root, "cache", "pixels", "bb", digest));
  const temp = put(join(root, "platforms", "workbuddy", "images", digest + ".123.tmp"));
  utimesSync(temp, new Date(0), new Date(0));
  const oldAsset = put(join(root, "platforms", "workbuddy", "images", digest));
  const recentAsset = put(join(root, "platforms", "opencode", "images", digest));
  const session = put(join(root, "platforms", "workbuddy", "sessions", digest + ".json"));
  const outside = put(join(root, "outside", digest));
  mkdirSync(join(root, "platforms", "mirror"));
  symlinkSync(dirname(outside), join(root, "platforms", "mirror", "images"), "junction");
  assert.equal(cachedFile(hot, 128, true), true);
  assert.equal(cachedFile(recentAsset, 128, true), true);

  await pruneDiskCaches(root, { pixels: 4096, images: 4096 });
  assert.ok(!existsSync(pixel) && !existsSync(oldAsset) && !existsSync(temp));
  for (const file of [hot, recentAsset, wrongShard, session, outside]) assert.ok(existsSync(file), file);
});
