// Purpose: eval — v0.12's stand-in generation tool (eval-v12.ts), an MCP server over stdio. generate_shot returns a shot's
// versions as images with their names (s02_v1.png …), drawn beforehand into a folder, the first time that shot is asked
// for; again, it only names them, as a real generator does not repeat itself. With a reference it makes one more version
// of the shot and records which reference it got (the action question). No file is shown to the model: these images
// are only in the conversation.
// Input: MCP lines on stdin; CAM_GEN_DIR (the drawn images), CAM_GEN_LOG (where each call is recorded), CAM_GEN_DONE=1 (a
// fork: every shot was made already). Output: answers on stdout.

import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

type Json = Record<string, any>;
const dir = process.env.CAM_GEN_DIR ?? "";
const log = process.env.CAM_GEN_LOG ?? "";
const made = new Set<number>();
const send = (message: Json) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
const two = (n: number) => String(n).padStart(2, "0");
const versionsOf = (shot: number) => (existsSync(dir) ? readdirSync(dir).filter((name) => new RegExp(`^s${two(shot)}_v\\d\\.png$`).test(name)).sort() : []);

function generate(args: Json): Json {
  const shot = Number(args.shot);
  const reference = typeof args.reference === "string" ? args.reference.trim() : "";
  if (log) appendFileSync(log, `${JSON.stringify({ at: new Date().toISOString(), shot, reference: reference || null, prompt: args.prompt ?? null })}\n`);
  const names = versionsOf(shot);
  if (!names.length) return { content: [{ type: "text", text: `There is no shot ${args.shot}.` }], isError: true };
  if (reference) {
    // One new version from the reference: drawn as the next version's file if there is one (s03_v4.png), else the reference's
    // shot's first version again under a new name.
    const name = `s${two(shot)}_v${names.length + 1}.png`;
    const file = existsSync(join(dir, `extra_${name}`)) ? join(dir, `extra_${name}`) : join(dir, names[0]);
    return { content: [{ type: "text", text: `${name} (from reference ${reference})` }, { type: "image", data: readFileSync(file).toString("base64"), mimeType: "image/png" }] };
  }
  if (made.has(shot) || process.env.CAM_GEN_DONE === "1") return { content: [{ type: "text", text: `Shot ${shot} was generated already: ${names.join(", ")}. The tool does not show them again.` }] };
  made.add(shot);
  return { content: names.flatMap((name) => [{ type: "text", text: name }, { type: "image", data: readFileSync(join(dir, name)).toString("base64"), mimeType: "image/png" }]) };
}

createInterface({ input: process.stdin }).on("line", (line) => {
  let message: Json;
  try { message = JSON.parse(line); } catch { return; }
  const { id, method, params } = message;
  if (id === undefined) return;
  if (method === "initialize") return send({ id, result: { protocolVersion: params?.protocolVersion ?? "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "gen", version: "1.0.0" } } });
  if (method === "ping") return send({ id, result: {} });
  if (method === "tools/list") return send({ id, result: { tools: [{
    name: "generate_shot",
    description: "Generates the versions of one shot of the film from its setup and returns them as images with their names (s01_v1.png …). A shot is generated once; asking again only names its versions. With `reference` (the name of an earlier version), generates one more version based on it.",
    inputSchema: { type: "object", properties: { shot: { type: "number", description: "The shot number." }, reference: { type: "string", description: "Optional: the name of an earlier version to base a new one on, e.g. s03_v2.png." }, prompt: { type: "string", description: "Optional: what to change." } }, required: ["shot"] },
  }] } });
  if (method === "tools/call" && params?.name === "generate_shot") return send({ id, result: generate(params.arguments ?? {}) });
  send({ id, error: { code: -32601, message: `unknown method ${method}` } });
});
