/**
 * X402-style Payment Trigger Schema (Coinbase X402, 2025 Q2)
 * 
 * Chain-agnostic protocol layer for payment triggers.
 * Works with any blockchain (EVM, Sui, Solana, etc.)
 */

import crypto from 'crypto';

export interface X402Trigger {
  payment_id: string;
  x402_version: string;
  intent_id: string; // Reference to AP2 intent
  amount: string; // Payment amount in native token
  payment_token?: string; // Optional: 'SUI', 'ETH', 'SOL', etc.
  recipient: string; // Recipient address (chain-specific format)
  conditions: string[]; // Payment conditions
  metadata?: Record<string, any>;
}

/**
 * Create an X402-style payment trigger
 * Chain-agnostic implementation
 */
export function createX402Trigger(
  intentId: string,
  amount: string,
  recipient: string,
  conditions: string[] = [],
  paymentToken: string = 'SUI'
): X402Trigger {
  const paymentData = `${intentId}-${amount}-${recipient}-${Date.now()}`;
  const paymentId = '0x' + crypto.createHash('sha256').update(paymentData).digest('hex');

  return {
    payment_id: paymentId,
    x402_version: "2025-q2",
    intent_id: intentId,
    amount,
    payment_token: paymentToken,
    recipient,
    conditions,
    metadata: {
      created_at: new Date().toISOString(),
      protocol: 'X402',
    },
  };
}

/**
 * Hash an X402 trigger for on-chain storage
 * Uses standard SHA-256 for chain-agnostic hashing
 */
export function hashX402Trigger(trigger: X402Trigger): string {
  const serialized = JSON.stringify({
    payment_id: trigger.payment_id,
    x402_version: trigger.x402_version,
    intent_id: trigger.intent_id,
    amount: trigger.amount,
    payment_token: trigger.payment_token,
    recipient: trigger.recipient,
    conditions: trigger.conditions,
  });
  return '0x' + crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Format payment ID for display
 */
export function formatPaymentId(trigger: X402Trigger): string {
  return trigger.payment_id.slice(0, 20) + "...";
}

/**
 * Validate X402 trigger structure
 */
export function validateX402Trigger(trigger: X402Trigger): boolean {
  return !!(
    trigger.payment_id &&
    trigger.x402_version &&
    trigger.intent_id &&
    trigger.amount &&
    trigger.recipient &&
    Array.isArray(trigger.conditions)
  );
}

/**
 * Convert X402 trigger to on-chain metadata format
 * Compatible with any blockchain's metadata storage
 */
export function triggerToMetadata(trigger: X402Trigger): Record<string, string> {
  return {
    x402_payment_id: trigger.payment_id,
    x402_version: trigger.x402_version,
    x402_hash: hashX402Trigger(trigger),
    intent_id: trigger.intent_id,
    amount: trigger.amount,
    payment_token: trigger.payment_token || 'NATIVE',
    recipient: trigger.recipient,
    created_at: trigger.metadata?.created_at || new Date().toISOString(),
  };
}

/**
 * Link X402 trigger to AP2 intent
 * Returns combined metadata for on-chain storage
 */
export function linkTriggerToIntent(
  trigger: X402Trigger,
  intentId: string
): Record<string, string> {
  if (trigger.intent_id !== intentId) {
    throw new Error('Trigger intent_id does not match provided intent_id');
  }

  return {
    ...triggerToMetadata(trigger),
    ap2_intent_reference: intentId,
    protocol_layer: 'AP2+X402',
  };
}
