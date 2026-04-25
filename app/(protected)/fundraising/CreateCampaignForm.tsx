"use client";

/**
 * CreateCampaignForm
 *
 * Two key improvements over the original:
 *  1. Wallet auto-injection — reads the connected Freighter address from the
 *     browser (via WalletCard's dispatched events) and injects it as a hidden
 *     field so the server action never hits the "no_wallet" redirect even if
 *     the address hasn't been saved to the profile yet.
 *  2. localStorage persistence — every text/select field is controlled and
 *     saved to localStorage on change so the user doesn't lose their work
 *     after a failed submission / page reload.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { getAddress, isAllowed } from "@stellar/freighter-api";

const CACHE_KEY = "fundr_create_campaign_draft";

const ERROR_MESSAGES: Record<string, string> = {
  save: "Could not save campaign. Please try again.",
  no_wallet:
    "No Stellar wallet found. Connect your Freighter wallet using the widget in the top-right corner.",
  onchain:
    "On-chain registration failed. Check that your wallet is funded on Testnet and try again.",
  official_link: "Official campaign link must start with http:// or https://",
  images_count: "Upload 4 to 5 campaign images.",
  images_type: "Campaign images must be image files.",
  images_size: "Each campaign image must be 4 MB or smaller.",
  images_upload: "Campaign image upload failed. Please try again.",
  proof_type: "Proof file must be an image or a PDF file.",
  proof_size: "Proof file must be 6 MB or smaller.",
  proof_upload: "Proof file upload failed. Please try again.",
  invalid: "Please complete all required fields correctly.",
  campaign_limit: "You have reached the maximum limit of 3 active campaigns. Please wait for one to conclude before creating another.",
};

interface DraftFields {
  title: string;
  short_description: string;
  description: string;
  category: string;
  goal_xlm: string;
  deadline: string;
  official_link: string;
}

const DEFAULT_DRAFT: DraftFields = {
  title: "",
  short_description: "",
  description: "",
  category: "technology",
  goal_xlm: "",
  deadline: "",
  official_link: "",
};

function loadDraft(): DraftFields {
  if (typeof window === "undefined") return DEFAULT_DRAFT;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return DEFAULT_DRAFT;
    return { ...DEFAULT_DRAFT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_DRAFT;
  }
}

function saveDraft(fields: DraftFields) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(fields));
  } catch {
    // quota exceeded — silently ignore
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

interface Props {
  action: (formData: FormData) => Promise<void>;
  error: string;
}

export default function CreateCampaignForm({ action, error }: Props) {
  // ── Wallet detection ─────────────────────────────────────────────────────
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletChecked, setWalletChecked] = useState(false);

  let errorMessage: string | null =
    ERROR_MESSAGES[error] ??
    (error ? decodeURIComponent(error) : null);

  // If the error was "no_wallet" but they have since connected one, hide the error
  // so they aren't confused by a stale URL query parameter.
  if (error === "no_wallet" && walletAddress) {
    errorMessage = null;
  }

  // ── Form state (controlled + persisted) ──────────────────────────────────
  const [fields, setFields] = useState<DraftFields>(DEFAULT_DRAFT);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage only on mount (avoid hydration mismatch/lint issues)
  useEffect(() => {
    // Wrap in setTimeout to avoid sync setState lint warning
    setTimeout(() => {
      const draft = loadDraft();
      setFields(draft);
      setHydrated(true);
    }, 0);
  }, []);
  // Ref so the submit wrapper can access the latest wallet address
  const walletRef = useRef<string | null>(null);
  useEffect(() => {
    walletRef.current = walletAddress;
  }, [walletAddress]);

  // Persist to localStorage whenever fields change
  useEffect(() => {
    if (hydrated) saveDraft(fields);
  }, [fields, hydrated]);

  // ── Detect Freighter wallet ──────────────────────────────────────────────
  // Strategy: poll Freighter directly (up to 20 attempts, 200 ms apart).
  // This avoids the race condition where the WalletCard event bridge isn't
  // ready yet when the form mounts.
  const detectWallet = useCallback(async () => {
    let addr: string | null = null;
    const MAX_ATTEMPTS = 20;
    const DELAY_MS = 200;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const { isConnected } = await import("@stellar/freighter-api");
        const connected = await isConnected();
        if (!connected) break; // Extension not installed — no point retrying

        const allowed = await isAllowed();
        if (allowed) {
          const { address, error: err } = await getAddress();
          if (!err && address) {
            addr = address;
            break;
          }
        } else {
          // Not yet allowed — wait a tick and retry (Freighter may still be initialising)
          await new Promise((r) => setTimeout(r, DELAY_MS));
          continue;
        }
      } catch {
        // Freighter threw — wait and retry
        await new Promise((r) => setTimeout(r, DELAY_MS));
        continue;
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    setWalletAddress(addr);
    setWalletChecked(true);
  }, []);


  useEffect(() => {
    // Call detectWallet asynchronously to avoid sync setState in effect
    void (async () => {
      await detectWallet();
    })();

    // Also update if WalletCard fires a live status change (e.g., user connects
    // the wallet *after* the form has already rendered).
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ status: string; address: string | null }>).detail;
      const addr = detail?.status === "connected" ? detail.address : null;
      setWalletAddress(addr);
      setWalletChecked(true); // ensure banner is visible
    };
    window.addEventListener("wallet-connection-changed", onChange);
    return () => window.removeEventListener("wallet-connection-changed", onChange);
  }, [detectWallet]);

  // ── Field helpers ─────────────────────────────────────────────────────────
  function field(name: keyof DraftFields) {
    return {
      value: fields[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setFields((prev) => ({ ...prev, [name]: e.target.value })),
    };
  }

  // ── Wrap action to inject wallet address into FormData ────────────────────
  async function handleAction(formData: FormData) {
    const addr = walletRef.current;
    if (addr) {
      formData.set("freighter_wallet", addr);
    }
    await action(formData);
    // Clear cache on successful submission (server will redirect on success)
    clearDraft();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (!hydrated) {
    // Avoid hydration mismatch — render nothing until client-side state is ready
    return null;
  }

  return (
    <section className="max-w-3xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
      {/* Wallet status banner */}
      {walletChecked && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
            walletAddress
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-amber-300 bg-amber-50 text-amber-700"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${walletAddress ? "bg-emerald-500" : "bg-amber-500"}`} />
          {walletAddress ? (
            <>
              <span className="font-semibold">Wallet connected:&nbsp;</span>
              <span className="font-mono text-xs break-all">{walletAddress}</span>
            </>
          ) : (
            <>
              <span className="font-semibold">No wallet connected.&nbsp;</span>
              Use the&nbsp;
              <button
                type="button"
                className="underline font-semibold"
                onClick={() => window.dispatchEvent(new Event("request-wallet-connect"))}
              >
                wallet widget ↗
              </button>
              &nbsp;in the top-right to connect Freighter.
            </>
          )}
        </div>
      )}

      <form action={handleAction} className="space-y-4">
        {/* Hidden wallet field — injected by handleAction, but keep a fallback input */}
        <input type="hidden" name="freighter_wallet" value={walletAddress ?? ""} />

        <label className="block space-y-2">
          <span className="text-sm font-medium">Campaign Title</span>
          <input
            name="title"
            required
            type="text"
            placeholder="My awesome campaign"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            {...field("title")}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Short Description</span>
          <input
            name="short_description"
            required
            type="text"
            placeholder="One-line summary shown in campaign listings"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            {...field("short_description")}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Full Description</span>
          <textarea
            name="description"
            required
            rows={5}
            placeholder="Detailed explanation of your campaign goals and impact"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            {...field("description")}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Category</span>
            <select
              name="category"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              value={fields.category}
              onChange={(e) => setFields((prev) => ({ ...prev, category: e.target.value }))}
            >
              <option value="technology">Technology</option>
              <option value="art">Art</option>
              <option value="education">Education</option>
              <option value="environment">Environment</option>
              <option value="health">Health</option>
              <option value="community">Community</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Goal (XLM)</span>
            <input
              name="goal_xlm"
              required
              min={1}
              step="0.01"
              type="number"
              placeholder="e.g. 5000"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              {...field("goal_xlm")}
            />
            <p className="text-[10px] text-[var(--muted)] leading-tight">
              A small platform maintenance fee will be deducted from your final withdrawn amount to the admin wallet.
            </p>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Deadline</span>
            <input
              name="deadline"
              required
              type="date"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              {...field("deadline")}
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Official Campaign Link (optional)</span>
          <input
            name="official_link"
            type="url"
            placeholder="https://example.org/campaign"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            {...field("official_link")}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Campaign Proof File (optional)</span>
          <input
            name="proof_file"
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
          />
          <p className="text-xs text-[var(--muted)]">Accepted: PNG, JPG, WEBP, PDF. Maximum size: 6 MB.</p>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Campaign Images (required, 4 to 5 images)</span>
          <input
            name="campaign_images"
            required
            multiple
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
          />
          <p className="text-xs text-[var(--muted)]">
            Each image can be up to 4 MB. Stored in Supabase Storage.
          </p>
        </label>

        {errorMessage ? (
          <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Launch Campaign
          </button>

          <button
            type="button"
            onClick={() => {
              if (confirm("Clear all saved draft data?")) {
                clearDraft();
                setFields(DEFAULT_DRAFT);
              }
            }}
            className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:border-red-300 hover:text-red-500"
          >
            Clear Draft
          </button>
        </div>
      </form>
    </section>
  );
}
