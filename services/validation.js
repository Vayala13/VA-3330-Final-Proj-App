export function isGoodStringParam(param) {
  return typeof param === "string" && param.trim().length > 0;
}

export function isGoodEmail(param) {
  return isGoodStringParam(param) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(param.trim());
}
