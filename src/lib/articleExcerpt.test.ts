import { expect, test } from "bun:test";
import { articleExcerpt, truncateArticleExcerpt } from "./articleExcerpt.js";

test("displayed publisher excerpts omit email addresses", () => {
  const text = "Co-authored-by: Pat <123+pat@users.noreply.github.com> Fixed the parser.";
  expect(truncateArticleExcerpt(text)).toBe("Co-authored-by: Pat Fixed the parser.");
  expect(articleExcerpt({ summary: text, content: "" })).toBe("Co-authored-by: Pat Fixed the parser.");
});

test("site-wide publisher descriptions do not masquerade as article summaries", () => {
  const mistral = "The most powerful AI platform for enterprises. Customize, fine-tune, and deploy AI assistants, autonomous agents, and multimodal AI with open models.";
  const anthropic = "Anthropic is an AI safety and research company that's working to build reliable, interpretable, and steerable AI systems.";
  expect(articleExcerpt({ source_key: "mistral-sitemap", summary: mistral })).toBe("");
  expect(articleExcerpt({ source_key: "anthropic-sitemap", summary: anthropic })).toBe("");
  expect(articleExcerpt({ source_key: "other-source", summary: mistral })).toBe(mistral);
});

test("incomplete publisher fragments are omitted", () => {
  expect(articleExcerpt({ summary: "We", content: "We" })).toBe("");
  expect(articleExcerpt({ summary: "We", content: "The publisher released a new model today." }))
    .toBe("The publisher released a new model today.");
  expect(articleExcerpt({ summary: "No content.", content: "" })).toBe("");
  expect(articleExcerpt({ summary: "Release v3.54.0", content: "" })).toBe("");
  expect(articleExcerpt({ summary: "The publisher released a new model today.", content: "" }))
    .toBe("The publisher released a new model today.");
});
