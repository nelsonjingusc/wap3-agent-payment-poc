# WAP3 Agent Payment & Escrow — Technical Documentation

> **Complete implementation guide for the EVM-based agent payment escrow protocol**

This document provides detailed technical information for developers, integrators, and engineers working with the WAP3 Agent Payment & Escrow proof-of-concept.

For company overview and vision, see [README.md](README.md).

---

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Smart Contract API](#smart-contract-api)
- [Testing](#testing)
- [Deployment](#deployment)
- [Examples](#examples)
- [Gas Optimization](#gas-optimization)
- [Security Considerations](#security-considerations)
- [Contributing](#contributing)

---

## Overview

This PoC demonstrates a minimal escrow system for AI agent payments on EVM-compatible blockchains. The system enables:

1. **Buyers** create escrows and fund them with native tokens
2. **Agents** complete tasks off-chain and submit proof hashes
3. **Verification** happens off-chain (e.g., checking Walrus storage)
4. **Settlement** is executed on-chain via smart contract

### Key Features

- ✅ Native token payments (ETH, MATIC, etc.)
- ✅ Proof-based verification system
- ✅ Refund mechanism for incomplete tasks
- ✅ Full event logging for provenance
- ✅ Gas-optimized implementation
- ✅ Chain-agnostic design

---

## Project Structure

```
wap3-agent-payment-poc/
├── README.md                          # company overview
├── TECHNICAL.md                       # this file
├── LICENSE                            # MIT license
├── contracts/
│   └── AgentEscrow.sol                # core escrow contract
├── scripts/
│   ├── deploy.ts                      # deployment script
│   └── demo-agent-payment.ts          # end-to-end demo
├── test/
│   └── AgentEscrow.test.ts            # comprehensive test suite
├── examples/
│   ├── 01-simple-payment.ts           # basic payment flow
│   ├── 02-refund-scenario.ts          # refund mechanism
│   └── 03-multiple-tasks.ts           # concurrent task handling
├── hardhat.config.ts                  # Hardhat configuration
├── package.json                       # dependencies and scripts
└── tsconfig.json                      # TypeScript configuration
```

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm/yarn
- Basic familiarity with Ethereum and Hardhat

### Installation

```bash
git clone https://github.com/gioroxai/wap3-agent-payment-poc.git
cd wap3-agent-payment-poc
npm install
```

### Compile Contracts

```bash
npm run compile
```

This generates TypeScript types in `typechain-types/` for type-safe contract interaction.

### Run Tests

```bash
npm test
```

Expected output:

```
  AgentEscrow
    Deployment
      ✓ Should initialize with nextEscrowId = 0
    Create Escrow
      ✓ Should create an escrow successfully
      ✓ Should increment escrow ID
      ✓ Should fail if agent is zero address
      ✓ Should fail if no funds sent
    Submit Proof
      ✓ Should allow agent to submit proof
      ✓ Should fail if called by non-agent
      ✓ Should fail if escrow not funded
      ✓ Should fail if already completed
    Release Payment
      ✓ Should release payment to agent
      ✓ Should fail if task not completed
      ✓ Should fail if called by non-payer
      ✓ Should fail if already released
    Refund
      ✓ Should refund payer if task not completed
      ✓ Should fail if task already completed
      ✓ Should fail if called by non-payer
      ✓ Should fail if already refunded
    Get Escrow
      ✓ Should return complete escrow details

  18 passing (472ms)
```

### Local Deployment & Demo

**Terminal 1** — Start local blockchain:

```bash
npm run node
```

**Terminal 2** — Run demo:

```bash
npm run demo
```

You'll see the complete payment flow:

```
=== Demo: Agent Payment Flow ===
Payer: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Agent: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

Initial balances:
  Payer: 10000.0 ETH
  Agent: 10000.0 ETH

Step 1: Payer creates and funds escrow
  Task ID: 0x...
  Amount: 0.05 ETH
  ✓ Escrow created with ID: 0

Step 2: Agent completes task and submits proof
  Proof hash: 0x...
  ✓ Proof submitted

Step 3: Payer verifies proof and releases payment
  ✓ Payment released

Final balances:
  Payer: 9999.949... ETH
  Agent: 10000.05 ETH

Agent received: 0.05 ETH

✓ Demo completed successfully
```

---

## Architecture

### Payment Flow Diagram

```
┌─────────┐                           ┌─────────┐
│  Buyer  │                           │  Agent  │
└────┬────┘                           └────┬────┘
     │                                     │
     │  1. createEscrow(agent, taskId)    │
     │     + fund with ETH                │
     ├────────────────────────────────────┤
     │         [Escrow Created]            │
     │                                     │
     │                                     │  2. Execute task
     │                                     │     off-chain
     │                                     │
     │  3. submitProof(escrowId, hash) ◄──┤
     ├────────────────────────────────────┤
     │       [Proof Submitted]             │
     │                                     │
     │  4. Verify proof off-chain          │
     │     (e.g. check Walrus storage)    │
     │                                     │
     │  5. releasePayment(escrowId)        │
     ├────────────────────────────────────┤
     │      [Payment Released]             │
     │                                     │
     │                              Payment│
     │                              sent to│
     │                                Agent│
     │                                     │
```

### Contract State Machine

```
         ┌─────────┐
         │ CREATED │
         └────┬────┘
              │
              │ submitProof()
              ▼
         ┌─────────┐
         │COMPLETED│
         └────┬────┘
              │
         ┌────┴────┐
         │         │
releasePayment()  refund()
         │         │  (only if NOT completed)
         ▼         ▼
    ┌─────────┐ ┌─────────┐
    │RELEASED │ │REFUNDED │
    └─────────┘ └─────────┘
```

---

## Smart Contract API

### Contract: `AgentEscrow.sol`

#### Data Structures

```solidity
struct Escrow {
    address payer;        // task buyer
    address agent;        // AI agent / service provider
    uint256 amount;       // payment in native token
    bytes32 taskId;       // external task identifier (AP2/X402)
    bytes32 proofHash;    // hash of result stored off-chain
    bool funded;
    bool completed;
    bool released;
    bool refunded;
}
```

#### Public Functions

##### `createEscrow(address agent, bytes32 taskId)`

Create and fund a new escrow.

**Parameters:**
- `agent`: Address of the agent that will complete the task
- `taskId`: External identifier for the task (e.g., AP2/X402 ID, IPFS hash)

**Returns:**
- `escrowId`: The newly created escrow ID

**Requirements:**
- `agent` cannot be zero address
- `msg.value` must be greater than 0

**Emits:** `EscrowCreated(escrowId, payer, agent, amount, taskId)`

**Example:**

```typescript
const taskId = ethers.id("analyze-sentiment-batch-001");
const amount = ethers.parseEther("0.1");

const tx = await escrow.createEscrow(
  agentAddress,
  taskId,
  { value: amount }
);
```

##### `submitProof(uint256 escrowId, bytes32 proofHash)`

Agent submits proof of task completion.

**Parameters:**
- `escrowId`: The escrow identifier
- `proofHash`: Hash of the completed work result (e.g., Walrus blob ID)

**Requirements:**
- Escrow must be funded
- Escrow must not be completed
- Caller must be the designated agent

**Emits:** `ProofSubmitted(escrowId, agent, proofHash)`

**Example:**

```typescript
const proofHash = ethers.keccak256(
  ethers.toUtf8Bytes("walrus://blob-id-abc123")
);

await escrow.connect(agent).submitProof(escrowId, proofHash);
```

##### `releasePayment(uint256 escrowId)`

Payer releases payment to agent after verifying proof.

**Parameters:**
- `escrowId`: The escrow identifier

**Requirements:**
- Escrow must be funded
- Task must be completed (proof submitted)
- Payment must not be already released or refunded
- Caller must be the payer

**Emits:** `PaymentReleased(escrowId, payer, agent, amount)`

**Example:**

```typescript
await escrow.connect(payer).releasePayment(escrowId);
```

##### `refund(uint256 escrowId)`

Payer requests refund if agent never completes task.

**Parameters:**
- `escrowId`: The escrow identifier

**Requirements:**
- Escrow must be funded
- Task must NOT be completed
- Payment must not be already released or refunded
- Caller must be the payer

**Emits:** `PaymentRefunded(escrowId, payer, amount)`

**Example:**

```typescript
await escrow.connect(payer).refund(escrowId);
```

##### `getEscrow(uint256 escrowId)`

Retrieve full escrow details.

**Parameters:**
- `escrowId`: The escrow identifier

**Returns:**
- `Escrow` struct with all escrow details

**Example:**

```typescript
const escrowData = await escrow.getEscrow(0);
console.log("Payer:", escrowData.payer);
console.log("Agent:", escrowData.agent);
console.log("Amount:", ethers.formatEther(escrowData.amount));
console.log("Completed:", escrowData.completed);
```

#### Events

```solidity
event EscrowCreated(
    uint256 indexed escrowId,
    address indexed payer,
    address indexed agent,
    uint256 amount,
    bytes32 taskId
);

event ProofSubmitted(
    uint256 indexed escrowId,
    address indexed agent,
    bytes32 proofHash
);

event PaymentReleased(
    uint256 indexed escrowId,
    address indexed payer,
    address indexed agent,
    uint256 amount
);

event PaymentRefunded(
    uint256 indexed escrowId,
    address indexed payer,
    uint256 amount
);
```

---

## Testing

### Run Test Suite

```bash
npm test
```

### Test with Coverage

```bash
npm run test:coverage
```

### Test with Gas Reporting

```bash
npm run test:gas
```

### Test Structure

The test suite (`test/AgentEscrow.test.ts`) covers:

1. **Deployment** — Contract initialization
2. **Create Escrow** — Valid creation, ID increment, validation
3. **Submit Proof** — Agent submission, authorization, edge cases
4. **Release Payment** — Payment transfer, authorization, state checks
5. **Refund** — Refund mechanism, timing, authorization
6. **Get Escrow** — Data retrieval

All 18 tests pass with 100% coverage of core functionality.

---

## Deployment

### Local Network

1. Start local node:

```bash
npm run node
```

2. Deploy (in another terminal):

```bash
npm run deploy:localhost
```

### Public Testnet (e.g., Sepolia)

1. Create `.env` file:

```env
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

2. Update `hardhat.config.ts`:

```typescript
import * as dotenv from "dotenv";
dotenv.config();

// ... existing config ...

networks: {
  sepolia: {
    url: process.env.SEPOLIA_RPC_URL || "",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  },
},
etherscan: {
  apiKey: process.env.ETHERSCAN_API_KEY,
},
```

3. Deploy:

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

4. Verify on Etherscan:

```bash
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS
```

---

## Examples

The `examples/` directory contains three usage patterns:

### 1. Simple Payment Flow

```bash
npm run example:simple
```

Demonstrates the basic happy path:
- Create escrow
- Submit proof
- Release payment

### 2. Refund Scenario

```bash
npm run example:refund
```

Shows what happens when an agent fails to complete:
- Create escrow
- Agent doesn't submit proof
- Payer requests refund

### 3. Multiple Concurrent Tasks

```bash
npm run example:multiple
```

Demonstrates handling multiple agents simultaneously:
- Create multiple escrows
- Different agents submit proofs
- Batch payment release

---

## Gas Optimization

The contract is optimized for gas efficiency:

### Storage Optimization

- Uses `mapping` instead of arrays for O(1) lookups
- Minimal storage slots per escrow
- Struct packing where possible
- No dynamic arrays or loops

### Typical Gas Costs

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| Create escrow | ~100k | Includes storage + event |
| Submit proof | ~50k | Updates state + event |
| Release payment | ~50k | Transfer + state update |
| Refund | ~40k | Transfer + state update |

### Further Optimizations (Future)

- Batch operations for multiple escrows
- Layer 2 deployment for reduced costs
- EIP-1559 gas estimation
- Signature-based authorization to reduce tx count

---

## Security Considerations

⚠️ **This is a proof of concept and has NOT been audited.**

### Current Security Features

- ✅ Access control (only payer can release/refund, only agent can submit proof)
- ✅ State validation (prevents double-spending, invalid state transitions)
- ✅ Safe transfer pattern (checks return values)
- ✅ No reentrancy vulnerabilities (state updates before external calls)

### Production Requirements

Before mainnet deployment, implement:

- [ ] **Time-based automatic refunds** — Prevent indefinite fund locking
- [ ] **Dispute resolution** — Arbitration for contested results
- [ ] **Emergency pause** — Admin ability to halt contract in emergencies
- [ ] **Rate limiting** — Prevent spam and DoS attacks
- [ ] **Multi-sig payer** — Support DAO and organizational payments
- [ ] **Formal verification** — Mathematical proof of contract correctness
- [ ] **Professional audit** — Third-party security review

### Known Limitations

1. **No timeout mechanism** — Funds can be locked indefinitely if agent never acts
2. **No dispute resolution** — Payer must manually verify proof off-chain
3. **No partial payments** — All-or-nothing payment model
4. **Single payer/agent** — No multi-party escrows
5. **Native token only** — No ERC20 support yet

---

## Contributing

We welcome contributions! This is an early-stage research project.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
git clone https://github.com/gioroxai/wap3-agent-payment-poc.git
cd wap3-agent-payment-poc
npm install
npm run compile
npm test
```

### Code Style

- Follow existing Solidity style (Solidity 0.8.20)
- Use TypeScript for all scripts and tests
- Include comprehensive tests for new features
- Document public functions with NatSpec comments
- Keep gas optimization in mind

---

## NPM Scripts Reference

```bash
npm run compile          # Compile contracts and generate types
npm test                 # Run test suite
npm run test:coverage    # Run tests with coverage report
npm run test:gas         # Run tests with gas reporting
npm run node             # Start local Hardhat node
npm run deploy           # Deploy to default network
npm run deploy:localhost # Deploy to local network
npm run demo             # Run end-to-end demo
npm run example:simple   # Run simple payment example
npm run example:refund   # Run refund example
npm run example:multiple # Run multiple tasks example
npm run clean            # Clean artifacts and cache
```

---

## Technology Stack

- **Solidity 0.8.20** — Smart contract language
- **Hardhat** — Development environment and task runner
- **TypeScript** — Type-safe scripting and testing
- **ethers.js v6** — Ethereum library for contract interaction
- **Mocha/Chai** — Testing framework
- **Typechain** — TypeScript bindings for contracts

---

## License

MIT License — see [LICENSE](LICENSE) file for details.

---

## Support

For technical questions and support:

- 📧 Email: nelsonjing@gioroxai.com
- 🐙 GitHub Issues: [github.com/gioroxai/wap3-agent-payment-poc/issues](https://github.com/gioroxai/wap3-agent-payment-poc/issues)
- 💬 Telegram: [@nelsonjingusc](https://t.me/nelsonjingusc)

---

**[← Back to Company Overview](README.md)**
