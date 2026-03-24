import type { ReactNode } from "react";
import TabsNav from "./TabsNav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <TabsNav />
      <div>{children}</div>
    </div>
  );
}
