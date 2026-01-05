# GioroX AI, Inc.

**Building the programmable financial layer for the Agent Economy.**

---

## 🚀 Quick Start - Run the Demos

### Sui + Walrus Demo (Recommended)

**See agent payments on Sui Testnet:**

```bash
npm run demo:sui
```

**What it demonstrates:**
- ✅ Real Sui testnet transactions
- ✅ Complete task lifecycle (create → claim → execute → verify → settle)
- ✅ Walrus decentralized storage integration
- ✅ 0.1 SUI payment automation
- ✅ On-chain provenance verification

### Agent Framework Demos

**LangChain Agent Demo:**
```bash
npm run demo:langchain
```
Simulated AI agent using LangChain tools for autonomous task management.

**LangGraph Workflow Demo:**
```bash
npm run demo:langgraph
```
Stateful workflow with automatic state transitions.

**MCP Protocol Demo:**
```bash
npm run demo:mcp
```
Model Context Protocol integration for tool discovery and execution.

### Legacy EVM Demo

```bash
./demo/run_mvp_demo.sh
```

**What it demonstrates:**
- ✅ AP2 Intent creation (Google AP2)
- ✅ X402 Payment trigger (Coinbase X402)
- ✅ EVM-compatible escrow
- ✅ Complete audit trail export

---

## 📖 Documentation

### Sui Implementation
- **[Sui Setup Guide](docs/SUI_SETUP.md)** - Complete setup and deployment guide
- **[Sui Architecture](docs/SUI_ARCHITECTURE.md)** - Technical architecture and design
- **[Sui Demo](demo/sui-demo.ts)** - End-to-end demo source code

### Agent Framework Integration
- **[LangChain Tools](adapters/langchain-tools/README.md)** - DynamicStructuredTool wrappers
- **[LangGraph Workflow](adapters/sui-langgraph/README.md)** - Stateful workflow implementation
- **[MCP Server](src/mcp/server.ts)** - Model Context Protocol server

### Legacy EVM
- **[Demo Guide](demo/README.md)** - EVM demo instructions
- **[Technical Documentation](TECHNICAL.md)** - Smart contract API
- **[Execution Layer](execution/nosana/README.md)** - Nosana integration

---

## About Us

### **GIOROX AI, INC.**

**Building the programmable financial layer for the Agent Economy.**

GioroX AI, Inc. is building the infrastructure that enables autonomous AI agents to transact, verify, and collaborate securely across Web3 ecosystems—without human intervention.

We're creating a new economic paradigm where AI agents can discover work, complete tasks, prove execution, and settle payments entirely on-chain. Our programmable settlement and escrow protocols unlock true agent autonomy by providing trustless, cryptographic guarantees for AI-to-AI commerce.

---

## Our Vision

The future of AI is autonomous, and autonomy requires economic independence.

Traditional payment systems (Stripe, PayPal, bank transfers) were designed for humans and fail to meet the requirements of AI-to-AI commerce:

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

WAP3 enables autonomous AI agents to transact, verify, and collaborate securely across Web3 ecosystems without human intervention.

### Key Features

#### Core Infrastructure
- **Programmable Escrow** -  On-chain escrow with smart contract automation
- **Proof-Based Verification** - Cryptographic proofs stored on decentralized storage (Walrus, IPFS)
- **Sub-Second Settlement** - Micro-payment support with instant verification
- **Multi-Chain Support** - Works on EVM and Sui blockchains
- **Full Provenance** - Immutable on-chain audit trails
- **Zero Intermediaries** - Trustless, cryptographic guarantees

#### Agent Framework Integration (NEW! ✨)

**LangChain Tools** - Ready-to-use tools for AI agents:
- ✅ 6 DynamicStructuredTool wrappers with Zod validation
- ✅ Type-safe interfaces for all WAP3 operations
- ✅ Comprehensive error handling
- ✅ Works with any LangChain-based agent

**LangGraph Workflow** - Stateful workflow orchestration:
- ✅ Pre-built workflow nodes for complete task lifecycle
- ✅ State management with WorkflowState interface
- ✅ Conditional branching and error recovery
- ✅ Easy integration with @langchain/langgraph

**MCP (Model Context Protocol) Server** - Industry-standard tool protocol:
- ✅ Full MCP protocol implementation
- ✅ Tool discovery and schema validation
- ✅ Compatible with Claude Desktop and other MCP clients
- ✅ Language-agnostic architecture

**Key Benefits**:
- 🤖 Plug-and-play integration with popular AI frameworks
- 🔒 Type-safe with zero compilation errors
- 📝 Comprehensive documentation and examples
- 🧪 Production-ready code with complete demos

### Use Cases

1. **Agent Marketplaces** - AI agents discover and bid on tasks autonomously
2. **Verifiable Execution** - Cryptographic proofs stored on decentralized networks
3. **Automated Settlement** - Smart contracts release payments when conditions are met
4. **Cross-Chain Payments** - Seamless transactions across different blockchain ecosystems

---

## 🏗️ Architecture

### Core Components

- **Smart Contract** (`contracts/AgentEscrow.sol`) - On-chain escrow and settlement
- **Protocol Layer** (`src/protocol/`) - AP2 Intent and X402 Trigger schemas
- **WAP3 SDK** (`src/wap3/`) - Client library for escrow operations
- **Execution Layer** (`execution/`) - Abstraction for task execution providers (Nosana, etc.)
- **Adapters** (`adapters/`) - Framework integration examples

### Transaction Lifecycle

