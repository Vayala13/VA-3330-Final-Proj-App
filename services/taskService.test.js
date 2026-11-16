import { test, before } from "node:test";
import assert from "node:assert/strict";
import { seedUsers, findUserByEmail } from "./userService.js";
import { seedSampleData } from "./seedData.js";
import { listTodo, compareTodo } from "./taskService.js";
import { Task } from "./Task.js";
import { TASK_PRIORITIES, TASK_STATUSES, TODO_LABELS } from "./constants.js";

const TODAY = "2026-11-15";

before(async () => {
  await seedUsers();
  seedSampleData(TODAY);
});

const makeTask = (overrides) =>
  new Task({
    taskId: 1,
    caseId: 1,
    title: "Task",
    ownerId: 1,
    dueDate: TODAY,
    priority: TASK_PRIORITIES.MEDIUM,
    status: TASK_STATUSES.OPEN,
    ...overrides
  });

test("the to-do list is overdue first, then due today, then by priority", () => {
  assert.deepEqual(
    listTodo({}, TODAY).map((row) => row.title),
    [
      "Research and outline",
      "Draft answer to counterclaim",
      "Send mediation statement to the mediator",
      "Motion to compel discovery",
      "Draft the motion",
      "Collect medical records for summary judgment response",
      "Attorney review",
      "File with the court",
      "Run conflict check"
    ]
  );
});

test("an overdue low-priority task still comes before a high-priority task due today", () => {
  const overdueLow = makeTask({ dueDate: "2026-11-14", priority: TASK_PRIORITIES.LOW });
  const todayHigh = makeTask({ priority: TASK_PRIORITIES.HIGH });
  assert.ok(compareTodo(overdueLow, todayHigh, TODAY) < 0);
});

test("a task due today comes before a high-priority task due tomorrow", () => {
  const todayLow = makeTask({ priority: TASK_PRIORITIES.LOW });
  const tomorrowHigh = makeTask({ dueDate: "2026-11-16", priority: TASK_PRIORITIES.HIGH });
  assert.ok(compareTodo(todayLow, tomorrowHigh, TODAY) < 0);
});

test("done tasks are left out", () => {
  assert.ok(!listTodo({}, TODAY).some((row) => row.title === "Send closing letter to client"));
});

test("rows are labeled Overdue or Due today, and subtasks name their parent", () => {
  const rows = listTodo({}, TODAY);
  assert.deepEqual(
    rows.filter((row) => row.label).map((row) => [row.title, row.label]),
    [
      ["Research and outline", TODO_LABELS.OVERDUE],
      ["Draft answer to counterclaim", TODO_LABELS.OVERDUE],
      ["Send mediation statement to the mediator", TODO_LABELS.DUE_TODAY]
    ]
  );
  assert.equal(rows.find((row) => row.title === "Draft the motion").parentTitle, "Motion to compel discovery");
});

test("filtering by owner shows only that person's work, in the same order", () => {
  const ana = findUserByEmail("agarza@mbmt.test");
  const rows = listTodo({ ownerId: ana.userId }, TODAY);
  assert.deepEqual(
    rows.map((row) => row.title),
    ["Research and outline", "Draft the motion", "Attorney review", "File with the court", "Run conflict check"]
  );
  assert.ok(rows.every((row) => row.ownerName === "Ana Garza"));
});
