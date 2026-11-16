export function isGoodStringParam(param) {
  return typeof param === "string" && param.trim().length > 0;
}
