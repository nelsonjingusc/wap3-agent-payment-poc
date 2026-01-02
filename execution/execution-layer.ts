export type ExecutionStatus = "SUBMITTED" | "RUNNING" | "SUCCEEDED" | "FAILED";

export interface ExecutionJob {
  taskType: string;     // e.g. "market_similarity"
  model?: string;       // optional
  inputs: any;          // JSON serializable
}

export interface ExecutionReceipt {
  executionId: string;      // WAP3 internal id
  provider: string;         // "nosana"
  providerJobId: string;    // Nosana job id (or placeholder in mock)
  submittedAt: string;
}

export interface ExecutionResult {
  status: ExecutionStatus;
  output?: any;             // JSON serializable
  logs?: string;
  providerJobId: string;
}

export interface ExecutionLayer {
  submit(job: ExecutionJob): Promise<ExecutionReceipt>;
  waitForCompletion(executionId: string): Promise<ExecutionResult>;
}

