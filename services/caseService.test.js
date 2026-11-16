import { test, before } from "node:test";
import assert from "node:assert/strict";
import { seedUsers, findUserByEmail } from "./userService.js";
import { seedSampleData } from "./seedData.js";
import { listCasesByStatus, parseCaseFilters, getAttorneys } from "./caseService.js";
import { CASE_STATUSES, CASE_TYPES } from "./constants.js";

const TODAY = "2026-11-15";

before(async () => {
  await seedUsers();
  seedSampleData(TODAY);
});

const countCases = (groups) => groups.reduce((total, group) => total + group.cases.length, 0);

test("groups come back in status order: Active, Intake, Referred out, Closed", () => {
  const groups = listCasesByStatus();
  assert.deepEqual(
    groups.map((g) => g.status),
    Object.values(CASE_STATUSES)
  );
  assert.equal(countCases(groups), 10);
});

test("each case sits in the group matching its status, sorted by caption", () => {
  const active = listCasesByStatus().find((g) => g.status === CASE_STATUSES.ACTIVE);
  const captions = active.cases.map((c) => c.caption);
  assert.equal(active.cases.length, 6);
  assert.deepEqual(captions, [...captions].sort((a, b) => a.localeCompare(b)));
});

test("rows show people's names, not ids", () => {
  const [first] = listCasesByStatus()[0].cases;
  assert.equal(typeof first.leadAttorneyName, "string");
  assert.notEqual(first.leadAttorneyName, "Unknown");
  assert.notEqual(first.lastTouchedByName, "Unknown");
});

test("filtering by attorney keeps only that attorney's cases", () => {
  const michael = findUserByEmail("mbenson@mbmt.test");
  const groups = listCasesByStatus({ attorneyId: michael.userId, type: null });
  const rows = groups.flatMap((g) => g.cases);
  assert.ok(rows.length > 0);
  assert.ok(rows.every((row) => row.leadAttorneyName === "Michael Benson"));
});

test("filtering by type and attorney together narrows the list", () => {
  const teresa = findUserByEmail("tmontoya@mbmt.test");
  const rows = listCasesByStatus({ attorneyId: teresa.userId, type: CASE_TYPES.PROPERTY }).flatMap((g) => g.cases);
  assert.deepEqual(
    rows.map((r) => r.caption).sort(),
    ["Alvarez v. Hidalgo Properties", "Trevino v. South Texas Roofing"]
  );
});

test("a filter with no matches still returns every group, just empty", () => {
  const michael = findUserByEmail("mbenson@mbmt.test");
  const groups = listCasesByStatus({ attorneyId: michael.userId, type: CASE_TYPES.PROPERTY });
  assert.equal(groups.length, 4);
  assert.equal(countCases(groups), 0);
});

test("empty filter values mean show all", () => {
  assert.deepEqual(parseCaseFilters({ attorneyId: "", type: "" }), { attorneyId: null, type: null });
  assert.deepEqual(parseCaseFilters(), { attorneyId: null, type: null });
});

test("valid filter values are converted for the service", () => {
  const [attorney] = getAttorneys();
  assert.deepEqual(parseCaseFilters({ attorneyId: String(attorney.userId), type: CASE_TYPES.EMPLOYMENT }), {
    attorneyId: attorney.userId,
    type: CASE_TYPES.EMPLOYMENT
  });
});

test("unknown attorneys, non-attorneys, and made-up types are rejected", () => {
  const paralegal = findUserByEmail("agarza@mbmt.test");
  assert.throws(() => parseCaseFilters({ attorneyId: "999" }), { status: 400 });
  assert.throws(() => parseCaseFilters({ attorneyId: "abc" }), { status: 400 });
  assert.throws(() => parseCaseFilters({ attorneyId: String(paralegal.userId) }), { status: 400 });
  assert.throws(() => parseCaseFilters({ type: "Criminal" }), { status: 400 });
});
