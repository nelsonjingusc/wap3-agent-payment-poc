import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { collectAuditData } from "../src/wap3/audit";
import { getChainConfig } from "../src/utils/env";
import { createAP2Intent } from "../src/protocol/intent_ap2";
import { createX402Trigger } from "../src/protocol/trigger_x402";
import { printAuditJson } from "../src/wap3/printer";

/**
 * Audit Export Script
 * 
 * Collects on-chain and off-chain data to generate an audit JSON record.
 * 
 * Usage:
 *   ESCROW_ID=0 npx hardhat run demo/audit.ts --network localhost
 * 
 * Reads from:
 *   - demo/out/mvp_runtime.json (contract, rpc)
 *   - demo/out/session_* (intent.json, trigger.json)
 *   - ESCROW_ID environment variable
 */

/**
 * RPC Health Check - Fast fail if node is not running
 */
async function assertRpcOnline(provider: any) {
  try {
    await Promise.race([
      provider.getBlockNumber(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("RPC timeout")), 1500)),
    ]);
  } catch (e: any) {
    console.error("❌ Error: Node not running, abort audit");
    console.error(`   ${String(e?.message || e)}`);
    console.error("   Please ensure Hardhat node is running: npm run node");
    process.exit(1);
  }
}

function parseArgs(): {
  contract?: string;
  escrowId?: string;
  rpc?: string;
  sessionDir?: string;
} {
  const args: Record<string, string> = {};
  
  // Support both --arg value and --arg=value formats
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith("--")) {
      if (arg.includes("=")) {
        // --arg=value format
        const [key, value] = arg.slice(2).split("=", 2);
        args[key] = value;
      } else {
        // --arg value format
        const key = arg.slice(2);
        const value = process.argv[i + 1];
        if (value && !value.startsWith("--")) {
          args[key] = value;
          i++;
        }
      }
    }
  }
  
  // Also check environment variables (for script compatibility)
  if (!args.escrowId && process.env.ESCROW_ID) {
    args.escrowId = process.env.ESCROW_ID;
  }
  
  return args;
}

function findLatestSessionDir(): string | null {
  const outDir = path.join(__dirname, "out");
  if (!fs.existsSync(outDir)) {
    return null;
  }
  
  const sessions = fs.readdirSync(outDir)
    .filter(name => name.startsWith("session_"))
    .map(name => ({
      name,
      path: path.join(outDir, name),
      timestamp: parseInt(name.replace("session_", "")) || 0,
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
  
  return sessions.length > 0 ? sessions[0].path : null;
}

async function main() {
  const args = parseArgs();

  // Try to load from runtime file first
  const runtimeFile = path.join(__dirname, "out", "mvp_runtime.json");
  let contractAddress: string | undefined;
  let rpcUrl: string | undefined;
  
  if (fs.existsSync(runtimeFile)) {
    try {
      const runtime = JSON.parse(fs.readFileSync(runtimeFile, "utf-8"));
      contractAddress = runtime.contract;
      rpcUrl = runtime.rpc;
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  // CLI args override runtime file
  if (args.contract) contractAddress = args.contract;
  if (args.rpc) rpcUrl = args.rpc;
  
  if (!contractAddress) {
    console.error("Error: Contract address required. Either provide --contract or ensure mvp_runtime.json exists.");
    process.exit(1);
  }

  if (!args.escrowId) {
    console.error("Error: --escrowId is required");
    process.exit(1);
  }

  const escrowId = BigInt(args.escrowId);
  rpcUrl = rpcUrl || "http://127.0.0.1:8545";
  
  // Find session directory: CLI arg > env var > latest session > null
  let sessionDir = args.sessionDir || process.env.SESSION_DIR;
  if (!sessionDir) {
    sessionDir = findLatestSessionDir() || undefined;
  }

  // Get provider
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // RPC Health Check - Fast fail if node is not running
  await assertRpcOnline(provider);
  
  const chainConfig = getChainConfig("hardhat-local");

  // Load intent/trigger from session directory (if provided) or use placeholder
  let intent, trigger;
  
  if (sessionDir && fs.existsSync(sessionDir)) {
    // Load from session directory (real transaction data)
    const intentPath = path.join(sessionDir, "intent.json");
    const triggerPath = path.join(sessionDir, "trigger.json");
    
    if (fs.existsSync(intentPath) && fs.existsSync(triggerPath)) {
      intent = JSON.parse(fs.readFileSync(intentPath, "utf-8"));
      trigger = JSON.parse(fs.readFileSync(triggerPath, "utf-8"));
      console.log(`Loaded intent/trigger from session: ${sessionDir}`);
    } else {
      console.warn(`Warning: Session directory exists but intent/trigger files not found. Using placeholder.`);
      // Fallback to placeholder
      intent = createAP2Intent(
        "sentiment-analysis-blockchain-text",
        "0.05",
        ["proof-required", "on-chain-settlement"]
      );
      const [deployer, payer, agent] = await ethers.getSigners();
      trigger = createX402Trigger(intent.intent_id, "0.05", agent.address, ["proof-verified"]);
    }
  } else {
    // Fallback to placeholder (for backward compatibility)
    console.warn("Warning: No session directory provided. Using placeholder intent/trigger.");
    intent = createAP2Intent(
      "sentiment-analysis-blockchain-text",
      "0.05",
      ["proof-required", "on-chain-settlement"]
    );
    const [deployer, payer, agent] = await ethers.getSigners();
    trigger = createX402Trigger(intent.intent_id, "0.05", agent.address, ["proof-verified"]);
  }

  // Collect audit data
  const auditRecord = await collectAuditData(
    contractAddress,
    escrowId,
    provider,
    chainConfig,
    intent,
    trigger
  );

  // Write audit to session directory if available, otherwise to out/
  let outputPath: string;
  if (sessionDir && fs.existsSync(sessionDir)) {
    // Write to session directory for better organization
    outputPath = path.join(sessionDir, "audit.json");
  } else {
    // Fallback to out/ directory
    const outDir = path.join(__dirname, "out");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    outputPath = path.join(outDir, `audit_${escrowId}.json`);
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(auditRecord, null, 2));

  // Print MVP:AUDIT_JSON (must be on stdout for script parsing)
  // This is the critical line that the demo script will parse
  printAuditJson(outputPath);
}

main().catch((error) => {
  // Suppress stack traces - only print clean error message to stderr
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Check if it's a TypeScript compilation error (diagnosticCodes)
  if (error && typeof error === 'object' && 'diagnosticCodes' in error) {
    // TypeScript compilation error - print clean message
    console.error("Error: TypeScript compilation failed");
    console.error("Please check your TypeScript configuration and dependencies");
    process.exit(1);
  }
  
  // Runtime error - print clean message
  console.error("Error generating audit:", errorMessage);
  process.exit(1);
});

