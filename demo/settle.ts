import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { WAP3Client } from "../src/wap3/client";
import { printSettleTx, printStatus } from "../src/wap3/printer";

/**
 * Settle Script
 * 
 * Releases payment for a completed escrow.
 * Used by run_mvp_demo.sh after agent submits proof.
 * 
 * Usage:
 *   ESCROW_ID=0 npx hardhat run --no-compile demo/settle.ts --network localhost
 */

async function main() {
  const escrowId = process.env.ESCROW_ID;
  
  if (!escrowId) {
    console.error("Error: ESCROW_ID environment variable is required");
    process.exit(1);
  }

  // Load runtime file
  const runtimeFile = path.join(__dirname, "out", "mvp_runtime.json");
  if (!fs.existsSync(runtimeFile)) {
    console.error("Error: mvp_runtime.json not found");
    process.exit(1);
  }

  const runtime = JSON.parse(fs.readFileSync(runtimeFile, "utf-8"));
  const contractAddress = runtime.contract;

  const [deployer, payer] = await ethers.getSigners();
  const client = new WAP3Client(contractAddress, payer);

  // Check escrow status
  const escrowInfo = await client.getEscrow(BigInt(escrowId));
  
  if (escrowInfo.status === "settled") {
    console.log(`Escrow ${escrowId} is already settled`);
    // Still print MVP outputs for consistency
    printSettleTx("already_settled");
    printStatus("settled");
    process.exit(0);
  }

  if (escrowInfo.status !== "completed") {
    console.error(`Error: Escrow ${escrowId} is not completed (status: ${escrowInfo.status})`);
    console.error(`Please wait for agent to submit proof first.`);
    process.exit(1);
  }

  // Settle payment
  const settleTxHash = await client.settle(BigInt(escrowId));
  
  printSettleTx(settleTxHash);
  printStatus("settled");
  
  console.log(`Payment settled for escrow ${escrowId}`);
  console.log(`Transaction: ${settleTxHash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

