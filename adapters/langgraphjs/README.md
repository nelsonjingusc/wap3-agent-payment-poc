# LangGraph Adapter for WAP3

This adapter demonstrates how to integrate WAP3 into a LangGraph workflow framework.

## Overview

The LangGraph adapter orchestrates the complete agent transaction lifecycle:

1. **Build AP2 Intent** - Create an AP2-style intent object
2. **Build X402 Trigger** - Create an X402-style payment trigger
3. **Create Escrow** - Initialize on-chain escrow
4. **Simulate Work + Submit Proof** - Execute task and submit proof
5. **Settle** - Release payment to agent
6. **Audit** - Generate audit JSON record

## Usage

```bash
# Run the LangGraph adapter demo
npx hardhat run adapters/langgraphjs/demo_langgraph.ts --network localhost
```

## Integration with Real LangGraph

In production, you would:

1. Install LangGraph: `npm install @langchain/langgraph`
2. Replace the step functions with LangGraph nodes
3. Add edges between nodes to define the workflow graph
4. Integrate with LLMs for intent negotiation and task execution

Example structure:

```typescript
import { StateGraph } from "@langchain/langgraph";

const workflow = new StateGraph<WorkflowState>()
  .addNode("buildIntent", buildAP2Intent)
  .addNode("buildTrigger", buildX402Trigger)
  .addNode("createEscrow", createEscrowStep)
  .addNode("executeWork", simulateWorkAndSubmitProof)
  .addNode("settle", settleStep)
  .addNode("audit", auditStep)
  .addEdge("buildIntent", "buildTrigger")
  .addEdge("buildTrigger", "createEscrow")
  // ... more edges
  .setEntryPoint("buildIntent");

const app = workflow.compile();
await app.invoke({});
```

## Framework-Agnostic Design

This adapter demonstrates that WAP3 can be integrated into any agent framework. The core WAP3 operations (createEscrow, submitProof, settle) are framework-independent.

