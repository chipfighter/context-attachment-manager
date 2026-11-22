// Purpose: v0.12 gate 2 (docs/v0.12/plan.md §5): a stand-in for computer use, as an MCP server over stdio. Its one tool,
// next_page, shows the next page of a 25-page setup wizard and returns only a screenshot of it, as a screenshot tool
// does. Each page shows its number large in the top-left corner and a progress bar; page 9 also shows a red warning box.
// Input: MCP JSON-RPC lines on stdin. Output: answers on stdout. Synthetic images only.

import { createInterface } from "node:readline";
import { png } from "./testkit.ts";

type Json = Record<string, any>;
const PAGES = 25;
const WARNING_PAGE = 9;
const FONT: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};
const inText = (text: string, left: number, top: number, scale: number) => (x: number, y: number) => {
  const at = Math.floor((x - left) / (6 * scale));
  const col = Math.floor((x - left) / scale) - at * 6;
  const row = Math.floor((y - top) / scale);
  return x >= left && y >= top && at < text.length && col < 5 && row < 7 && FONT[text[at]]?.[row]?.[col] === "1";
};
function page(n: number): Buffer {
  const number = inText(String(n).padStart(2, "0"), 40, 70, 10);
  const done = Math.round((560 * n) / PAGES);
  return png(640, 400, (x, y) => {
    if (y < 40) return [45, 48, 56];
    if (number(x, y)) return [30, 30, 36];
    if (y >= 330 && y < 350 && x >= 40 && x < 600) return x - 40 < done ? [60, 120, 230] : [220, 224, 232];
    if (n === WARNING_PAGE && x >= 300 && x < 600 && y >= 90 && y < 260) return x < 306 || x >= 594 || y < 96 || y >= 254 ? [200, 30, 30] : [255, 228, 228];
    if (y >= 180 && y < 300 && (y - 180) % 40 < 18 && x >= 40 && x < 260) return [236, 238, 242];
    return [252, 252, 253];
  });
}

let shown = 0;
const send = (message: Json) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
createInterface({ input: process.stdin }).on("line", (line) => {
  let message: Json;
  try { message = JSON.parse(line); } catch { return; }
  const { id, method, params } = message;
  if (id === undefined) return;
  if (method === "initialize") return send({ id, result: { protocolVersion: params?.protocolVersion ?? "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "screens", version: "1.0.0" } } });
  if (method === "ping") return send({ id, result: {} });
  if (method === "tools/list") return send({ id, result: { tools: [{ name: "next_page", description: "Shows the next page of the setup wizard and returns a screenshot of the screen.", inputSchema: { type: "object", properties: {} } }] } });
  if (method === "tools/call" && params?.name === "next_page") {
    if (shown >= PAGES) return send({ id, result: { content: [{ type: "text", text: "There is no next page." }], isError: true } });
    shown++;
    return send({ id, result: { content: [{ type: "image", data: page(shown).toString("base64"), mimeType: "image/png" }] } });
  }
  send({ id, error: { code: -32601, message: `unknown method ${method}` } });
});
