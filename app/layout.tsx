import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import Header from "./Header";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "MVP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable}
          min-h-screen
          bg-zinc-950 text-zinc-100
        `}
      >
        <div
          className="pointer-events-none fixed inset-0 -z-10 opacity-20
                     [background-image:url('/grid.svg')]"
        />
        <Providers>
          <Header />
          {/*  */}
          <main className="relative">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
