import { expect, test } from "bun:test";
import { articleMetaDescription, articlePublicationDateLabel } from "./articleSeo.js";

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

test("long headlines reserve room for substantive publisher context", () => {
  const title = "AI Infra Summit: " + "NVIDIA Vera Rubin infrastructure ".repeat(6);
  const excerpt = "Details include rollout dates, supported hardware, and upgrade steps.";
  const result = articleMetaDescription({ title }, excerpt, "example.com");
  expect(result).toStartWith("AI Infra Summit:");
  expect(result).toContain("Details include rollout dates");
  expect(result.length).toBeLessThanOrEqual(155);
});

test("long inline headlines retain their following publisher summary", () => {
  const title = "AI Infra Summit: " + "NVIDIA Vera Rubin infrastructure ".repeat(6);
  const result = articleMetaDescription({ title }, `${title}. Details include rollout dates and supported hardware.`, "example.com");
  expect(result).toContain("Details include rollout dates");
  expect(result.length).toBeLessThanOrEqual(155);
});

test("a headline prefix does not swallow a different opening word", () => {
  expect(articleMetaDescription({ title: "Model" }, "Models share a common release schedule.", "example.com"))
    .toBe("Model. Models share a common release schedule.");
});

test("publication labels keep the publisher UTC day near midnight", () => {
  expect(articlePublicationDateLabel("2025-08-27T00:09:00.000Z")).toBe("August 27, 2025");
  expect(articlePublicationDateLabel("2025-08-27T00:09:00.000Z", "short")).toBe("Aug 27, 2025");
});

test("publication labels keep the same day at the other UTC boundary", () => {
  expect(articlePublicationDateLabel("2025-08-27T23:59:00.000Z")).toBe("August 27, 2025");
});
