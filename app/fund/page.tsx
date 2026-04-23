"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { WalletButton } from "@/components/wallet/WalletButton";
import { featuredCampaigns } from "@/lib/constants/home";

export default function FundPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? use(searchParams) : {};
  const preselectedCampaign =
    typeof resolvedSearchParams.campaign === "string" ? resolvedSearchParams.campaign : "";
  const [selectedCampaign, setSelectedCampaign] = useState(
    preselectedCampaign || featuredCampaigns[0]?.title || "",
  );
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [fundAmount, setFundAmount] = useState("1");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");

  const selectedCampaignLabel = useMemo(() => {
    return selectedCampaign || "Choose a campaign";
  }, [selectedCampaign]);

  const minimumAmount = 1;

  const requiresIdentity = !isAnonymous;

  const selectedCampaignMeta = useMemo(() => {
    return featuredCampaigns.find((campaign) => campaign.title === selectedCampaign) || featuredCampaigns[0];
  }, [selectedCampaign]);

  const handleContinue = () => {
    return;
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_top_left,_rgba(15,139,128,0.12),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(15,139,128,0.08),_transparent_34%)]" />
      <div className="pointer-events-none absolute left-0 top-24 h-64 w-64 rounded-full bg-[rgba(15,139,128,0.08)] blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-40 h-72 w-72 rounded-full bg-[rgba(15,139,128,0.06)] blur-3xl" />

      <main className="relative mx-auto w-full max-w-6xl px-4 py-10 md:px-8 md:py-14">
        <section className="max-w-4xl space-y-4">
          <p className="inline-flex rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] px-4 py-1 text-sm font-medium text-[var(--brand-strong)] shadow-sm">
            Public Fund Flow
          </p>
          <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Fund a campaign with wallet support and optional anonymity.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[var(--muted)] md:text-lg">
            Choose a campaign, connect your wallet, and either donate anonymously or provide your name and email.
            Minimum funding amount is {minimumAmount} XLM.
          </p>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <form className="rounded-[2rem] border border-[var(--line)] bg-[rgba(255,255,255,0.92)] p-5 shadow-[0_16px_40px_rgba(20,24,23,0.08)] backdrop-blur-sm md:p-6">
            <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight md:text-[1.75rem]">Fund a campaign</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Use a connected wallet or continue anonymously.</p>
              </div>
              <div className="shrink-0">
                <WalletButton />
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Campaign</span>
                <select
                  value={selectedCampaign}
                  onChange={(event) => setSelectedCampaign(event.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)] focus:bg-white"
                >
                  <option value="">Select a campaign</option>
                  {featuredCampaigns.map((campaign) => (
                    <option key={campaign.title} value={campaign.title}>
                      {campaign.title}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4 transition hover:border-[rgba(15,139,128,0.35)]">
                <label className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">Donate anonymously</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">Hide your personal details from the campaign owner.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(event) => setIsAnonymous(event.target.checked)}
                    className="mt-1 h-5 w-5 accent-[var(--brand)]"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Amount (XLM)</span>
                  <input
                    type="number"
                    min={minimumAmount}
                    step="0.01"
                    value={fundAmount}
                    onChange={(event) => setFundAmount(event.target.value)}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)] focus:bg-white"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">Minimum value</span>
                  <input
                    type="text"
                    value={`${minimumAmount} XLM`}
                    readOnly
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)] outline-none"
                  />
                </label>
              </div>

              {requiresIdentity ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Full Name</span>
                    <input
                      type="text"
                      required
                      value={donorName}
                      onChange={(event) => setDonorName(event.target.value)}
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)] focus:bg-white"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Email Address</span>
                    <input
                      type="email"
                      required
                      value={donorEmail}
                      onChange={(event) => setDonorEmail(event.target.value)}
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)] focus:bg-white"
                    />
                  </label>
                </div>
              ) : (
                <p className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
                  Anonymous donations skip the name and email fields.
                </p>
              )}

              <button
                type="button"
                onClick={handleContinue}
                className="w-full rounded-xl bg-[var(--brand)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,139,128,0.22)] transition hover:bg-[var(--brand-strong)]"
              >
                Continue to Donate
              </button>
            </div>
          </form>

          <aside className="space-y-4 rounded-[2rem] border border-[var(--line)] bg-[rgba(255,255,255,0.92)] p-5 shadow-[0_16px_40px_rgba(20,24,23,0.08)] backdrop-blur-sm md:p-6">
            <h2 className="text-2xl font-bold tracking-tight">Current setup</h2>
            <p className="text-sm leading-6 text-[var(--muted)]">
              Campaigns are created in the protected fundraiser portal. Donations happen here on the public Fund page.
            </p>

            <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
              <div>
                <p className="text-sm font-semibold">Selected campaign</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{selectedCampaignLabel}</p>
              </div>

              {selectedCampaignMeta ? (
                <div className="rounded-xl border border-[var(--line)] bg-white/60 p-3 text-xs text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">Campaign preview</p>
                  <p className="mt-1">{selectedCampaignMeta.location}</p>
                  <p className="mt-1">Raised {selectedCampaignMeta.raised} and {selectedCampaignMeta.progress} funded</p>
                </div>
              ) : null}
            </div>

            <div className="space-y-1 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
              <p className="text-sm font-semibold">Anonymous mode</p>
              <p className="text-sm text-[var(--muted)]">{isAnonymous ? "Enabled" : "Disabled"}</p>
            </div>

            <div className="space-y-1 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
              <p className="text-sm font-semibold">Next step</p>
              <p className="text-sm leading-6 text-[var(--muted)]">
                Smart contract execution and payment confirmation will come after the admin and monitoring layer.
              </p>
            </div>

            <Link
              href="/fundraising"
              className="block rounded-xl border border-[var(--brand)] px-4 py-3 text-center text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
            >
              Go to Campaign Creation
            </Link>
          </aside>
        </section>
      </main>
    </div>
  );
}