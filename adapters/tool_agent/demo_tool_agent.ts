/**
 * Tool-Agent Adapter for WAP3
 * 
 * This adapter demonstrates a framework-agnostic integration using simple tool calls.
 * It shows how any agent framework can integrate WAP3 by treating escrow operations
 * as callable tools.
 * 
 * This is the simplest possible integration pattern - no framework dependencies.
 */

import { ethers } from "hardhat";
import { createAP2Intent, formatIntentId } from "../../src/protocol/intent_ap2";
import { createX402Trigger, formatPaymentId } from "../../src/protocol/trigger_x402";
import { WAP3Client } from "../../src/wap3/client";
import {
  printAP2Intent,
  printX402Payment,
  printEscrowId,
  printCreateTx,
  printProofHash,
  printSettleTx,
  printStatus,
} from "../../src/wap3/printer";

/**
 * Tool: Create AP2 Intent
 */
function tool_createAP2Intent(taskDescription: string, maxPayment: string) {
  console.log("[Tool] createAP2Intent");
  const intent = createAP2Intent(taskDescription, maxPayment, ["proof-required"]);
  printAP2Intent(formatIntentId(intent));
  return intent;
}

/**
 * Tool: Create X402 Payment Trigger
 */
function tool_createX402Trigger(intentId: string, amount: string, recipient: string) {
  console.log("[Tool] createX402Trigger");
  const trigger = createX402Trigger(intentId, amount, recipient, ["proof-verified"]);
  printX402Payment(formatPaymentId(trigger));
  return trigger;
}

/**
 * Tool: Create Escrow
 */
async function tool_createEscrow(
  client: WAP3Client,
  agentAddress: string,
  intentHash: string,
  triggerHash: string,
  amount: bigint
) {
  console.log("[Tool] createEscrow");
  const taskId = ethers.keccak256(ethers.toUtf8Bytes(triggerHash + intentHash));
  const { escrowId, txHash } = await client.createEscrow(agentAddress, taskId, amount);
  printEscrowId(escrowId);
  printCreateTx(txHash);
  return { escrowId, txHash };
}

/**
 * Tool: Execute Work (simulated)
 */
async function tool_executeWork() {
  console.log("[Tool] executeWork");
  await new Promise(resolve => setTimeout(resolve, 1000));
  const result = { sentiment: "POSITIVE", confidence: "92.5%" };
  return result;
}

/**
 * Tool: Submit Proof
 */
async function tool_submitProof(
  client: WAP3Client,
  escrowId: bigint,
  workResult: any
) {
  console.log("[Tool] submitProof");
  const proofHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(workResult)));
  printProofHash(proofHash);
  const txHash = await client.submitProof(escrowId, proofHash);
  return { proofHash, txHash };
}

/**
 * Tool: Settle Payment
 */
async function tool_settle(client: WAP3Client, escrowId: bigint) {
  console.log("[Tool] settle");
  const txHash = await client.settle(escrowId);
  printSettleTx(txHash);
  printStatus("settled");
  return txHash;
}

/**
 * Main Tool-Agent Workflow
 * 
 * This demonstrates how an agent would call WAP3 tools in sequence.
 * In a real agent framework, these would be registered as available tools.
 */
async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║     Tool-Agent Adapter for WAP3 - Demo Workflow      ║");
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
  
  // Agent workflow: call tools in sequence
  console.log("Starting agent workflow...\n");
  
  // Step 1: Create AP2 Intent
  const intent = tool_createAP2Intent("sentiment-analysis-blockchain-text", "0.05");
  const intentHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(intent)));
  
  // Step 2: Create X402 Trigger
  const trigger = tool_createX402Trigger(intent.intent_id, "0.05", agent.address);
  const triggerHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(trigger)));
  
  // Step 3: Create Escrow
  const { escrowId } = await tool_createEscrow(
    client,
    agent.address,
    intentHash,
    triggerHash,
    ethers.parseEther("0.05")
  );
  
  // Step 4: Execute Work
  const workResult = await tool_executeWork();
  
  // Step 5: Submit Proof
  await tool_submitProof(client, escrowId, workResult);
  
  // Step 6: Settle
  await tool_settle(client, escrowId);
  
  console.log("\n✓ Tool-Agent workflow completed successfully!");
  console.log(`  Escrow ID: ${escrowId}`);
  console.log(`  Status: settled`);
  console.log("\nThis demonstrates framework-agnostic WAP3 integration.");
  console.log("Any agent framework can use WAP3 by calling these tools.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

