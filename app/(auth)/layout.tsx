import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid-soft min-h-screen bg-[var(--background)] px-4 py-10 md:px-8">
      <div className="mx-auto flex w-full max-w-5xl justify-between">
        <Link href="/" className="text-2xl font-bold text-[var(--brand)]">
          Fundr
        </Link>
      </div>

      <div className="mx-auto mt-10 flex w-full max-w-5xl items-start justify-center">{children}</div>
    </div>
  );
}
