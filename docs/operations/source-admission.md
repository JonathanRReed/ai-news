# Source admission and verification

AI News admits a source only when it is first-party, stable enough to automate,
and capable of producing attributable records without a paid service.

## Admission requirements

An entity may be `active`, `watchlist`, or `archived`. An active ingestion source
must satisfy every requirement below:

1. The entity has a stable slug, display name, type, homepage, and status in
   `config/intelligence-sources.mjs`.
2. The endpoint is HTTPS and belongs to the entity, its documented publishing
   platform, or its official GitHub organization.
3. The endpoint is RSS, Atom, or an official sitemap with bounded page paths.
4. A direct fetch returns the declared media type and at least one valid record.
5. Every record has a title, canonical HTTPS URL on an explicitly admitted
   source host, and valid publication
   date. The collector does not invent missing dates.
6. The source has a recorded verification date.
7. A failure cannot delete or replace historical records.

Third-party reporting may later support an existing event, but cannot become a
canonical source through this manifest.

Inactive records marked `archiveOnly` are a narrow migration exception. They
admit an exact historical endpoint and its known canonical hosts solely to
preserve previously published article routes. They are never fetched by the
collector, never count as active coverage, and cannot justify admitting new
third-party material. The launch catalog contains archive-only records for the
legacy Anthropic community feed, Meta Research feed, and old Meta AI, Mistral
AI, and xAI TechCrunch feeds.

## Verification commands

Run the structural gate:

```bash
bun scripts/intelligence/validate-manifest.mjs
bun test scripts/intelligence/validate-manifest.test.mjs
```

Then run each proposed source through `fetchSource`. A successful HTTP status is
not enough. The result must be `success` with at least one parsed item.

```js
import { fetchSource } from '../../scripts/intelligence/fetch-source.mjs';

const result = await fetchSource(source);
if (result.status !== 'success' || result.items.length === 0) {
  throw new Error(`${source.sourceKey} did not produce a valid item`);
}
```

RSS or Atom endpoints that return HTML, empty release feeds, cross-domain
redirects, or feeds without valid dates remain inactive. Sitemap adapters may
fetch at most eight nested sitemap files and twenty-five new or changed pages per
source run.

## Verified launch coverage

The 2026-08-30 direct verification pass confirmed active adapters for the
existing provider set plus:

- Meta Llama Models releases;
- Z.AI release notes;
- Moonshot AI and Kimi Code or CLI releases;
- MiniMax news, blog, and research;
- Cohere, AI21 Labs, Stability AI, Anthropic, and Mistral sitemaps;
- Hermes Agent, OpenClaw, OpenHands, Aider, Cline, Roo Code, Goose, Continue,
  Letta, Codex CLI, Claude Code, and Gemini CLI releases.

Tencent Hunyuan, StepFun, and the MiniMax M2 repository are represented as
entities, but their checked release feeds contained no valid entries during the
verification pass. Those feeds remain inactive until a future direct check
produces a release. Microsoft AI remains a watchlist entity because its broad
sitemap needs a narrower, proven path filter.

`https://ai.meta.com/sitemap.xml` returned HTTP 404, so Meta coverage uses the
official `meta-llama/llama-models` release feed instead. `https://x.ai/news` and
`https://x.ai/sitemap.xml` returned HTTP 403 to the bounded verifier. xAI remains
an inactive first-party watchlist source so historical records retain honest
provenance without pretending refreshes are healthy.

## Adding or changing a source

1. Verify the organization and canonical endpoint through its first-party site
   or official repository.
2. Add or update the entity and source definition.
3. Add a minimal fixture when a new parser behavior is required.
4. Run structural validation and the complete Bun suite.
5. Run a bounded live verification and record the date.
6. Keep the source optional for its first successful scheduled-equivalent run.
7. Mark it required only after it has passed both a direct check and one complete
   scheduled-equivalent refresh.

Do not activate an endpoint because it looks conventional. The rejected guesses
in the initial audit included several `/rss.xml` and `/feed/` URLs that returned
404, 410, or HTML despite resembling feed paths.
