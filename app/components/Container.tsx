// app/components/Container.tsx
import type { ReactNode } from "react";

export default function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  // ✅ RootLayout already gives px-6, so Container should NOT add px-6 again
  return <div className={`mx-auto max-w-6xl ${className}`}>{children}</div>;
}