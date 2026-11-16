export class User {
  constructor({ userId, name, email, passwordHash, role }) {
    this.userId = userId;
    this.name = name;
    this.email = email;
    this.passwordHash = passwordHash;
    this.role = role;
  }

  hasRole(...roles) {
    return roles.includes(this.role);
  }
}
