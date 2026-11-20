import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import test from "node:test";
import { persistedEnv } from "../../plugin/src/adapters/codex/codexconfig.ts";
import { readSystemProxy } from "../../plugin/src/core/engine/transport.ts";

test("Windows registry lookups for proxy settings hide the subprocess window", { skip: process.platform !== "win32" }, (t) => {
  const proxy = "127.0.0.1:7890";
  const execute = t.mock.method(childProcess, "execFileSync", (_file: string, args: string[]) => {
    if (args[1] === "HKCU\\Environment") return `HTTPS_PROXY REG_SZ http://${proxy}\n`;
    return `ProxyEnable REG_DWORD 0x1\nProxyServer REG_SZ ${proxy}\n`;
  });
  syncBuiltinESMExports();
  try {
    assert.equal(readSystemProxy(), proxy);
    assert.equal(persistedEnv("HTTPS_PROXY"), `http://${proxy}`);
  } finally {
    execute.mock.restore();
    syncBuiltinESMExports();
  }
  assert.deepEqual(execute.mock.calls.map(({ arguments: [file, , options] }) => [file, options?.windowsHide]), [
    ["reg", true],
    ["reg", true],
  ]);
});
