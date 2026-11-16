import { test, before } from "node:test";
import assert from "node:assert/strict";
import { seedUsers } from "./userService.js";
import { seedSampleData } from "./seedData.js";
import { listUpcomingDeadlines } from "./deadlineService.js";
import { DEADLINE_FLAGS } from "./constants.js";

const TODAY = "2026-11-15";

before(async () => {
  await seedUsers();
  seedSampleData(TODAY);
});

const countByFlag = (rows, flag) => rows.filter((row) => row.flag === flag).length;

test("shows open deadlines through 3 weeks out, including overdue ones", () => {
  const rows = listUpcomingDeadlines(TODAY);
  assert.equal(rows.length, 9);
  assert.ok(rows.every((row) => row.dueDate <= "2026-12-06"));
  assert.ok(!rows.some((row) => row.title === "Trial setting"));
});

test("completed deadlines are left out", () => {
  const rows = listUpcomingDeadlines(TODAY);
  assert.ok(!rows.some((row) => row.title === "File settlement papers"));
});

test("each deadline is marked Overdue, Due soon, or On track", () => {
  const rows = listUpcomingDeadlines(TODAY);
  assert.equal(countByFlag(rows, DEADLINE_FLAGS.OVERDUE), 2);
  assert.equal(countByFlag(rows, DEADLINE_FLAGS.DUE_SOON), 4);
  assert.equal(countByFlag(rows, DEADLINE_FLAGS.ON_TRACK), 3);
});

test("due today and due in exactly 7 days both count as Due soon", () => {
  const rows = listUpcomingDeadlines(TODAY);
  assert.equal(rows.find((row) => row.daysUntilDue === 0).flag, DEADLINE_FLAGS.DUE_SOON);
  assert.equal(rows.find((row) => row.daysUntilDue === 7).flag, DEADLINE_FLAGS.DUE_SOON);
});

test("rows are sorted soonest first and show names, not ids", () => {
  const rows = listUpcomingDeadlines(TODAY);
  const dates = rows.map((row) => row.dueDate);
  assert.deepEqual(dates, [...dates].sort());
  assert.ok(rows.every((row) => row.ownerName !== "Unassigned" && row.caption !== "Unknown case"));
});
