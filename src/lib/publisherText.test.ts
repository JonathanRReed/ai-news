import { expect, test } from "bun:test";
import { decodePublisherPunctuation } from "./publisherText.js";

test("publisher punctuation is readable without changing other source text", () => {
  expect(decodePublisherPunctuation("Stability AI &mdash; new model&nbsp;release"))
    .toBe("Stability AI — new model release");
  expect(decodePublisherPunctuation("The &ldquo;new&rdquo; model&hellip; it&rsquo;s here"))
    .toBe("The “new” model… it’s here");
  expect(decodePublisherPunctuation("Research & development")).toBe("Research & development");
});
