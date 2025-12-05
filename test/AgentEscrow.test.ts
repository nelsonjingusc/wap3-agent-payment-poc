import { expect } from "chai";
import { ethers } from "hardhat";
import { AgentEscrow } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AgentEscrow", function () {
  let escrow: AgentEscrow;
  let payer: SignerWithAddress;
  let agent: SignerWithAddress;
  let other: SignerWithAddress;

  beforeEach(async function () {
    [payer, agent, other] = await ethers.getSigners();

    const AgentEscrow = await ethers.getContractFactory("AgentEscrow");
    escrow = await AgentEscrow.deploy();
    await escrow.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should initialize with nextEscrowId = 0", async function () {
      expect(await escrow.nextEscrowId()).to.equal(0);
    });
  });

  describe("Create Escrow", function () {
    const taskId = ethers.id("task-1");
    const amount = ethers.parseEther("1.0");

    it("Should create an escrow successfully", async function () {
      await expect(
        escrow.connect(payer).createEscrow(agent.address, taskId, { value: amount })
      )
        .to.emit(escrow, "EscrowCreated")
        .withArgs(0, payer.address, agent.address, amount, taskId);

      const e = await escrow.escrows(0);
      expect(e.payer).to.equal(payer.address);
      expect(e.agent).to.equal(agent.address);
      expect(e.amount).to.equal(amount);
      expect(e.taskId).to.equal(taskId);
      expect(e.funded).to.be.true;
      expect(e.completed).to.be.false;
    });

    it("Should increment escrow ID", async function () {
      await escrow.connect(payer).createEscrow(agent.address, taskId, { value: amount });
      expect(await escrow.nextEscrowId()).to.equal(1);

      await escrow.connect(payer).createEscrow(agent.address, taskId, { value: amount });
      expect(await escrow.nextEscrowId()).to.equal(2);
    });

    it("Should fail if agent is zero address", async function () {
      await expect(
        escrow.connect(payer).createEscrow(ethers.ZeroAddress, taskId, { value: amount })
      ).to.be.revertedWith("invalid agent");
    });

    it("Should fail if no funds sent", async function () {
      await expect(
        escrow.connect(payer).createEscrow(agent.address, taskId, { value: 0 })
      ).to.be.revertedWith("no funds sent");
    });
  });

  describe("Submit Proof", function () {
    const taskId = ethers.id("task-1");
    const amount = ethers.parseEther("1.0");
    const proofHash = ethers.id("proof-hash-1");
    let escrowId: bigint;

    beforeEach(async function () {
      const tx = await escrow.connect(payer).createEscrow(agent.address, taskId, { value: amount });
      const receipt = await tx.wait();
      const event = receipt!.logs.find((log: any) => log.fragment?.name === "EscrowCreated") as any;
      escrowId = event?.args?.escrowId ?? 0n;
    });

    it("Should allow agent to submit proof", async function () {
      await expect(escrow.connect(agent).submitProof(escrowId, proofHash))
        .to.emit(escrow, "ProofSubmitted")
        .withArgs(escrowId, agent.address, proofHash);

      const e = await escrow.escrows(escrowId);
      expect(e.proofHash).to.equal(proofHash);
      expect(e.completed).to.be.true;
    });

    it("Should fail if called by non-agent", async function () {
      await expect(
        escrow.connect(other).submitProof(escrowId, proofHash)
      ).to.be.revertedWith("only agent");
    });

    it("Should fail if escrow not funded", async function () {
      await expect(
        escrow.connect(agent).submitProof(999, proofHash)
      ).to.be.revertedWith("escrow not found or not funded");
    });

    it("Should fail if already completed", async function () {
      await escrow.connect(agent).submitProof(escrowId, proofHash);

      await expect(
        escrow.connect(agent).submitProof(escrowId, proofHash)
      ).to.be.revertedWith("already completed");
    });
  });

  describe("Release Payment", function () {
    const taskId = ethers.id("task-1");
    const amount = ethers.parseEther("1.0");
    const proofHash = ethers.id("proof-hash-1");
    let escrowId: bigint;

    beforeEach(async function () {
      const tx = await escrow.connect(payer).createEscrow(agent.address, taskId, { value: amount });
      const receipt = await tx.wait();
      const event = receipt!.logs.find((log: any) => log.fragment?.name === "EscrowCreated") as any;
      escrowId = event?.args?.escrowId ?? 0n;
    });

    it("Should release payment to agent", async function () {
      await escrow.connect(agent).submitProof(escrowId, proofHash);

      const agentBalanceBefore = await ethers.provider.getBalance(agent.address);

      await expect(escrow.connect(payer).releasePayment(escrowId))
        .to.emit(escrow, "PaymentReleased")
        .withArgs(escrowId, payer.address, agent.address, amount);

      const agentBalanceAfter = await ethers.provider.getBalance(agent.address);
      expect(agentBalanceAfter - agentBalanceBefore).to.equal(amount);

      const e = await escrow.escrows(escrowId);
      expect(e.released).to.be.true;
    });

    it("Should fail if task not completed", async function () {
      await expect(
        escrow.connect(payer).releasePayment(escrowId)
      ).to.be.revertedWith("task not completed");
    });

    it("Should fail if called by non-payer", async function () {
      await escrow.connect(agent).submitProof(escrowId, proofHash);

      await expect(
        escrow.connect(other).releasePayment(escrowId)
      ).to.be.revertedWith("only payer");
    });

    it("Should fail if already released", async function () {
      await escrow.connect(agent).submitProof(escrowId, proofHash);
      await escrow.connect(payer).releasePayment(escrowId);

      await expect(
        escrow.connect(payer).releasePayment(escrowId)
      ).to.be.revertedWith("already released");
    });
  });

  describe("Refund", function () {
    const taskId = ethers.id("task-1");
    const amount = ethers.parseEther("1.0");
    let escrowId: bigint;

    beforeEach(async function () {
      const tx = await escrow.connect(payer).createEscrow(agent.address, taskId, { value: amount });
      const receipt = await tx.wait();
      const event = receipt!.logs.find((log: any) => log.fragment?.name === "EscrowCreated") as any;
      escrowId = event?.args?.escrowId ?? 0n;
    });

    it("Should refund payer if task not completed", async function () {
      const payerBalanceBefore = await ethers.provider.getBalance(payer.address);

      const tx = await escrow.connect(payer).refund(escrowId);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      await expect(tx)
        .to.emit(escrow, "PaymentRefunded")
        .withArgs(escrowId, payer.address, amount);

      const payerBalanceAfter = await ethers.provider.getBalance(payer.address);
      expect(payerBalanceAfter - payerBalanceBefore + gasUsed).to.equal(amount);

      const e = await escrow.escrows(escrowId);
      expect(e.refunded).to.be.true;
    });

    it("Should fail if task already completed", async function () {
      const proofHash = ethers.id("proof-hash-1");
      await escrow.connect(agent).submitProof(escrowId, proofHash);

      await expect(
        escrow.connect(payer).refund(escrowId)
      ).to.be.revertedWith("already completed");
    });

    it("Should fail if called by non-payer", async function () {
      await expect(
        escrow.connect(other).refund(escrowId)
      ).to.be.revertedWith("only payer");
    });

    it("Should fail if already refunded", async function () {
      await escrow.connect(payer).refund(escrowId);

      await expect(
        escrow.connect(payer).refund(escrowId)
      ).to.be.revertedWith("already refunded");
    });
  });

  describe("Get Escrow", function () {
    it("Should return complete escrow details", async function () {
      const taskId = ethers.id("task-1");
      const amount = ethers.parseEther("1.0");

      await escrow.connect(payer).createEscrow(agent.address, taskId, { value: amount });

      const e = await escrow.getEscrow(0);
      expect(e.payer).to.equal(payer.address);
      expect(e.agent).to.equal(agent.address);
      expect(e.amount).to.equal(amount);
      expect(e.taskId).to.equal(taskId);
      expect(e.funded).to.be.true;
    });
  });
});
