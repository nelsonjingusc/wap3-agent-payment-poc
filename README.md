# WAP3 – Agent Payment & Escrow PoC

> **GioroX AI, Inc.** — Web3-based Agent Payment & Provenance Platform

This repository contains a minimal **proof-of-concept for AI agent payments on an EVM chain**. It demonstrates how an AI task can be:

1. created and funded by a buyer,
2. claimed and completed by an agent,
3. verified via an off-chain proof hash, and
4. settled automatically through a smart-contract escrow.

The same pattern will be used in **WAP3** to connect AP2/X402-compatible agents with on-chain settlement, verifiable storage (e.g. Walrus), and multi-chain payment rails.

This PoC is chain-agnostic and can be deployed to:

- a local Hardhat network,
- any EVM-compatible testnet, or
- an EVM-based GPU network such as **Aethir** in future integrations.

---

## About GioroX AI

**GioroX AI, Inc.** builds programmable settlement and escrow protocols that enable autonomous AI agents to transact, verify, and collaborate securely across Web3 ecosystems.

### Our Vision

Building the programmable financial layer for the Agent Economy.

We believe that for AI agents to truly operate autonomously in the economy, they need native payment rails that are:

- **Fast**: sub-second settlement, not batch processed over days
- **Trustless**: programmable escrow without intermediaries
- **Verifiable**: cryptographic proof of work completion
- **Economical**: micro-payments at AI speed without prohibitive fees

Traditional payment systems (Stripe, PayPal, bank transfers) were designed for humans and fail to meet the requirements of AI-to-AI commerce. WAP3 provides the foundational infrastructure to enable:

- **Agent marketplaces** where AI agents discover and bid on tasks
- **Verifiable execution** with cryptographic proofs stored on decentralized networks
- **Automated settlement** based on programmable smart contract logic
- **Multi-chain support** for seamless payments across different blockchain ecosystems

### Current Status

- ✅ **Incorporated**: Delaware (October 2024)
- 🚀 **Participant**: BTCFi & Payments Fellowship powered by Press Start Capital, Sui, and Walrus
- 🔬 **Research Focus**: Move-based smart contracts and decentralized storage on Sui/Walrus
- 🛠️ **Active Development**: EVM-compatible escrow protocols (this repository)

This repository represents our first public building block towards that vision.

---

## Why This Matters

AI agents are starting to complete real work — monitoring, content analysis, pricing checks, data processing, and more. However, there is still **no native way for agents to lock funds, verify execution, and release payments autonomously**.

Traditional payment rails:

- are too slow (seconds instead of sub-second settlement),
- too expensive for micro-transactions ($0.30 + 2.9% vs. fractions of a cent),
- require human authentication in the loop,
- lack verifiable proof of work completion.

**WAP3** provides:

- programmable escrow on-chain,
- proof-based verification (via external storage like Walrus),
- automatic settlement once conditions are met,
- micro-payments at AI speed,
- full on-chain provenance and audit trail.

This repository is the first public building block: a simple escrow contract plus scripts that simulate a buyer and an agent interacting programmatically.

---

## Project Structure

```
wap3-agent-payment-poc/
├── README.md                          # this file
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
├── package.json                       # dependencies
└── tsconfig.json                      # TypeScript configuration
```

### Contract: `AgentEscrow.sol`

Minimal escrow contract for agent tasks. Supports:

- creation and funding by a buyer (in native token),
- submission of a result proof hash by the agent,
- release or refund by the buyer,
- fully on-chain event log for provenance.

### Scripts

- **`deploy.ts`**: Hardhat script to deploy the `AgentEscrow` contract.
- **`demo-agent-payment.ts`**: A complete TypeScript script that:
  1. deploys the contract,
  2. simulates a buyer funding an agent task,
  3. simulates the agent submitting a proof hash,
  4. releases the payment on success.

### Tests

- **`AgentEscrow.test.ts`**: Comprehensive test suite covering:
  - escrow creation and funding,
  - proof submission,
  - payment release,
  - refund mechanism,
  - edge cases and error conditions.

### Examples

- **`01-simple-payment.ts`**: Basic happy path demonstration
- **`02-refund-scenario.ts`**: Shows refund mechanism when agent fails to complete
- **`03-multiple-tasks.ts`**: Demonstrates concurrent task handling for multiple agents

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm/yarn
- Basic familiarity with Ethereum and Hardhat

### Installation

```bash
git clone https://github.com/yourorg/wap3-agent-payment-poc.git
cd wap3-agent-payment-poc
npm install
```

### Compile Contracts

```bash
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
```

You should see output confirming all test cases pass:

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
      ...
```

### Local Deployment & Demo

1. **Start a local Hardhat node**

```bash
npx hardhat node
```

This will start a local Ethereum node at `http://127.0.0.1:8545` with 20 pre-funded test accounts.

2. **Deploy the contract** (in a new terminal)

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

You'll see output like:

```
Deploying AgentEscrow with account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Account balance: 10000.0 ETH
AgentEscrow deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

3. **Run the end-to-end demo**

```bash
npx hardhat run scripts/demo-agent-payment.ts --network localhost
```

You should see a complete payment flow:

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

### Run Examples

The `examples/` directory contains additional usage patterns:

```bash
# Basic payment flow
npx hardhat run examples/01-simple-payment.ts --network localhost

