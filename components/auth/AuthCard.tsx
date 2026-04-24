import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <section className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm md:p-8">
      <h1 className="text-3xl font-bold leading-tight">{title}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
