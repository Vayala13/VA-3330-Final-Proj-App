import bcrypt from "bcrypt";
import { User } from "./User.js";
import { ROLES, SALT_ROUNDS, MIN_PASSWORD_LENGTH } from "./constants.js";
import { isGoodStringParam, isGoodEmail } from "./validation.js";
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

const nextUserId = () => (users.length ? Math.max(...users.map((user) => user.userId)) + 1 : 1);

export async function seedUsers() {
  users.length = 0;
  for (const staff of SEED_STAFF) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
    users.push(new User({ userId: nextUserId(), passwordHash, ...staff }));
  }
}

export async function createUser({ name, email, password, role }) {
  if (!isGoodStringParam(name)) {
    const error = new Error("Name is required.");
    error.status = 400;
    throw error;
  }
  if (!isGoodEmail(email)) {
    const error = new Error("Enter a valid email address.");
    error.status = 400;
    throw error;
  }
  if (findUserByEmail(email)) {
    const error = new Error("A staff account with that email already exists.");
    error.status = 400;
    throw error;
  }
  if (!Object.values(ROLES).includes(role)) {
    const error = new Error("Choose a role.");
    error.status = 400;
    throw error;
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    const error = new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    error.status = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = new User({
    userId: nextUserId(),
    name: name.trim(),
    email: normalizeEmail(email),
    passwordHash,
    role
  });
  users.push(user);
  return user;
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
