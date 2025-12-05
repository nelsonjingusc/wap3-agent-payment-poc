import { ethers } from "hardhat";

/**
 * Example 1: Simple payment flow
 *
 * This example shows the basic happy path:
 * 1. Deploy contract
 * 2. Create escrow with funding
 * 3. Agent submits proof
 * 4. Payer releases payment
 */

async function main() {
  const [deployer, payer, agent] = await ethers.getSigners();

  console.log("=== Example 1: Simple Payment Flow ===\n");

  const AgentEscrow = await ethers.getContractFactory("AgentEscrow");
  const escrow = await AgentEscrow.deploy();
  await escrow.waitForDeployment();

  console.log("Contract deployed to:", await escrow.getAddress());
  console.log();

  const taskId = ethers.id("analyze-sentiment-batch-001");
  const paymentAmount = ethers.parseEther("0.1");

  console.log("Creating escrow for task:", taskId);
  console.log("Payment amount:", ethers.formatEther(paymentAmount), "ETH");

  const tx = await escrow.connect(payer).createEscrow(
    agent.address,
    taskId,
    { value: paymentAmount }
  );
  const receipt = await tx.wait();

  const event = receipt!.logs.find(
    (log: any) => log.fragment?.name === "EscrowCreated"
  ) as any;
  const escrowId = event?.args?.escrowId;

  console.log("Escrow created with ID:", escrowId.toString());
  console.log();

  console.log("Agent submitting proof...");
  const proofHash = ethers.keccak256(
    ethers.toUtf8Bytes("walrus://blob-id-abc123")
  );

  await escrow.connect(agent).submitProof(escrowId, proofHash);
  console.log("Proof hash:", proofHash);
  console.log();

  console.log("Payer releasing payment...");
  await escrow.connect(payer).releasePayment(escrowId);
  console.log("Payment released successfully!");
  console.log();

  const escrowData = await escrow.getEscrow(escrowId);
  console.log("Final escrow state:");
  console.log("  Completed:", escrowData.completed);
  console.log("  Released:", escrowData.released);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
