// Purpose: v0.11 — DeepSeek Harness (dsh): automatic selection as a dsh plugin, mounted in place of dsh's own
// `@deepseek-ai/dsh-compaction-image-offload` (docs/v0.11/plan.md 3.9). dsh keeps an image's offload as a durable mark
// in the session log (an `image/offload` event); every later request shows that image to the model as text naming the
// attachment and a read-only path it can read the image back from. dsh's plugin marks the oldest images only when a
// route refuses a request as over its image budget. This one does the same, and also, as a new turn starts, marks every
// image of the turns before it — what automatic selection does on the other platforms. The model reads an image back
// through its path when it needs it; what it reads is a new occurrence, kept for that turn and marked when the next one
// starts. Marks never revert, so the provider's cached prefix only moves forward. No request goes through the engine.
// Written against dsh's docs and the source of its image-offload plugin (agent/pre-step, agent/request-error,
// compaction/summary-error, image/offload); not tested live.
// Use (dsh composition config): replace `- name: '@deepseek-ai/dsh-compaction-image-offload'` with
// `- name: '<path to this file>'`.
// Input: dsh's events. Output: image/offload events in the session log.

import { IMAGE_OFFLOAD_REQUIRED_CODE, LlmError } from "@deepseek-ai/dsh-llm";
import { imageOffloadProjection } from "@deepseek-ai/dsh-compaction-image-offload/projection";

type Seq = number;
type Block = { type: string; offloaded?: true };
type Session = {
  eventAt(seq: Seq): { type: string } | undefined;
  deriveEventMessage(event: { type: string }): { content: Block[] } | undefined;
  append(type: "image/offload", payload: { targets: Array<{ seq: Seq; imageIndexes: number[] }> }): void;
  surface: { nodes: readonly Seq[] };
};
type Agent = { session: Session };
type Context = {
  sessions: { registerMessageProjection(projection: unknown): void };
  on(event: string, listener: (payload: any, next: () => any) => any): void;
};

export const name = "context-attachment-manager";
export const inject = ["agents", "sessions"];

// Marks up to `count` retained input images, in request order (assistant messages hold no input images). Image indexes
// count every image of a message, marked ones included, as dsh's own plugin does. False when none was left.
export function offloadImages(session: Session, seqs: readonly Seq[], count: number): boolean {
  const targets: Array<{ seq: Seq; imageIndexes: number[] }> = [];
  for (const seq of seqs) {
    if (count <= 0) break;
    const event = session.eventAt(seq);
    if (!event || (event.type !== "user/message" && event.type !== "tool/result")) continue;
    const message = session.deriveEventMessage(event);
    if (!message) continue;
    const imageIndexes: number[] = [];
    let index = 0;
    for (const block of message.content) {
      if (count <= 0) break;
      if (block.type !== "image") continue;
      if (block.offloaded !== true) { imageIndexes.push(index); count--; }
      index++;
    }
    if (imageIndexes.length) targets.push({ seq, imageIndexes });
  }
  if (!targets.length) return false;
  session.append("image/offload", { targets });
  return true;
}

export function apply(ctx: Context): void {
  ctx.sessions.registerMessageProjection(imageOffloadProjection);
  // The turn each agent was last in: a different one means a new turn starts, and its user messages are not on the
  // surface yet, so every image there belongs to an earlier turn (on a resumed session too).
  const turnOf = new WeakMap<object, number>();
  ctx.on("agent/pre-step", ({ agent, turn, signal }: { agent: Agent; turn: number; signal: AbortSignal }, next) => {
    if (!signal.aborted && turnOf.get(agent) !== turn) {
      turnOf.set(agent, turn);
      offloadImages(agent.session, agent.session.surface.nodes, Number.POSITIVE_INFINITY);
    }
    return next();
  });
  // As dsh's own plugin: a route that refuses the request as over its image budget names how many more to mark.
  ctx.on("agent/request-error", ({ agent, failure, signal }: { agent: Agent; failure: { code: string; offloadImages?: number }; signal: AbortSignal }, next) => {
    if (failure.code !== IMAGE_OFFLOAD_REQUIRED_CODE || failure.offloadImages === undefined || signal.aborted) return next();
    if (!offloadImages(agent.session, agent.session.surface.nodes, failure.offloadImages)) return next();
    return Promise.resolve({ kind: "retry" });
  });
  ctx.on("compaction/summary-error", ({ session, sourceEventSeqs, error, signal }: { session: Session; sourceEventSeqs: readonly Seq[]; error: unknown; signal?: AbortSignal }, next) => {
    if (!(error instanceof LlmError) || (error as any).code !== IMAGE_OFFLOAD_REQUIRED_CODE || (error as any).failure?.offloadImages === undefined) return next();
    signal?.throwIfAborted();
    if (!offloadImages(session, sourceEventSeqs, (error as any).failure.offloadImages)) return next();
    return true;
  });
}
