import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { CACHE_BUDGET_BYTES, CACHE_IDLE_MS, LruCache, cacheMemory, cleanupCaches, clearCaches } from "../../plugin/src/core/memory.ts";

afterEach(clearCaches);

test("the shared budget evicts the least recently used entry across caches", () => {
  const left = new LruCache<number>(10, (bytes) => bytes);
  const right = new LruCache<number>(10, (bytes) => bytes);
  const weight = Math.floor(CACHE_BUDGET_BYTES * 0.3);
  left.set("first", weight);
  right.set("second", weight);
  assert.equal(left.get("first"), weight);
  right.set("third", CACHE_BUDGET_BYTES / 2);
  assert.equal(right.has("second"), false);
  assert.equal(left.has("first"), true);
  assert.equal(right.has("third"), true);
  assert.ok(cacheMemory().bytes <= CACHE_BUDGET_BYTES);
});

test("oversize entries are not retained and idle entries release their weight", () => {
  const cache = new LruCache<number>(10, (bytes) => bytes);
  cache.set("cached", 100);
  cache.set("oversize", CACHE_BUDGET_BYTES);
  assert.equal(cache.has("oversize"), false);
  assert.equal(cacheMemory().entries, 1);
  cleanupCaches(performance.now() + CACHE_IDLE_MS);
  assert.equal(cache.has("cached"), false);
  assert.equal(cacheMemory().bytes, 0);
});

test("an individual cache evicts its least recently used entry; null is a cached value", () => {
  const cache = new LruCache<true | null>(2);
  cache.set("empty", null);
  cache.set("old", true);
  assert.equal(cache.get("empty"), null);
  cache.set("new", true);
  assert.equal(cache.has("old"), false);
  assert.equal(cache.has("empty"), true);
  cache.delete("empty");
  assert.equal(cacheMemory().entries, 1);
  clearCaches();
  assert.equal(cache.has("new"), false);
  assert.equal(cacheMemory().bytes, 0);
});
