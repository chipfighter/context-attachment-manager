// A trusted controller approves only the existing CI run for the current PR revision.
// It never checks out PR code, changes a selection, reviews a PR, or merges one.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CI_PATH = ".github/workflows/ci.yml";
const pending = (run) => run.event === "pull_request" && run.status === "completed" && run.conclusion === "action_required";

export async function approveCiRun({ repository, runId, request }) {
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(repository) || [".", ".."].includes(repository.split("/")[1]) || !Number.isSafeInteger(runId) || runId <= 0) {
    throw new TypeError("Invalid repository or workflow run ID");
  }
  const root = `/repos/${repository}`;
  const skip = (reason) => ({ approved: false, reason });
  const workflow = await request("GET", `${root}/actions/workflows/ci.yml`);
  const run = await request("GET", `${root}/actions/runs/${runId}`);
  if (run.workflow_id !== workflow.id || run.path !== CI_PATH || !pending(run)) return skip("Not a pending pull-request CI run");
  if (!/^[0-9a-f]{40}$/.test(run.head_sha) || !run.head_branch || !run.head_repository?.id || !run.head_repository.owner?.login) return skip("Missing source identity");
  const matches = (pr) => Number.isSafeInteger(pr.number) && pr.number > 0 && pr.state === "open" && pr.base?.ref === "main" && pr.base.repo?.full_name === repository && pr.head?.sha === run.head_sha && pr.head.repo?.id === run.head_repository.id;
  // GitHub omits pull_requests on some fork runs. Resolve the branch, then verify repository ID and SHA.
  const query = new URLSearchParams({ state: "open", base: "main", head: `${run.head_repository.owner.login}:${run.head_branch}`, per_page: "100" });
  const candidates = (await request("GET", `${root}/pulls?${query}`)).filter(matches);
  if (candidates.length !== 1) return skip("No unique current PR for this source commit");
  // A contributor may push or close the PR while the controller reads metadata.
  const pr = await request("GET", `${root}/pulls/${candidates[0].number}`);
  if (!matches(pr)) return skip("PR changed before approval");
  await request("POST", `${root}/actions/runs/${runId}/approve`);
  return { approved: true, runId, pullRequest: pr.number, sha: run.head_sha };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if (process.env.GITHUB_EVENT_NAME !== "workflow_run" || !process.env.GH_TOKEN) throw new Error("Run only in the CI approval workflow");
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const request = async (method, path) => {
    const response = await fetch(`https://api.github.com${path}`, {
      method,
      headers: { accept: "application/vnd.github+json", authorization: `Bearer ${process.env.GH_TOKEN}`, "x-github-api-version": "2026-03-10" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`GitHub API ${method} ${path.split("?")[0]} returned ${response.status}`);
    const body = await response.text();
    return body ? JSON.parse(body) : {};
  };
  console.log(JSON.stringify(await approveCiRun({ repository: process.env.GITHUB_REPOSITORY, runId: event.workflow_run.id, request })));
}