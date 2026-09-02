export type SourceHealthState = "healthy" | "stale" | "failing" | "pending" | "inactive";

// The scheduled collector runs every six hours. Two missed checks are overdue.
export const SOURCE_CHECK_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function displayedSourceHealth(
  health: SourceHealthState,
  lastSuccess: string | null,
  now = Date.now(),
): SourceHealthState {
  if (health !== "healthy") return health;
  const timestamp = lastSuccess ? Date.parse(lastSuccess) : NaN;
  if (!Number.isFinite(timestamp) || timestamp > now + 5 * 60 * 1000) return "pending";
  return now - timestamp > SOURCE_CHECK_MAX_AGE_MS ? "stale" : "healthy";
}
