import { test, before } from "node:test";
import assert from "node:assert/strict";
import {
  seedUsers,
  getAllUsers,
  findUserByEmail,
  verifyCredentials,
  DEMO_PASSWORD
} from "./userService.js";

before(async () => {
  await seedUsers();
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
