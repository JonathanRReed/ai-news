# Model release selection

The Models page selects model announcements and substantive AI software releases from the admitted news collection. It does not change, delete, or retag news records.

A selection needs a current, affirmative announcement or availability claim tied to the same artifact as its AI purpose. Names, role descriptions, coordinated product lists, and directly referring follow-up sentences can provide that evidence. Negation, uncertainty, an unrelated organization's AI work, and a different product's availability do not qualify. A declared manual tool or configuration setting overrides weaker keyword evidence.

## Sparse preview exception

Some official previews have only a name and an availability caption, without an informative purpose description. For recall, the page retains these when the entire excerpt is an affirmative public/research-preview caption and the headline and canonical news, blog, or product URL identify the same artifact. This is a limited selection tradeoff, not evidence that an un-described feature is AI-powered. An informative purpose, a conflicting role, a different URL identity, or a routine prerelease build cannot use this exception.

## Producer cards and source attribution

The article's company field identifies its admitted feed. It is not a separate producer field. A hosted Hugging Face community post remains source-attributed in the timeline and news feed, but cannot become Hugging Face's latest producer card. Producer cards select the latest attributable eligible record without rewriting source labels or inferring another producer.

Frozen publisher fixtures and general boundary tests cover the selection rules. Browser tests verify the same selections in the timeline and producer cards, including retained community source labels.
