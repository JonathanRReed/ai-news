import { expect, test } from "bun:test";
import { displayedSourceHealth } from "./source-health.js";

const now = Date.parse("2026-09-02T16:00:00Z");

test("source status expires after two scheduled checks even when the database reports healthy", () => {
  expect(displayedSourceHealth("healthy", "2026-09-02T10:00:00Z", now)).toBe("healthy");
  expect(displayedSourceHealth("healthy", "2026-09-02T04:00:00Z", now)).toBe("healthy");
  expect(displayedSourceHealth("healthy", "2026-09-02T03:59:59Z", now)).toBe("stale");
  expect(displayedSourceHealth("healthy", "2026-09-01T16:00:00Z", now)).toBe("stale");
});

test("source status never upgrades failures or treats missing and future receipts as healthy", () => {
  for (const health of ["failing", "pending", "inactive", "stale"] as const) {
    expect(displayedSourceHealth(health, "2026-09-02T15:00:00Z", now)).toBe(health);
  }
  for (const timestamp of [null, "invalid", "2026-09-03T16:00:00Z"]) {
    expect(displayedSourceHealth("healthy", timestamp, now)).toBe("pending");
  }
});
