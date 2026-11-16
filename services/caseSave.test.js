import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { db } from "./dataStore.js";
import { seedUsers, findUserByEmail } from "./userService.js";
import { seedSampleData } from "./seedData.js";
import { createCase, updateCase, findCase, getCaseDetails, canSetStatus, statusesFor } from "./caseService.js";
import { getActivityForCase } from "./activityService.js";
import { CASE_STATUSES, CASE_TYPES, ACTIVITY_ACTIONS } from "./constants.js";
const TODAY = "2026-11-15";
const NOW = new Date(2026, 10, 15, 14, 30);

let admin;
let michael;
let ana;

before(async () => {
  await seedUsers();
  admin = findUserByEmail("dtorres@mbmt.test");
  michael = findUserByEmail("mbenson@mbmt.test");
  ana = findUserByEmail("agarza@mbmt.test");
});

beforeEach(() => seedSampleData(TODAY));

const newCaseInput = () => ({
  caption: "  Lopez v. Harbor Marine  ",
  causeNumber: "Not yet filed",
  clientName: "Irene Lopez",
  type: CASE_TYPES.PERSONAL_INJURY,
  status: CASE_STATUSES.INTAKE,
  leadAttorneyId: String(michael.userId)
});

const inputFrom = (matter, changes = {}) => ({
  caption: matter.caption,
  causeNumber: matter.causeNumber,
  clientName: matter.clientName,
  type: matter.type,
  status: matter.status,
  leadAttorneyId: String(matter.leadAttorneyId),
  ...changes
});

const activitiesFor = (caseId) => db.activities.filter((a) => a.caseId === caseId);

test("creating a case saves trimmed fields and touches it by the creator", () => {
  const matter = createCase(newCaseInput(), ana, NOW);
  assert.equal(matter.caption, "Lopez v. Harbor Marine");
  assert.equal(matter.leadAttorneyId, michael.userId);
  assert.equal(matter.lastTouchedBy, ana.userId);
  assert.equal(matter.lastTouchedDate, TODAY);
  assert.equal(findCase(String(matter.caseId)), matter);
});

test("creating a case writes a Created case activity", () => {
  const matter = createCase(newCaseInput(), ana, NOW);
  const [activity] = activitiesFor(matter.caseId);
  assert.equal(activity.userId, ana.userId);
  assert.equal(activity.action, ACTIVITY_ACTIONS.CASE_CREATED);
  assert.equal(activity.timestamp, NOW.toISOString());
});

test("editing a case writes an activity listing what changed, and touches the case", () => {
  const matter = db.cases.find((c) => c.caption.startsWith("Pena"));
  const before = activitiesFor(matter.caseId).length;

  const { changed } = updateCase(String(matter.caseId), inputFrom(matter, { clientName: "Elena Pena Ruiz" }), ana, NOW);

  assert.equal(changed, true);
  const activities = activitiesFor(matter.caseId);
  assert.equal(activities.length, before + 1);
  const latest = activities.at(-1);
  assert.equal(latest.action, ACTIVITY_ACTIONS.CASE_UPDATED);
  assert.equal(latest.detail, "Changed client from Elena Pena to Elena Pena Ruiz.");
  assert.equal(matter.lastTouchedBy, ana.userId);
  assert.equal(matter.lastTouchedDate, TODAY);
});

test("changing the status is logged as Changed status, with attorney names instead of ids", () => {
  const matter = db.cases.find((c) => c.status === CASE_STATUSES.INTAKE);
  const teresa = findUserByEmail("tmontoya@mbmt.test");
  const otherAttorney = matter.leadAttorneyId === michael.userId ? teresa : michael;
  const oldName = matter.leadAttorneyId === michael.userId ? "Michael Benson" : "Teresa Montoya";

  updateCase(
    String(matter.caseId),
    inputFrom(matter, { status: CASE_STATUSES.ACTIVE, leadAttorneyId: String(otherAttorney.userId) }),
    ana,
    NOW
  );

  const latest = activitiesFor(matter.caseId).at(-1);
  assert.equal(latest.action, ACTIVITY_ACTIONS.STATUS_CHANGED);
  assert.match(latest.detail, /Changed status from Intake to Active\./);
  assert.match(latest.detail, new RegExp(`Changed lead attorney from ${oldName} to ${otherAttorney.name}\\.`));
});

