# Tool-Agent Adapter for WAP3

This adapter demonstrates a framework-agnostic integration pattern using simple tool calls.

## Overview

The Tool-Agent adapter treats WAP3 operations as callable tools that any agent framework can use:

- `createAP2Intent` - Create an AP2-style intent
- `createX402Trigger` - Create an X402-style payment trigger
- `createEscrow` - Initialize on-chain escrow
- `executeWork` - Execute the task (simulated)
- `submitProof` - Submit proof of work completion
- `settle` - Release payment to agent

## Usage

```bash
# Run the Tool-Agent adapter demo
npx hardhat run adapters/tool_agent/demo_tool_agent.ts --network localhost
```

## Framework Integration

This adapter shows the simplest possible integration pattern. Any agent framework can:

1. Register WAP3 operations as available tools
2. Call tools in sequence based on workflow logic
3. Handle tool responses and continue workflow

### Example: OpenAI Function Calling

```typescript
const tools = [
  {
    type: "function",
    function: {
      name: "createAP2Intent",
      description: "Create an AP2-style intent for agent task",
      parameters: {
        type: "object",
        properties: {
          taskDescription: { type: "string" },
          maxPayment: { type: "string" },
        },
      },
    },
  },
  // ... more WAP3 tools
];
```

### Example: LangChain Tools

```typescript
import { DynamicStructuredTool } from "@langchain/core/tools";

const wap3Tools = [
  new DynamicStructuredTool({
    name: "createAP2Intent",
    description: "Create an AP2-style intent",
    schema: z.object({
      taskDescription: z.string(),
      maxPayment: z.string(),
    }),
    func: async ({ taskDescription, maxPayment }) => {
      return tool_createAP2Intent(taskDescription, maxPayment);
    },
  }),
  // ... more tools
];
```

## Benefits

- **Framework-Agnostic**: Works with any agent framework
- **Simple**: No complex dependencies
- **Composable**: Tools can be combined in any order
- **Testable**: Each tool is independently testable

