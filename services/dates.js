// Calendar dates are stored as "YYYY-MM-DD" strings so comparisons never shift with time zones.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toUtc = (dateString) => new Date(`${dateString}T00:00:00Z`);

export function isValidDateString(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return false;
  }
  return toUtc(value).toISOString().slice(0, 10) === value;
}

export function today(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function addDays(dateString, days) {
  const date = toUtc(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Positive when `to` is after `from`.
export function daysBetween(from, to) {
  return Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY);
}
