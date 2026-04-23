"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !user) {
      setError("Please sign in to complete onboarding.");
      setIsSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: username || null,
        full_name: fullName || null,
        wallet_address: walletAddress || null,
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <AuthCard
      title="Complete your profile"
      subtitle="Set your creator identity and optionally link your wallet address."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Username</span>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="yourname"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Full Name</span>
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your Name"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Freighter Wallet Address (optional)</span>
          <input
            type="text"
            value={walletAddress}
            onChange={(event) => setWalletAddress(event.target.value)}
            placeholder="G..."
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Continue to Dashboard"}
        </button>
      </form>
    </AuthCard>
  );
}
