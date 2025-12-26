/**
 * Consistent MVP output formatting
 * 
 * All MVP-related output uses these prefixes:
 * - MVP: for key events and milestones
 * - MVP_INFO: for machine-readable configuration
 */

export function printMVPInfo(contract: string, agent: string, rpc: string): void {
  console.log(`MVP_INFO contract=${contract} agent=${agent} rpc=${rpc}`);
}

export function printMVP(key: string, value: string): void {
  console.log(`MVP:${key}=${value}`);
}

export function printAP2Intent(intentId: string): void {
  printMVP("AP2_INTENT_ID", intentId);
}

export function printX402Payment(paymentId: string): void {
  printMVP("X402_PAYMENT_ID", paymentId);
}

export function printEscrowId(escrowId: bigint | number): void {
  printMVP("ESCROW_ID", escrowId.toString());
}

export function printCreateTx(txHash: string): void {
  printMVP("CREATE_TX", txHash);
}

export function printEscrowPicked(escrowId: bigint | number): void {
  printMVP("ESCROW_PICKED", escrowId.toString());
}

export function printProofHash(proofHash: string): void {
  printMVP("PROOF_HASH", proofHash);
}

export function printProofTx(txHash: string): void {
  printMVP("PROOF_TX", txHash);
}

export function printSettleTx(txHash: string): void {
  printMVP("SETTLE_TX", txHash);
}

export function printStatus(status: string): void {
  printMVP("STATUS", status);
}

export function printAuditJson(filePath: string): void {
  printMVP("AUDIT_JSON", filePath);
}

export function printSessionDir(sessionDir: string): void {
  printMVP("SESSION_DIR", sessionDir);
}

