import { ethers } from "hardhat";
import * as readline from "readline";

/**
 * Autonomous Agent Service
 *
 * This service demonstrates an AI agent that:
 * 1. Listens for new escrow tasks on-chain
 * 2. Automatically executes the work (simulated AI processing)
 * 3. Submits proof of completion
 * 4. Receives payment automatically
 *
 * In production, this would:
 * - Call real AI APIs (OpenAI, etc.)
 * - Store results on decentralized storage (Walrus, IPFS)
 * - Handle multiple tasks concurrently
 */

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
};

function log(emoji: string, message: string, color = colors.cyan) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

async function simulateAIWork(taskDescription: string): Promise<string> {
  log("🧠", "Analyzing task with AI model...", colors.yellow);

  await new Promise(resolve => setTimeout(resolve, 1500));

  const sentiments = ["POSITIVE", "NEGATIVE", "NEUTRAL"];
  const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
  const confidence = (85 + Math.random() * 15).toFixed(1);

  const result = {
    task: taskDescription,
    sentiment: sentiment,
    confidence: `${confidence}%`,
    timestamp: new Date().toISOString(),
    model: "sentiment-analyzer-v1.0",
  };

  return JSON.stringify(result, null, 2);
}

async function simulateIPFSUpload(data: string): Promise<string> {
  log("📦", "Uploading result to IPFS...", colors.yellow);

  await new Promise(resolve => setTimeout(resolve, 800));

  const hash = ethers.keccak256(ethers.toUtf8Bytes(data + Date.now()));
  const ipfsHash = `Qm${hash.slice(2, 48)}`;

  return ipfsHash;
}

async function main() {
  console.clear();
  console.log(`${colors.bright}${colors.magenta}`);
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║       🤖 WAP3 AUTONOMOUS AGENT SERVICE 🤖           ║");
  console.log("║  AI-Powered Task Execution with On-Chain Settlement  ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(colors.reset);

  const [deployer, payer, agent] = await ethers.getSigners();

  log("🚀", "Deploying AgentEscrow contract...", colors.cyan);
  const AgentEscrow = await ethers.getContractFactory("AgentEscrow");
  const escrow = await AgentEscrow.deploy();
  await escrow.waitForDeployment();

  const escrowAddress = await escrow.getAddress();
  log("✓", `Contract deployed at: ${escrowAddress}`, colors.green);
  console.log();

  log("🤖", `Agent address: ${agent.address}`, colors.cyan);
  const initialBalance = await ethers.provider.getBalance(agent.address);
  log("💰", `Agent balance: ${ethers.formatEther(initialBalance)} ETH`, colors.cyan);
  console.log();

  console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  log("👂", "Agent is now listening for tasks on-chain...", colors.bright);
  log("⏳", "Waiting for buyers to create escrows...", colors.cyan);
  console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log();

  escrow.on("EscrowCreated", async (escrowId, payerAddress, agentAddress, amount, taskId) => {
    if (agentAddress.toLowerCase() !== agent.address.toLowerCase()) {
      return;
    }

    console.log();
    console.log(`${colors.green}${"═".repeat(55)}${colors.reset}`);
    log("🔔", "NEW TASK DETECTED!", colors.bright + colors.green);
    console.log(`${colors.green}${"═".repeat(55)}${colors.reset}`);
    console.log();

    log("📋", `Escrow ID: ${escrowId}`, colors.cyan);
    log("👤", `Payer: ${payerAddress}`, colors.cyan);
    log("💵", `Payment: ${ethers.formatEther(amount)} ETH`, colors.cyan);
    log("🎯", `Task ID: ${taskId.slice(0, 20)}...`, colors.cyan);
    console.log();

    try {
      const taskDescription = "Analyze sentiment: 'WAP3 enables autonomous AI agents to transact on-chain!'";
      log("📝", `Task: "${taskDescription}"`, colors.yellow);
      console.log();

      const result = await simulateAIWork(taskDescription);
      log("✓", "AI analysis complete!", colors.green);
      console.log(`${colors.cyan}${result}${colors.reset}`);
      console.log();

      const ipfsHash = await simulateIPFSUpload(result);
      log("✓", `IPFS Hash: ${ipfsHash}`, colors.green);
      console.log();

      const proofHash = ethers.keccak256(ethers.toUtf8Bytes(ipfsHash));
      log("📤", "Submitting proof to blockchain...", colors.yellow);

      const txProof = await escrow.connect(agent).submitProof(escrowId, proofHash);
      await txProof.wait();

      log("✓", "Proof submitted successfully!", colors.green);
      log("🔗", `Proof Hash: ${proofHash.slice(0, 20)}...`, colors.cyan);
      console.log();

      log("⏳", "Waiting for payer to verify and release payment...", colors.yellow);

    } catch (error: any) {
      log("❌", `Error: ${error.message}`, colors.reset);
    }
  });

  escrow.on("PaymentReleased", async (escrowId, payerAddress, agentAddress, amount) => {
    if (agentAddress.toLowerCase() !== agent.address.toLowerCase()) {
      return;
    }

    console.log();
    console.log(`${colors.green}${"═".repeat(55)}${colors.reset}`);
    log("💰", "PAYMENT RECEIVED!", colors.bright + colors.green);
    console.log(`${colors.green}${"═".repeat(55)}${colors.reset}`);
    console.log();

    const newBalance = await ethers.provider.getBalance(agent.address);
    log("✓", `Escrow ID: ${escrowId}`, colors.green);
    log("💵", `Amount: ${ethers.formatEther(amount)} ETH`, colors.green);
    log("💰", `New balance: ${ethers.formatEther(newBalance)} ETH`, colors.green);
    console.log();

    console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    log("✓", "Task completed successfully! Ready for next task...", colors.bright);
    console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log();
  });

  console.log(`${colors.cyan}Contract address for buyer: ${escrowAddress}${colors.reset}`);
  console.log(`${colors.cyan}Agent address: ${agent.address}${colors.reset}`);
  console.log();
  console.log(`${colors.yellow}Press Ctrl+C to stop the agent service${colors.reset}`);

  await new Promise(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
