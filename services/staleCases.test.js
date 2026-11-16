import { test, before } from "node:test";
import assert from "node:assert/strict";
import { seedUsers } from "./userService.js";
import { seedSampleData } from "./seedData.js";
import { listStaleCases } from "./caseService.js";
import { db } from "./dataStore.js";
import { addDays } from "./dates.js";
import { CASE_STATUSES } from "./constants.js";

const TODAY = "2026-11-15";

before(async () => {
  await seedUsers();
  seedSampleData(TODAY);
});

test("lists active cases untouched for more than a year, longest-quiet first", () => {
  const rows = listStaleCases(TODAY);
  assert.deepEqual(
    rows.map((row) => [row.caption, row.daysQuiet]),
    [
      ["Sandoval Builders v. Cortez Holdings", 540],
      ["Pena v. Valley Medical Center", 420],
      ["Moreno v. Lone Star Logistics", 380]
    ]
  );
});

test("a case touched exactly 365 days ago is not stale yet", () => {
  const matter = db.cases.find((c) => c.caption === "Trevino v. South Texas Roofing");
  const original = matter.lastTouchedDate;
  matter.lastTouchedDate = addDays(TODAY, -365);
  try {
    assert.ok(!listStaleCases(TODAY).some((row) => row.caseId === matter.caseId));
    matter.lastTouchedDate = addDays(TODAY, -366);
    assert.ok(listStaleCases(TODAY).some((row) => row.caseId === matter.caseId));
  } finally {
    matter.lastTouchedDate = original;
  }
});

test("cases that are not Active never show as stale", () => {
  const matter = db.cases.find((c) => c.caption === "Pena v. Valley Medical Center");
  matter.status = CASE_STATUSES.CLOSED;
  try {
    assert.ok(!listStaleCases(TODAY).some((row) => row.caseId === matter.caseId));
  } finally {
    matter.status = CASE_STATUSES.ACTIVE;
  }
});

test("rows show people's names", () => {
  const [first] = listStaleCases(TODAY);
  assert.notEqual(first.leadAttorneyName, "Unknown");
  assert.notEqual(first.lastTouchedByName, "Unknown");
});
