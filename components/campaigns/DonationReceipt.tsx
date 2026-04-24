"use client";

import Link from "next/link";
import type { CampaignRow } from "@/types/supabase";

interface DonationReceiptProps {
  campaign: CampaignRow;
  amount: string;
  isAnonymous: boolean;
  donorName: string;
  txHash: string;
  onClose: () => void;
}

export function DonationReceipt({
  campaign,
  amount,
  isAnonymous,
  donorName,
  txHash,
  onClose,
}: DonationReceiptProps) {
  const stellarUrl = `https://stellar.expert/explorer/public/tx/${txHash}`;

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="space-y-3 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <span className="text-3xl">✓</span>
        </div>
        <h2 className="text-2xl font-bold">Donation Successful!</h2>
        <p className="text-sm text-[var(--muted)]">Thank you for supporting this campaign.</p>
      </div>

      {/* Receipt Details */}
      <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-sm">
        <div className="flex items-center justify-between">
          <p className="text-[var(--muted)]">Campaign</p>
          <p className="font-semibold">{campaign.title}</p>
        </div>
        <div className="border-t border-[var(--line)]" />
        <div className="flex items-center justify-between">
          <p className="text-[var(--muted)]">Amount</p>
          <p className="font-semibold">{amount} XLM</p>
        </div>
        <div className="border-t border-[var(--line)]" />
        <div className="flex items-center justify-between">
          <p className="text-[var(--muted)]">Donor</p>
          <p className="font-semibold">{isAnonymous ? "Anonymous" : donorName}</p>
        </div>
        <div className="border-t border-[var(--line)]" />
        <div className="flex items-start justify-between gap-2">
          <p className="text-[var(--muted)]">Transaction ID</p>
          <p className="break-all text-right font-mono text-xs">{txHash.slice(0, 16)}...</p>
        </div>
      </div>

      {/* Stellar Explorer Link */}
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
        <p className="text-xs text-emerald-700 mb-3">
          View your transaction on the Stellar blockchain explorer.
        </p>
        <a
          href={stellarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          View on Stellar Explorer
          <span>↗</span>
        </a>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-[var(--brand)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
        >
          Back to Campaign
        </button>
        <Link
          href="/campaigns"
          className="block w-full rounded-xl border border-[var(--line)] py-2 text-center text-sm font-semibold transition hover:bg-[var(--surface-soft)]"
        >
          Explore More Campaigns
        </Link>
      </div>

      {/* Success Widget Hint */}
      <p className="text-center text-xs text-[var(--muted)]">
        A success notification has been sent. You can track your donation at any time.
      </p>
    </div>
  );
}
