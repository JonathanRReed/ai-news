/* global AbortController */
import React, { useEffect, useMemo, useState } from "react";
import { displayedSourceHealth, type SourceHealthState } from "../lib/source-health.js";
import { supabaseConfigured } from "../lib/supabaseClient.js";
import { fetchSourceHealth } from "../lib/fetchSourceHealth.js";

type HealthRow = { health: SourceHealthState; last_checked_at: string | null; last_success_at: string | null };
const HEALTH_STATES = new Set(["healthy", "stale", "failing", "pending", "inactive"]);

function validDate(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && Number.isFinite(Date.parse(value)));
}

function isHealthRow(value: unknown): value is HealthRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.health === "string" && HEALTH_STATES.has(row.health) && validDate(row.last_checked_at) && validDate(row.last_success_at);
}

export default function SourceHealthOverview({ registryActive }: { registryActive: number }) {
  const [rows, setRows] = useState<HealthRow[] | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      select: "health,last_checked_at,last_success_at",
      active: "eq.true",
      limit: "200",
    });
    fetchSourceHealth(params, controller.signal)
      .then((payload) => {
        if (!Array.isArray(payload) || payload.length === 0 || !payload.every(isHealthRow)) {
          return;
        }
        setRows(payload.map(row => ({ ...row, health: displayedSourceHealth(row.health, row.last_success_at) })));
      })
      .catch(() => {
        // An outage leaves the registry count on its own; nothing is guessed.
      });
    return () => controller.abort();
  }, []);

  const counts = useMemo(() => {
    const result = { healthy: 0, stale: 0, failing: 0, pending: 0 };
    for (const row of rows ?? []) {
      if (row.health in result) result[row.health as keyof typeof result] += 1;
    }
    return result;
  }, [rows]);
  const lastChecked = (rows ?? [])
    .map((row) => row.last_checked_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const lastCheckedLabel = lastChecked
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(lastChecked))
    : "Unavailable";

  const troubled = counts.stale + counts.failing + counts.pending;

  // One inline fact in the masthead. The registry count is always true; the live check is
  // added only when it loaded, so an outage never prints a guess.
  return (
    <span aria-live="polite">
      <a href="/labs/" className="rail-link focus-industrial !text-sm" title={rows ? `Last check ${lastCheckedLabel}` : undefined}>
        <span className="font-mono tabular-nums text-white">{registryActive}</span> active sources
      </a>
      {rows && troubled === 0 && <>, all checked in the last 12 hours</>}
      {rows && troubled > 0 && (
        <>
          , <span className="font-mono tabular-nums text-white">{counts.healthy}</span> checked in the last 12 hours
          {counts.stale > 0 && <>, <span className="font-mono tabular-nums text-warn">{counts.stale}</span> delayed</>}
          {counts.failing + counts.pending > 0 && <>, <span className="font-mono tabular-nums text-brand-hover">{counts.failing + counts.pending}</span> unavailable</>}
        </>
      )}
    </span>
  );
}
