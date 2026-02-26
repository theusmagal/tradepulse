// app/components/FAQ.tsx
"use client";

import Container from "./Container";
import { useState } from "react";

type QA = { q: string; a: string };

const faqs: QA[] = [
  {
    q: "How does trade import work?",
    a: "Bybit connects via secure read-only API for automatic syncing. Binance trades are imported instantly using a CSV upload. Both end up in the same analytics dashboard.",
  },
  {
    q: "Do I need to enter trades manually?",
    a: "No. Import your trades (API or CSV) and your KPIs, calendar, and equity curve are calculated automatically.",
  },
  {
    q: "What is the Journal for?",
    a: "It’s for daily notes: your plan, your emotions, and lessons learned. Over time you’ll see patterns that improve discipline and execution.",
  },
  {
    q: "Can I cancel?",
    a: "Absolutely. Cancel anytime from your account page—no hoops.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-12 md:py-16">
      <Container className="max-w-3xl">
        <h2 className="text-center text-2xl md:text-3xl font-semibold text-zinc-100">
          FAQ
        </h2>

        <div className="mt-6 space-y-3">
          {faqs.map((item, i) => {
            const active = open === i;
            return (
              <div
                key={item.q}
                className={["glass overflow-hidden", active ? "ring-1 ring-emerald-400/25" : ""].join(
                  " "
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpen(active ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
                >
                  <span className="font-medium text-zinc-100">{item.q}</span>
                  <svg
                    className={[
                      "h-4 w-4 shrink-0 text-zinc-400 transition-transform",
                      active ? "rotate-90 text-emerald-300" : "",
                    ].join(" ")}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {active && (
                  <div className="border-t border-zinc-700/60 px-4 py-3 text-sm text-zinc-300">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}