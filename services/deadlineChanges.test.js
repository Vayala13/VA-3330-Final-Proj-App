import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { db } from "./dataStore.js";
import { seedUsers, findUserByEmail } from "./userService.js";
import { seedSampleData } from "./seedData.js";
import { addDeadline, moveDeadline, getDeadlinesForCase, getDeadlineHistory } from "./deadlineService.js";
import { getActivityForCase } from "./activityService.js";
import { DEADLINE_KINDS, ACTIVITY_ACTIONS } from "./constants.js";

const TODAY = "2026-11-15";
const NOW = new Date(2026, 10, 15, 14, 30);

let ana;

before(async () => {
  await seedUsers();
  ana = findUserByEmail("agarza@mbmt.test");
});

beforeEach(() => seedSampleData(TODAY));

const openDeadline = (title) => db.deadlines.find((d) => d.title === title);

test("moving a deadline keeps the old date in its history", () => {
  const hearing = openDeadline("Hearing on motion to compel");
  const oldDate = hearing.dueDate;
  moveDeadline(String(hearing.deadlineId), { newDate: "2026-12-01", reason: "  Court reset the hearing.  " }, ana, NOW);

  assert.equal(hearing.dueDate, "2026-12-01");
  const [change] = getDeadlineHistory(hearing.deadlineId);
  assert.deepEqual(
    [change.oldDate, change.newDate, change.reason, change.changedByName, change.changedDate],
    [oldDate, "2026-12-01", "Court reset the hearing.", "Ana Garza", TODAY]
  );
});

test("moving a deadline writes an Activity and touches the case", () => {
  const hearing = openDeadline("Hearing on motion to compel");
  moveDeadline(hearing.deadlineId, { newDate: "2026-12-01", reason: "Court reset the hearing." }, ana, NOW);

  const [latest] = getActivityForCase(hearing.caseId);
  assert.equal(latest.action, ACTIVITY_ACTIONS.DEADLINE_MOVED);
  assert.match(latest.detail, /Court reset the hearing\./);
  const matter = db.cases.find((c) => c.caseId === hearing.caseId);
  assert.deepEqual([matter.lastTouchedBy, matter.lastTouchedDate], [ana.userId, TODAY]);
});

test("a move without a reason is rejected and changes nothing", () => {
  const hearing = openDeadline("Hearing on motion to compel");
  const before = { dueDate: hearing.dueDate, changes: db.deadlineChanges.length, activities: db.activities.length };

  for (const reason of [undefined, "", "   "]) {
    assert.throws(() => moveDeadline(hearing.deadlineId, { newDate: "2026-12-01", reason }, ana, NOW), { status: 400 });
  }
  assert.deepEqual(
    { dueDate: hearing.dueDate, changes: db.deadlineChanges.length, activities: db.activities.length },
    before
  );
});

test("bad dates, same-date moves, completed deadlines, and unknown ids are rejected", () => {
  const hearing = openDeadline("Hearing on motion to compel");
  const completed = openDeadline("File settlement papers");
  const reason = "Testing.";
  assert.throws(() => moveDeadline(hearing.deadlineId, { newDate: "2026-02-30", reason }, ana, NOW), { status: 400 });
  assert.throws(() => moveDeadline(hearing.deadlineId, { newDate: hearing.dueDate, reason }, ana, NOW), { status: 400 });
  assert.throws(() => moveDeadline(completed.deadlineId, { newDate: "2026-12-01", reason }, ana, NOW), { status: 400 });
  assert.throws(() => moveDeadline("999", { newDate: "2026-12-01", reason }, ana, NOW), { status: 404 });
});

test("adding a deadline saves it and writes an Activity", () => {
  const garza = db.cases.find((c) => c.caption === "Garza v. Delta Freight Lines");
  const deadline = addDeadline(
    String(garza.caseId),
    { title: " Mediation ", kind: DEADLINE_KINDS.HEARING, dueDate: "2026-12-10", ownerId: String(ana.userId) },
    ana,
    NOW
  );

  assert.equal(deadline.title, "Mediation");
  assert.ok(getDeadlinesForCase(garza.caseId, TODAY).some((row) => row.deadlineId === deadline.deadlineId));
  assert.equal(getActivityForCase(garza.caseId)[0].action, ACTIVITY_ACTIONS.DEADLINE_ADDED);
});

test("adding a deadline with missing or made-up fields is rejected", () => {
  const caseId = db.cases[0].caseId;
  const good = { title: "Mediation", kind: DEADLINE_KINDS.HEARING, dueDate: "2026-12-10", ownerId: String(ana.userId) };
  assert.throws(() => addDeadline(caseId, { ...good, title: "" }, ana, NOW), { status: 400 });
  assert.throws(() => addDeadline(caseId, { ...good, kind: "Party" }, ana, NOW), { status: 400 });
  assert.throws(() => addDeadline(caseId, { ...good, dueDate: "next week" }, ana, NOW), { status: 400 });
  assert.throws(() => addDeadline(caseId, { ...good, ownerId: "999" }, ana, NOW), { status: 400 });
  assert.throws(() => addDeadline("999", good, ana, NOW), { status: 404 });
});

test("a case's deadlines include their move history", () => {
  const hollis = db.cases.find((c) => c.caption === "Hollis v. Rio Grande Insurance Co.");
  const expert = getDeadlinesForCase(hollis.caseId, TODAY).find((row) => row.title === "Expert designation deadline");
  assert.equal(expert.history.length, 1);
  assert.equal(expert.history[0].reason, "Opposing counsel agreed to a one-week extension.");
});
