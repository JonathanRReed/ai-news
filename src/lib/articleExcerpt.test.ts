import { expect, test } from "bun:test";
import { articleExcerpt, truncateArticleExcerpt } from "./articleExcerpt.js";

test("displayed publisher excerpts omit email addresses", () => {
  const text = "Co-authored-by: Pat <123+pat@users.noreply.github.com> Fixed the parser.";
  expect(truncateArticleExcerpt(text)).toBe("Co-authored-by: Pat Fixed the parser.");
  expect(articleExcerpt({ summary: text, content: "" })).toBe("Co-authored-by: Pat Fixed the parser.");
});
