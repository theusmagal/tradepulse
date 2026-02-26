// app/components/Testimonials.tsx
import Container from "./Container";
import { Star } from "lucide-react";

const quotes = [
  {
    name: "Mikko K.",
    role: "Futures Trader",
    text: "The calendar view finally made my bad days obvious. Huge win for discipline.",
    rating: 5,
  },
  {
    name: "Sara L.",
    role: "Crypto Swing",
    text: "Automatic import means I actually keep a journal. The equity curve tells the truth.",
    rating: 5,
  },
  {
    name: "João M.",
    role: "Scalper",
    text: "Fast, clean, and no spreadsheet drama. Exactly what I needed.",
    rating: 5,
  },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < rating;
        return (
          <Star
            key={i}
            className={
              filled
                ? "h-4 w-4 fill-yellow-400 text-yellow-400"
                : "h-4 w-4 text-yellow-500/40"
            }
            strokeWidth={1.5}
            aria-hidden
          />
        );
      })}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="py-12 md:py-16">
      <Container>
        <h2 className="text-center text-2xl md:text-3xl font-semibold text-zinc-100">
          What traders say
        </h2>
        <p className="mt-2 text-center text-zinc-400">
          Built to make performance visible and improvement repeatable.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {quotes.map((q) => (
            <figure
              key={q.name}
              className="glass p-5 transition hover:ring-1 hover:ring-emerald-400/25 hover:shadow-[0_0_22px_rgba(16,185,129,.14)]"
            >
              <Stars rating={q.rating} />
              <blockquote className="mt-3 text-zinc-200">&ldquo;{q.text}&rdquo;</blockquote>
              <figcaption className="mt-4 text-sm text-zinc-400">
                {q.name} &bull; {q.role}
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}