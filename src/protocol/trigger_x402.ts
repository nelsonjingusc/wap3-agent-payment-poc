/**
 * X402-style Payment Trigger Schema (Coinbase X402, 2025 Q2)
 * 
 * Represents a payment trigger that initiates escrow creation.
 * In production, this would integrate with Coinbase's X402 network.
 */

import { ethers } from "ethers";

export interface X402Trigger {
  payment_id: string;
  x402_version: string;
  intent_id: string; // Reference to AP2 intent
  amount: string; // in ETH
  recipient: string; // agent address
  conditions: string[]; // payment conditions
  metadata?: Record<string, any>;
}

/**
 * Create an X402-style payment trigger
 */
export function createX402Trigger(
  intentId: string,
  amount: string,
  recipient: string,
  conditions: string[] = []
): X402Trigger {
  const paymentId = ethers.keccak256(
    ethers.toUtf8Bytes(`${intentId}-${amount}-${recipient}-${Date.now()}`)
  );

  return {
    payment_id: paymentId,
    x402_version: "2025-q2",
    intent_id: intentId,
    amount,
    recipient,
    conditions,
    metadata: {
      created_at: new Date().toISOString(),
    },
  };
}

/**
 * Hash an X402 trigger for on-chain storage
 */
export function hashX402Trigger(trigger: X402Trigger): string {
  const serialized = JSON.stringify({
    payment_id: trigger.payment_id,
    x402_version: trigger.x402_version,
    intent_id: trigger.intent_id,
    amount: trigger.amount,
    recipient: trigger.recipient,
    conditions: trigger.conditions,
  });
  return ethers.keccak256(ethers.toUtf8Bytes(serialized));
}

/**
 * Format payment ID for MVP output
 */
export function formatPaymentId(trigger: X402Trigger): string {
  return trigger.payment_id.slice(0, 20) + "...";
}

