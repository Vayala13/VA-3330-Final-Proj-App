// In-memory collections for every domain object except User (see userService.js).
// Only services read or change these arrays.
export const db = {
  cases: [],
  deadlines: [],
  deadlineChanges: [],
  tasks: [],
  activities: [],
  taskTemplates: [],
  callLogs: []
};

export function nextId(items, idField) {
  return items.length ? Math.max(...items.map((item) => item[idField])) + 1 : 1;
}

export function clearData() {
  for (const items of Object.values(db)) {
    items.length = 0;
  }
}