test("saving with no changes writes nothing", () => {
  const matter = db.cases[0];
  const before = db.activities.length;
  const touched = matter.lastTouchedDate;

  const { changed } = updateCase(String(matter.caseId), inputFrom(matter), ana, NOW);

  assert.equal(changed, false);
  assert.equal(db.activities.length, before);
  assert.equal(matter.lastTouchedDate, touched);
});

test("paralegals cannot close or refer out a case; attorneys and admins can", () => {
  assert.equal(canSetStatus(ana, CASE_STATUSES.CLOSED, CASE_STATUSES.ACTIVE), false);
  assert.equal(canSetStatus(ana, CASE_STATUSES.REFERRED_OUT, CASE_STATUSES.ACTIVE), false);
  assert.equal(canSetStatus(ana, CASE_STATUSES.ACTIVE, CASE_STATUSES.INTAKE), true);
  assert.equal(canSetStatus(michael, CASE_STATUSES.CLOSED, CASE_STATUSES.ACTIVE), true);
  assert.equal(canSetStatus(admin, CASE_STATUSES.REFERRED_OUT, CASE_STATUSES.ACTIVE), true);
});

test("a paralegal can still edit other fields on a case that is already closed", () => {
  const closed = db.cases.find((c) => c.status === CASE_STATUSES.CLOSED);
  assert.equal(canSetStatus(ana, CASE_STATUSES.CLOSED, CASE_STATUSES.CLOSED), true);
  const { changed } = updateCase(String(closed.caseId), inputFrom(closed, { clientName: "Lucia Ochoa Diaz" }), ana, NOW);
  assert.equal(changed, true);
});

test("the service refuses a paralegal's close attempt and writes nothing", () => {
  const matter = db.cases.find((c) => c.status === CASE_STATUSES.ACTIVE);
  const before = db.activities.length;
  assert.throws(
    () => updateCase(String(matter.caseId), inputFrom(matter, { status: CASE_STATUSES.CLOSED }), ana, NOW),
    { status: 403 }
  );
  assert.throws(() => createCase({ ...newCaseInput(), status: CASE_STATUSES.CLOSED }, ana, NOW), { status: 403 });
  assert.equal(matter.status, CASE_STATUSES.ACTIVE);
  assert.equal(db.activities.length, before);
});

test("the status dropdown only offers what the user may choose", () => {
  assert.deepEqual(statusesFor(ana), [CASE_STATUSES.ACTIVE, CASE_STATUSES.INTAKE]);
  assert.deepEqual(statusesFor(ana, CASE_STATUSES.CLOSED), [CASE_STATUSES.ACTIVE, CASE_STATUSES.INTAKE, CASE_STATUSES.CLOSED]);
  assert.deepEqual(statusesFor(michael), Object.values(CASE_STATUSES));
});

test("bad input is rejected with status 400 and nothing is saved", () => {
  const caseCount = db.cases.length;
  const bad = [
    { caption: "   " },
    { clientName: "" },
    { caption: "x".repeat(201) },
    { type: "Criminal" },
    { status: "Archived" },
    { leadAttorneyId: String(ana.userId) },
    { leadAttorneyId: "abc" }
  ];
  for (const change of bad) {
    assert.throws(() => createCase({ ...newCaseInput(), ...change }, michael, NOW), { status: 400 }, JSON.stringify(change));
  }
  assert.equal(db.cases.length, caseCount);
});

test("the case history lists newest first with names, including the edit just made", () => {
  const matter = db.cases.find((c) => c.caption.startsWith("Hollis"));
  updateCase(String(matter.caseId), inputFrom(matter, { clientName: "Mark A. Hollis" }), ana, NOW);

  const history = getActivityForCase(matter.caseId);
  assert.equal(history[0].userName, "Ana Garza");
  assert.equal(history[0].detail, "Changed client from Mark Hollis to Mark A. Hollis.");
  const times = history.map((a) => a.timestamp);
  assert.deepEqual(times, [...times].sort().reverse());
  assert.ok(history.every((a) => a.userName !== "Unknown"));
});

test("case details show names and status for the detail page", () => {
  const details = getCaseDetails("1");
  assert.equal(details.status, CASE_STATUSES.ACTIVE);
  assert.equal(details.leadAttorneyName, "Michael Benson");
  assert.throws(() => getCaseDetails("999"), { status: 404 });
});

test("unknown case ids are a 404", () => {
  assert.throws(() => findCase("999"), { status: 404 });
  assert.throws(() => findCase("abc"), { status: 404 });
});
