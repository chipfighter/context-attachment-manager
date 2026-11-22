// Purpose: one Claude Code process for the v0.12 probes (v12-claude-*.ts): messages in and events out as JSON lines,
// as Claude Desktop runs it (the same as eval-long.ts's, which runs on import and cannot be shared). Image data stays out
// of the log.
// Input: Claude Code's arguments, environment, folder and a log file. Output: each turn's events and its result.

import { spawn, type ChildProcess } from "node:child_process";
import { appendFileSync } from "node:fs";

type Json = Record<string, any>;

export class Session {
  readonly child: ChildProcess;
  private buffer = "";
  readonly events: Json[] = [];
  private waiting: ((event: Json) => void) | null = null;
  exited: number | null = null;
  private log: string;
  constructor(args: string[], env: NodeJS.ProcessEnv, cwd: string, log: string) {
    this.log = log;
    this.child = spawn(process.env.CAM_CLAUDE_BIN || "claude", args, { cwd, env, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    this.child.stdout!.setEncoding("utf8");
    this.child.stdout!.on("data", (chunk: string) => {
      this.buffer += chunk;
      for (let at = this.buffer.indexOf("\n"); at >= 0; at = this.buffer.indexOf("\n")) {
        const line = this.buffer.slice(0, at).trim();
        this.buffer = this.buffer.slice(at + 1);
        if (!line) continue;
        let event: Json;
        try { event = JSON.parse(line); } catch { appendFileSync(this.log, `?? ${line.slice(0, 500)}\n`); continue; }
        appendFileSync(this.log, `${JSON.stringify(event, (key, value) => (key === "data" && typeof value === "string" && value.length > 200 ? `<${value.length} chars>` : value))}\n`);
        this.events.push(event);
        if (event.type === "result" && this.waiting) { const done = this.waiting; this.waiting = null; done(event); }
      }
    });
    this.child.stderr!.setEncoding("utf8");
    this.child.stderr!.on("data", (chunk: string) => appendFileSync(this.log, `stderr ${chunk}`));
    this.child.on("exit", (code) => {
      this.exited = code ?? -1;
      if (this.waiting) { const done = this.waiting; this.waiting = null; done({ type: "exit", code }); }
    });
  }
  // One user message; resolves with the turn's events once Claude Code reports the turn's result (null: timed out).
  async send(content: Json[], timeoutMs: number): Promise<{ events: Json[]; result: Json | null }> {
    const from = this.events.length;
    if (this.exited !== null) return { events: [], result: null };
    const done = new Promise<Json>((resolve) => { this.waiting = resolve; });
    this.child.stdin!.write(`${JSON.stringify({ type: "user", message: { role: "user", content } })}\n`);
    let timer: NodeJS.Timeout | undefined;
    const result = await Promise.race([done, new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); })]);
    clearTimeout(timer);
    if (result === null) this.waiting = null;
    return { events: this.events.slice(from), result: result?.type === "result" ? result : null };
  }
  async close(): Promise<void> {
    if (this.exited !== null) return;
    this.child.stdin!.end();
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => { this.child.kill(); resolve(); }, 30_000);
      this.child.on("exit", () => { clearTimeout(timer); resolve(); });
    });
  }
}
