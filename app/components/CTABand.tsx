import Container from "./Container";

export default function CTABand() {
  return (
    <section className="py-12">
      <Container>
        <div className="glass p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Ready to track your edge?</h3>
            <p className="text-zinc-300/90 text-sm">
              Start your 14-day free trial and import your first trades in minutes.
            </p>
          </div>
          <a
            href="/pricing"
            className="px-5 py-3 rounded-lg bg-emerald-500 text-zinc-900 font-medium hover:bg-emerald-400 transition"
          >
            Get started
          </a>
        </div>
      </Container>
    </section>
  );
}