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

describe("re-dated records", () => {
  const moved = { id: "m", company: "M", title: "M", url: "https://m.test/post", source_key: "m-sitemap", published_at: "2025-06-10T00:00:00Z" };
  const other = { id: "o", company: "O", title: "O", url: "https://o.test", published_at: "2026-07-13T12:00:00Z" };

  test("keeps a date that corrections emptied and lists where its records went", () => {
    const digests = dailyDigests([moved, other], [
      { sourceKey: "m-sitemap", url: "https://m.test/post", recorded: "2026-07-12T09:00:00.000Z" },
    ]);
    expect(digests.map((digest) => digest.day)).toEqual(["2026-07-13", "2026-07-12", "2025-06-10"]);
    const vacated = digests[1];
    expect(vacated.count).toBe(0);
    expect(vacated.redated?.map((article) => article.id)).toEqual(["m"]);
  });

  test("adds nothing when the old date still has records or the record is gone", () => {
    const digests = dailyDigests([moved, other], [
      { sourceKey: "m-sitemap", url: "https://m.test/post", recorded: "2026-07-13T09:00:00.000Z" },
      { sourceKey: "x-sitemap", url: "https://x.test/missing", recorded: "2026-01-01T00:00:00.000Z" },
    ]);
    expect(digests.map((digest) => digest.day)).toEqual(["2026-07-13", "2025-06-10"]);
    expect(digests.every((digest) => !digest.redated)).toBe(true);
  });
});
