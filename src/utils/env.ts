/**
 * Environment and chain configuration utilities
 */

import { ChainConfig } from "../protocol/types";

export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  "hardhat-local": {
    name: "hardhat-local",
    chainId: 31337,
    rpcUrl: "http://127.0.0.1:8545",
  },
  sepolia: {
    name: "sepolia",
    chainId: 11155111,
    rpcUrl: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
  },
};

export function getChainConfig(chainName: string = "hardhat-local"): ChainConfig {
  const config = CHAIN_CONFIGS[chainName];
  if (!config) {
    throw new Error(`Unknown chain: ${chainName}`);
  }
  return config;
}

export function parseAddress(address: string): string {
  if (!address.startsWith("0x") || address.length !== 42) {
    throw new Error(`Invalid address format: ${address}`);
  }
  return address.toLowerCase();
}

export function parseAmount(amount: string): string {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  return num.toString();
}

