import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import {
  printMVPInfo,
  printEscrowPicked,
  printProofHash,
  printProofTx,
  printSettleTx,
  printStatus,
} from "../src/wap3/printer";

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
  const rpcUrl = (ethers.provider as any).connection?.url || "http://127.0.0.1:8545";

  // Print MVP_INFO (machine-readable, must be first)
  printMVPInfo(escrowAddress, agent.address, rpcUrl);

  // Write runtime file for buyer/audit scripts
  const outDir = path.join(__dirname, "out");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  const runtimeFile = path.join(outDir, "mvp_runtime.json");
  fs.writeFileSync(
    runtimeFile,
    JSON.stringify({
      contract: escrowAddress,
      agent: agent.address,
      rpc: rpcUrl,
      timestamp: new Date().toISOString(),
    }, null, 2)
  );

  log("✓", `Contract deployed at: ${escrowAddress}`, colors.green);
  log("📝", `Runtime file written: ${runtimeFile}`, colors.cyan);
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

  escrow.on(escrow.filters.EscrowCreated(), async (...args: any[]) => {
    // In ethers v6 with typechain, event args are passed as an array
    // EscrowCreated: [escrowId, payer, agent, amount, taskId]
    // Handle both direct args and event log object
    let escrowId: bigint;
    let payerAddress: string;
    let agentAddress: string;
    let amount: bigint;
    let taskId: string;
    
    // Check if first arg is an event log object (has args property)
    if (args.length === 1 && args[0] && typeof args[0] === 'object' && 'args' in args[0]) {
      const eventLog = args[0] as any;
      const eventArgs = eventLog.args;
      // Try object access first, then array access
      escrowId = eventArgs.escrowId ?? eventArgs[0];
      payerAddress = eventArgs.payer ?? eventArgs[1];
      agentAddress = eventArgs.agent ?? eventArgs[2];
      amount = eventArgs.amount ?? eventArgs[3];
      taskId = eventArgs.taskId ?? eventArgs[4];
    } else {
      // Direct args: [escrowId, payer, agent, amount, taskId]
      escrowId = args[0];
      payerAddress = args[1];
      agentAddress = args[2];
      amount = args[3];
      taskId = args[4];
    }
    
    // Safety check: ensure agentAddress exists and matches
    if (!agentAddress || typeof agentAddress !== 'string') {
      return;
    }
    
    if (agentAddress.toLowerCase() !== agent.address.toLowerCase()) {
      return;
    }

    // Print MVP:ESCROW_PICKED
    printEscrowPicked(escrowId);

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
      
      // Print MVP:PROOF_HASH
      printProofHash(proofHash);

      log("📤", "Submitting proof to blockchain...", colors.yellow);

      const txProof = await escrow.connect(agent).submitProof(escrowId, proofHash);
      const receiptProof = await txProof.wait();

      // Print MVP:PROOF_TX
      if (receiptProof) {
        printProofTx(receiptProof.hash);
      }

      log("✓", "Proof submitted successfully!", colors.green);
      log("🔗", `Proof Hash: ${proofHash.slice(0, 20)}...`, colors.cyan);
      console.log();

      log("⏳", "Waiting for payer to verify and release payment...", colors.yellow);

    } catch (error: any) {
      log("❌", `Error: ${error.message}`, colors.reset);
    }
  });

  escrow.on(escrow.filters.PaymentReleased(), async (...args: any[]) => {
    // In ethers v6 with typechain, event args are passed as an array
    // PaymentReleased: [escrowId, payer, agent, amount]
    // Handle both direct args and event log object
    let escrowId: bigint;
    let payerAddress: string;
    let agentAddress: string;
    let amount: bigint;

    if (args.length > 0 && typeof args[0] === 'object' && args[0].args) {
      // Event log object format
      const event = args[0];
      escrowId = event.args[0];
      payerAddress = event.args[1];
      agentAddress = event.args[2];
      amount = event.args[3];
    } else {
      // Direct args format
      escrowId = args[0];
      payerAddress = args[1];
      agentAddress = args[2];
      amount = args[3];
    }

    // Safety check: ensure agentAddress exists and matches
    if (!agentAddress || typeof agentAddress !== 'string') {
      return;
    }
    
    if (agentAddress.toLowerCase() !== agent.address.toLowerCase()) {
      return;
    }

    // Print MVP:SETTLE_TX and MVP:STATUS
    // Note: We need to get the tx hash from the event, but events don't include it
    // So we'll query the latest transaction or use a placeholder
    printSettleTx("pending"); // Will be updated by buyer-client or audit script
    printStatus("settled");

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
