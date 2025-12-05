# GioroX AI, Inc.

**Building the programmable financial layer for the Agent Economy.**

---

## About Us

**GioroX AI** builds programmable settlement and escrow protocols that enable autonomous AI agents to transact, verify, and collaborate securely across Web3 ecosystems.

We're creating the infrastructure that allows AI agents to autonomously execute economic transactions without human intervention—enabling a new paradigm where agents can discover work, complete tasks, prove execution, and settle payments entirely on-chain.

---

## Our Vision

The future of AI is autonomous, and autonomy requires economic independence.

Traditional payment systems (Stripe, PayPal, bank transafers) were designed for humans and fail to meet the requirements of AI-to-AI commerce:

- ❌ Too slow (days vs. milliseconds)
- ❌ Too expensive for micro-transactions ($0.30 + 2.9% per transaction)
- ❌ Require human authentication
- ❌ No cryptographic proof of work completion
- ❌ Centralized intermediaries

**GioroX AI provides:**

- ✅ **Programmable escrow** on-chain with smart contract automation
- ✅ **Proof-based verification** via decentralized storage (Walrus, IPFS)
- ✅ **Sub-second settlement** with micro-payment support
- ✅ **Multi-chain support** across EVM, Move, and other ecosystems
- ✅ **Full provenance** with immutable on-chain audit trails
- ✅ **Zero intermediaries** with trustless, cryptographic guarantees

---

## Current Status

| Status | Details |
|--------|---------|
| **Incorporated** | Delaware, October 2025 |
| **Active Development** | EVM-compatible escrow protocols (see [Technical Documentation](TECHNICAL.md)) |
| **Stage** | Early-stage R&D, building foundational infrastructure |

---

## What We're Building

### WAP3 — Web3 Agent Payment & Provenance Platform

WAP3 is a comprehensive infrastructure layer that enables:

1. **Agent Marketplaces** — AI agents discover and bid on tasks autonomously
2. **Verifiable Execution** — Cryptographic proofs stored on decentralized networks
3. **Automated Settlement** — Smart contracts release payments when conditions are met
4. **Cross-Chain Payments** — Seamless transactions across different blockchain ecosystems

### This Repository: Agent Payment & Escrow PoC

This repository contains our first public proof-of-concept: a minimal escrow contract for AI agent payments on EVM chains.

**What it demonstrates:**
- 🔒 Escrow creation and funding by a task buyer
- 🤖 Task completion and proof submission by an AI agent
- ✅ Off-chain verification via proof hash
- 💰 Automatic payment settlement on-chain

**Quick stats:**
- ✅ 18 comprehensive tests (100% passing)
- ✅ Full TypeScript support with auto-generated types
- ✅ Gas-optimized contracts (~100k gas for escrow creation)
- ✅ Chain-agnostic (works on any EVM network)

👉 **[Read the Technical Documentation](TECHNICAL.md)** for implementation details, quick start guide, and API reference.

---

## Use Cases

Our infrastructure enables a new class of autonomous agent applications:

### 1. **Content Analysis & Monitoring**
AI agents analyze sentiment, extract insights, or monitor social media—receiving automatic payment upon proof of completion.

### 2. **Data Processing Services**
Agents scrape, clean, and structure data from various sources. Payment is held in escrow until verified results are delivered.

### 3. **GPU-Intensive Compute**
Image classification, video transcription, model training—agents with compute resources complete tasks and receive metered payments.

### 4. **Blockchain Monitoring & Alerting**
Agents monitor on-chain events and submit periodic reports, triggering micro-payments for each verified submission.

### 5. **Multi-Agent Collaboration**
Complex tasks split across multiple specialized agents, with payment distribution based on verified contributions.

---

## Roadmap

### ✅ Phase 1: Foundation (Current)
- [x] EVM escrow contract implementation
- [x] Comprehensive test suite
- [x] TypeScript SDK and examples
- [x] Technical documentation

### 🚧 Phase 2: Decentralized Storage Integration (Q1 2026)
- [ ] Walrus storage integration for proof verification
- [ ] IPFS support for task specifications and results
- [ ] Automated proof validation via oracles

### 🔮 Phase 3: Multi-Chain & Protocol Integration (Q2 2026)
- [ ] Move-based contracts on Sui
- [ ] AP2/X402 agent protocol adapters
- [ ] Multi-token support (USDC, USDT, stablecoins)
- [ ] Cross-chain payment rails

### 🚀 Phase 4: Production Infrastructure (Q3 2026)
- [ ] Agent marketplace frontend
- [ ] Reputation and dispute resolution system
- [ ] Security audit and formal verification
- [ ] Mainnet deployment
- [ ] GPU network integration (Aethir, etc.)

---

## Technology Stack

**Current (EVM PoC):**
- Solidity 0.8.20
- Hardhat development environment
- TypeScript + ethers.js v6
- Comprehensive Mocha/Chai test suite

**Future:**
- Move language for Sui integration
- Walrus for decentralized storage
- Chainlink oracles for automated verification
- Layer 2 solutions for gas optimization

---

## Get Involved

We're in active development and welcome collaboration from:

- 🏢 **Partners & Integrators** — GPU providers, storage networks, agent frameworks
- 💼 **Investors** — Building the future of autonomous agent economies
- 👨‍💻 **Developers** — Contribute to our open-source infrastructure
- 🔬 **Researchers** — Explore agent economics and verification mechanisms

---

## Contact

**GioroX AI, Inc.**

- 📧 **Email**: nelsonjing@gioroxai.com, nelson.jingusc@gmail.com
- 💬 **Telegram**: [@nelsonjingusc](https://t.me/nelsonjingusc)

**Founder**: Nan (Nelson) Jing

For partnership inquiries, investment opportunities, or technical collaboration, please reach out via email or Telegram.

---

## Quick Links

- 📖 **[Technical Documentation](TECHNICAL.md)** — Full implementation guide, API reference, and quick start
- 📝 **[Smart Contract](contracts/AgentEscrow.sol)** — Escrow contract source code
- 🧪 **[Test Suite](test/AgentEscrow.test.ts)** — Comprehensive test coverage
- 💡 **[Examples](examples/)** — Usage examples and patterns
- 📄 **[License](LICENSE)** — MIT License

---

## Acknowledgments

This project builds on the broader vision of autonomous AI agent economies. We're inspired by and grateful to:

- The Web3 ecosystem's commitment to decentralization and transparency
- Press Start Capital, Sui Foundation, and Walrus for fellowship support
- The emerging AP2/X402 agent protocol standards community
- The broader AI agent research and development community
- All open-source contributors to the Ethereum and Move ecosystems

---

<div align="center">

**Built with ❤️ by GioroX AI, Inc.**

_Enabling the autonomous agent economy, one transaction at a time._

[Website](https://www.gioroxai.com) • [Technical Docs](TECHNICAL.md) • [Contact](mailto:nelsonjing@gioroxai.com)

</div>
