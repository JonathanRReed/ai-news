/* global AbortController */
import React, { useEffect, useMemo, useState } from "react";
import { displayedSourceHealth } from "../lib/source-health.js";
import {
  SUPABASE_REST_HEADERS,
  SUPABASE_URL,
  supabaseConfigured,
} from "../lib/supabaseClient.js";

type SourceHealth = {
  source_key: string;
  name: string;
  active: boolean;
  last_checked_at: string | null;
  last_success_at: string | null;
  last_item_at: string | null;
  consecutive_failures: number;
  health: "healthy" | "stale" | "failing" | "pending" | "inactive";
};

type FallbackSource = {
  sourceKey: string;
  name: string;
  active: boolean;
  verifiedAt: string;
};

const HEALTH_STATES = new Set<SourceHealth["health"]>(["healthy", "stale", "failing", "pending", "inactive"]);

function validDate(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && Number.isFinite(Date.parse(value)));
}

function isSourceHealth(value: unknown): value is SourceHealth {
  if (!value || typeof value !== "object") return false;
  const source = value as Record<string, unknown>;
  return (
    typeof source.source_key === "string"
    && typeof source.name === "string"
    && typeof source.active === "boolean"
    && validDate(source.last_checked_at)
    && validDate(source.last_success_at)
    && validDate(source.last_item_at)
    && typeof source.consecutive_failures === "number"
    && Number.isInteger(source.consecutive_failures)
    && source.consecutive_failures >= 0
    && typeof source.health === "string"
    && HEALTH_STATES.has(source.health as SourceHealth["health"])
  );
}

function dateTime(value: string | null): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function statusClass(health: SourceHealth["health"]): string {
  if (health === "healthy") return "border-emerald-400/45 text-emerald-300";
  if (health === "failing") return "border-brand/70 text-brand-hover";
  return "border-amber-300/45 text-amber-200";
}

export default function SourceHealthReceipt({
  sourceKeys,
  fallbacks,
}: {
  sourceKeys: string[];
  fallbacks: FallbackSource[];
}) {
  const stableKeys = useMemo(() => [...new Set(sourceKeys.filter(Boolean))].sort(), [sourceKeys]);
  const [rows, setRows] = useState<SourceHealth[]>([]);
  const [state, setState] = useState<"loading" | "live" | "fallback">(
    supabaseConfigured ? "loading" : "fallback",
  );

  useEffect(() => {
    if (!supabaseConfigured || stableKeys.length === 0) {
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({
      select: "source_key,name,active,last_checked_at,last_success_at,last_item_at,consecutive_failures,health",
      source_key: `in.(${stableKeys.join(",")})`,
      order: "name.asc",
      limit: String(Math.min(stableKeys.length, 100)),
    });
    fetch(`${SUPABASE_URL}/rest/v1/intelligence_source_health_v1?${params}`, {
      headers: SUPABASE_REST_HEADERS,
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`source health responded ${response.status}`);
        const payload: unknown = await response.json();
        if (!Array.isArray(payload) || !payload.every(isSourceHealth)) throw new Error("source health returned an invalid payload");
        if (payload.length === 0) {
          setState("fallback");
          return;
        }
        setRows(payload.map(source => ({ ...source, health: displayedSourceHealth(source.health, source.last_success_at) })));
        setState("live");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("fallback");
      });
    return () => controller.abort();
  }, [stableKeys]);

  if (state !== "live") {
    return (
      <div className="grid gap-px bg-white/15 md:grid-cols-2" role="status">
        {fallbacks.map((source) => (
          <article key={source.sourceKey} className="bg-bg-0 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm text-white">{source.name}</strong>
              <span className="micro-label border border-white/20 px-2 py-1 text-text-2">
                {state === "loading" ? "Checking" : source.active ? "Tracked" : "Not active"}
              </span>
            </div>
            <p className="micro-label mt-3 text-text-2">
              Source added {source.verifiedAt}. Current fetch status is {state === "loading" ? "loading" : "unavailable"}.
            </p>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-px bg-white/15 md:grid-cols-2" aria-live="polite">
      {rows.map((source) => (
        <article key={source.source_key} className="bg-bg-0 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-sm text-white">{source.name}</strong>
            <span className={`micro-label border px-2 py-1 ${statusClass(source.health)}`}>
              {source.health}
            </span>
          </div>
          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
            <div><dt className="micro-label text-muted">Last checked</dt><dd className="mt-1 font-mono text-text-2">{dateTime(source.last_checked_at)}</dd></div>
            <div><dt className="micro-label text-muted">Last success</dt><dd className="mt-1 font-mono text-text-2">{dateTime(source.last_success_at)}</dd></div>
            <div><dt className="micro-label text-muted">Latest item</dt><dd className="mt-1 font-mono text-text-2">{dateTime(source.last_item_at)}</dd></div>
            <div><dt className="micro-label text-muted">Consecutive failures</dt><dd className="mt-1 font-mono tabular-nums text-text-2">{source.consecutive_failures}</dd></div>
          </dl>
        </article>
      ))}
    </div>
  );
}