# Refund scenario
npx hardhat run examples/02-refund-scenario.ts --network localhost

# Multiple concurrent tasks
npx hardhat run examples/03-multiple-tasks.ts --network localhost
```

---

## Architecture Overview

### Payment Flow

```
┌─────────┐                           ┌─────────┐
│  Buyer  │                           │  Agent  │
└────┬────┘                           └────┬────┘
     │                                     │
     │  1. createEscrow(agent, taskId)    │
     │     + fund with ETH                │
     ├────────────────────────────────────┤
     │                                     │
     │                                     │  2. Execute task
     │                                     │     off-chain
     │                                     │
     │  3. submitProof(escrowId, hash) ◄──┤
     ├────────────────────────────────────┤
     │                                     │
     │  4. Verify proof off-chain          │
     │     (e.g. check Walrus storage)    │
     │                                     │
     │  5. releasePayment(escrowId)        │
     ├────────────────────────────────────┤
     │                                     │
     │                              Payment│
     │                              sent to│
     │                                Agent│
     │                                     │
```

### Future Extensions

This PoC will be extended in the full WAP3 project to:

- **Integrate AP2/X402 protocols**: Connect with standardized agent communication protocols
- **Walrus storage integration**: Store and verify task results on decentralized storage
- **Multi-token support**: Accept USDC, USDT, and other stablecoins
- **Oracle integration**: Enable automated verification through Chainlink or similar oracles
- **Aethir GPU provider integration**: Support metered, verifiable AI workloads on GPU networks
- **Batch payments**: Optimize gas costs for high-frequency micro-transactions
- **Dispute resolution**: Implement arbitration mechanisms for contested results
- **Agent reputation system**: Track performance and reliability metrics on-chain

---

## Technical Details

### Stack

- **Solidity 0.8.20**: Smart contract language
- **Hardhat**: Development environment and task runner
- **TypeScript**: Type-safe scripting and testing
- **ethers.js v6**: Ethereum library for contract interaction
- **Mocha/Chai**: Testing framework

### Gas Optimization

The contract is optimized for gas efficiency:

- Uses `mapping` instead of arrays for O(1) lookups
- Minimal storage slots per escrow
- No loops or unbounded operations
- Struct packing where possible

Typical gas costs on a local network:

- Create escrow: ~100k gas
- Submit proof: ~50k gas
- Release payment: ~50k gas
- Refund: ~40k gas

### Security Considerations

This is a **proof of concept** and has not been audited. For production use:

- Implement time-based automatic refunds
- Add dispute resolution mechanisms
- Consider using a factory pattern for multiple escrow types
- Implement emergency pause functionality
- Add signature-based verification for proof hashes
- Consider reentrancy guards (though current implementation is safe)

---

## Testing

Run the full test suite:

```bash
npx hardhat test
```

Run tests with coverage:

```bash
npx hardhat coverage
```

Run tests with gas reporting:

```bash
REPORT_GAS=true npx hardhat test
```

---

## Deployment to Testnets

To deploy to a public testnet (e.g., Sepolia):

1. Create a `.env` file:

```env
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

2. Update `hardhat.config.ts` to include testnet configuration:

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

## Use Cases

### 1. Content Analysis Agents

An AI agent analyzes sentiment in social media posts. The buyer creates an escrow, the agent processes the data and stores results on Walrus, submits the proof hash, and receives payment automatically.

### 2. Data Extraction Services

Agents scrape and structure data from various sources. Payment is held in escrow until the structured data is verified and accessible via the proof hash.

### 3. Image/Video Processing

GPU-intensive tasks like image classification or video transcription are completed by agents with access to compute resources. Proof of completion is submitted and payment is released upon verification.

### 4. Monitoring & Alerting

Agents continuously monitor blockchain or web data and submit periodic reports. Each report triggers a small payment from escrow.

---

## Contributing

This is an early-stage research project. Contributions, feedback, and suggestions are welcome.

To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see LICENSE file for details

---

## Contact & Support

**GioroX AI, Inc.**

- **Founder**: Nan (Nelson) Jing
- **Email**: nelsonjing@gioroxai.com, nelson.jingusc@gmail.com
- **Telegram**: [@nelsonjingusc](https://t.me/nelsonjingusc)

For questions, partnership inquiries, or collaboration opportunities, please reach out via email or Telegram.

---

## Roadmap

- [x] PoC smart contract implementation
- [x] Comprehensive test suite
- [x] Example scripts and documentation
- [ ] Walrus storage integration
- [ ] AP2/X402 protocol adapters
- [ ] Multi-token support (USDC, USDT)
- [ ] Oracle-based automated verification
- [ ] Aethir GPU network integration
- [ ] Agent marketplace frontend
- [ ] Security audit
- [ ] Mainnet deployment

---

## Acknowledgments

This project builds on the broader vision of autonomous AI agent economies. We're inspired by:

- The Web3 ecosystem's commitment to decentralization and transparency
- The emerging AP2/X402 agent protocol standards
- Walrus and other decentralized storage solutions
- The Aethir GPU network and similar compute providers
- The broader AI agent research community

---

**Built with ❤️ by GioroX AI, Inc.**
