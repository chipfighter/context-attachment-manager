// Purpose: eval — what the long-task eval (eval-long.ts) runs Claude Code with, kept apart from the user's own setup:
// a Claude Code configuration folder of its own (signed in once for the eval; no skills, settings, memory or history of
// the user's), and for each arm a copy of the Claude plugin whose engine port and data folder are the eval's, so the
// plugin the user has installed and its engine (port 17891) are never touched.
// Arms: "v0.10" — this checkout. "v0.9.1" — the v0.9.1 release (`git archive v0.9.1`) with this checkout's hooks/register.js:
// Claude Code 2.1.309 refuses 0.9.1's mod for `$.env.get(name)` with a non-literal name, and the two mods differ only in
// that (CHANGELOG 0.10.0), so the arm measures the compaction fixes and nothing else.
// Input: the arm, a port, folders. Output: plugin copies under local/eval-long/plugins/, an engine process.

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { engineHealth } from "../../plugin/src/engine.ts";

export type Arm = "off" | "v0.9.1" | "v0.10";
const here = dirname(fileURLToPath(import.meta.url));
export const repo = resolve(here, "../..");
export const evalRoot = join(repo, "local", "eval-long");
// The eval's own Claude Code configuration folder: sign in once with
//   CLAUDE_CONFIG_DIR=<repo>/local/eval-long/claude claude auth login
export const claudeConfigDir = join(evalRoot, "claude");

// The plugin files an arm runs: this checkout, or the v0.9.1 release extracted once.
function sourceOf(arm: Exclude<Arm, "off">): string {
  if (arm === "v0.10") return repo;
  const dir = join(evalRoot, "v0.9.1");
  if (!existsSync(join(dir, ".claude-plugin", "plugin.json"))) {
    mkdirSync(dir, { recursive: true });
    const archive = spawnSync("git", ["-C", repo, "archive", "--format=tar", "v0.9.1", "plugin", "hooks", ".claude-plugin"], { maxBuffer: 1 << 28 });
    if (archive.status !== 0) throw new Error(`git archive v0.9.1 failed: ${archive.stderr}`);
    // Unpacked in its own folder: a tar from Git for Windows takes "D:\…" after -C for a remote host.
    const untar = spawnSync("tar", ["-x"], { cwd: dir, input: archive.stdout });
    if (untar.status !== 0) throw new Error(`tar failed: ${untar.stderr}`);
  }
  return dir;
}

// A copy of an arm's plugin pointed at its own engine port and data folder; the model's text in Chinese, as the
// conversation is.
export function preparePlugin(arm: Exclude<Arm, "off">, port: number, data: string): string {
  const source = sourceOf(arm);
  const root = join(evalRoot, "plugins", `${arm}-${port}`);
  rmSync(root, { recursive: true, force: true });
  for (const part of ["hooks", "plugin/src", "plugin/scripts"]) cpSync(join(source, part), join(root, part), { recursive: true });
  // v0.9.1 runs with the mod that loads in current Claude Code (see above).
  if (arm === "v0.9.1") cpSync(join(repo, "hooks", "register.js"), join(root, "hooks", "register.js"));
  const manifest = JSON.parse(readFileSync(join(source, ".claude-plugin", "plugin.json"), "utf8"));
  const server = manifest.mcpServers.codex_attachment_manager;
  server.env = { ...server.env, CAM_ENGINE_PORT: String(port), CAM_DATA_DIR: data, CAM_LANG: "zh" };
  mkdirSync(join(root, ".claude-plugin"), { recursive: true });
  writeFileSync(join(root, ".claude-plugin", "plugin.json"), JSON.stringify(manifest, null, 2));
  const register = join(root, "hooks", "register.js");
  const mod = readFileSync(register, "utf8").replace(/\r\n/g, "\n");
  if (!mod.includes("const ENGINE_PORT = 17891")) throw new Error("the mod's engine port was not found");
  writeFileSync(register, mod.replace("const ENGINE_PORT = 17891", `const ENGINE_PORT = ${port}`));
  return root;
}

// The arm's engine, started from its plugin copy (the plugin's own service then finds it running and keeps it), with
// every request written to <data>/p2/requests for the counts in the report.
export async function startEngine(root: string, port: number, data: string): Promise<ChildProcess> {
  if (await engineHealth(port)) throw new Error(`port ${port} is in use`);
  const env = { ...process.env, CAM_DATA_DIR: data, CAM_LANG: "zh", CLAUDE_CONFIG_DIR: claudeConfigDir };
  const engine = spawn(process.execPath, [join(root, "plugin", "src", "proxy.ts"), "--port", String(port), "--stay", "--dump-requests"], { env, stdio: "ignore", windowsHide: true });
  for (let i = 0; i < 50 && !(await engineHealth(port)); i++) await sleep(200);
  if (!(await engineHealth(port))) throw new Error(`the engine on ${port} did not start`);
  return engine;
}
