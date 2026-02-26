
import type { Metadata } from "next";
import { requireMember } from "@/lib/membership";
import JournalClient from "./JournalClient";

export const metadata: Metadata = {
  title: "Journal • Trading Journal",
};

export default async function JournalPage() {
  await requireMember();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Journal</h1>
      <JournalClient />
    </div>
  );
}