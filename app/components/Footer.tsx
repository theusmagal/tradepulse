// app/components/Footer.tsx
import Container from "./Container";

export default function Footer() {
  return (
    <footer className="mt-12">
      <Container>
        <div className="glass px-6 py-6 text-sm text-zinc-300 flex flex-col md:flex-row items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} Trading Journal Oy (FI)</div>
          <nav className="flex gap-4">
            <a className="underline hover:text-white" href="/pricing">
              Pricing
            </a>
            <a className="underline hover:text-white" href="/legal/privacy">
              Privacy
            </a>
            <a className="underline hover:text-white" href="/legal/terms">
              Terms
            </a>
          </nav>
        </div>
      </Container>
    </footer>
  );
}