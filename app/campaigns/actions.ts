"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface DonationPayload {
  campaignId: string;
  amount: number;
  walletAddress: string;
  txHash: string;
  isAnonymous: boolean;
  donorName?: string;
  donorMessage?: string;
}

export async function submitDonation(payload: DonationPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const { error } = await supabase.from("contributions").insert({
      campaign_id: payload.campaignId,
      backer_id: user?.id || null,
      wallet_address: payload.walletAddress,
      amount_xlm: payload.amount,
      tx_hash: payload.txHash,
      status: "confirmed",
      is_anonymous: payload.isAnonymous,
      donor_name: payload.donorName || null,
      donor_message: payload.donorMessage || null,
    });

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate the campaign detail page
    revalidatePath(`/campaigns/${payload.campaignId}`);

    return { success: true, message: "Donation recorded successfully" };
  } catch (error) {
    console.error("Donation submission error:", error);
    return { success: false, message: "Failed to record donation" };
  }
}