```
1. Intent Creation (AP2)
   └─> Buyer creates task intent
   
2. Payment Trigger (X402)
   └─> Payment conditions defined
   
3. Escrow Creation
   └─> Funds locked on-chain
   
4. Task Execution
   └─> Agent executes work (via Execution Layer, e.g., Nosana)
   
5. Proof Submission
   └─> Cryptographic proof stored
   
6. Settlement
   └─> Payment released automatically
   
7. Audit
   └─> Complete transaction record
```

---

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/gioroxai/wap3-agent-payment-poc.git
cd wap3-agent-payment-poc

# Install dependencies
npm install

# Compile contracts (optional, demo auto-detects)
npm run compile
```

---

## 🎬 Demo Modes

### Mode 1: MVP Demo (One-Command, Recommended)

**Perfect for presentations and video demos:**

```bash
./demo/run_mvp_demo.sh
```

**Features:**
- One-command execution
- Non-interactive
- Stable output with MVP: prefixes
- Complete audit JSON generation

### Mode 2: Dual-Agent Demo (LangGraph Integration)

**Showcases multi-agent collaboration:**

```bash
npm run demo:dual-agent
```

**Features:**
- Two agents collaborating (Buyer Agent + Service Agent)
- LangGraph workflow orchestration
- Framework integration demonstration

### Mode 3: Manual Two-Terminal Demo

**For interactive testing:**

```bash
# Terminal 1: Start agent service
npm run demo:agent

# Terminal 2: Create task
npm run demo:buyer
```

See [demo/README.md](demo/README.md) for detailed instructions.

---

## 🧪 Testing

```bash
# Run test suite
npm test

# Run with coverage
npm run test:coverage

# Run with gas reporting
npm run test:gas
```

**Test Results:** 18/18 passing ✅

---

## 📚 Project Structure

```
wap3-agent-payment-poc/
├── contracts/                # Smart Contracts
│   ├── AgentEscrow.sol       # EVM implementation
│   └── sui/                  # Sui Move contracts ✨
│       ├── Move.toml         # Package manifest
│       └── sources/
│           ├── task_contract.move    # Core escrow contract
│           └── reputation.move       # Reputation tracking
├── src/                      # TypeScript SDK and utilities
│   ├── protocol/             # AP2 Intent + X402 Trigger schemas
│   ├── wap3/                 # WAP3 client library (EVM)
│   ├── sui/                  # Sui blockchain client ✨
│   ├── walrus/               # Walrus storage client ✨
│   ├── mcp/                  # MCP server and tools ✨ NEW!
│   │   └── server.ts         # Model Context Protocol server
│   └── utils/                # Chain config and utilities
├── adapters/                 # Framework integration ✨ NEW!
│   ├── langchain-tools/      # LangChain DynamicStructuredTool wrappers
│   │   ├── wap3-tools.ts     # 6 tool implementations
│   │   └── README.md         # Tool documentation
│   ├── sui-langgraph/        # LangGraph workflow adapter
│   │   ├── workflow.ts       # Stateful workflow nodes
│   │   └── README.md         # Workflow documentation
│   ├── langgraphjs/          # Legacy LangGraph adapter (EVM)
│   └── tool_agent/           # Legacy tool-agent adapter (EVM)
├── demo/                     # Demo scripts and examples
│   ├── sui-demo.ts           # Sui + Walrus demo ✨
│   ├── langchain-agent-demo.ts  # LangChain agent demo ✨ NEW!
│   ├── langgraph-workflow-demo.ts  # LangGraph workflow demo ✨ NEW!
│   ├── mcp-client-demo.ts    # MCP client demo ✨ NEW!
│   ├── run_mvp_demo.sh       # One-command MVP demo (EVM)
│   ├── run_dual_agent_demo.sh
│   └── ...
├── docs/                     # Documentation
│   ├── SUI_SETUP.md          # Sui installation guide ✨
│   └── SUI_ARCHITECTURE.md   # Technical architecture ✨
├── test/                     # Test suite
├── examples/                 # Usage examples
└── sui.config.ts             # Sui & Walrus configuration ✨
```

**✨ = New in this release**


---

## 🔗 Chain Support

### EVM Chains
**Default:** Hardhat Local (Chain ID: 31337)

**Also Supports:**
- Sepolia Testnet (Chain ID: 11155111)
- Any EVM-compatible chain (via `hardhat.config.ts`)

### Sui Blockchain
**Default:** Sui Testnet

**Also Supports:**
- Sui Devnet
- Sui Mainnet
- Local Sui Network

The protocol is **chain-agnostic** - core intent/trigger/audit layers work across all chains.

---

## 🔧 Development

### Sui Development
```bash
# Build Sui Move contracts
npm run build:sui

# Test Sui contracts
npm run test:sui

# Run Sui demo
npm run demo:sui

# Run agent framework demos
npm run demo:langchain
npm run demo:langgraph  
npm run demo:mcp

# Start MCP server
npm run mcp:server
```

### EVM Development
```bash
# Start local Hardhat node
npm run node

# Deploy contract
npm run deploy:localhost

# Run specific demo
npm run demo:agent
npm run demo:buyer
npm run demo:dual-agent
```

### TypeScript Compilation
```bash
# Build TypeScript
npm run build

# Run tests
npm test
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 👥 About

**GioroX AI, Inc.** - Building the programmable financial layer for the Agent Economy.

For more information, visit our [Technical Documentation](TECHNICAL.md).

---

**Built with ❤️ by GioroX AI, Inc.**
