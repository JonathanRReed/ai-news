import React, { useState } from "react";

const faqs = [
  {
    question: "How does this site get its data?",
    answer:
      "Articles come from RSS and Atom feeds.",
  },
  {
    question: "How often does it update?",
    answer:
      "The feed updates hourly.",
  },
  {
    question: "Will other sources be added?",
    answer:
      "New sources can be added when they have a stable RSS or Atom feed.",
  },
  {
    question: "Is the project open source?",
    answer:
      "Yes. The repository is available on <a href=\"https://github.com/JonathanRReed/ai-news.git\" class='underline decoration-brand decoration-2 underline-offset-4 text-white hover:text-brand-hover transition-colors'>the AI News Hub source repository</a>.",
  },
];

export default function FaqDropdown() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="my-12 mx-auto max-w-4xl">
      <p className="micro-label mb-4 text-brand">[ FAQ ]</p>
      <h2 className="mb-8 text-4xl font-black uppercase leading-none text-white">Details</h2>
      <div className="space-y-px bg-white/20">
        {faqs.map((faq, idx) => (
          <div
            key={faq.question}
            className={
              `group relative overflow-hidden border border-white/20 bg-bg-1 transition-all ` +
              `hover:z-10 hover:bg-white/10 ` +
              `transform-gpu duration-200 ease-[cubic-bezier(.4,0,.2,1)]`
            }
          >
            <button
              className="focus-industrial flex w-full items-center justify-between px-6 py-5 text-left text-lg font-semibold text-white transition-colors hover:text-brand-hover"
              aria-expanded={openIndex === idx}
              aria-controls={`faq-panel-${idx}`}
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            >
              <span>{faq.question}</span>
              <span className="ml-3 font-mono" aria-hidden="true">
                {openIndex === idx ? "-" : "+"}
              </span>
            </button>
            <div
              id={`faq-panel-${idx}`}
              className={`overflow-hidden px-6 transition-all duration-300 ease-in-out ${
                openIndex === idx ? "max-h-40 py-2 opacity-100" : "max-h-0 py-0 opacity-0"
              }`}
              style={{ pointerEvents: openIndex === idx ? "auto" : "none" }}
              hidden={openIndex !== idx}
            >
              <div
                className="max-w-2xl pb-4 text-base leading-relaxed text-text-2"
                dangerouslySetInnerHTML={{ __html: faq.answer }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
