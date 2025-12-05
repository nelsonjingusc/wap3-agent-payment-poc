import { ethers } from "hardhat";

async function main() {
  const [deployer, payer, agent] = await ethers.getSigners();

  console.log("Deploying AgentEscrow...");
  const AgentEscrow = await ethers.getContractFactory("AgentEscrow");
  const escrow = await AgentEscrow.deploy();
  await escrow.waitForDeployment();

  const escrowAddress = await escrow.getAddress();
  console.log("AgentEscrow deployed to:", escrowAddress);
  console.log();

  console.log("=== Demo: Agent Payment Flow ===");
  console.log("Payer:", payer.address);
  console.log("Agent:", agent.address);
  console.log();

  const payerBalanceBefore = await ethers.provider.getBalance(payer.address);
  const agentBalanceBefore = await ethers.provider.getBalance(agent.address);

  console.log("Initial balances:");
  console.log("  Payer:", ethers.formatEther(payerBalanceBefore), "ETH");
  console.log("  Agent:", ethers.formatEther(agentBalanceBefore), "ETH");
  console.log();

  const taskId = ethers.keccak256(ethers.toUtf8Bytes("task-sentiment-analysis-2024"));
  const amount = ethers.parseEther("0.05");

  console.log("Step 1: Payer creates and funds escrow");
  console.log("  Task ID:", taskId);
  console.log("  Amount:", ethers.formatEther(amount), "ETH");

  const txCreate = await escrow.connect(payer).createEscrow(agent.address, taskId, { value: amount });
  const receiptCreate = await txCreate.wait();

  const event = receiptCreate!.logs.find(
    (log: any) => log.fragment?.name === "EscrowCreated"
  ) as any;
  const escrowId = event?.args?.escrowId ?? 0n;

  console.log("  ✓ Escrow created with ID:", escrowId.toString());
  console.log();

  console.log("Step 2: Agent completes task and submits proof");
  const proofHash = ethers.keccak256(
    ethers.toUtf8Bytes("ipfs://Qm...abc123/result.json")
  );
  console.log("  Proof hash:", proofHash);

  const txProof = await escrow.connect(agent).submitProof(escrowId, proofHash);
  await txProof.wait();
  console.log("  ✓ Proof submitted");
  console.log();

  console.log("Step 3: Payer verifies proof and releases payment");
  const txRelease = await escrow.connect(payer).releasePayment(escrowId);
  await txRelease.wait();
  console.log("  ✓ Payment released");
  console.log();

  const payerBalanceAfter = await ethers.provider.getBalance(payer.address);
  const agentBalanceAfter = await ethers.provider.getBalance(agent.address);

  console.log("Final balances:");
  console.log("  Payer:", ethers.formatEther(payerBalanceAfter), "ETH");
  console.log("  Agent:", ethers.formatEther(agentBalanceAfter), "ETH");
  console.log();

  console.log("Agent received:", ethers.formatEther(agentBalanceAfter - agentBalanceBefore), "ETH");
  console.log();
  console.log("✓ Demo completed successfully");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
