import React, { useMemo, useState } from "react";
import { TOPICS } from "../lib/articleTags.js";
import { entitySharePath, type IntelligenceEntity } from "../lib/intelligenceCatalog.js";

export default function FeedBuilderIsland({ entities }: { entities: IntelligenceEntity[] }) {
  const [entity, setEntity] = useState(entities[0]?.slug ?? "");
  const [topic, setTopic] = useState(TOPICS[0]?.key ?? "releases");
  const selected = useMemo(() => entities.find((item) => item.slug === entity), [entities, entity]);
  const shareUrl = selected ? entitySharePath(selected) : "/";

  return (
    <div className="industrial-grid">
      <section className="col-span-12 p-5 md:col-span-6">
        <label className="micro-label text-text-2" htmlFor="feed-entity">Entity feed</label>
        <select id="feed-entity" value={entity} onChange={(event) => setEntity(event.target.value)} className="mt-3 min-h-12 w-full border border-white/25 bg-bg-0 px-3 text-white focus-industrial">
          {entities.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
        </select>
        <div className="mt-4 flex flex-wrap gap-3">
          <a className="signal-button" href={`/feed/entity/${entity}.xml`}>RSS</a>
          <a className="ghost-button" href={`/feed/entity/${entity}.json`}>JSON</a>
          <a className="ghost-button" href={shareUrl}>Share filtered view</a>
        </div>
      </section>
      <section className="col-span-12 p-5 md:col-span-6">
        <label className="micro-label text-text-2" htmlFor="feed-topic">Topic feed</label>
        <select id="feed-topic" value={topic} onChange={(event) => setTopic(event.target.value)} className="mt-3 min-h-12 w-full border border-white/25 bg-bg-0 px-3 text-white focus-industrial">
          {TOPICS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select>
        <div className="mt-4 flex flex-wrap gap-3">
          <a className="signal-button" href={`/feed/topic/${topic}.xml`}>RSS</a>
          <a className="ghost-button" href={`/?topic=${encodeURIComponent(topic)}`}>Share filtered view</a>
        </div>
      </section>
    </div>
  );
}
