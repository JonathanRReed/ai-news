import { expect, test } from "bun:test";
import { articleMetaDescription } from "./articleSeo";

test("distinct releases retain their headlines when publisher excerpts repeat", () => {
  const excerpt = "Bug fixes and stability improvements for this release.";
  const first = articleMetaDescription({ title: "Release v1.2.3" }, excerpt, "github.com");
  const second = articleMetaDescription({ title: "Release v1.2.4" }, excerpt, "github.com");
  expect(first).not.toBe(second);
  expect(first).toContain("Release v1.2.3");
  expect(second).toContain("Release v1.2.4");
  expect(first.length).toBeLessThanOrEqual(155);
});

test("a publisher excerpt already starting with its headline is not repeated", () => {
  const excerpt = "Release v1.2.3 fixes the reported startup issue.";
  expect(articleMetaDescription({ title: "Release v1.2.3" }, excerpt, "github.com"))
    .toBe(excerpt);
});

test("missing source text uses the factual headline and source link notice", () => {
  expect(articleMetaDescription({ title: "New release" }, "No content.", "example.com"))
    .toBe("New release. Read the original at example.com.");
});

test("long descriptions are bounded without adding claims", () => {
  const result = articleMetaDescription({ title: "Release v1.2.3" }, "A published change. ".repeat(30), "github.com");
  expect(result.length).toBeLessThanOrEqual(155);
  expect(result).toContain("Release v1.2.3");
});
