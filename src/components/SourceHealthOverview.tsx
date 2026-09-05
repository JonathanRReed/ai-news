/* global AbortController */
import React, { useEffect, useMemo, useState } from "react";
import { displayedSourceHealth, type SourceHealthState } from "../lib/source-health.js";
import {
  SUPABASE_REST_HEADERS,
  SUPABASE_URL,
  supabaseConfigured,
} from "../lib/supabaseClient.js";

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
  const [unavailable, setUnavailable] = useState(!supabaseConfigured);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      select: "health,last_checked_at,last_success_at",
      active: "eq.true",
      limit: "200",
    });
    fetch(`${SUPABASE_URL}/rest/v1/intelligence_source_health_v1?${params}`, {
      headers: SUPABASE_REST_HEADERS,
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`source health responded ${response.status}`);
        const payload: unknown = await response.json();
        if (!Array.isArray(payload) || payload.length === 0 || !payload.every(isHealthRow)) {
          setUnavailable(true);
          return;
        }
        setRows(payload.map(row => ({ ...row, health: displayedSourceHealth(row.health, row.last_success_at) })));
      })
      .catch(() => {
        if (!controller.signal.aborted) setUnavailable(true);
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

  return (
    <section className="industrial-border p-5 md:p-6" aria-labelledby="source-health-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/15 pb-4">
        <div>
          <h2 id="source-health-heading" className="text-xl font-bold text-white">Source status</h2>
          <p className="mt-2 text-sm leading-relaxed text-text-2">Successful checks within 12 hours count as recent. A successful check does not mean a new story was published.</p>
        </div>
        <span className="micro-label text-text-2">Last check {lastCheckedLabel}</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-px bg-white/15 md:grid-cols-4">
        <div className="bg-bg-0 p-4"><dt className="micro-label text-muted">Checked recently</dt><dd className="mt-2 font-mono text-2xl font-medium tabular-nums text-ok">{rows ? counts.healthy : "..."}</dd></div>
        <div className="bg-bg-0 p-4"><dt className="micro-label text-muted">Delayed</dt><dd className="mt-2 font-mono text-2xl font-medium tabular-nums text-warn">{rows ? counts.stale : "..."}</dd></div>
        <div className="bg-bg-0 p-4"><dt className="micro-label text-muted">Unavailable</dt><dd className="mt-2 font-mono text-2xl font-medium tabular-nums text-brand-hover">{rows ? counts.failing + counts.pending : "..."}</dd></div>
        <div className="bg-bg-0 p-4"><dt className="micro-label text-muted">Sources tracked</dt><dd className="mt-2 font-mono text-2xl font-medium tabular-nums text-white">{registryActive}</dd></div>
      </dl>
      {rows && counts.stale > 0 && <p className="mt-4 text-sm leading-relaxed text-warn">Some source checks are overdue. Collected stories remain available, but newer updates may be missing.</p>}
      {!rows && !unavailable && <p className="micro-label mt-4 text-text-2">Checking current source status...</p>}
      {!rows && unavailable && <p className="mt-4 text-sm leading-relaxed text-text-2">Current source checks are unavailable. The tracked-source count comes from the latest published site build.</p>}
    </section>
  );
}
