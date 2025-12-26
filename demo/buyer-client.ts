import { ethers } from "hardhat";
import * as readline from "readline";
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
  printProofHash,
  printSettleTx,
  printStatus,
  printSessionDir,
} from "../src/wap3/printer";

/**
 * Buyer Client
 *
 * This script simulates a buyer who:
 * 1. Creates an AP2-style intent
 * 2. Creates an X402-style payment trigger
 * 3. Creates a task (escrow)
 * 4. Funds it with ETH
 * 5. Waits for agent to complete
 * 6. Verifies the proof (simulated)
 * 7. Releases payment
 *
 * Supports CLI args for non-interactive mode:
 * --rpc <url>
 * --contract <addr>
 * --agent <addr>
 * --amount <number>
 * --task <string>
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

function parseArgs(): {
  rpc?: string;
  contract?: string;
  agent?: string;
  amount?: string;
  task?: string;
} {
  const args: Record<string, string> = {};
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i].startsWith("--")) {
      const key = process.argv[i].slice(2);
      const value = process.argv[i + 1];
      if (value && !value.startsWith("--")) {
        args[key] = value;
        i++;
      }
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();
  
  // Try to load from runtime file first, then CLI args, then prompt
  const runtimeFile = path.join(__dirname, "out", "mvp_runtime.json");
  let contractAddress: string | undefined;
  let agentAddress: string | undefined;
  
  if (fs.existsSync(runtimeFile)) {
    try {
      const runtime = JSON.parse(fs.readFileSync(runtimeFile, "utf-8"));
      contractAddress = runtime.contract;
      agentAddress = runtime.agent;
    } catch (e) {
      // Ignore parse errors, fall back to args/prompt
    }
  }
  
  // CLI args override runtime file
  if (args.contract) contractAddress = args.contract;
  if (args.agent) agentAddress = args.agent;
  
  const isNonInteractive = !!(contractAddress && agentAddress);

  if (!isNonInteractive) {
    console.clear();
    console.log(`${colors.bright}${colors.magenta}`);
    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║           👤 WAP3 BUYER CLIENT 👤                    ║");
    console.log("║    Create tasks and hire autonomous AI agents        ║");
    console.log("╚══════════════════════════════════════════════════════╝");
    console.log(colors.reset);
    console.log();
  }

  contractAddress = contractAddress || await askQuestion(`${colors.yellow}Enter contract address: ${colors.reset}`);
  if (!isNonInteractive) console.log();

  agentAddress = agentAddress || await askQuestion(`${colors.yellow}Enter agent address: ${colors.reset}`);
  if (!isNonInteractive) console.log();

  const [deployer, payer, agent] = await ethers.getSigners();

  log("🔗", "Connecting to AgentEscrow contract...", colors.blue);
  const escrow = await ethers.getContractAt("AgentEscrow", contractAddress);
  const wap3Client = new WAP3Client(contractAddress, payer);
  
  if (!isNonInteractive) console.log();

  log("👤", `Your address: ${payer.address}`, colors.blue);
  const initialBalance = await ethers.provider.getBalance(payer.address);
  log("💰", `Your balance: ${ethers.formatEther(initialBalance)} ETH`, colors.blue);
  if (!isNonInteractive) console.log();

  if (!isNonInteractive) {
    console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    log("📝", "Creating new task for AI agent...", colors.bright);
    console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log();
  }

  // Step 1: Create AP2-style intent
  const taskDescription = args.task || "sentiment-analysis-blockchain-text";
  const amountStr = args.amount || "0.05";
  const amount = ethers.parseEther(amountStr);

  const intent = createAP2Intent(taskDescription, amountStr, ["proof-required", "on-chain-settlement"]);
  const intentHash = hashAP2Intent(intent);
  
  if (!isNonInteractive) {
    log("🎯", `Task: ${taskDescription}`, colors.blue);
    log("💵", `Payment: ${ethers.formatEther(amount)} ETH`, colors.blue);
    log("🤖", `Agent: ${agentAddress}`, colors.blue);
    console.log();
  }

  // Print MVP:AP2_INTENT_ID
  printAP2Intent(formatIntentId(intent));

  // Step 2: Create X402-style payment trigger
  const trigger = createX402Trigger(intent.intent_id, amountStr, agentAddress, ["proof-verified"]);
  const triggerHash = hashX402Trigger(trigger);

  // Print MVP:X402_PAYMENT_ID
  printX402Payment(formatPaymentId(trigger));

  // Save intent/trigger to session directory for audit traceability
  const sessionDir = path.join(__dirname, "out", `session_${Date.now()}`);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(sessionDir, "intent.json"),
    JSON.stringify(intent, null, 2)
  );
  
  fs.writeFileSync(
    path.join(sessionDir, "trigger.json"),
    JSON.stringify(trigger, null, 2)
  );
  
  // Print session directory for audit script
  printSessionDir(sessionDir);

  // Step 3: Create escrow (using trigger hash as taskId for on-chain storage)
  const taskId = ethers.keccak256(ethers.toUtf8Bytes(triggerHash + intentHash));

  if (!isNonInteractive) {
    log("📤", "Creating escrow on-chain...", colors.yellow);
  }

  const { escrowId, txHash } = await wap3Client.createEscrow(agentAddress, taskId, amount);

  // Print MVP:ESCROW_ID and MVP:CREATE_TX
  printEscrowId(escrowId);
  printCreateTx(txHash);

  if (!isNonInteractive) {
    console.log();
    log("✓", `Escrow created successfully!`, colors.green);
    log("🆔", `Escrow ID: ${escrowId}`, colors.green);
    log("🔗", `Transaction: ${txHash}`, colors.green);
    console.log();

    console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    log("⏳", "Waiting for agent to complete task...", colors.yellow);
    console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log();
  }

  // In non-interactive mode (script mode), exit after creating escrow
  // The script will handle waiting for agent completion and settlement
  if (isNonInteractive) {
    // Ensure all output is flushed before exiting
    await new Promise(resolve => setImmediate(resolve));
    
    // Exit immediately after creating escrow in script mode
    // Settlement will be handled by run_mvp_demo.sh using settle.ts
    process.exit(0);
  }

  let proofReceived = false;

  escrow.on(escrow.filters.ProofSubmitted(), async (submittedEscrowId, agentAddr, proofHash) => {
    if (submittedEscrowId.toString() !== escrowId.toString()) {
      return;
    }

    if (proofReceived) return;
    proofReceived = true;

    // Print MVP:PROOF_HASH
    printProofHash(proofHash);

    if (!isNonInteractive) {
      console.log();
      console.log(`${colors.green}${"═".repeat(55)}${colors.reset}`);
      log("✓", "PROOF RECEIVED FROM AGENT!", colors.bright + colors.green);
      console.log(`${colors.green}${"═".repeat(55)}${colors.reset}`);
      console.log();

      log("🔗", `Proof Hash: ${proofHash.slice(0, 40)}...`, colors.green);
      console.log();

      log("🔍", "Verifying proof off-chain...", colors.yellow);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!isNonInteractive) {
      log("✓", "Proof verified! Work completed successfully.", colors.green);
      console.log();

      log("💰", "Releasing payment to agent...", colors.yellow);
    }

    const settleTxHash = await wap3Client.settle(escrowId);

    // Print MVP:SETTLE_TX and MVP:STATUS
    printSettleTx(settleTxHash);
    printStatus("settled");

    if (!isNonInteractive) {
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
    }

    process.exit(0);
  });

  // Timeout for non-interactive mode
  const timeout = isNonInteractive ? 30000 : 10000;
  setTimeout(() => {
    if (!proofReceived) {
      if (!isNonInteractive) {
        console.log();
        log("⚠️", "No proof received yet. Agent may still be working...", colors.yellow);
      } else {
        // In non-interactive mode, exit after timeout if no proof
        process.exit(1);
      }
    }
  }, timeout);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
