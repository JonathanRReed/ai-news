import React, { useState } from "react";

type FaqItem = {
  question: string;
  answer: React.ReactNode;
};

const faqs: FaqItem[] = [
  {
    question: "Will other sources be added?",
    answer:
      "New sources can be added when they have a stable RSS or Atom feed.",
  },
  {
    question: "Is the project open source?",
    answer: (
      <>
        Yes. The repository is available on{" "}
        <a
          href="https://github.com/JonathanRReed/ai-news.git"
          className="underline decoration-brand decoration-2 underline-offset-4 transition-colors hover:text-brand-hover"
          target="_blank"
          rel="noopener noreferrer"
        >
          the AI News Hub source repository
        </a>.
      </>
    ),
  },
];

export default function FaqDropdown() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="my-12 mx-auto max-w-4xl">
      <h2 className="mb-8 text-2xl font-semibold leading-tight text-white">Details</h2>
      <div className="space-y-px bg-white/20">
        {faqs.map((faq, idx) => (
          <div
            key={faq.question}
            className={
              `group relative overflow-hidden border border-white/20 bg-bg-1 transition-all ` +
              `hover:z-10 hover:bg-white/10 ` +
              `transform-gpu duration-[var(--dur-base)] ease-[var(--ease-standard)]`
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
              className="grid overflow-hidden px-6"
              style={{
                gridTemplateRows: openIndex === idx ? "1fr" : "0fr",
                opacity: openIndex === idx ? 1 : 0,
                transition: "grid-template-rows var(--dur-base) var(--ease-standard), opacity var(--dur-base) var(--ease-standard)",
              }}
              inert={openIndex !== idx}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="max-w-2xl py-2 pb-4 text-base leading-relaxed text-text-2">{faq.answer}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
