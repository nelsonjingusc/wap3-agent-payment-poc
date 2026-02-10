# Dual-Agent Demo - Buyer Agent (LangGraph) + Service Agent

## Overview

This demo showcases **two AI agents collaborating**:

1. **Buyer Agent (LangGraph)**: Uses LangGraph to orchestrate task creation workflow
   - Task planning
   - Create AP2 Intent
   - Create X402 Trigger
   - Create Escrow
   - Monitor and settle payment

2. **Service Agent**: Executes tasks and submits proof
   - Listens for on-chain escrow events
   - Executes sentiment analysis task
   - Submits proof to blockchain

## Running the Demo

### Option 1: One-Command Dual-Agent Demo

```bash
npm run demo:dual-agent
```

Or:

```bash
./demo/run_dual_agent_demo.sh
```

This will:
1. Start Hardhat node
2. Deploy AgentEscrow contract
3. Start Service Agent
4. Run Buyer Agent (LangGraph workflow)
5. Wait for settlement
6. Generate audit JSON

### Option 2: Manual Two-Terminal Setup

**Terminal 1 - Service Agent:**

```bash
npx ts-node demo/agent-service.ts
```

Wait for:
```
Agent service started
Contract: 0x...
Agent address: 0x...
```

**Terminal 2 - Buyer Agent (LangGraph):**

```bash
npx ts-node demo/buyer-agent-langgraph.ts
```

## What Gets Demonstrated

### LangGraph Integration

The Buyer Agent uses LangGraph for workflow orchestration:

```typescript
const graph = new StateGraph<DemoState>({
  channels: stateSchema
})
  .addNode("plan", planTask)
  .addNode("createIntent", createIntent)
  .addNode("createTrigger", createTrigger)
  .addNode("createEscrow", createEscrow)
  .addNode("monitor", monitorSettlement)
  .addEdge(START, "plan")
  .addEdge("plan", "createIntent")
  .addEdge("createIntent", "createTrigger")
  .addEdge("createTrigger", "createEscrow")
  .addEdge("createEscrow", "monitor")
  .addEdge("monitor", END);
```

### Multi-Agent Collaboration

1. **Buyer Agent** creates escrow with payment locked
2. **Service Agent** detects escrow event
3. **Service Agent** executes task
4. **Service Agent** submits proof
5. **Buyer Agent** monitors settlement
6. Payment automatically released

## Expected Output

You should see:

```
[Buyer Agent] Planning task...
[Buyer Agent] Creating AP2 Intent...
MVP:AP2_INTENT_ID=0x...
[Buyer Agent] Creating X402 Trigger...
MVP:X402_PAYMENT_ID=0x...
[Buyer Agent] Creating escrow...
MVP:ESCROW_ID=0
[Service Agent] Escrow detected, executing task...
[Service Agent] Submitting proof...
MVP:PROOF_HASH=0x...
[Buyer Agent] Payment settled
MVP:SETTLE_TX=0x...
```

## Key Differences from MVP Demo

| Feature | MVP Demo | Dual-Agent Demo |
|---------|----------|-----------------|
| Buyer | Simple client script | LangGraph agent |
| Workflow | Linear script | Graph-based workflow |
| Orchestration | Manual steps | LangGraph StateGraph |
| Adaptability | Fixed flow | Can add branches/conditions |

## Extending the Demo

### Adding Conditional Logic

```typescript
.addConditionalEdges("monitor", (state) => {
  if (state.settled) return "complete";
  if (state.retries > 3) return "refund";
  return "retry";
})
```

### Adding Parallel Execution

```typescript
.addNode("validateIntent", validateIntent)
.addNode("checkBalance", checkBalance)
.addEdge("plan", "validateIntent")
.addEdge("plan", "checkBalance")
```

## Troubleshooting

### Agent not detecting escrow

Check Service Agent logs:
```bash
cat /tmp/wap3_agent.log
```

### LangGraph workflow stuck

Enable debug logging:
```typescript
const graph = workflow.compile({
  checkpointer: new MemorySaver(),
  debug: true
});
```

## More Information

- **Main README**: [../README.md](../README.md)
- **Product Overview**: [PRODUCT_OVERVIEW.md](PRODUCT_OVERVIEW.md)
- **Architecture Overview**: [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)
