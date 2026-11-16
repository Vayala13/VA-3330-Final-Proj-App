const OWNER_PATTERN = /^(mine|\d+)$/;

// Where a "Mark done" button sends the user back to. Only these fixed pages are allowed.
export function returnPath({ from, owner } = {}, caseId) {
  const ownerQuery = typeof owner === "string" && OWNER_PATTERN.test(owner) ? `?owner=${owner}` : "";
  if (from === "tasks") {
    return `/tasks${ownerQuery}`;
  }
  if (from === "deadlines") {
    return `/deadlines${ownerQuery}`;
  }
  return `/cases/${caseId}`;
}
