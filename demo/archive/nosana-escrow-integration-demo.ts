/**
 * Demo: Nosana Execution Layer + Escrow Integration
 * 
 * This demo shows how to:
 * 1. Create an escrow for a task
 * 2. Submit the task to Nosana execution layer
 * 3. Wait for completion
 * 4. Generate proof hash from execution result
 * 5. Submit proof to escrow
 * 6. Trigger settlement
 */

import { ethers } from "hardhat";
import { getExecutionLayer } from "../execution";
import { WAP3Client } from "../src/wap3/client";
import { createAP2Intent } from "../src/protocol/intent_ap2";
import { createX402Trigger } from "../src/protocol/trigger_x402";

async function main() {
  console.log("=".repeat(60));
  console.log("Nosana Execution Layer + Escrow Integration Demo");
  console.log("=".repeat(60));
  console.log();

  // Setup
  const [payer, agent] = await ethers.getSigners();
  
  async function getOrDeployEscrowAddress(): Promise<string> {
    if (process.env.ESCROW_ADDRESS) return process.env.ESCROW_ADDRESS;

    const Escrow = await ethers.getContractFactory("AgentEscrow");
    const escrow = await Escrow.deploy();
    await escrow.waitForDeployment();
    return await escrow.getAddress();
  }

  const escrowAddress = await getOrDeployEscrowAddress();
  const wap3Client = new WAP3Client(escrowAddress, payer);
  const executionLayer = getExecutionLayer("nosana");

  // Step 1: Create AP2 Intent and X402 Trigger
  const taskDescription = "Analyze market similarity for event: Product launch announcement";
  const intent = createAP2Intent(
    taskDescription,
    ethers.formatEther(ethers.parseEther("0.1")),
    ["market_similarity"]
  );

  const trigger = createX402Trigger(
    intent.intent_id,
    ethers.formatEther(ethers.parseEther("0.1")),
    agent.address,
    []
  );

  console.log("📋 Task Intent:", JSON.stringify(intent, null, 2));
  console.log("💰 Payment Trigger:", JSON.stringify(trigger, null, 2));
  console.log();

  // Step 2: Create Escrow
  const taskId = ethers.id(JSON.stringify(intent));
  console.log("🔐 Creating escrow...");
  const { escrowId, txHash } = await wap3Client.createEscrow(
    agent.address,
    taskId,
    ethers.parseEther(trigger.amount)
  );
  console.log(`✓ Escrow created: ID=${escrowId}, TX=${txHash}`);
  console.log();

  // Step 3: Submit task to execution layer
  console.log("🚀 Submitting task to Nosana execution layer...");
  const receipt = await executionLayer.submit({
    taskType: "market_similarity",
    inputs: {
      eventText: "Product launch announcement",
      marketUniverse: ["AAPL", "MSFT", "GOOGL"]
    }
  });
  console.log(`✓ Execution submitted: ID=${receipt.executionId}, Provider Job ID=${receipt.providerJobId}`);
  console.log();

  // Step 4: Wait for completion
  console.log("⏳ Waiting for execution to complete...");
  const result = await executionLayer.waitForCompletion(receipt.executionId);
  
  if (result.status !== "SUCCEEDED") {
    console.error("❌ Execution failed:", result.logs);
    process.exit(1);
  }

  console.log(`✓ Execution completed successfully`);
  console.log(`  Output:`, JSON.stringify(result.output, null, 2));
  console.log();

  // Step 5: Generate proof hash from execution result
  const proofData = {
    executionId: receipt.executionId,
    providerJobId: result.providerJobId,
    output: result.output,
    completedAt: new Date().toISOString()
  };
  const proofHash = ethers.id(JSON.stringify(proofData));
  console.log("🔐 Generated proof hash:", proofHash);
  console.log();

  // Step 6: Submit proof to escrow (as agent)
  console.log("📝 Submitting proof to escrow...");
  const agentClient = new WAP3Client(escrowAddress, agent);
  const proofTxHash = await agentClient.submitProof(escrowId, proofHash);
  console.log(`✓ Proof submitted: TX=${proofTxHash}`);
  console.log();

  // Step 7: Settlement hook - Release payment (as payer)
  console.log("💸 Releasing payment...");
  const settleTxHash = await wap3Client.settle(escrowId);
  console.log(`✓ Payment released: TX=${settleTxHash}`);
  console.log();

  console.log("=".repeat(60));
  console.log("✅ Integration Demo Complete!");
  console.log("=".repeat(60));
  console.log();
  console.log("Summary:");
  console.log(`  Escrow ID: ${escrowId}`);
  console.log(`  Execution ID: ${receipt.executionId}`);
  console.log(`  Provider Job ID: ${result.providerJobId}`);
  console.log(`  Proof Hash: ${proofHash}`);
  console.log(`  Status: ${result.status}`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

