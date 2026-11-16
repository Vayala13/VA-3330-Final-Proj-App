import bcrypt from "bcrypt";
import { User } from "./User.js";
import { ROLES, SALT_ROUNDS } from "./constants.js";
import { isGoodStringParam } from "./validation.js";

// Demo staff for the class version. Passwords are hashed when the server starts; only the hashes are kept.
export const DEMO_PASSWORD = "CaseTracker1!";

const SEED_STAFF = [
  { name: "Diana Torres", email: "dtorres@mbmt.test", role: ROLES.ADMIN },
  { name: "Michael Benson", email: "mbenson@mbmt.test", role: ROLES.ATTORNEY },
  { name: "Teresa Montoya", email: "tmontoya@mbmt.test", role: ROLES.ATTORNEY },
  { name: "Ana Garza", email: "agarza@mbmt.test", role: ROLES.PARALEGAL },
  { name: "Luis Ortega", email: "lortega@mbmt.test", role: ROLES.PARALEGAL }
];

const users = [];

const normalizeEmail = (email) => email.trim().toLowerCase();

export async function seedUsers() {
  users.length = 0;
  for (const staff of SEED_STAFF) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
    users.push(new User({ userId: users.length + 1, passwordHash, ...staff }));
  }
}

export function getAllUsers() {
  return [...users];
}

export function findUserById(userId) {
  return users.find((user) => user.userId === userId);
}

export function findUserByEmail(email) {
  if (!isGoodStringParam(email)) {
    return undefined;
  }
  return users.find((user) => user.email === normalizeEmail(email));
}

// Returns the user when the email and password match, otherwise null. The password is never un-hashed:
// bcrypt hashes the login attempt with the stored salt and compares the results.
export async function verifyCredentials(email, password) {
  if (!isGoodStringParam(email) || !isGoodStringParam(password)) {
    return null;
  }
  const user = findUserByEmail(email);
  if (!user) {
    return null;
  }
  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  return passwordMatches ? user : null;
}
