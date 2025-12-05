import { ethers } from "hardhat";
import * as readline from "readline";

/**
 * Buyer Client
 *
 * This script simulates a buyer who:
 * 1. Creates a task (escrow)
 * 2. Funds it with ETH
 * 3. Waits for agent to complete
 * 4. Verifies the proof (simulated)
 * 5. Releases payment
 *
 * Run this AFTER starting the agent-service.ts
 */

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
};

function log(emoji: string, message: string, color = colors.blue) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, (answer) => {
    rl.close();
    resolve(answer);
  }));
}

async function main() {
  console.clear();
  console.log(`${colors.bright}${colors.magenta}`);
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║           👤 WAP3 BUYER CLIENT 👤                    ║");
  console.log("║    Create tasks and hire autonomous AI agents        ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(colors.reset);
  console.log();

  const contractAddress = await askQuestion(`${colors.yellow}Enter contract address: ${colors.reset}`);
  console.log();

  const agentAddress = await askQuestion(`${colors.yellow}Enter agent address: ${colors.reset}`);
  console.log();

  const [deployer, payer, agent] = await ethers.getSigners();

  log("🔗", "Connecting to AgentEscrow contract...", colors.blue);
  const escrow = await ethers.getContractAt("AgentEscrow", contractAddress);
  console.log();

  log("👤", `Your address: ${payer.address}`, colors.blue);
  const initialBalance = await ethers.provider.getBalance(payer.address);
  log("💰", `Your balance: ${ethers.formatEther(initialBalance)} ETH`, colors.blue);
  console.log();

  console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  log("📝", "Creating new task for AI agent...", colors.bright);
  console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log();

  const taskDescription = "sentiment-analysis-blockchain-text";
  const taskId = ethers.keccak256(ethers.toUtf8Bytes(taskDescription + Date.now()));
  const amount = ethers.parseEther("0.05");

  log("🎯", `Task: ${taskDescription}`, colors.blue);
  log("💵", `Payment: ${ethers.formatEther(amount)} ETH`, colors.blue);
  log("🤖", `Agent: ${agentAddress}`, colors.blue);
  console.log();

  log("📤", "Creating escrow on-chain...", colors.yellow);

  const tx = await escrow.connect(payer).createEscrow(agentAddress, taskId, { value: amount });
  const receipt = await tx.wait();

  const event = receipt!.logs.find(
    (log: any) => log.fragment?.name === "EscrowCreated"
  ) as any;
  const escrowId = event?.args?.escrowId ?? 0n;

  console.log();
  log("✓", `Escrow created successfully!`, colors.green);
  log("🆔", `Escrow ID: ${escrowId}`, colors.green);
  log("🔗", `Transaction: ${receipt!.hash}`, colors.green);
  console.log();

  console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  log("⏳", "Waiting for agent to complete task...", colors.yellow);
  console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log();

  let proofReceived = false;

  escrow.on("ProofSubmitted", async (submittedEscrowId, agentAddr, proofHash) => {
    if (submittedEscrowId.toString() !== escrowId.toString()) {
      return;
    }

    if (proofReceived) return;
    proofReceived = true;

    console.log();
    console.log(`${colors.green}${"═".repeat(55)}${colors.reset}`);
    log("✓", "PROOF RECEIVED FROM AGENT!", colors.bright + colors.green);
    console.log(`${colors.green}${"═".repeat(55)}${colors.reset}`);
    console.log();

    log("🔗", `Proof Hash: ${proofHash.slice(0, 40)}...`, colors.green);
    console.log();

    log("🔍", "Verifying proof off-chain...", colors.yellow);
    await new Promise(resolve => setTimeout(resolve, 1000));
    log("✓", "Proof verified! Work completed successfully.", colors.green);
    console.log();

    log("💰", "Releasing payment to agent...", colors.yellow);

    const releaseTx = await escrow.connect(payer).releasePayment(escrowId);
    await releaseTx.wait();

    console.log();
    log("✓", "Payment released successfully!", colors.green);
    console.log();

    const finalBalance = await ethers.provider.getBalance(payer.address);
    log("💵", `Your new balance: ${ethers.formatEther(finalBalance)} ETH`, colors.blue);
    console.log();

    console.log(`${colors.green}${"═".repeat(55)}${colors.reset}`);
    log("🎉", "TRANSACTION COMPLETE!", colors.bright + colors.green);
    console.log(`${colors.green}${"═".repeat(55)}${colors.reset}`);
    console.log();

    log("✓", "Task completed and agent paid autonomously", colors.green);
    log("✓", "No intermediaries, no manual approval", colors.green);
    log("✓", "Fully on-chain settlement with cryptographic proof", colors.green);
    console.log();

    process.exit(0);
  });

  setTimeout(() => {
    if (!proofReceived) {
      console.log();
      log("⚠️", "No proof received yet. Agent may still be working...", colors.yellow);
    }
  }, 10000);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
