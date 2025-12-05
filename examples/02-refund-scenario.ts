import { ethers } from "hardhat";

/**
 * Example 2: Refund scenario
 *
 * This example demonstrates what happens when an agent fails to complete a task.
 * The payer can request a refund if the task remains incomplete.
 */

async function main() {
  const [deployer, payer, agent] = await ethers.getSigners();

  console.log("=== Example 2: Refund Scenario ===\n");

  const AgentEscrow = await ethers.getContractFactory("AgentEscrow");
  const escrow = await AgentEscrow.deploy();
  await escrow.waitForDeployment();

  console.log("Contract deployed to:", await escrow.getAddress());
  console.log();

  const taskId = ethers.id("video-transcription-task-999");
  const paymentAmount = ethers.parseEther("0.25");

  console.log("Creating escrow for task:", taskId);
  console.log("Payment amount:", ethers.formatEther(paymentAmount), "ETH");

  const payerBalanceBefore = await ethers.provider.getBalance(payer.address);

  const tx = await escrow.connect(payer).createEscrow(
    agent.address,
    taskId,
    { value: paymentAmount }
  );
  const createReceipt = await tx.wait();

  const event = createReceipt!.logs.find(
    (log: any) => log.fragment?.name === "EscrowCreated"
  ) as any;
  const escrowId = event?.args?.escrowId;

  console.log("Escrow created with ID:", escrowId.toString());
  console.log();

  console.log("Scenario: Agent fails to complete task");
  console.log("Payer requesting refund...");

  const refundTx = await escrow.connect(payer).refund(escrowId);
  const refundReceipt = await refundTx.wait();

  console.log("Refund processed successfully!");
  console.log();

  const payerBalanceAfter = await ethers.provider.getBalance(payer.address);
  const gasUsed = createReceipt!.gasUsed * createReceipt!.gasPrice +
                  refundReceipt!.gasUsed * refundReceipt!.gasPrice;

  console.log("Payer balance change:");
  console.log("  Before:", ethers.formatEther(payerBalanceBefore), "ETH");
  console.log("  After:", ethers.formatEther(payerBalanceAfter), "ETH");
  console.log("  Gas cost:", ethers.formatEther(gasUsed), "ETH");
  console.log("  Net loss:", ethers.formatEther(payerBalanceBefore - payerBalanceAfter), "ETH");
  console.log();

  const escrowData = await escrow.getEscrow(escrowId);
  console.log("Final escrow state:");
  console.log("  Completed:", escrowData.completed);
  console.log("  Refunded:", escrowData.refunded);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
