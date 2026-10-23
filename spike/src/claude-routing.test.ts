// The real Claude mod handlers, with only the host's process environment and HTTP API replaced.
import assert from "node:assert/strict";
import test from "node:test";

let instance = 0;
const engine = "http://127.0.0.1:17891";
const routing = "http://127.0.0.1:17892";
const original = { ANTHROPIC_BASE_URL: "https://relay.example/anthropic", NO_PROXY: "example.test", no_proxy: "internal.test" };

async function mod(values: Record<string, string> = {}, options: { routeOk?: boolean; routingVersion?: number; routingPort?: number; responsePort?: number; routeBaseUrl?: string; failBaseSet?: boolean } = {}) {
  const { register } = await import(new URL(`../../hooks/register.js?test=${++instance}`, import.meta.url).href);
  const env = new Map(Object.entries(values));
  const states = new Map<string, any>();
  const requests: { url: string; options: any }[] = [];
  const writes: [string, string | undefined][] = [];
  const handlers = new Map<string, any>();
  const id = `synthetic-route-${instance}`;
  const baseUrl = `${routing}/__cam/routes/${id}`;
  let failedBase = false;
  register((name: string, ...args: any[]) => {
    handlers.set(name, args.at(-1));
    return { catch() {} };
  });
  const $ = {
    env: {
      get: async (name: string) => env.get(name),
      set: async (name: string, value: string | undefined) => {
        if (options.failBaseSet && name === "ANTHROPIC_BASE_URL" && value === baseUrl && !failedBase) { failedBase = true; throw new Error("synthetic env failure"); }
        writes.push([name, value]);
        if (value === undefined) env.delete(name); else env.set(name, value);
      },
    },
    state: {
      get: async (key: any) => ({ value: states.get(key.key) }),
      set: async (key: any, value: any) => { states.set(key.key, structuredClone(value)); },
    },
    http: {
      fetch: async (url: string, request: any) => {
        requests.push({ url, options: request });
        if (url === `${engine}/__cam/health`) return { ok: true, text: JSON.stringify({ service: "codex-attachment-manager", upstreams: ["api.anthropic.com"], routingVersion: options.routingVersion ?? 1, routingPort: options.routingPort ?? 17892 }) };
        if (url === `${engine}/__cam/routes`) return { ok: options.routeOk ?? true, text: JSON.stringify({ id, baseUrl: options.routeBaseUrl ?? `http://127.0.0.1:${options.responsePort ?? 17892}/__cam/routes/${id}` }) };
        throw new Error(`unexpected synthetic request ${url}`);
      },
    },
    command: { register: async () => {} },
    ui: { invalidate: async () => {} },
    clock: { after: () => ({ cancel() {} }), sleep: async () => {} },
  };
  const next = async (event: any) => event;
  return {
    env, states, requests, writes, baseUrl,
    start: () => handlers.get("session.start")($, {}, next),
    end: (reason = "exit") => handlers.get("session.end")($, { reason }, next),
  };
}

test("Claude registers its official upstream before switching this process to its own route", async () => {
  const m = await mod();
  await m.start();
  assert.equal(m.env.get("ANTHROPIC_BASE_URL"), m.baseUrl);
  const registration = m.requests.find((entry) => entry.url === `${engine}/__cam/routes`)!;
  assert.ok(registration, "an explicit route must be registered");
  assert.equal(registration.options.method, "POST");
  assert.equal(registration.options.headers["x-cam-panel"], "1");
  assert.deepEqual(JSON.parse(registration.options.body), { platform: "claude", baseUrl: "https://api.anthropic.com" });
  assert.equal(m.states.get("routing").active, true);
  await m.end();
  assert.equal(m.env.has("ANTHROPIC_BASE_URL"), false);
  assert.equal(m.env.has("NO_PROXY"), false);
  assert.equal(m.env.has("no_proxy"), false);
});

test("two Claude processes register separate relay and official routes without sharing their targets", async () => {
  const relay = await mod(original);
  const official = await mod({ ANTHROPIC_BASE_URL: "https://api.anthropic.com/" });
  await Promise.all([relay.start(), official.start()]);
  const requestOf = (m: typeof relay) => {
    const registration = m.requests.find((entry) => entry.url.endsWith("/__cam/routes"));
    assert.ok(registration, "the upstream must be registered before takeover");
    return JSON.parse(registration.options.body);
  };
  assert.deepEqual(requestOf(relay), { platform: "claude", baseUrl: original.ANTHROPIC_BASE_URL });
  assert.deepEqual(requestOf(official), { platform: "claude", baseUrl: "https://api.anthropic.com/" });
  assert.equal(relay.env.get("ANTHROPIC_BASE_URL"), relay.baseUrl);
  assert.equal(official.env.get("ANTHROPIC_BASE_URL"), official.baseUrl);
  assert.notEqual(relay.baseUrl, official.baseUrl);
  await relay.end();
  assert.deepEqual(Object.fromEntries(relay.env), original);
  assert.equal(official.env.get("ANTHROPIC_BASE_URL"), official.baseUrl);
});

