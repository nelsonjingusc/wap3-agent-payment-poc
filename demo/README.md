# WAP3 Demo Guide

## 🎯 Quick Start

**Run the complete demo in one command:**

```bash
./demo/run_mvp_demo.sh
```

This demonstrates the full agent transaction lifecycle:
- AP2 Intent → X402 Trigger → Escrow → Proof → Settlement → Audit

**Expected output:**
```
MVP:AP2_INTENT_ID=0x...
MVP:X402_PAYMENT_ID=0x...
MVP:ESCROW_ID=0
MVP:PROOF_HASH=0x...
MVP:SETTLE_TX=0x...
MVP:AUDIT_JSON=demo/out/session_*/audit.json
```

---

## 🎬 Demo Modes

### Mode 1: MVP Demo (One-Command, Recommended)

**Best for presentations and video demos:**

```bash
./demo/run_mvp_demo.sh
```

**What it does:**
1. Starts Hardhat node (if needed)
2. Deploys AgentEscrow contract
3. Starts autonomous agent service
4. Creates escrow with AP2 intent and X402 trigger
5. Waits for agent to complete task
6. Settles payment automatically
7. Generates audit JSON record

**Features:**
- ✅ Non-interactive (no manual input)
- ✅ Stable output (MVP: prefixes for parsing)
- ✅ Complete audit trail
- ✅ Auto-compile detection (falls back to --no-compile if needed)

### Mode 2: Dual-Agent Demo (LangGraph Integration)

**Showcases two agents collaborating:**

```bash
npm run demo:dual-agent
```

**What it demonstrates:**
- 🤖 **Buyer Agent** (LangGraph): Task planning → Intent → Trigger → Escrow
- 🤖 **Service Agent**: Listen → Execute → Submit Proof
- ✅ Full LangGraph workflow orchestration
- ✅ Real multi-agent collaboration

### Mode 3: Manual Two-Terminal Demo

**For interactive testing and debugging:**

**Terminal 1 - Start Service Agent:**
```bash
npm run demo:agent
```

Wait for output:
```
MVP_INFO contract=0x... agent=0x... rpc=http://127.0.0.1:8545
```

**Terminal 2 - Run Buyer Client:**
```bash
npm run demo:buyer
```

Or use LangGraph Buyer Agent:
```bash
npm run demo:buyer-agent
```

---

## 📋 Prerequisites

- Node.js 18+ and npm
- Hardhat development environment
- Local Hardhat node (auto-started by scripts)

**Installation:**
```bash
npm install
```

---

## 🔍 What Gets Demonstrated

### For Reviewers / Grant Evaluators

1. **Real Automation** - Agent operates autonomously, no human clicks
2. **AI Integration** - Shows how AI agents integrate with blockchain payments
3. **Decentralized Storage** - Demonstrates off-chain storage with on-chain verification
4. **Instant Settlement** - Payment happens automatically once proof is verified
5. **Scalability** - One agent can handle multiple tasks from multiple buyers

### For Developers

1. **Event-Driven Architecture** - Agent listens to on-chain events
2. **Async Workflow** - Real-world async task execution pattern
3. **Proof-Based Verification** - Cryptographic proof instead of trust
4. **Gas Efficiency** - Minimal on-chain operations, complex work off-chain

### For Business Partners

1. **New Business Model** - Enables pay-per-task AI services
2. **Trustless** - No need to trust the agent or the buyer
3. **Transparent** - All transactions verifiable on-chain
4. **Composable** - Can integrate with any EVM chain

---

## 📁 Output Files

All demo runs generate files in `demo/out/`:

- `mvp_runtime.json` - Runtime configuration (contract, agent, rpc)
- `session_*/intent.json` - AP2 intent data
- `session_*/trigger.json` - X402 trigger data
- `session_*/audit.json` - Complete audit record

**Example audit structure:**
```json
{
  "intent": {
    "intent_id": "0x...",
    "ap2_version": "2025-q3",
    "hash": "0x..."
  },
  "trigger": {
    "x402_version": "2025-q2",
    "payment_id": "0x...",
    "hash": "0x..."
  },
  "escrow": {
    "escrow_id": 0,
    "payer": "0x...",
    "agent": "0x...",
    "amount": "0.05",
    "status": "settled"
  },
  "proof": {
    "proof_hash": "0x...",
    "uri": "walrus://..."
  },
  "tx": {
    "create_tx": "0x...",
    "proof_tx": "0x...",
    "settle_tx": "0x..."
  },
  "chain": {
    "name": "hardhat-local",
    "chain_id": 31337
  }
}
```

---

## 🔧 Troubleshooting

### Demo script hangs or fails

1. **Check Hardhat node:**
   ```bash
   curl http://127.0.0.1:8545
   ```

2. **Check agent logs:**
   ```bash
   tail -f /tmp/wap3_agent.log
   ```

3. **Check compile logs:**
   ```bash
   cat /tmp/wap3_compile.log
   ```

### Port 8545 already in use

```bash
# Find and kill process
lsof -ti:8545 | xargs kill -9
```

### Clean output files

```bash
rm -rf demo/out/*
```

---

## 🎥 Recording a Video Demo

For grant applications or presentations:

1. Use OBS Studio or similar screen recording software
2. Run `./demo/run_mvp_demo.sh`
3. Capture the terminal output
4. Target 45-60 seconds length
5. Highlight key MVP outputs

**Key points to emphasize:**
- "This agent is completely autonomous"
- "No human intervention after buyer creates task"
- "Payment happens automatically once work is verified"
- "This enables a new economy for AI agents"

---

## 🏗️ Architecture

```
┌─────────────────┐                    ┌─────────────────┐
│  Buyer Client   │                    │  Agent Service  │
│   (Terminal 2)  │                    │   (Terminal 1)  │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │  1. Creates task + funds escrow     │
         ├─────────────────────────────────────>│
         │                                      │
         │                        2. Detects new task
         │                        3. Executes AI work
         │                        4. Uploads to IPFS
         │                        5. Submits proof
         │                                      │
         │<─────────────────────────────────────┤
         │  6. Receives proof                   │
         │  7. Verifies (off-chain)             │
         │  8. Releases payment                 │
         ├─────────────────────────────────────>│
         │                                      │
         │                        9. Payment received!
         │                        10. Ready for next task
```

---

## 📚 Next Steps

After running the demo:

1. **Try multiple tasks** - Keep agent running, run buyer multiple times
2. **Modify the task** - Edit `buyer-client.ts` to change task description
3. **Simulate failures** - Comment out `releasePayment()` to test refunds
4. **Deploy to testnet** - Run on Sepolia or other public testnet
5. **Explore adapters** - Check `adapters/` for framework integration examples

---

## 🔗 Related Documentation

- **[Main README](../README.md)** - Project overview
- **[Technical Docs](../TECHNICAL.md)** - Smart contract API
- **[Adapters](../adapters/)** - Framework integration examples
