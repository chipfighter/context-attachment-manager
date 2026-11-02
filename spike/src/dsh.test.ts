// Purpose: v0.11 — the DeepSeek Harness plugin's decisions (plugin/src/adapters/dsh/offload.js), on a fake dsh session:
// at a new turn every retained input image is marked, in request order, with dsh's own image indexes; a budget refusal
// marks only as many as it names; a step of the same turn marks nothing.
// Input: a fake session. Output: test results.
import assert from "node:assert/strict";
import test from "node:test";
import { offloadImages, startsTurn } from "../../plugin/src/adapters/dsh/offload.js";

type Block = { type: string; offloaded?: true };
const fakeSession = (events: Record<number, { type: string; content: Block[] }>) => {
  const appended: unknown[] = [];
  return {
    appended,
    session: {
      eventAt: (seq: number) => events[seq],
      deriveEventMessage: (event: { content: Block[] }) => ({ content: event.content }),
      append: (_type: string, payload: unknown) => appended.push(payload),
    },
  };
};
const image = (offloaded = false): Block => (offloaded ? { type: "image", offloaded: true } : { type: "image" });
const events = () => ({
  1: { type: "user/message", content: [{ type: "text" }, image(true), image()] },
  2: { type: "assistant/message", content: [image()] },
  3: { type: "tool/result", content: [image(), { type: "text" }, image()] },
});

test("a new turn marks every retained input image, with indexes counting the ones already marked", () => {
  const { session, appended } = fakeSession(events());
  assert.equal(offloadImages(session, [1, 2, 3], Number.POSITIVE_INFINITY), true);
  assert.deepEqual(appended, [{ targets: [{ seq: 1, imageIndexes: [1] }, { seq: 3, imageIndexes: [0, 1] }] }]);
});

test("a budget refusal marks only as many as it names, oldest first; none left means no event", () => {
  const some = fakeSession(events());
  offloadImages(some.session, [1, 2, 3], 2);
  assert.deepEqual(some.appended, [{ targets: [{ seq: 1, imageIndexes: [1] }, { seq: 3, imageIndexes: [0] }] }]);
  const none = fakeSession({ 1: { type: "user/message", content: [image(true)] } });
  assert.equal(offloadImages(none.session, [1], Number.POSITIVE_INFINITY), false);
  assert.deepEqual(none.appended, []);
});

test("only the first step of a turn starts it", () => {
  const turns = new WeakMap<object, number>();
  const agent = {};
  assert.equal(startsTurn(turns, agent, 4), true, "the first step seen (a resumed session too)");
  assert.equal(startsTurn(turns, agent, 4), false, "a later step of the same turn");
  assert.equal(startsTurn(turns, agent, 5), true);
  assert.equal(startsTurn(turns, {}, 5), true, "each agent its own");
});
