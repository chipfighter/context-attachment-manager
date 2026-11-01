import assert from "node:assert/strict";
import test from "node:test";
import { draw, scene, score } from "./eval-long-scene.ts";

test("eval-long: each question fits exactly one image, its answer", () => {
  const { images, steps, questions } = scene();
  const keys = images.map((image) => image.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const question of questions) {
    if (question.target) assert.ok(keys.includes(question.target), `${question.key} target ${question.target}`);
    if (question.fits) assert.deepEqual(images.filter(question.fits).map((image) => image.key), [question.target], `${question.key}: ${question.say}`);
    if (question.expect === "number") assert.match(question.answer, /^\d+$/);
  }
  // Every file a turn names is an image of the scene, and every image is named or sent once.
  const files = new Set(images.flatMap((image) => ("file" in image ? [image.file] : [])));
  const named = steps.flatMap((step) => (step.type === "turn" ? [...step.say.matchAll(/[\w-]+\.png/g)].map((m) => m[0]) : []));
  for (const file of named) assert.ok(files.has(file), file);
  const ranges = [...steps.flatMap((step) => (step.type === "turn" ? [...step.say.matchAll(/(clip\d+|set_\d+)_(\d+)\.png 到 \1_(\d+)\.png/g)] : []))];
  const shown = new Set([...named, ...ranges.flatMap((m) => Array.from({ length: Number(m[3]) - Number(m[2]) + 1 }, (_, i) => `${m[1]}_${m[1].startsWith("clip") ? String(Number(m[2]) + i).padStart(2, "0") : Number(m[2]) + i}.png`))]);
  assert.deepEqual([...files].filter((file) => !shown.has(file)), []);
  const uploads = steps.flatMap((step) => (step.type === "turn" ? step.upload : []));
  assert.deepEqual(uploads.sort(), images.filter((image) => !("file" in image)).map((image) => image.key).sort());
  assert.equal(images.length, 51);
  assert.equal(steps.filter((step) => step.type === "turn").length, 16);
});

test("eval-long: images are PNGs, a resent image is the same bytes", () => {
  const { images } = scene();
  const of = (key: string) => images.find((image) => image.key === key)!;
  for (const key of ["s03_v2", "sheet_03", "clip1_06", "set_1105_4", "sketch2"]) assert.equal(draw(of(key), images).subarray(1, 4).toString("ascii"), "PNG");
  assert.deepEqual(draw(of("resend1"), images), draw(of("s05_v2"), images));
});

test("eval-long: scoring", () => {
  const { questions } = scene();
  const q = (key: string) => questions.find((question) => question.key === key)!;
  const file = q("Q2"), digit = q("Q7"), sit = q("Q11"), count = q("Q14");
  assert.equal(file.answer, "s03_v1.png");
  assert.deepEqual(score(file, "[//]: # (cam IMG-007 雨夜｜近景)\n是 s03_v1.png。"), { verdict: "right", said: "s03_v1.png" });
  assert.equal(score(file, "s03_v2.png").verdict, "wrong");
  assert.equal(score(file, "看不到这张图了").verdict, "none");
  assert.equal(digit.target, "s01_v1");
  assert.equal(score(digit, `第 1 镜 v1（s01_v1.png，IMG-001）角落里的数字是 ${digit.answer}。`).said, digit.answer);
  assert.equal(score(sit, "坐着，坐在椅子上").verdict, "right");
  assert.equal(score(sit, "站着").verdict, "wrong");
  assert.equal(score(count, "一共 3 版").said, "3");
});
