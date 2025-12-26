/**
 * Buyer Agent using LangGraph
 * 
 * This demonstrates a Buyer Agent that uses LangGraph to orchestrate:
 * 1. Task planning (deciding what task to create)
 * 2. Creating AP2 intent
 * 3. Creating X402 trigger
 * 4. Creating escrow
 * 5. Monitoring and settling payment
 * 
 * This is the "Buyer Agent" that needs service from the "Service Agent"
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { createAP2Intent, hashAP2Intent, formatIntentId } from "../src/protocol/intent_ap2";
import { createX402Trigger, hashX402Trigger, formatPaymentId } from "../src/protocol/trigger_x402";
import { WAP3Client } from "../src/wap3/client";
import {
  printAP2Intent,
  printX402Payment,
  printEscrowId,
  printCreateTx,
  printSettleTx,
  printStatus,
  printSessionDir,
  printMVPInfo,
} from "../src/wap3/printer";

/**
 * LangGraph-style state for Buyer Agent workflow
 */
interface BuyerAgentState {
  taskDescription?: string;
  intent?: ReturnType<typeof createAP2Intent>;
  trigger?: ReturnType<typeof createX402Trigger>;
  escrowId?: bigint;
  createTx?: string;
  settleTx?: string;
  sessionDir?: string;
}

/**
 * Step 1: Plan Task (Buyer Agent decides what task to create)
 * In production, this would use LLM to understand user needs
 */
async function planTask(state: BuyerAgentState): Promise<BuyerAgentState> {
  console.log("[Buyer Agent] 🤔 Planning task...");
  
  // In production, this would be LLM-driven:
  // "I need to analyze sentiment of blockchain-related text"
  const taskDescription = "sentiment-analysis-blockchain-text";
  
  console.log(`[Buyer Agent] ✓ Task planned: ${taskDescription}`);
  return { ...state, taskDescription };
}

/**
 * Step 2: Create AP2 Intent (Buyer Agent creates intent)
 */
async function createIntent(state: BuyerAgentState, amount: string): Promise<BuyerAgentState> {
  console.log("[Buyer Agent] 📝 Creating AP2 intent...");
  
  if (!state.taskDescription) {
    throw new Error("Task must be planned first");
  }
  
  const intent = createAP2Intent(
    state.taskDescription,
    amount,
    ["proof-required", "on-chain-settlement"]
  );
  
  printAP2Intent(formatIntentId(intent));
  console.log(`[Buyer Agent] ✓ AP2 Intent created: ${formatIntentId(intent)}`);
  
  return { ...state, intent };
}

/**
 * Step 3: Create X402 Trigger (Buyer Agent creates payment trigger)
 */
async function createTrigger(
  state: BuyerAgentState,
  agentAddress: string,
  amount: string
): Promise<BuyerAgentState> {
  console.log("[Buyer Agent] 💳 Creating X402 payment trigger...");
  
  if (!state.intent) {
    throw new Error("Intent must be created first");
  }
  
  const trigger = createX402Trigger(
    state.intent.intent_id,
    amount,
    agentAddress,
    ["proof-verified"]
  );
  
  printX402Payment(formatPaymentId(trigger));
  console.log(`[Buyer Agent] ✓ X402 Trigger created: ${formatPaymentId(trigger)}`);
  
  return { ...state, trigger };
}

/**
 * Step 4: Create Escrow (Buyer Agent creates and funds escrow)
 */
async function createEscrow(
  state: BuyerAgentState,
  client: WAP3Client,
  agentAddress: string,
  amount: bigint
): Promise<BuyerAgentState> {
  console.log("[Buyer Agent] 🔒 Creating escrow...");
  
  if (!state.intent || !state.trigger) {
    throw new Error("Intent and trigger must be created first");
  }
  
  // Save intent/trigger to session directory for audit
  const sessionDir = path.join(__dirname, "out", `session_${Date.now()}`);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(sessionDir, "intent.json"),
    JSON.stringify(state.intent, null, 2)
  );
  
  fs.writeFileSync(
    path.join(sessionDir, "trigger.json"),
    JSON.stringify(state.trigger, null, 2)
  );
  
  printSessionDir(sessionDir);
  
  const taskId = ethers.keccak256(
    ethers.toUtf8Bytes(hashX402Trigger(state.trigger) + hashAP2Intent(state.intent))
  );
  
  const { escrowId, txHash } = await client.createEscrow(agentAddress, taskId, amount);
  
  printEscrowId(escrowId);
  printCreateTx(txHash);
  console.log(`[Buyer Agent] ✓ Escrow created (ID: ${escrowId})`);
  
  return { ...state, escrowId, createTx: txHash, sessionDir };
}

