# Model release selection

The Models page selects model announcements and substantive AI software releases from the admitted news collection. It does not change, delete, or retag news records.

A selection needs a current, affirmative announcement or availability claim tied to the same artifact as its AI purpose. Names, role descriptions, coordinated product lists, and directly referring follow-up sentences can provide that evidence. Negation, uncertainty, an unrelated organization's AI work, and a different product's availability do not qualify. A declared manual tool or configuration setting overrides weaker keyword evidence. Explicitly dated past-tense launches use the article’s publication year when supplied; a different year or relative historical qualifier alone is not current release evidence.

## Sparse preview exception

Some official previews have only a name and an availability caption, without an informative purpose description. For recall, the page retains these when the entire excerpt is an affirmative public/research-preview caption and the headline and canonical news, blog, or product URL identify the same artifact. This is a limited selection tradeoff, not evidence that an un-described feature is AI-powered. An informative purpose, a conflicting role, a different URL identity, or a routine prerelease build cannot use this exception.

## Sparse numbered launches

Short numbered launch headlines can retain identity-only evidence when a feed omits an informative purpose. This is a recall heuristic within the admitted publisher collection, not proof that every numbered software product is AI-powered. An explicit non-AI artifact role in the headline or excerpt overrides it, including expense tools and operating systems.

## Identity normalization

Identity matching normalizes punctuation and versions, but does not infer arbitrary initial-letter abbreviations. One bounded alias preserves the feed's expanded “GPT-4 Omni” spelling of GPT-4o: the [official announcement](https://openai.com/index/hello-gpt-4o/) explicitly explains “o” as “omni.” This alias supplies only identity evidence. The same artifact still needs an affirmative launch and qualifying purpose; different families, versions, speculative claims, and conflicting manual roles remain excluded.

## Producer cards and source attribution

The article's company field identifies its admitted feed. It is not a separate producer field. A hosted Hugging Face community post remains source-attributed in the timeline and news feed, but cannot become Hugging Face's latest producer card. Hugging Face's own [verified organization](https://huggingface.co/huggingface) publishes first-party articles under `/blog/huggingface/<slug>` as well as the editorial `/blog/<slug>` path. Other organizations, lookalike hosts and malformed paths cannot use that producer credit. Producer cards select the latest attributable eligible record without rewriting source labels or inferring another producer.

## Remaining heuristic limits

The classifier does not fully parse arbitrary prose. These pre-existing edge cases remain outside the bounded repair:

- A shared provider word and version can corroborate different artifacts in the availability fallback.
- A capitalized-word excerpt fallback can omit version tokens.
- Spaced `report generation` can be excluded where `report-generation` is retained.
- A negated or speculative purpose that does not parse as a declaration can fall through to keyword evidence.
- A launch verb embedded in reporting, response or allegation wording can be mistaken for the main announcement.

The sparse numbered-caption fallback can also admit analysis wording without independent release evidence. These are precision and recall limits, not evidence that every selected artifact has launched or is AI-powered.

Frozen publisher fixtures and general boundary tests cover the selection rules. Browser tests verify the same selections in the timeline and producer cards, including retained community source labels.
