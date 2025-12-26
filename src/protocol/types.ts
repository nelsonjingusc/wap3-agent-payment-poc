/**
 * Shared types for WAP3 protocol
 */

export interface ChainConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
}

export interface EscrowInfo {
  escrowId: bigint;
  payer: string;
  agent: string;
  amount: string;
  status: "pending" | "completed" | "settled" | "refunded";
}

