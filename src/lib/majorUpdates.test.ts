import { describe, expect, test } from "bun:test";
import { classifyMajorUpdate } from "./majorUpdates.js";

describe("major update classification", () => {
  test("classifies an explicit model version release with a public reason", () => {
    expect(classifyMajorUpdate({
      title: "Introducing GLM-5.1",
    })).toEqual({
      significance: "major",
      reason: "Named model version announced or released",
    });
  });

  test("classifies a major harness version", () => {
    expect(classifyMajorUpdate({
      title: "OpenHands v3.0.0 released",
    })?.reason).toBe("Major harness version released");
  });

  test("does not promote generic marketing copy", () => {
    expect(classifyMajorUpdate({
      title: "Five ways AI is changing work",
    })).toBeNull();
  });
});

test('corroborates a terse model-launch title without mistaking a case study for a launch', () => {
  expect(classifyMajorUpdate({
    title: 'GPT-6 and Intelligent UI for everyone',
    summary: 'GPT-6 is rolling out globally in ChatGPT with Intelligent UI, delivering faster responses with visuals and interactive experiences.',
    url: 'https://openai.com/index/gpt-6-and-intelligent-ui-for-everyone/',
  })?.significance).toBe('major');
  expect(classifyMajorUpdate({
    title: 'How a company uses GPT-6 to cut costs',
    summary: 'GPT-6 launched earlier this year. A company now uses it for customer support.',
  })).toBeNull();
});
