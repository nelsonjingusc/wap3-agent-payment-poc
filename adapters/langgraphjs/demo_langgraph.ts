/**
 * LangGraph Adapter for WAP3
 * 
 * This adapter demonstrates how to integrate WAP3 into a LangGraph workflow.
 * It orchestrates the complete agent transaction lifecycle:
 * 1. Build AP2 intent
 * 2. Build X402 trigger
 * 3. Create escrow
 * 4. Simulate work + submit proof
 * 5. Settle
 * 6. Audit
 * 
 * Note: This is a deterministic demo without actual LLM calls.
 * In production, you would use @langchain/langgraph and integrate with real LLMs.
 */

import { ethers } from "hardhat";
import type { Signer, Provider } from "ethers";
import { createAP2Intent, hashAP2Intent, formatIntentId } from "../../src/protocol/intent_ap2";
import { createX402Trigger, hashX402Trigger, formatPaymentId } from "../../src/protocol/trigger_x402";
import { WAP3Client } from "../../src/wap3/client";
import { collectAuditData } from "../../src/wap3/audit";
import { getChainConfig } from "../../src/utils/env";
import {
  printAP2Intent,
  printX402Payment,
  printEscrowId,
  printCreateTx,
  printProofHash,
  printProofTx,
  printSettleTx,
  printStatus,
  printAuditJson,
} from "../../src/wap3/printer";
import * as fs from "fs";
import * as path from "path";

/**
 * LangGraph-style state for the workflow
 */
interface WorkflowState {
  intent?: ReturnType<typeof createAP2Intent>;
  trigger?: ReturnType<typeof createX402Trigger>;
  escrowId?: bigint;
  proofHash?: string;
  settleTx?: string;
  auditRecord?: any;
}

/**
 * Step 1: Build AP2 Intent
 */
async function buildAP2Intent(state: WorkflowState): Promise<WorkflowState> {
  console.log("[LangGraph] Step 1: Building AP2 intent...");
  
  const intent = createAP2Intent(
    "sentiment-analysis-blockchain-text",
    "0.05",
    ["proof-required", "on-chain-settlement"]
  );
  
  printAP2Intent(formatIntentId(intent));
  
  return { ...state, intent };
}

/**
 * Step 2: Build X402 Trigger
 */
async function buildX402Trigger(state: WorkflowState, agentAddress: string): Promise<WorkflowState> {
  console.log("[LangGraph] Step 2: Building X402 payment trigger...");
  
  if (!state.intent) {
    throw new Error("Intent must be created first");
  }
  
  const trigger = createX402Trigger(
    state.intent.intent_id,
    "0.05",
    agentAddress,
    ["proof-verified"]
  );
  
  printX402Payment(formatPaymentId(trigger));
  
  return { ...state, trigger };
}

/**
 * Step 3: Create Escrow
 */
async function createEscrowStep(
  state: WorkflowState,
  client: WAP3Client,
  agentAddress: string
): Promise<WorkflowState> {
  console.log("[LangGraph] Step 3: Creating escrow...");
  
  if (!state.intent || !state.trigger) {
    throw new Error("Intent and trigger must be created first");
  }
  
  const taskId = ethers.keccak256(
    ethers.toUtf8Bytes(hashX402Trigger(state.trigger) + hashAP2Intent(state.intent))
  );
  
  const { escrowId, txHash } = await client.createEscrow(
    agentAddress,
    taskId,
    ethers.parseEther("0.05")
  );
  
  printEscrowId(escrowId);
  printCreateTx(txHash);
  
  return { ...state, escrowId };
}

/**
 * Step 4: Simulate Work + Submit Proof
 */
async function simulateWorkAndSubmitProof(
  state: WorkflowState,
  client: WAP3Client,
  agentSigner: Signer
): Promise<WorkflowState> {
  console.log("[LangGraph] Step 4: Simulating work and submitting proof...");
  
  if (!state.escrowId) {
    throw new Error("Escrow must be created first");
  }
  
  // Simulate AI work
  await new Promise(resolve => setTimeout(resolve, 1000));
  const result = JSON.stringify({
    task: "sentiment-analysis-blockchain-text",
    sentiment: "POSITIVE",
    confidence: "92.5%",
    timestamp: new Date().toISOString(),
  });
  
  // Simulate IPFS upload
  const ipfsHash = `Qm${ethers.keccak256(ethers.toUtf8Bytes(result + Date.now())).slice(2, 48)}`;
  const proofHash = ethers.keccak256(ethers.toUtf8Bytes(ipfsHash));
  
  printProofHash(proofHash);
  
  // Submit proof
  const proofTx = await client.submitProof(state.escrowId, proofHash);
  printProofTx(proofTx);
  
  return { ...state, proofHash };
}

/**
 * Step 5: Settle
 */
async function settleStep(state: WorkflowState, client: WAP3Client): Promise<WorkflowState> {
  console.log("[LangGraph] Step 5: Settling payment...");
  
  if (!state.escrowId) {
    throw new Error("Escrow must be created first");
  }
  
  const settleTx = await client.settle(state.escrowId);
  printSettleTx(settleTx);
  printStatus("settled");
  
  return { ...state, settleTx };
}

/**
 * Step 6: Audit
 */
async function auditStep(
  state: WorkflowState,
  contractAddress: string,
  provider: Provider
): Promise<WorkflowState> {
  console.log("[LangGraph] Step 6: Generating audit record...");
  
  if (!state.intent || !state.trigger || !state.escrowId) {
    throw new Error("Intent, trigger, and escrow must exist");
  }
  
  const chainConfig = getChainConfig("hardhat-local");
  const auditRecord = await collectAuditData(
    contractAddress,
    state.escrowId,
    provider,
    chainConfig,
    state.intent,
    state.trigger
  );
  
  // Save audit JSON
  const outDir = path.join(__dirname, "../../demo/out");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  const outputPath = path.join(outDir, `audit_${state.escrowId}_langgraph.json`);
  fs.writeFileSync(outputPath, JSON.stringify(auditRecord, null, 2));
  
  printAuditJson(outputPath);
  
  return { ...state, auditRecord };
}

/**
 * Main LangGraph workflow (deterministic, no LLM)
 */
async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║     LangGraph Adapter for WAP3 - Demo Workflow        ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log();
  
  const [deployer, payer, agent] = await ethers.getSigners();
  
  // Deploy contract
  console.log("Deploying AgentEscrow contract...");
  const AgentEscrow = await ethers.getContractFactory("AgentEscrow");
  const escrow = await AgentEscrow.deploy();
  await escrow.waitForDeployment();
  const contractAddress = await escrow.getAddress();
  console.log(`Contract deployed: ${contractAddress}\n`);
  
  // Create WAP3 client
  const client = new WAP3Client(contractAddress, payer);
  
  // Initialize workflow state
  let state: WorkflowState = {};
  
  // Execute workflow steps
  state = await buildAP2Intent(state);
  state = await buildX402Trigger(state, agent.address);
  state = await createEscrowStep(state, client, agent.address);
  state = await simulateWorkAndSubmitProof(state, client, agent);
  state = await settleStep(state, client);
  state = await auditStep(state, contractAddress, ethers.provider);
  
  console.log("\n✓ LangGraph workflow completed successfully!");
  console.log(`  Escrow ID: ${state.escrowId}`);
  console.log(`  Status: settled`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

