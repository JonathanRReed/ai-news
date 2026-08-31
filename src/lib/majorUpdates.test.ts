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
