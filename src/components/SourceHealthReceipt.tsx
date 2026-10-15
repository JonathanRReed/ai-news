/* global AbortController */
import React, { useEffect, useMemo, useState } from "react";
import { displayedSourceHealth } from "../lib/source-health.js";
import { cn } from "../lib/utils.js";
import { supabaseConfigured } from "../lib/supabaseClient.js";
import { fetchSourceHealth } from "../lib/fetchSourceHealth.js";

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
  officialUrl?: string;
  description?: string;
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

// The same written labels the overview panel uses, so one source never reads
// "healthy" here and "Checked recently" there.
function statusLabel(health: SourceHealth["health"]): string {
  switch (health) {
    case "healthy": return "Checked recently";
    case "stale": return "Delayed";
    case "inactive": return "Not active";
    default: return "Unavailable";
  }
}

function statusClass(health: SourceHealth["health"]): string {
  if (health === "healthy") return "border-ok/45 text-ok";
  if (health === "failing") return "border-brand/70 text-brand-hover";
  return "border-warn/45 text-warn";
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
    fetchSourceHealth(params, controller.signal)
      .then((payload) => {
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

  const healthByKey = new Map(rows.map((row) => [row.source_key, row]));
  return (
    <div className="source-card-grid" aria-live="polite">
      {fallbacks.map((source) => {
        const health = state === "live" ? healthByKey.get(source.sourceKey) : undefined;
        return (
          <article key={source.sourceKey} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-white">{source.name}</h3>
              <span className={cn("micro-label border px-2 py-1", health ? statusClass(health.health) : "border-white/20 text-text-2")}>
                {health ? statusLabel(health.health) : state === "loading" ? "Checking" : source.active ? "Tracked" : "Not active"}
              </span>
            </div>
            {source.description && <p className="micro-label mt-3 text-text-2">{source.description}</p>}
            {health ? (
              <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <div><dt className="micro-label text-muted">Last checked</dt><dd className="mt-1 font-mono text-text-2">{dateTime(health.last_checked_at)}</dd></div>
                <div><dt className="micro-label text-muted">Last success</dt><dd className="mt-1 font-mono text-text-2">{dateTime(health.last_success_at)}</dd></div>
                <div><dt className="micro-label text-muted">Latest item</dt><dd className="mt-1 font-mono text-text-2">{dateTime(health.last_item_at)}</dd></div>
                <div><dt className="micro-label text-muted">Consecutive failures</dt><dd className="mt-1 font-mono tabular-nums text-text-2">{health.consecutive_failures}</dd></div>
              </dl>
            ) : (
              <p className="micro-label mt-3 text-text-2">
                Source added {source.verifiedAt}. Current fetch status is {state === "loading" ? "loading" : "unavailable"}.
              </p>
            )}
            {source.officialUrl && <a href={source.officialUrl} target="_blank" rel="noopener noreferrer" className="micro-label mt-5 inline-block text-white underline decoration-brand decoration-2 underline-offset-4 hover:text-brand-hover focus-industrial">Open official source</a>}
          </article>
        );
      })}
    </div>
  );
}
