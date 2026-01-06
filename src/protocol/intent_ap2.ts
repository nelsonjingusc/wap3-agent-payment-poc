/**
 * AP2-style Intent Schema (Google AP2, 2025 Q3)
 * 
 * Chain-agnostic protocol layer for agent task intents.
 * Works with any blockchain (EVM, Sui, Solana, etc.)
 */

import crypto from 'crypto';

export interface AP2Intent {
  intent_id: string;
  ap2_version: string;
  task_description: string;
  requirements: string[];
  max_payment: string; // Amount in native token
  payment_token?: string; // Optional: 'SUI', 'ETH', 'SOL', etc.
  deadline?: number; // Unix timestamp
  metadata?: Record<string, any>;
}

/**
 * Create an AP2-style intent object
 * Chain-agnostic implementation
 */
export function createAP2Intent(
  taskDescription: string,
  maxPayment: string,
  requirements: string[] = [],
  deadline?: number,
  paymentToken: string = 'SUI'
): AP2Intent {
  const intentData = `${taskDescription}-${Date.now()}-${Math.random()}`;
  const intentId = '0x' + crypto.createHash('sha256').update(intentData).digest('hex');

  return {
    intent_id: intentId,
    ap2_version: "2025-q3",
    task_description: taskDescription,
    requirements,
    max_payment: maxPayment,
    payment_token: paymentToken,
    deadline,
    metadata: {
      created_at: new Date().toISOString(),
      protocol: 'AP2',
    },
  };
}

/**
 * Hash an AP2 intent for on-chain storage
 * Uses standard SHA-256 for chain-agnostic hashing
 */
export function hashAP2Intent(intent: AP2Intent): string {
  const serialized = JSON.stringify({
    intent_id: intent.intent_id,
    ap2_version: intent.ap2_version,
    task_description: intent.task_description,
    requirements: intent.requirements,
    max_payment: intent.max_payment,
    payment_token: intent.payment_token,
    deadline: intent.deadline,
  });
  return '0x' + crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Format intent ID for display
 */
export function formatIntentId(intent: AP2Intent): string {
  return intent.intent_id.slice(0, 20) + "...";
}

/**
 * Validate AP2 intent structure
 */
export function validateAP2Intent(intent: AP2Intent): boolean {
  return !!(
    intent.intent_id &&
    intent.ap2_version &&
    intent.task_description &&
    Array.isArray(intent.requirements) &&
    intent.max_payment
  );
}

/**
 * Convert AP2 intent to on-chain metadata format
 * Compatible with any blockchain's metadata storage
 */
export function intentToMetadata(intent: AP2Intent): Record<string, string> {
  return {
    ap2_intent_id: intent.intent_id,
    ap2_version: intent.ap2_version,
    ap2_hash: hashAP2Intent(intent),
    task_description: intent.task_description,
    max_payment: intent.max_payment,
    payment_token: intent.payment_token || 'NATIVE',
    created_at: intent.metadata?.created_at || new Date().toISOString(),
  };
}
