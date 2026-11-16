import { test, before } from "node:test";
import assert from "node:assert/strict";
import { seedUsers, findUserByEmail } from "./userService.js";
import { seedSampleData } from "./seedData.js";
import { getDashboard } from "./dashboardService.js";

const TODAY = "2026-11-15";

before(async () => {
  await seedUsers();
  seedSampleData(TODAY);
});

test("the dashboard counts the signed-in person's own deadlines and tasks", () => {
  const ana = findUserByEmail("agarza@mbmt.test");
  assert.deepEqual(getDashboard(ana, TODAY), {
    myOverdueDeadlines: 1,
    myDueSoonDeadlines: 1,
    myTasksNeedingAttention: 1,
    myOpenTasks: 5,
    staleCases: 3
  });
});

test("someone with no assigned work sees zeros, but still sees firm-wide stale cases", () => {
  const diana = findUserByEmail("dtorres@mbmt.test");
  assert.deepEqual(getDashboard(diana, TODAY), {
    myOverdueDeadlines: 0,
    myDueSoonDeadlines: 0,
    myTasksNeedingAttention: 0,
    myOpenTasks: 0,
    staleCases: 3
  });
});
