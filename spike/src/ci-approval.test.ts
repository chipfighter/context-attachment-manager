// The privileged CI controller must approve only the current PR's existing CI run.
import assert from "node:assert/strict";
import test from "node:test";
import { approveCiRun } from "../../.github/scripts/approve-ci.mjs";

const repository = "owner/project";
const sha = "a".repeat(40);
function fixture(change: Record<string, unknown> = {}) {
  const calls: Array<{ method: string; path: string }> = [];
  const workflow = { id: 10, path: ".github/workflows/ci.yml" };
  const run = { id: 42, workflow_id: 10, path: workflow.path, event: "pull_request", status: "completed", conclusion: "action_required", head_sha: sha, head_branch: "fix/example", head_repository: { id: 22, owner: { login: "contributor" } }, ...change };
  const pr = { number: 7, state: "open", head: { sha, repo: { id: 22 } }, base: { ref: "main", repo: { full_name: repository } } };
  const request = async (method: string, path: string) => {
    calls.push({ method, path });
    if (method === "POST") return {};
    if (path.endsWith("/actions/workflows/ci.yml")) return workflow;
    if (path.endsWith("/actions/runs/42")) return run;
    if (path.includes("/pulls?")) return [pr];
    if (path.endsWith("/pulls/7")) return pr;
    throw new Error(`unexpected request: ${method} ${path}`);
  };
  return { calls, run, pr, request };
}
const writes = (calls: Array<{ method: string; path: string }>) => calls.filter((call) => call.method !== "GET");

test("CI approval accepts the exact pending CI run even when the fork run has no pull_requests list", async () => {
  const f = fixture();
  const result = await approveCiRun({ repository, runId: 42, request: f.request });
  assert.equal(result.approved, true);
  assert.deepEqual(writes(f.calls), [{ method: "POST", path: `/repos/${repository}/actions/runs/42/approve` }]);
});

test("CI approval refuses a spoofed workflow ID, path, event, or already running job", async (t) => {
  for (const change of [{ workflow_id: 11 }, { path: ".github/workflows/release.yml" }, { event: "push" }, { status: "in_progress", conclusion: null }]) {
    await t.test(JSON.stringify(change), async () => {
      const f = fixture(change);
      assert.equal((await approveCiRun({ repository, runId: 42, request: f.request })).approved, false);
      assert.deepEqual(writes(f.calls), []);
    });
  }
});

test("CI approval refuses stale commits, different repositories, closed PRs, and a different base", async (t) => {
  for (const change of ["sha", "fork", "closed", "base", "repository"]) {
    await t.test(change, async () => {
      const f = fixture();
      if (change === "sha") f.pr.head.sha = "b".repeat(40);
      if (change === "fork") f.pr.head.repo.id = 99;
      if (change === "closed") f.pr.state = "closed";
      if (change === "base") f.pr.base.ref = "another-branch";
      if (change === "repository") f.pr.base.repo.full_name = "another/project";
      assert.equal((await approveCiRun({ repository, runId: 42, request: f.request })).approved, false);
      assert.deepEqual(writes(f.calls), []);
    });
  }
});

test("CI approval validates its repository and run ID before making any API request", async () => {
  for (const change of [{ repository: "../outside", runId: 42 }, { repository, runId: -1 }]) {
    const f = fixture();
    await assert.rejects(() => approveCiRun({ ...change, request: f.request }), TypeError);
    assert.deepEqual(f.calls, []);
  }
});