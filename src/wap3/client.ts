/**
 * WAP3Client - High-level client for WAP3 escrow operations
 */

import { ethers } from "ethers";
import { AgentEscrow, AgentEscrow__factory } from "../../typechain-types";
import { EscrowInfo } from "../protocol/types";

export class WAP3Client {
  private contract: AgentEscrow;
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(contractAddress: string, signer: ethers.Signer) {
    this.signer = signer;
    this.provider = signer.provider!;
    
    // Connect to contract using typechain factory
    this.contract = AgentEscrow__factory.connect(contractAddress, signer);
  }

  /**
   * Create an escrow with AP2 intent and X402 trigger context
   */
  async createEscrow(
    agentAddress: string,
    taskId: string,
    amount: bigint
  ): Promise<{ escrowId: bigint; txHash: string }> {
    const tx = await this.contract.createEscrow(agentAddress, taskId, { value: amount });
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error("Transaction receipt not found");
    }

    // Parse EscrowCreated event
    const event = receipt.logs.find(
      (log: any) => log.fragment?.name === "EscrowCreated"
    ) as any;
    
    const escrowId = event?.args?.escrowId ?? 0n;

    return {
      escrowId,
      txHash: receipt.hash,
    };
  }

  /**
   * Submit proof for an escrow
   */
  async submitProof(escrowId: bigint, proofHash: string): Promise<string> {
    const tx = await this.contract.submitProof(escrowId, proofHash);
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error("Transaction receipt not found");
    }

    return receipt.hash;
  }

  /**
   * Release payment for a completed escrow
   */
  async settle(escrowId: bigint): Promise<string> {
    const tx = await this.contract.releasePayment(escrowId);
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error("Transaction receipt not found");
    }

    return receipt.hash;
  }

  /**
   * Get escrow information
   */
  async getEscrow(escrowId: bigint): Promise<EscrowInfo> {
    const escrow = await this.contract.getEscrow(escrowId);
    
    let status: "pending" | "completed" | "settled" | "refunded";
    if (escrow.refunded) {
      status = "refunded";
    } else if (escrow.released) {
      status = "settled";
    } else if (escrow.completed) {
      status = "completed";
    } else {
      status = "pending";
    }

    return {
      escrowId,
      payer: escrow.payer,
      agent: escrow.agent,
      amount: ethers.formatEther(escrow.amount),
      status,
    };
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return this.contract.target as string;
  }
}

