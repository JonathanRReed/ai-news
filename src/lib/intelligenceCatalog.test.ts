import { describe, expect, test } from "bun:test";
import {
  activeEntities,
  entitySharePath,
  entitiesBySection,
  entityForArticle,
  entitySources,
  getEntity,
} from "./intelligenceCatalog.js";

describe("intelligence catalog", () => {
  test("exposes admitted providers and harnesses from the generated registry", () => {
    expect(getEntity("z-ai")?.name).toBe("Z.AI");
    expect(getEntity("moonshot-ai")?.name).toBe("Moonshot AI");
    expect(getEntity("hermes-agent")?.entityType).toBe("harness");
    expect(getEntity("openclaw")?.entityType).toBe("harness");
  });

  test("only calls an entity active when it has an active source", () => {
    expect(activeEntities.some((entity) => entity.slug === "xai")).toBe(false);
    expect(activeEntities.some((entity) => entity.slug === "z-ai")).toBe(true);
    expect(entitySources("xai").filter((source) => source.active)).toHaveLength(0);
    expect(entitySources("xai").some((source) => source.archiveOnly)).toBeTrue();
  });

  test("groups harnesses separately from labs and providers", () => {
    expect(entitiesBySection.harnesses.every((entity) => entity.entityType === "harness")).toBe(true);
    expect(entitiesBySection.labs.every((entity) => entity.entityType !== "harness")).toBe(true);
  });

  test("maps legacy article publisher names to canonical entities", () => {
    expect(entityForArticle({ company: "Amazon AI" })?.slug).toBe("amazon-ai");
    expect(entityForArticle({ company: "Google DeepMind" })?.slug).toBe("google-deepmind");
  });

  test("shares provider filters through the index and harnesses through their entity page", () => {
    expect(entitySharePath(getEntity("z-ai")!)).toBe("/?company=Z.AI");
    expect(entitySharePath(getEntity("hermes-agent")!)).toBe("/entities/hermes-agent/");
  });
});
