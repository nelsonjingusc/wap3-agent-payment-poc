# Nosana Integration - Technical Architecture

## Overview

This document describes the technical architecture of the Nosana execution layer integration in WAP3. The integration enables autonomous AI agents to submit GPU-enabled containerized tasks to Nosana's decentralized compute network, monitor execution status in real-time, and retrieve results from IPFS.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    WAP3 Application                     │
│            (Agent Payment & Escrow System)              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Execution Layer Abstraction                │
│     (Provider-agnostic interface for compute)           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Nosana Execution Layer Provider              │
│         (Implementation using @nosana/kit SDK)          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Nosana Network                         │
│    (Decentralized GPU compute + IPFS storage)           │
└─────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Execution Layer Interface

**File**: `execution/execution-layer.ts`

Defines the contract that all compute providers must implement:

```typescript
interface ExecutionLayer {
  submit(job: ExecutionJob): Promise<ExecutionReceipt>;
  waitForCompletion(executionId: string): Promise<ExecutionResult>;
}
```

**Key Types:**

- `ExecutionJob` - Task specification (type, inputs, model)
- `ExecutionReceipt` - Submission confirmation with job IDs
- `ExecutionResult` - Completion status with output and logs
- `ExecutionStatus` - State enum (SUBMITTED, RUNNING, SUCCEEDED, FAILED)

### 2. Nosana Provider Implementation

**File**: `execution/nosana/nosana-layer.ts`

Implements the execution layer interface using Nosana's SDK.

**Initialization:**
```typescript
const { createNosanaClient, NosanaNetwork } = await import("@nosana/kit");
this.nosanaClient = createNosanaClient(NosanaNetwork.MAINNET, {
  api: { apiKey: this.apiKey }
});
```

**Job Submission:**
```typescript
const jobResponse = await client.api.jobs.create({
  market: this.market,
  jobDefinition: nosanaJobSpec
});
```

**Event Monitoring:**
```typescript
const [events, stop] = await client.jobs.monitor();
for await (const event of events) {
  if (event?.data?.id === targetJobId) {
    // Process state changes
  }
}
```

**IPFS Retrieval:**
```typescript
const ipfsResult = event?.data?.ipfsResult;
const output = await client.ipfs.retrieve(ipfsResult);
```

### 3. Job Template System

**File**: `execution/nosana/job-templates.ts`

Maps WAP3 task types to Nosana job specifications.

**Job Specification Structure:**
```typescript
{
  version: "0.1",
  type: "container",
  meta: {
    trigger: "api",
    system_requirements: { required_vram: 8 }
  },
  global: {
    work_dir: "/workspace"
  },
  ops: [{
    type: "container/run",
    id: "wap3-<taskType>-task",
    args: {
      gpu: true,
      image: "python:3.10-slim",
      cmd: ["<execution commands>"],
      env: { TASK_TYPE: "...", INPUTS_JSON: "..." },
      volumes: [{ name: "nosana-output", dest: "/nosana/output" }]
    }
  }]
}
```

---

## Data Flow

### Task Submission Flow

```
1. Application creates ExecutionJob
   ↓
2. Nosana layer generates job specification
   ↓
3. Submit to Nosana via client.api.jobs.create()
   ↓
4. Receive job ID from Nosana
   ↓
5. Return ExecutionReceipt to application
```

### Monitoring Flow

```
1. Application calls waitForCompletion()
   ↓
2. Nosana layer starts event stream via client.jobs.monitor()
   ↓
3. Filter events for target job ID
   ↓
4. Track state changes (submitted → running → completed)
   ↓
5. Extract IPFS hash from completion event
   ↓
6. Retrieve output via client.ipfs.retrieve()
   ↓
7. Parse and return ExecutionResult
```

### Integration with Escrow

```
1. Buyer creates task intent (AP2)
   ↓
2. Payment trigger defined (X402)
   ↓
3. Escrow created on-chain with locked funds
   ↓
4. Task submitted to Nosana execution layer
   ↓
5. Agent monitors execution to completion
   ↓
6. Generate proof hash from execution result
   ↓
7. Submit proof to escrow smart contract
   ↓
8. Escrow validates and releases payment
```

---

## Nosana SDK Usage

### API Endpoints Used

**1. Client Creation**
```typescript
createNosanaClient(NosanaNetwork.MAINNET, { api: { apiKey } })
```

**2. Job Submission**
```typescript
client.api.jobs.create({ market, jobDefinition })
```

**3. Event Monitoring**
```typescript
client.jobs.monitor()
```

