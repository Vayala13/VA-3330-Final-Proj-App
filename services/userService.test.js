import { test, before } from "node:test";
import assert from "node:assert/strict";
import {
  seedUsers,
  getAllUsers,
  findUserByEmail,
  verifyCredentials,
  createUser,
  DEMO_PASSWORD
} from "./userService.js";
import { ROLES } from "./constants.js";
before(async () => {
  await seedUsers();
});

const newStaff = (overrides = {}) => ({
  name: "Rosa Villarreal",
  email: "rvillarreal@mbmt.test",
  password: "temporary-pass",
  role: ROLES.PARALEGAL,
  ...overrides
});

test("seeded users never store the plain-text password", () => {
  for (const user of getAllUsers()) {
    assert.notEqual(user.passwordHash, DEMO_PASSWORD);
    assert.match(user.passwordHash, /^\$2[aby]\$10\$/);
  }
});

test("each user gets a different hash because bcrypt adds a random salt", () => {
  const hashes = getAllUsers().map((user) => user.passwordHash);
  assert.equal(new Set(hashes).size, hashes.length);
});

test("correct email and password returns the user", async () => {
  const user = await verifyCredentials("dtorres@mbmt.test", DEMO_PASSWORD);
  assert.equal(user?.name, "Diana Torres");
});

test("email match ignores case and surrounding spaces", async () => {
  const user = await verifyCredentials("  DTorres@MBMT.test ", DEMO_PASSWORD);
  assert.equal(user?.email, "dtorres@mbmt.test");
});

test("wrong password returns null", async () => {
  assert.equal(await verifyCredentials("dtorres@mbmt.test", "wrong-password"), null);
});

test("unknown email returns null", async () => {
  assert.equal(await verifyCredentials("nobody@mbmt.test", DEMO_PASSWORD), null);
});

test("blank or missing input returns null", async () => {
  assert.equal(await verifyCredentials("", DEMO_PASSWORD), null);
  assert.equal(await verifyCredentials("dtorres@mbmt.test", "   "), null);
  assert.equal(await verifyCredentials(undefined, undefined), null);
  assert.equal(findUserByEmail(undefined), undefined);
});

test("createUser adds a staff member who can then log in", async () => {
  await seedUsers();
  const user = await createUser(newStaff({ email: "  RVillarreal@MBMT.test " }));

  assert.equal(user.userId, 6);
  assert.equal(user.email, "rvillarreal@mbmt.test");
  assert.notEqual(user.passwordHash, "temporary-pass");
  assert.equal(getAllUsers().length, 6);
  assert.equal((await verifyCredentials("rvillarreal@mbmt.test", "temporary-pass"))?.name, "Rosa Villarreal");
});

test("createUser rejects bad input with status 400", async () => {
  await seedUsers();
  const cases = [
    [newStaff({ name: "  " }), /Name is required/],
    [newStaff({ email: "not-an-email" }), /valid email/],
    [newStaff({ email: "dtorres@mbmt.test" }), /already exists/],
    [newStaff({ role: "superuser" }), /Choose a role/],
    [newStaff({ password: "short" }), /at least 8 characters/]
  ];
  for (const [input, message] of cases) {
    await assert.rejects(createUser(input), (error) => error.status === 400 && message.test(error.message));
  }
  assert.equal(getAllUsers().length, 5);
});
