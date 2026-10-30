// Purpose: v0.4 — synthetic Claude Code transcripts and the requests Claude Code would build from them, for the tests
// of claude-index.ts and claude-rewrite.ts. Shapes follow Claude Code 2.1.293's transcript (records linked by
// parentUuid, one assistant content block per record) and its Messages requests; no real session data.
// Output: record lists, request message lists and small synthetic PNGs.

import { png } from "./testkit.ts";

type Json = Record<string, any>;

export const pngA = png(8, 8, () => [220, 30, 30]).toString("base64");
export const pngB = png(8, 8, () => [40, 70, 210]).toString("base64");
export const pngC = png(16, 8, () => [255, 255, 255]).toString("base64");
export const image = (data: string, extra: Json = {}) => ({ type: "image", source: { type: "base64", media_type: "image/png", data }, ...extra });
export const text = (value: string, extra: Json = {}) => ({ type: "text", text: value, ...extra });

// A transcript builder: each record links to the one before unless told otherwise. v0.10: `base` offsets its uuids,
// for a second builder whose records join the first one (a resumed session).
export function transcript(base = 0) {
  const records: Json[] = [];
  let last: string | null = null;
  let n = 0;
  const add = (record: Json, parent: string | null | undefined = last) => {
    const uuid = record.uuid ?? `00000000-0000-4000-8000-${String(++n + base).padStart(12, "0")}`;
    const full = { parentUuid: parent ?? null, isSidechain: false, sessionId: "s", ...record, uuid };
    records.push(full);
    if (!full.isSidechain) last = uuid;
    return uuid;
  };
  return {
    records,
    prompt: (content: Json[] | string, extra: Json = {}, parent?: string | null) => add({ type: "user", message: { role: "user", content }, ...extra }, parent),
    assistant: (block: Json, extra: Json = {}, parent?: string | null) => add({ type: "assistant", message: { role: "assistant", content: [block] }, ...extra }, parent),
    toolResult: (toolUseId: string, content: Json[], extra: Json = {}, parent?: string | null) => add({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: toolUseId, content }] }, toolUseResult: {}, ...extra }, parent),
    attachment: () => add({ type: "attachment", attachment: { type: "x" } }),
    boundary: () => add({ type: "system", subtype: "compact_boundary", compactMetadata: {}, logicalParentUuid: last }, null),
    summary: (content = "summary") => add({ type: "user", isCompactSummary: true, message: { role: "user", content } }),
    // v0.10: a compaction that keeps the last messages (Claude Code 2.1.304+), as written where it happened: the
    // boundary (no parent; its logical parent is the last message), the summary after it, the kept messages left
    // where they were. The next records hang off the last kept one ("tail", as when the records of the /compact
    // command were written first) or off the summary. `list`: preservedMessages instead of preservedSegment.
    compact: (kept: string[], after: "tail" | "summary" = "summary", content = "summary", extra: Json = {}, list = false) => {
      const tail = kept[kept.length - 1];
      const anchor = `00000000-0000-4000-8000-${String(++n + base + 500).padStart(12, "0")}`;
      const metadata = list ? { preservedMessages: { anchorUuid: anchor, uuids: kept, allUuids: kept } } : { preservedSegment: { headUuid: kept[0], anchorUuid: anchor, tailUuid: tail } };
      const boundary = add({ type: "system", subtype: "compact_boundary", compactMetadata: { trigger: "manual", ...metadata }, logicalParentUuid: tail, ...extra }, null);
      add({ type: "user", isCompactSummary: true, message: { role: "user", content }, uuid: anchor, ...extra }, boundary);
      if (after === "tail") last = tail;
      return { boundary, anchor };
    },
    from: (uuid: string) => { last = uuid; },
    get last() { return last; },
  };
}

// The usual session: turn 1 pastes A and B; turn 2 reads c.png; turn 3 pastes A again.
export function usualSession() {
  const t = transcript();
  const p1 = t.prompt([image(pngA), image(pngB), text("What are these?")]);
  t.assistant({ type: "thinking", thinking: "", signature: "sig-1" });
  t.assistant(text("A red square and a blue square."));
  const p2 = t.prompt("Read c.png");
  t.assistant({ type: "tool_use", id: "toolu_1", name: "Read", input: { file_path: "C:\\work\\c.png" } });
  t.toolResult("toolu_1", [image(pngC)]);
  t.assistant(text("A white rectangle. need IMG-001"));
  const p3 = t.prompt([image(pngA), text("Again?")]);
  t.assistant(text("Same red square."));
  return { t, p1, p2, p3 };
}

// The request Claude Code would send after the usual session, with a fourth prompt.
export function usualRequest(): Json[] {
  return [
    { role: "user", content: [image(pngA), image(pngB), text("What are these?"), text("<system-reminder>x</system-reminder>")] },
    { role: "assistant", content: [{ type: "thinking", thinking: "", signature: "sig-1" }, text("A red square and a blue square.")] },
    { role: "user", content: [text("Read c.png")] },
    { role: "assistant", content: [{ type: "tool_use", id: "toolu_1", name: "Read", input: { file_path: "C:\\work\\c.png" } }] },
    { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_1", content: [image(pngC)] }] },
    { role: "assistant", content: [text("A white rectangle. need IMG-001")] },
    { role: "user", content: [image(pngA), text("Again?")] },
    { role: "assistant", content: [text("Same red square.")] },
    { role: "user", content: [text("And now?", { cache_control: { type: "ephemeral" } })] },
  ];
}
