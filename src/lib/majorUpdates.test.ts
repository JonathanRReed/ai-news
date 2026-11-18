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

describe("major update rule coverage", () => {
  test.each([
    "Introducing Claude Opus 4.5",
    "Introducing Claude Haiku 5.5",
    "Announcing Claude Sonnet 5",
  ])("recognizes a Claude tier name in %s", (title) => {
    expect(classifyMajorUpdate({ title, company: "Anthropic" })?.reason).toBe("Named model version announced or released");
  });

  test("does not promote a customer story that only uses the model", () => {
    expect(classifyMajorUpdate({
      title: "Higgsfield AI ships new video features in a day with GPT-6 Astra",
      company: "OpenAI",
    })).toBeNull();
  });

  test("keeps a launch that leads with release language even when it says with", () => {
    expect(classifyMajorUpdate({ title: "Introducing computer use with Gemini 3.5 Flash", company: "Google DeepMind" })?.significance).toBe("major");
  });

  test("says when the named model belongs to another maker instead of crediting a launch", () => {
    expect(classifyMajorUpdate({
      title: "Grok 4.7 is now available on Amazon Bedrock",
      company: "Amazon AI",
    })?.reason).toBe("Named model version from another maker");
    // The maker is read from the version that matched, not from another family word in the title.
    expect(classifyMajorUpdate({
      title: "Introducing Grok 4.6 on Gemini Enterprise Agent Platform",
      company: "xAI",
    })?.reason).toBe("Named model version announced or released");
    expect(classifyMajorUpdate({ title: "Introducing Grok 4.7", company: "xAI" })?.reason).toBe("Named model version announced or released");
  });

  test("makes no ownership claim when the publisher is unknown", () => {
    expect(classifyMajorUpdate({ title: "Introducing GLM-5.1" })?.reason).toBe("Named model version announced or released");
  });
});