**4. IPFS Retrieval**
```typescript
client.ipfs.retrieve(ipfsHash)
```

### Event Schema

Events received from `monitor()` contain:
```typescript
{
  data: {
    id: string,           // Job ID
    state: string,        // Job state (running, completed, etc.)
    ipfsResult?: string   // IPFS hash when completed
  }
}
```

---

## Job Execution Environment

### Container Configuration

- **Base Image**: python:3.10-slim
- **GPU**: Enabled (8GB VRAM required)
- **Working Directory**: /workspace
- **Output Directory**: /nosana/output (mounted volume)

### Task Input/Output

**Input**: Passed via environment variables
```typescript
env: {
  TASK_TYPE: "market_similarity",
  INPUTS_JSON: JSON.stringify(inputs)
}
```

**Output**: Written to `/nosana/output/result.json`
```json
{
  "ok": true,
  "task": "market_similarity",
  "inputs": { ... },
  "result": { ... }
}
```

---

## Error Handling

### Graceful Degradation

The system implements automatic fallback to mock mode in these scenarios:

1. **SDK Not Available**: `@nosana/kit` not installed
2. **Missing Credentials**: API key or market address not configured
3. **API Failures**: Network issues or service errors

### Logging

All operations are logged with `[nosana]` prefix and trace IDs for debugging:
```
[nosana][trace=exec_123] Creating job with market: <address>
[nosana][trace=exec_123] Job created successfully, id: <job-id>
[nosana][trace=exec_123] Monitoring job: <job-id>
[nosana][trace=exec_123] Event received: state=completed
[nosana][trace=exec_123] IPFS retrieve successful
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `USE_NOSANA_REAL` | No | Enable real API (default: false) |
| `NOSANA_API_KEY` | Yes (real mode) | Nosana API authentication key |
| `NOSANA_MARKET` | Yes (real mode) | Nosana market address for job submission |

### Mode Selection

**Mock Mode** (default):
- No configuration needed
- Simulates job execution locally
- Returns mock results after 800ms delay
- Used for testing and development

**Real API Mode**:
- Requires environment variables
- Connects to Nosana Mainnet
- Uses real GPU resources
- Returns actual execution results from IPFS

---

## Performance Characteristics

### Latency

- **Job Submission**: ~100-500ms (API call)
- **Execution Time**: Varies by task (typically 10-60 seconds)
- **Event Monitoring**: Real-time streaming
- **IPFS Retrieval**: ~1-5 seconds

### Scalability

- **Concurrent Jobs**: Limited by Nosana market capacity
- **Event Stream**: Single stream monitors multiple jobs
- **Job Filtering**: Client-side filtering by job ID

---

## Security Considerations

### API Credentials

- API keys stored in environment variables
- Never committed to version control
- Scoped to specific markets

### IPFS Data

- Job outputs stored in public IPFS
- Consider encryption for sensitive data
- Results are content-addressed (immutable)

### Proof Generation

- Execution results hashed for on-chain verification
- Hash includes job ID, outputs, and timestamp
- Prevents result tampering

---

## Testing

### Test Coverage

1. **Standalone Execution** (`demo/nosana-execution-demo.ts`)
   - Job submission
   - Completion monitoring
   - Result retrieval

2. **Escrow Integration** (`demo/nosana-escrow-integration-demo.ts`)
   - End-to-end workflow
   - Proof generation
   - Payment settlement

3. **Automated Test Suite** (`demo/test_nosana_integration.sh`)
   - Runs both demos
   - Validates outputs
   - Generates test reports

### Mock vs Real Testing

**Mock Mode**: Fast, reliable, no external dependencies
**Real Mode**: Tests actual Nosana integration, requires API access

---

## Future Enhancements

### Planned Features

- Additional compute providers (Akash, etc.)
- Retry logic for transient failures
- Job cost estimation
- Batch job submission
- Custom container images
- Result encryption

### Extensibility

The provider-agnostic design allows easy addition of new compute providers:

```typescript
// execution/akash/akash-layer.ts
export class AkashExecutionLayer implements ExecutionLayer {
  async submit(job: ExecutionJob): Promise<ExecutionReceipt> {
    // Akash-specific implementation
  }
  
  async waitForCompletion(executionId: string): Promise<ExecutionResult> {
    // Akash-specific implementation
  }
}
```

---

## References

- Nosana SDK: `@nosana/kit` v2.0.38
- Nosana Network: https://nosana.io
- IPFS: https://ipfs.io
- WAP3 Technical Documentation: `TECHNICAL.md`
