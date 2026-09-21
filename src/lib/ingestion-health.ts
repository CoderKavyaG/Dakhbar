export const STALE_AFTER_MS = 35 * 60 * 1000;

export function ingestionHealth(lastSuccess: string | null, workerAlive: boolean, paused: boolean, now = Date.now()) {
  const parsed = lastSuccess ? Date.parse(lastSuccess) : NaN;
  const elapsedMinutes = Number.isFinite(parsed) ? Math.max(0, Math.floor((now - parsed) / 60000)) : null;
  const stale = !Number.isFinite(parsed) || now - parsed >= STALE_AFTER_MS;
  return { lastSuccess, elapsedMinutes, stale, workerAlive, paused, alert: stale || !workerAlive || paused };
}
