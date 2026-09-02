/* global AbortController */
import React, { useEffect, useMemo, useState } from "react";
import {
  SUPABASE_REST_HEADERS,
  SUPABASE_URL,
  supabaseConfigured,
} from "../lib/supabaseClient.js";

type HealthRow = { health: string; last_checked_at: string | null };

export default function SourceHealthOverview({ registryActive }: { registryActive: number }) {
  const [rows, setRows] = useState<HealthRow[] | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      select: "health,last_checked_at",
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
        if (Array.isArray(payload)) setRows(payload as HealthRow[]);
      })
      .catch(() => undefined);
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
          <p className="micro-label text-brand-hover">Live source receipt</p>
          <h2 id="source-health-heading" className="mt-2 text-xl font-bold text-white">Coverage is visible, including failures.</h2>
        </div>
        <span className="micro-label text-text-2">Last check {lastCheckedLabel}</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-px bg-white/15 md:grid-cols-4">
        <div className="bg-bg-0 p-4"><dt className="micro-label text-muted">Healthy</dt><dd className="mt-2 font-mono text-2xl font-black tabular-nums text-emerald-300">{rows ? counts.healthy : "..."}</dd></div>
        <div className="bg-bg-0 p-4"><dt className="micro-label text-muted">Stale</dt><dd className="mt-2 font-mono text-2xl font-black tabular-nums text-amber-200">{rows ? counts.stale : "..."}</dd></div>
        <div className="bg-bg-0 p-4"><dt className="micro-label text-muted">Failing</dt><dd className="mt-2 font-mono text-2xl font-black tabular-nums text-brand-hover">{rows ? counts.failing : "..."}</dd></div>
        <div className="bg-bg-0 p-4"><dt className="micro-label text-muted">Registry active</dt><dd className="mt-2 font-mono text-2xl font-black tabular-nums text-white">{registryActive}</dd></div>
      </dl>
      {!rows && <p className="micro-label mt-4 text-text-2">Live health is loading. Registry admission counts remain available in the page.</p>}
    </section>
  );
}
