import { ethers } from "hardhat";

/**
 * Example 3: Multiple concurrent tasks
 *
 * This example shows how a single payer can create multiple escrows
 * for different agents working on different tasks simultaneously.
 */

async function main() {
  const [deployer, payer, agent1, agent2, agent3] = await ethers.getSigners();

  console.log("=== Example 3: Multiple Concurrent Tasks ===\n");

  const AgentEscrow = await ethers.getContractFactory("AgentEscrow");
  const escrow = await AgentEscrow.deploy();
  await escrow.waitForDeployment();

  console.log("Contract deployed to:", await escrow.getAddress());
  console.log();

  const tasks = [
    {
      name: "Image classification batch",
      taskId: ethers.id("classify-images-001"),
      agent: agent1,
      amount: ethers.parseEther("0.05"),
    },
    {
      name: "Text summarization",
      taskId: ethers.id("summarize-docs-002"),
      agent: agent2,
      amount: ethers.parseEther("0.08"),
    },
    {
      name: "Data extraction",
      taskId: ethers.id("extract-data-003"),
      agent: agent3,
      amount: ethers.parseEther("0.12"),
    },
  ];

  console.log("Creating escrows for multiple tasks...");
  console.log();

  const escrowIds: bigint[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    console.log(`Task ${i + 1}: ${task.name}`);
    console.log(`  Agent: ${task.agent.address}`);
    console.log(`  Amount: ${ethers.formatEther(task.amount)} ETH`);

    const tx = await escrow.connect(payer).createEscrow(
      task.agent.address,
      task.taskId,
      { value: task.amount }
    );
    const receipt = await tx.wait();

    const event = receipt!.logs.find(
      (log: any) => log.fragment?.name === "EscrowCreated"
    ) as any;
    const escrowId = event?.args?.escrowId;
    escrowIds.push(escrowId);

    console.log(`  ✓ Escrow ID: ${escrowId.toString()}`);
    console.log();
  }

  console.log("Agents completing tasks and submitting proofs...");
  console.log();

  for (let i = 0; i < escrowIds.length; i++) {
    const task = tasks[i];
    const escrowId = escrowIds[i];

    const proofHash = ethers.keccak256(
      ethers.toUtf8Bytes(`proof-for-${task.name}-${Date.now()}`)
    );

    await escrow.connect(task.agent).submitProof(escrowId, proofHash);
    console.log(`Task ${i + 1}: Proof submitted`);
  }
  console.log();

  console.log("Payer verifying and releasing payments...");
  console.log();

  for (let i = 0; i < escrowIds.length; i++) {
    const escrowId = escrowIds[i];
    await escrow.connect(payer).releasePayment(escrowId);
    console.log(`Task ${i + 1}: Payment released`);
  }
  console.log();

  console.log("Summary:");
  let totalPaid = 0n;
  for (let i = 0; i < escrowIds.length; i++) {
    const escrowData = await escrow.getEscrow(escrowIds[i]);
    totalPaid += escrowData.amount;
    console.log(`  Escrow ${escrowIds[i]}: ${escrowData.released ? "✓ Completed" : "✗ Pending"}`);
  }

  console.log();
  console.log("Total paid out:", ethers.formatEther(totalPaid), "ETH");
  console.log("All tasks completed successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
