# LangGraph Workflow Adapter for WAP3

Stateful workflow implementation for WAP3 (Web3 Agent Payment & Provenance) on Sui blockchain.

## Overview

This adapter demonstrates how to integrate WAP3 into a LangGraph-style stateful workflow, orchestrating the complete agent task lifecycle:

```
┌────────────┐
│ Create Task│ ──► Escrow SUI
└──────┬─────┘
       │
       ▼
┌────────────┐
│ Claim Task │ ──► Worker signals intent
└──────┬─────┘
       │
       ▼
┌────────────┐
│Execute Work│ ──► Generate proof
└──────┬─────┘
       │
       ▼
┌────────────────┐
│Submit Evidence │ ──► Upload to Walrus + on-chain
└────────┬───────┘
         │
         ▼
┌────────────────┐
│Verify Evidence │ ──► Check integrity
└────────┬───────┘
         │
         ▼
┌────────────┐
│Settle Task │ ──► Release payment
└────────────┘
```

## Workflow State

```typescript
interface WorkflowState {
    // Task info
    taskType?: string;
    requirements?: string;
    rewardSUI?: number;
    taskId?: string;
    
    // Claim & evidence
    claimId?: string;
    blobId?: string;
    submissionId?: string;
    
    // Settlement
    transactionDigest?: string;
    
    // Status
    currentStep?: string;
    completed: boolean;
}
```

## Usage

### Simple Workflow Execution

```typescript
import { runWorkflow } from './workflow';

const result = await runWorkflow({
    taskType: 'data_analysis',
    requirements: 'Analyze customer feedback',
    rewardSUI: 0.2,
});

console.log('Completed:', result.completed);
console.log('Transaction:', result.transactionDigest);
```

### With Production LangGraph

```typescript
import { StateGraph } from '@langchain/langgraph';
import {
    createTaskNode,
    claimTaskNode,
    executeWorkNode,
    submitEvidenceNode,
    verifyEvidenceNode,
    settleTaskNode,
} from './workflow';

const workflow = new StateGraph<WorkflowState>()
    .addNode('createTask', createTaskNode)
    .addNode('claimTask', claimTaskNode)
    .addNode('executeWork', executeWorkNode)
    .addNode('submitEvidence', submitEvidenceNode)
    .addNode('verifyEvidence', verifyEvidenceNode)
    .addNode('settleTask', settleTaskNode)
    .addEdge('createTask', 'claimTask')
    .addEdge('claimTask', 'executeWork')
    .addEdge('executeWork', 'submitEvidence')
    .addEdge('submitEvidence', 'verifyEvidence')
    .addConditionalEdges('verifyEvidence', (state) => {
        return state.error ? 'END' : 'settleTask';
    })
    .addEdge('settleTask', 'END')
    .setEntryPoint('createTask');

const app = workflow.compile();
const result = await app.invoke({ taskType: '...', rewardSUI: 0.1 });
```

## Workflow Nodes

### 1. Create Task
- Initializes task with escrowed SUI
- Returns: `taskId`

### 2. Claim Task
- Worker signals intent to work
- Returns: `claimId`

### 3. Execute Work
- Simulates task execution
- Generates evidence file
- Returns: `evidenceFilePath`

### 4. Submit Evidence
- Uploads proof to Walrus
- Records hash on-chain
- Returns: `submissionId`, `blobId`

### 5. Verify Evidence
- Retrieves from Walrus
- Validates hash
- Returns: verification status

### 6. Settle Task
- Releases escrowed payment
- Returns: `transactionDigest`

## State Transitions

```
┌─────────────┐
│  initial    │
└───────┬─────┘
        │
        ▼
┌──────────────┐
│task_created  │
└───────┬──────┘
        │
        ▼
┌──────────────┐
│task_claimed  │
└───────┬──────┘
        │
        ▼
┌───────────────┐
│work_completed │
└───────┬───────┘
        │
        ▼
┌─────────────────────┐
│evidence_submitted   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│evidence_verified    │
└──────────┬──────────┘
           │
           ▼
      ┌─────────┐
      │ settled │
      └─────────┘
```

## Error Handling

Each node catches errors and updates state:

```typescript
if (state.error) {
    // Workflow stops
    // Can implement retry logic or rollback
}
```

## Environment Setup

```bash
# Required
SUI_NETWORK=testnet
SUI_PRIVATE_KEY=suiprivkey1...
SUI_PACKAGE_ID=0x4a344bda...

# Optional (for separate worker)
SUI_WORKER_PRIVATE_KEY=suiprivkey1...

# Walrus
WALRUS_MOCK_MODE=true
```

## Conditional Logic Example

```typescript
// Add conditional edges in production LangGraph
.addConditionalEdges('verifyEvidence', (state) => {
    if (state.error) return 'handleError';
    if (!state.verified) return 'rejectSubmission';
    return 'settleTask';
})
```

## Integration with LLMs

```typescript
// Add LLM decision-making between nodes
.addNode('decideAction', async (state) => {
    const llm = new ChatOpenAI();
    const decision = await llm.invoke({
        messages: [
            {
                role: 'system',
                content: 'Decide if evidence quality is acceptable'
            },
            {
                role: 'user',
                content: `Evidence: ${state.evidenceHash}`
            }
        ]
    });
    
    return { shouldSettle: decision.content === 'approve' };
})
```

## See Also

- [LangChain Tools Adapter](../langchain-tools/README.md)
- [Demo Script](../../demo/langgraph-workflow-demo.ts)
- [WAP3 Architecture](../../docs/SUI_ARCHITECTURE.md)
