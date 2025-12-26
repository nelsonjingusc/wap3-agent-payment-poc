/**
 * Audit collector and event indexer
 * 
 * Collects on-chain events and off-chain metadata to generate audit JSON
 */

import { ethers } from "ethers";
import { AgentEscrow, AgentEscrow__factory } from "../../typechain-types";
import { ChainConfig } from "../protocol/types";
import { AP2Intent } from "../protocol/intent_ap2";
import { X402Trigger } from "../protocol/trigger_x402";

export interface AuditRecord {
  intent: {
    intent_id: string;
    ap2_version: string;
    hash: string;
  };
  trigger: {
    x402_version: string;
    payment_id: string;
    hash: string;
  };
  escrow: {
    escrow_id: number;
    payer: string;
    agent: string;
    amount: string;
    status: string;
  };
  proof: {
    proof_hash: string;
    uri: string;
  };
  tx: {
    create_tx: string;
    proof_tx: string | null;
    settle_tx: string | null;
  };
  chain: {
    name: string;
    chain_id: number;
  };
}

/**
 * Collect audit data for an escrow
 */
export async function collectAuditData(
  contractAddress: string,
  escrowId: bigint,
  provider: ethers.Provider,
  chainConfig: ChainConfig,
  intent: AP2Intent,
  trigger: X402Trigger
): Promise<AuditRecord> {
  const contract = AgentEscrow__factory.connect(contractAddress, provider);

  // Get escrow details
  const escrow = await contract.getEscrow(escrowId);
  
  let status: string;
  if (escrow.refunded) {
    status = "refunded";
  } else if (escrow.released) {
    status = "settled";
  } else if (escrow.completed) {
    status = "completed";
  } else {
    status = "pending";
  }

  // Query events for transaction hashes
  const createFilter = contract.filters.EscrowCreated(escrowId);
  const proofFilter = contract.filters.ProofSubmitted(escrowId);
  const settleFilter = contract.filters.PaymentReleased(escrowId);

  const [createEvents, proofEvents, settleEvents] = await Promise.all([
    contract.queryFilter(createFilter),
    contract.queryFilter(proofFilter),
    contract.queryFilter(settleFilter),
  ]);

  const createTx = createEvents[0]?.transactionHash || "";
  const proofTx = proofEvents[0]?.transactionHash || null;
  const settleTx = settleEvents[0]?.transactionHash || null;

  // Generate proof URI (placeholder for Walrus/IPFS)
  const proofUri = escrow.proofHash !== ethers.ZeroHash 
    ? `walrus://${escrow.proofHash.slice(2)}` 
    : "";

  return {
    intent: {
      intent_id: intent.intent_id,
      ap2_version: intent.ap2_version,
      hash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(intent))),
    },
    trigger: {
      x402_version: trigger.x402_version,
      payment_id: trigger.payment_id,
      hash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(trigger))),
    },
    escrow: {
      escrow_id: Number(escrowId),
      payer: escrow.payer,
      agent: escrow.agent,
      amount: ethers.formatEther(escrow.amount),
      status,
    },
    proof: {
      proof_hash: escrow.proofHash,
      uri: proofUri,
    },
    tx: {
      create_tx: createTx,
      proof_tx: proofTx,
      settle_tx: settleTx,
    },
    chain: {
      name: chainConfig.name,
      chain_id: chainConfig.chainId,
    },
  };
}

