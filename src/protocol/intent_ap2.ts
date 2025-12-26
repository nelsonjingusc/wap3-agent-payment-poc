/**
 * AP2-style Intent Schema (Google AP2, 2025 Q3)
 * 
 * Represents a user's intent/negotiation for agent task execution.
 * In production, this would integrate with Google's AP2 network.
 */

import { ethers } from "ethers";

export interface AP2Intent {
  intent_id: string;
  ap2_version: string;
  task_description: string;
  requirements: string[];
  max_payment: string; // in ETH
  deadline?: number; // Unix timestamp
  metadata?: Record<string, any>;
}

/**
 * Create an AP2-style intent object
 */
export function createAP2Intent(
  taskDescription: string,
  maxPayment: string,
  requirements: string[] = [],
  deadline?: number
): AP2Intent {
  const intentId = ethers.keccak256(
    ethers.toUtf8Bytes(`${taskDescription}-${Date.now()}-${Math.random()}`)
  );

  return {
    intent_id: intentId,
    ap2_version: "2025-q3",
    task_description: taskDescription,
    requirements,
    max_payment: maxPayment,
    deadline,
    metadata: {
      created_at: new Date().toISOString(),
    },
  };
}

/**
 * Hash an AP2 intent for on-chain storage
 */
export function hashAP2Intent(intent: AP2Intent): string {
  const serialized = JSON.stringify({
    intent_id: intent.intent_id,
    ap2_version: intent.ap2_version,
    task_description: intent.task_description,
    requirements: intent.requirements,
    max_payment: intent.max_payment,
    deadline: intent.deadline,
  });
  return ethers.keccak256(ethers.toUtf8Bytes(serialized));
}

/**
 * Format intent ID for MVP output
 */
export function formatIntentId(intent: AP2Intent): string {
  return intent.intent_id.slice(0, 20) + "...";
}

