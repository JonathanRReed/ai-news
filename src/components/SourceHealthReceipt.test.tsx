import React from "react";
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import SourceHealthReceipt from "./SourceHealthReceipt.js";

test("one source has one complete card with an available original link before hydration", () => {
  const html = renderToStaticMarkup(<SourceHealthReceipt sourceKeys={["openai-news"]} fallbacks={[{
    sourceKey: "openai-news", name: "OpenAI News", active: true, verifiedAt: "2026-08-30",
    officialUrl: "https://openai.com/news/", description: "Newsroom · RSS feed",
  }]} />);
  expect(html.match(/<article /g)).toHaveLength(1);
  expect(html.match(/OpenAI News/g)).toHaveLength(1);
  expect(html).toContain('href="https://openai.com/news/"');
  expect(html).toContain("Newsroom · RSS feed");
  expect(html).toContain('class="source-card-grid"');
  expect(html).not.toContain("md:grid-cols-2");
  expect(html).not.toContain("bg-white/15");
});
