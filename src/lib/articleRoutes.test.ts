import { describe, expect, test } from "bun:test";
import { articlePath, isSafeArticleRouteId, normalizeArticleRouteId } from "./articleRoutes.js";

describe("article route IDs", () => {
  test.each([
    "legacy-openai-release",
    "provider-a6fd4eef859d02922e",
    "efab8582-cf78-4471-84d6-3ae73b991b5d",
  ])("accepts compatible single-segment ID %s", (id) => {
    expect(isSafeArticleRouteId(id)).toBeTrue();
    expect(normalizeArticleRouteId(id)).toBe(id);
    expect(articlePath(id)).toBe(`/article/${id}/`);
  });

  test.each([
    "../about",
    "foo/bar",
    "%2fadmin",
    "item?preview=1",
    "item#fragment",
    ".",
    "..",
    "item\u0000",
  ])("rejects unsafe ID %s", (id) => {
    expect(isSafeArticleRouteId(id)).toBeFalse();
    expect(() => normalizeArticleRouteId(id)).toThrow("safe single URL path segment");
    expect(() => articlePath(id)).toThrow("safe single URL path segment");
  });
});
