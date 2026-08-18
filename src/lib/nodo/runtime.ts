export function isElectron() {
  if (typeof navigator === "undefined") return false;
  return /Electron/i.test(navigator.userAgent);
}
