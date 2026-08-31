import { describe, expect, test } from "bun:test";
import { dailyDigests, dayKeyOf } from "./dailyDigest.js";

describe("daily digests", () => {
  test("uses stable UTC day keys", () => {
    expect(dayKeyOf("2026-08-30T23:59:59-05:00")).toBe("2026-08-31");
    expect(dayKeyOf("not-a-date")).toBe("");
  });

  test("creates newest-first permanent date records", () => {
    const digests = dailyDigests([
      { id: "a", company: "A", title: "A", url: "https://a.test", published_at: "2026-08-29T12:00:00Z" },
      { id: "b", company: "B", title: "B", url: "https://b.test", published_at: "2026-08-30T12:00:00Z" },
    ]);
    expect(digests.map((digest) => digest.day)).toEqual(["2026-08-30", "2026-08-29"]);
    expect(digests[0]?.count).toBe(1);
  });
});