/**
 * Step 5: Monitor and Settle (Buyer Agent monitors escrow and settles when proof is submitted)
 */
async function monitorAndSettle(
  state: BuyerAgentState,
  client: WAP3Client,
  contractAddress: string
): Promise<BuyerAgentState> {
  console.log("[Buyer Agent] 👀 Monitoring escrow for proof submission...");
  
  if (!state.escrowId) {
    throw new Error("Escrow must be created first");
  }
  
  // Wait for agent to submit proof
  const escrow = await ethers.getContractAt("AgentEscrow", contractAddress);
  let proofSubmitted = false;
  let attempts = 0;
  const maxAttempts = 60; // 60 seconds max wait
  
  while (!proofSubmitted && attempts < maxAttempts) {
    const escrowData = await escrow.getEscrow(state.escrowId);
    proofSubmitted = escrowData.completed;
    
    if (!proofSubmitted) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      if (attempts % 5 === 0) {
        console.log(`[Buyer Agent] ⏳ Still waiting for proof... (${attempts}s)`);
      }
    }
  }
  
  if (!proofSubmitted) {
    throw new Error("Proof not submitted within timeout");
  }
  
  console.log("[Buyer Agent] ✓ Proof detected! Settling payment...");
  
  // Settle payment
  const settleTx = await client.settle(state.escrowId);
  printSettleTx(settleTx);
  printStatus("settled");
  console.log(`[Buyer Agent] ✓ Payment settled (TX: ${settleTx})`);
  
  return { ...state, settleTx };
}

/**
 * Main Buyer Agent workflow using LangGraph-style orchestration
 */
async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║     Buyer Agent (LangGraph) - Task Creation          ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log();
  
  // Read runtime config (created by agent-service)
  const runtimeFile = path.join(__dirname, "out", "mvp_runtime.json");
  if (!fs.existsSync(runtimeFile)) {
    throw new Error("Runtime file not found. Please start agent-service first.");
  }
  
  const runtime = JSON.parse(fs.readFileSync(runtimeFile, "utf-8"));
  const contractAddress = runtime.contract;
  const agentAddress = runtime.agent;
  const rpcUrl = runtime.rpc;
  
  printMVPInfo(contractAddress, agentAddress, rpcUrl);
  console.log();
  
  const [deployer, payer, agent] = await ethers.getSigners();
  const client = new WAP3Client(contractAddress, payer);
  const amount = ethers.parseEther("0.05");
  
  // Initialize workflow state
  let state: BuyerAgentState = {};
  
  // Execute LangGraph-style workflow
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Buyer Agent Workflow (LangGraph orchestration):");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log();
  
  state = await planTask(state);
  state = await createIntent(state, "0.05");
  state = await createTrigger(state, agentAddress, "0.05");
  state = await createEscrow(state, client, agentAddress, amount);
  
  // MVP outputs (ESCROW_ID, CREATE_TX, SESSION_DIR) are already printed by createEscrow function
  
  console.log();
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✓ Buyer Agent workflow completed (escrow created)!");
  console.log(`  Escrow ID: ${state.escrowId}`);
  console.log(`  Session: ${state.sessionDir}`);
  console.log("  Waiting for Service Agent to submit proof...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  // Exit immediately - let the script handle monitoring and settling
  // This allows the service agent time to process the task
}

main().catch((error) => {
  console.error("[Buyer Agent] ❌ Error:", error);
  process.exitCode = 1;
});

