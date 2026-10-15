// Initial behavior for the security regression's red phase; not installed in a workflow.
export async function approveCiRun({ repository, runId, request }) {
  await request("POST", `/repos/${repository}/actions/runs/${runId}/approve`);
  return { approved: true };
}