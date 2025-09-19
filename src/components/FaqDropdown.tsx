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
      "Maybe! It's just one person creating it; me, so it depends on my time. But if you think you know a way to improve it or want to help, it is an open-source project; the GitHub repo is here: <a href=\"https://github.com/JonathanRReed/ai-news.git\" class='underline text-cyan hover:text-brand-hover transition-colors'>GitHub</a>.",
  },
];

export default function FaqDropdown() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="my-12 max-w-2xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-cyan drop-shadow-lg">FAQ</h2>
      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div
            key={faq.question}
            className={
              `rounded-2xl bg-white/10 border border-cyan/20 shadow-lg backdrop-blur-[14px] saturate-[1.18] transition-all relative overflow-hidden group ` +
              `hover:scale-[1.03] hover:z-10 hover:shadow-[0_8px_40px_0_rgba(196,167,231,0.26),0_2px_24px_0_rgba(235,111,146,0.18)] hover:bg-white/25 hover:border-cyan/40 ` +
              `transform-gpu duration-200 ease-[cubic-bezier(.4,0,.2,1)]`
            }
            style={{ boxShadow: '0 4px 32px 0 rgba(196,167,231,0.2), 0 1.5px 12px 0 rgba(156,207,216,0.18)' }}
          >
            <button
              className="w-full flex justify-between items-center px-6 py-4 text-left focus:outline-none font-semibold text-lg text-white hover:text-cyan transition-colors"
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
            {/* Frosted glass effect overlay */}
            <div
              aria-hidden="true"
              className="absolute inset-0 z-0 pointer-events-none group-hover:opacity-95 group-hover:blur-[3.5px] transition-all duration-300"
              style={{
                background:
                  'radial-gradient(ellipse at 60% 0%, rgba(64,61,82,0.28) 0%, rgba(31,29,46,0.3) 100%), linear-gradient(120deg, rgba(156,207,216,0.16) 0%, rgba(235,111,146,0.12) 100%)',
                opacity: 0.85,
                filter: 'blur(2.5px) saturate(1.18)',
                borderRadius: 'inherit',
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
