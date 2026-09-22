export const PULSE_STALE_AFTER_MS = 27 * 60 * 60 * 1000;

export function pulseHealth(lastSuccess: string | null, now = new Date()) {
  const timestamp = lastSuccess ? Date.parse(lastSuccess) : Number.NaN;
  const elapsedHours = Number.isFinite(timestamp) ? Math.max(0, (now.getTime() - timestamp) / 3600000) : null;
  return { lastSuccess, elapsedHours, stale: elapsedHours === null || elapsedHours >= PULSE_STALE_AFTER_MS / 3600000 };
}
