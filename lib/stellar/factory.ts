/**
 * lib/stellar/factory.ts
 *
 * Server-side only. Requires STELLAR_FACTORY_SECRET_KEY (never sent to the browser).
 * Compatible with @stellar/stellar-sdk v13.x (rpc namespace, not SorobanRpc).
 */

import {
  Address,
  Contract,
  Keypair,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import { getRpcServer, getNetworkPassphrase, waitForSorobanTx } from "@/lib/stellar/soroban";

/**
 * Input for registering a campaign on-chain via the CrowdfundFactory contract.
 *
 * @field creatorWallet - The Stellar public key (G...) of the campaign creator.
 *   This is NOT the Supabase user.id UUID. It must be the wallet address stored
 *   in profiles.wallet_address.
 */
export interface CreateOnChainCampaignInput {
  /** Stellar G-address of the creator. Must match the signing keypair for auth. */
  creatorWallet: string;
  goalXlm: number;
  deadlineIso: string;
  title: string;
}

export interface OnChainCampaignResult {
  contractAddress: string;
  factoryTxHash: string;
  /** The u64 sequence ID returned by the factory contract (stringified). */
  campaignId: string;
  mode: "live";
}



async function invokeFactoryCreate(
  input: CreateOnChainCampaignInput,
): Promise<OnChainCampaignResult> {
  const factoryContractId = process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID;
  const factorySecret = process.env.STELLAR_FACTORY_SECRET_KEY;

  if (!factoryContractId || !factorySecret) {
    throw new Error(
      "Missing Soroban env vars. Required: " +
        "NEXT_PUBLIC_FACTORY_CONTRACT_ID, STELLAR_FACTORY_SECRET_KEY",
    );
  }

  if (!input.creatorWallet.startsWith("G") || input.creatorWallet.length !== 56) {
    throw new Error(
      `creatorWallet must be a valid Stellar public key (G... 56 chars), ` +
        `got: "${input.creatorWallet}"`,
    );
  }

  // Use shared helpers — Contract class-based pattern throughout
  const server = getRpcServer();
  const networkPassphrase = getNetworkPassphrase();
  const sourceKeypair = Keypair.fromSecret(factorySecret);
  const sourceAccount = await server.getAccount(sourceKeypair.publicKey());

  // Contract class-based call — standard Soroban integration pattern
  const contract = new Contract(factoryContractId);

  // Convert units: goal → stroops (i128), deadline → unix seconds (u64)
  const goalStroops = BigInt(Math.round(input.goalXlm * 10_000_000));
  const deadlineTs = Math.floor(new Date(input.deadlineIso).getTime() / 1000);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: "10000",
    networkPassphrase,
  })
    .addOperation(
      contract.call(
        "create_campaign",
        new Address(input.creatorWallet).toScVal(),
        new Address(
          process.env.NEXT_PUBLIC_STELLAR_TOKEN_ADDRESS ||
            "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
        ).toScVal(),
        nativeToScVal(goalStroops, { type: "i128" }),
        nativeToScVal(deadlineTs, { type: "u64" }),
      ),
    )
    .setTimeout(120)
    .build();

  // Simulate first to get resource footprint
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    const detail =
      typeof sim.error === "string" ? sim.error : JSON.stringify(sim.error ?? "unknown");
    throw new Error(`Soroban simulation failed: ${detail}`);
  }

  let simulatedAddress = "";
  if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
    simulatedAddress = String(scValToNative(sim.result.retval));
  }

  // Assemble (adds resource fees from simulation) then sign
  const prepared = rpc.assembleTransaction(tx, sim).build();
  prepared.sign(sourceKeypair);

  // Submit the signed transaction
  const send = await server.sendTransaction(prepared);

  // In SDK v13 the status is a plain string: "PENDING" | "DUPLICATE" | "TRY_AGAIN_LATER" | "ERROR"
  if (send.status !== "PENDING" && send.status !== "DUPLICATE") {
    throw new Error(
      `Soroban sendTransaction failed with status "${send.status}": ` +
        JSON.stringify((send as unknown as Record<string, unknown>).errorResult ?? send),
    );
  }

  const txHash = send.hash;
  // Use SDK-based polling — no raw fetch
  await waitForSorobanTx(server, txHash);

  return {
    contractAddress: simulatedAddress,
    factoryTxHash: txHash,
    campaignId: simulatedAddress,
    mode: "live",
  };
}

/**
 * Invoke the CrowdfundFactory contract's create_campaign entry-point and
 * return the campaign ID + transaction hash.
 *
 * Must be called server-side only. Requires STELLAR_FACTORY_SECRET_KEY.
 */
export async function createCampaignOnChain(
  input: CreateOnChainCampaignInput,
): Promise<OnChainCampaignResult> {
  return invokeFactoryCreate(input);
}
