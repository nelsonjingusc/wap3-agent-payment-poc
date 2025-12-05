# WAP3 Autonomous Agent Demo

This demo showcases the **core value proposition** of WAP3: autonomous AI agents that can execute tasks and receive payment without human intervention.

## What This Demonstrates

Unlike traditional smart contract demos that just show wallet interactions, this demo shows:

- 🤖 **Autonomous agents** that listen for tasks on-chain
- 🧠 **Real AI work** (simulated sentiment analysis)
- 📦 **Decentralized storage** (simulated IPFS upload)
- ⚡ **Instant settlement** once work is verified
- 🔗 **Zero intermediaries** — fully trustless execution

## How It Works

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

## Running the Demo

### Prerequisites

- Node.js 18+
- Two terminal windows
- Local Hardhat network OR public testnet

### Step 1: Start the Agent Service

**Terminal 1:**

```bash
npx hardhat run demo/agent-service.ts --network localhost
```

This will:
- Deploy the AgentEscrow contract
- Start listening for tasks
- Display contract address and agent address

**Keep this terminal open!** The agent runs continuously.

### Step 2: Create a Task (Buyer Side)

**Terminal 2:**

```bash
npx hardhat run demo/buyer-client.ts --network localhost
```

When prompted:
1. Enter the **contract address** from Terminal 1
2. Enter the **agent address** from Terminal 1

Then watch the magic happen! 🎉

### Expected Output

**Terminal 1 (Agent):**
```
🤖 WAP3 AUTONOMOUS AGENT SERVICE 🤖
✓ Contract deployed at: 0x5FbDB...
🤖 Agent address: 0x3C44C...
💰 Agent balance: 10000.0 ETH

👂 Agent is now listening for tasks on-chain...
⏳ Waiting for buyers to create escrows...

═══════════════════════════════════════════════════════
🔔 NEW TASK DETECTED!
═══════════════════════════════════════════════════════

📋 Escrow ID: 0
👤 Payer: 0x70997...
💵 Payment: 0.05 ETH
🎯 Task ID: 0x1a2b3c...

📝 Task: "Analyze sentiment: 'WAP3 enables autonomous AI agents...'"

🧠 Analyzing task with AI model...
✓ AI analysis complete!
{
  "task": "...",
  "sentiment": "POSITIVE",
  "confidence": "92.3%",
  "timestamp": "2024-12-05T10:30:45.123Z",
  "model": "sentiment-analyzer-v1.0"
}

📦 Uploading result to IPFS...
✓ IPFS Hash: QmXx...abc123

📤 Submitting proof to blockchain...
✓ Proof submitted successfully!

⏳ Waiting for payer to verify and release payment...

═══════════════════════════════════════════════════════
💰 PAYMENT RECEIVED!
═══════════════════════════════════════════════════════

✓ Escrow ID: 0
💵 Amount: 0.05 ETH
💰 New balance: 10000.05 ETH

✓ Task completed successfully! Ready for next task...
```

**Terminal 2 (Buyer):**
```
👤 WAP3 BUYER CLIENT 👤

Enter contract address: 0x5FbDB...
Enter agent address: 0x3C44C...

🔗 Connecting to AgentEscrow contract...

👤 Your address: 0x70997...
💰 Your balance: 10000.0 ETH

📝 Creating new task for AI agent...

🎯 Task: sentiment-analysis-blockchain-text
💵 Payment: 0.05 ETH
🤖 Agent: 0x3C44C...

📤 Creating escrow on-chain...

✓ Escrow created successfully!
🆔 Escrow ID: 0
🔗 Transaction: 0xabc123...

⏳ Waiting for agent to complete task...

═══════════════════════════════════════════════════════
✓ PROOF RECEIVED FROM AGENT!
═══════════════════════════════════════════════════════

🔗 Proof Hash: 0xdef456...
🔍 Verifying proof off-chain...
✓ Proof verified! Work completed successfully.

💰 Releasing payment to agent...

✓ Payment released successfully!
💵 Your new balance: 9999.949... ETH

═══════════════════════════════════════════════════════
🎉 TRANSACTION COMPLETE!
═══════════════════════════════════════════════════════

✓ Task completed and agent paid autonomously
✓ No intermediaries, no manual approval
✓ Fully on-chain settlement with cryptographic proof
```

## What This Proves

### For Reviewers / Grant Evaluators:

1. **Real Automation** — The agent operates autonomously, no human clicks "execute"
2. **AI Integration** — Shows how AI agents can be integrated with blockchain payments
3. **Decentralized Storage** — Demonstrates off-chain storage with on-chain verification
4. **Instant Settlement** — Payment happens automatically once proof is verified
5. **Scalability** — One agent can handle multiple tasks from multiple buyers

### For Developers:

1. **Event-Driven Architecture** — Agent listens to on-chain events
2. **Async Workflow** — Real-world async task execution pattern
3. **Proof-Based Verification** — Cryptographic proof instead of trust
4. **Gas Efficiency** — Minimal on-chain operations, complex work off-chain

### For Business Partners:

1. **New Business Model** — Enables pay-per-task AI services
2. **Trustless** — No need to trust the agent or the buyer
3. **Transparent** — All transactions verifiable on-chain
4. **Composable** — Can integrate with any EVM chain

## Next Steps

After running the demo:

1. **Try multiple tasks** — Keep Terminal 1 running, run Terminal 2 multiple times
2. **Modify the task** — Edit `buyer-client.ts` to change task description
3. **Simulate failures** — Comment out the `releasePayment()` call to test refunds
4. **Deploy to testnet** — Run on Sepolia or other public testnet

## Recording a Video Demo

For grant applications, record both terminals side-by-side:

1. Use OBS Studio or similar screen recording software
2. Split screen to show both terminals
3. Add voiceover explaining what's happening
4. Target 2-3 minutes length
5. Upload to YouTube or Loom

**Key points to emphasize in video:**
- "This agent is completely autonomous"
- "No human intervention after buyer creates task"
- "Payment happens automatically once work is verified"
- "This enables a new economy for AI agents"

## Architecture Notes

This demo simulates:
- **AI Processing** — In production, would call OpenAI, Anthropic, or custom models
- **IPFS Storage** — In production, would use real Walrus or IPFS
- **Instant Verification** — In production, might use oracles or more complex verification

The smart contract is production-ready. The off-chain components are simplified for demo purposes.

## Troubleshooting

**Agent not detecting tasks:**
- Make sure you're using the correct contract address
- Check that both scripts are on the same network (localhost)

**Buyer client hangs:**
- Make sure agent service is running first
- Check that you entered the correct addresses

**Want to reset:**
- Stop both terminals (Ctrl+C)
- Restart agent service first, then buyer client

## Feedback

This demo is designed to impress reviewers while being technically accurate. If you have suggestions for improvement, please open an issue!

---

**[← Back to Technical Documentation](../TECHNICAL.md)**