test("failed route registration preserves the original endpoint and proxy variables", async () => {
  const m = await mod(original, { routeOk: false });
  await m.start();
  assert.deepEqual(Object.fromEntries(m.env), original);
  assert.equal(m.states.get("routing").active, false);
  assert.equal(m.states.get("routing").reason, "failed");
  assert.equal(m.writes.length, 0);
});

test("an engine without explicit routing support cannot take over a Claude process", async () => {
  const m = await mod(original, { routingVersion: 0 });
  await m.start();
  assert.deepEqual(Object.fromEntries(m.env), original);
  assert.equal(m.states.get("routing").reason, "engine-old");
  assert.equal(m.requests.some((entry) => entry.url.endsWith("/__cam/routes")), false);
});

test("health must advertise the isolated routing port before Claude can be taken over", async () => {
  const m = await mod(original, { routingPort: 17891 });
  await m.start();
  assert.deepEqual(Object.fromEntries(m.env), original);
  assert.equal(m.states.get("routing").reason, "engine-old");
  assert.equal(m.requests.some((entry) => entry.url.endsWith("/__cam/routes")), false);
});

test("a route returned on the legacy engine port is rejected to prevent downgrade misrouting", async () => {
  const m = await mod(original, { responsePort: 17891 });
  await m.start();
  assert.deepEqual(Object.fromEntries(m.env), original);
  assert.equal(m.states.get("routing").reason, "failed");
  assert.equal(m.writes.length, 0);
});

test("restoring routing does not overwrite endpoint or proxy settings changed after takeover", async () => {
  const m = await mod(original);
  await m.start();
  assert.equal(m.env.get("ANTHROPIC_BASE_URL"), m.baseUrl, "first take over this relay process");
  m.env.set("ANTHROPIC_BASE_URL", "https://replacement.example/api");
  m.env.set("NO_PROXY", "replacement.test");
  m.env.set("no_proxy", "changed.test");
  await m.end();
  assert.deepEqual(Object.fromEntries(m.env), { ANTHROPIC_BASE_URL: "https://replacement.example/api", NO_PROXY: "replacement.test", no_proxy: "changed.test" });
  assert.equal(m.states.get("routing").active, false);
});

test("an environment-write failure rolls back the variables already changed", async () => {
  const m = await mod(original, { failBaseSet: true });
  await m.start();
  assert.deepEqual(Object.fromEntries(m.env), original);
  assert.equal(m.states.get("routing").active, false);
  assert.equal(m.states.get("routing").reason, "failed");
});

test("a malformed route response cannot redirect Claude to a different endpoint", async () => {
  const m = await mod(original, { routeBaseUrl: "https://unexpected.example" });
  await m.start();
  assert.deepEqual(Object.fromEntries(m.env), original);
  assert.equal(m.states.get("routing").reason, "failed");
});

test("Bedrock, Vertex and Foundry keep their original native transport", async () => {
  for (const name of ["CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX", "CLAUDE_CODE_USE_FOUNDRY"]) {
    const values = { ...original, [name]: "1" };
    const m = await mod(values);
    await m.start();
    assert.deepEqual(Object.fromEntries(m.env), values);
    assert.equal(m.states.get("routing").reason, "provider");
    assert.equal(m.requests.length, 0);
  }
});

test("a reloaded mod upgrades an earlier unscoped engine URL using its saved original upstream", async () => {
  const m = await mod({ ANTHROPIC_BASE_URL: engine, NO_PROXY: "example.test,127.0.0.1,localhost,::1", no_proxy: "internal.test,127.0.0.1,localhost,::1" });
  m.states.set("routing", { active: true, port: 17891, originalBaseUrl: original.ANTHROPIC_BASE_URL, originalNoProxy: original.NO_PROXY, originalNoProxyLower: original.no_proxy });
  await m.start();
  assert.equal(m.env.get("ANTHROPIC_BASE_URL"), m.baseUrl);
  const registration = m.requests.find((entry) => entry.url.endsWith("/__cam/routes"));
  assert.ok(registration);
  assert.equal(JSON.parse(registration.options.body).baseUrl, original.ANTHROPIC_BASE_URL);
  await m.end();
  assert.deepEqual(Object.fromEntries(m.env), original);
});
