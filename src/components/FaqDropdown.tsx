import React, { useState } from "react";

const faqs = [
  {
    question: "How does this site get its data?",
    answer:
      "Primarily through RSS, but also through scraping. An article shows the sources it was found from. Either official RSS, unofficial RSS, or scraping.",
  },
  {
    question: "Where is DeepSeek!?",
    answer:
      "Sadly, they don't have a news feed or RSS feed to be tracked.",
  },
  {
    question: "How up-to-date is the info?",
    answer:
      "It should be updated every hour via scrapers & RSS feeds.",
  },
  {
    question: "Are there any plans to add other providers?",
    answer:
      "Not right now, but if Deepseek or another big lab makes an official news feed or RSS feed, maybe.",
  },
  {
    question: "Will this get better or continue to be improved?",
    answer:
      "Maybe! It's just one person creating it; me, so it depends on my time. But if you think you know a way to improve it or want to help, it is an open-source project; the GitHub repo is here: <a href=\"https://github.com/JonathanRReed/ai-news.git\" class='underline text-brand hover:text-brand-hover transition-colors'>GitHub</a>.",
  },
];

export default function FaqDropdown() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="my-12 max-w-2xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-brand drop-shadow-lg">FAQ</h2>
      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div
            key={faq.question}
            className={
              `rounded-2xl border backdrop-blur-md transition-all relative overflow-hidden group ` +
              `hover:scale-[1.02] hover:z-10 hover:border-white/20 ` +
              `transform-gpu duration-200 ease-[cubic-bezier(.4,0,.2,1)]`
            }
            style={{ 
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
              boxShadow: '0 6px 24px 0 rgba(0, 0, 0, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(12px) saturate(1.3) brightness(1.05)',
            }}
          >
            <button
              className="w-full flex justify-between items-center px-6 py-4 text-left focus:outline-none font-semibold text-lg text-white hover:text-brand-hover transition-colors"
              aria-expanded={openIndex === idx}
              aria-controls={`faq-panel-${idx}`}
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            >
              <span>{faq.question}</span>
              <span
                className={`ml-3 transform transition-transform duration-300 ${openIndex === idx ? "rotate-180" : "rotate-0"}`}
                aria-hidden="true"
              >
                ▼
              </span>
            </button>
            <div
              id={`faq-panel-${idx}`}
              className={`overflow-hidden transition-all duration-400 ease-in-out px-6 ${
                openIndex === idx ? "max-h-40 py-2 opacity-100" : "max-h-0 py-0 opacity-0"
              }`}
              style={{ pointerEvents: openIndex === idx ? "auto" : "none" }}
              aria-hidden={openIndex !== idx}
            >
              <div
                className="text-white/90 text-base leading-relaxed"
                dangerouslySetInnerHTML={{ __html: faq.answer }}
              />
            </div>
            {/* Subtle glass highlight */}
            <div
              aria-hidden="true"
              className="absolute top-0 left-0 right-0 h-px z-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
              }}
            />
            {/* Hover shine effect */}
            <div
              aria-hidden="true"
              className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.04) 50%, transparent 100%)',
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
