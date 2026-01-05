# LangChain Tools for WAP3

Standardized LangChain tool wrappers for the WAP3 (Web3 Agent Payment & Provenance) platform on Sui blockchain.

## Overview

This adapter provides 6 `DynamicStructuredTool` instances that wrap WAP3 operations, enabling any LangChain-based agent to:
- Create tasks with escrowed payments
- Claim and execute tasks
- Submit proof of work to Walrus storage
- Verify evidence integrity
- Settle payments automatically

## Installation

```bash
npm install @langchain/core zod
```

## Available Tools

### 1. `create_task`
Create a new task with escrowed SUI payment.

**Inputs**:
- `taskType`: string (e.g., "data_analysis")
- `requirements`: string (detailed specifications)
- `rewardAmountSUI`: number (reward in SUI tokens)
- `deadlineHours`: number (default: 24)
- `maxWorkers`: number (default: 1)

**Returns**: `{ success, taskId, reward, deadline }`

### 2. `claim_task`
Claim a task as a worker.

**Inputs**:
- `taskId`: string (0x... format)

**Returns**: `{ success, claimId, taskId }`

### 3. `submit_evidence`
Upload proof of work to Walrus and record on-chain.

**Inputs**:
- `taskId`: string
- `claimId`: string
- `evidenceFilePath`: string

**Returns**: `{ success, submissionId, blobId, evidenceHash }`

### 4. `verify_evidence`
Verify evidence integrity from Walrus.

**Inputs**:
- `blobId`: string
- `expectedHash`: string

**Returns**: `{ success, verified, actualHash }`

### 5. `settle_task`
Distribute escrowed payment to approved workers.

**Inputs**:
- `taskId`: string
- `approvedSubmissionIds`: string[]

**Returns**: `{ success, transactionDigest, paidWorkers }`

### 6. `register_agent`
Create on-chain agent identity and reputation.

**Inputs**:
- `agentId`: string
- `walletAddress`: string (0x...)

**Returns**: `{ success, agentId, walletAddress }`

## Usage Example

```typescript
import { wap3Tools } from './wap3-tools';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createReactAgent } from 'langchain/agents';

// Initialize agent with WAP3 tools
const llm = new ChatOpenAI({ temperature: 0 });
const agent = await createReactAgent({
    llm,
    tools: wap3Tools,
    // ... other config
});

const executor = new AgentExecutor({ agent, tools: wap3Tools });

// Agent can now use tools
const result = await executor.invoke({
    input: "Create a data analysis task with 0.5 SUI reward"
});
```

## Environment Setup

Create `.env` file:
```bash
SUI_NETWORK=testnet
SUI_PRIVATE_KEY=suiprivkey1...
SUI_PACKAGE_ID=0x4a344bda...
WALRUS_MOCK_MODE=true
```

## Integration Patterns

### Pattern 1: Sequential Workflow

```typescript
// Buyer creates task
const createResult = await createTaskTool.invoke({
    taskType: "sentiment_analysis",
    requirements: "Analyze 100 tweets",
    rewardAmountSUI: 0.1,
});

// Worker claims task  
const claimResult = await claimTaskTool.invoke({
    taskId: createResult.taskId
});

// Worker submits evidence
const submitResult = await submitEvidenceTool.invoke({
    taskId: createResult.taskId,
    claimId: claimResult.claimId,
    evidenceFilePath: "./results.json"
});

// Buyer verifies and settles
const settleResult = await settleTaskTool.invoke({
    taskId: createResult.taskId,
    approvedSubmissionIds: [submitResult.submissionId]
});
```

### Pattern 2: Agent Decision Making

```typescript
const agent = createReactAgent({
    llm: new ChatOpenAI(),
    tools: wap3Tools,
});

// Agent decides when to use each tool based on context
await agent.invoke({
    input: `I need help analyzing customer feedback. 
           Create a task for sentiment analysis with 0.2 SUI reward.`
});
```

## Error Handling

All tools return JSON strings with `success` boolean:

```typescript
const result = JSON.parse(await tool.invoke(params));
if (!result.success) {
    console.error('Tool failed:', result.error);
}
```

## Best Practices

1. **Always check balances** before creating tasks
2. **Store claim IDs** after claiming for later submission
3. **Verify evidence** before settling payments
4. **Handle errors gracefully** - blockchain operations can fail
5. **Use mock Walrus mode** for development/testing

## TypeScript Types

```typescript
// Tool results are JSON strings, parse them:
type ToolResult = {
    success: boolean;
    error?: string;
    [key: string]: any;
};

const result: ToolResult = JSON.parse(await tool.invoke(params));
```

## See Also

- [WAP3 Main Documentation](../../README.md)
- [Sui Architecture Guide](../../docs/SUI_ARCHITECTURE.md)
- [LangGraph Workflow Adapter](../sui-langgraph/README.md)
- [Demo Script](../../demo/langchain-agent-demo.ts)
