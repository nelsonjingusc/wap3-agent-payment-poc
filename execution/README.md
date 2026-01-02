# Execution Layer

The Execution Layer provides a first-class abstraction for task execution across different compute providers (Nosana, Akash, etc.).

## Architecture

```
execution/
├── execution-layer.ts    # Core interfaces (ExecutionLayer, ExecutionJob, etc.)
├── index.ts                 # Provider registry
└── nosana/
    ├── nosana-layer.ts      # Nosana provider implementation
    ├── job-templates.ts     # Task type → Nosana job spec mapping
    └── README.md            # Nosana-specific documentation
```

## Usage

### Basic Usage

```typescript
import { getExecutionLayer } from "./execution";

const layer = getExecutionLayer("nosana");

// Submit a task
const receipt = await layer.submit({
  taskType: "market_similarity",
  inputs: { eventText: "...", marketUniverse: [...] }
});

// Wait for completion
const result = await layer.waitForCompletion(receipt.executionId);

if (result.status === "SUCCEEDED") {
  // Use result.output for proof generation
  const proofHash = ethers.id(JSON.stringify(result.output));
  // Submit to escrow...
}
```

### Integration with Escrow

See `demo/nosana-escrow-integration-demo.ts` for a complete example showing:
1. Escrow creation
2. Task submission to execution layer
3. Proof generation from execution result
4. Proof submission to escrow
5. Payment settlement

## Adding New Providers

To add a new execution provider:

1. Create a new directory under `execution/` (e.g., `execution/akash/`)
2. Implement the `ExecutionLayer` interface
3. Register in `execution/index.ts`

Example:

```typescript
// execution/akash/akash-layer.ts
export class AkashExecutionLayer implements ExecutionLayer {
  async submit(job: ExecutionJob): Promise<ExecutionReceipt> {
    // Implementation
  }
  
  async waitForCompletion(executionId: string): Promise<ExecutionResult> {
    // Implementation
  }
}
```

## Design Principles

- **First-class execution**: Execution is a core abstraction, not an afterthought
- **Provider agnostic**: Same interface works with any compute provider
- **Graceful degradation**: Falls back to mock if provider unavailable
- **No hardhat dependency**: Execution layer is independent of blockchain tooling

