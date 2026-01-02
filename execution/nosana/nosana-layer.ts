import { ExecutionLayer, ExecutionJob, ExecutionReceipt, ExecutionResult } from "../execution-layer";
import { createNosanaJobSpec } from "./job-templates";

export class NosanaExecutionLayer implements ExecutionLayer {
  // later: accept config + real nosana client
  private executions = new Map<string, { providerJobId: string }>();

  async submit(job: ExecutionJob): Promise<ExecutionReceipt> {
    const spec = createNosanaJobSpec(job);
    // for now just log spec to prove mapping works
    console.log("[nosana][mock] job spec:", spec);

    const executionId = `exec_${Date.now()}`;
    const providerJobId = `nosana_mock_${Date.now()}`;

    this.executions.set(executionId, { providerJobId });

    return {
      executionId,
      provider: "nosana",
      providerJobId,
      submittedAt: new Date().toISOString()
    };
  }

  async waitForCompletion(executionId: string): Promise<ExecutionResult> {
    const meta = this.executions.get(executionId);
    if (!meta) throw new Error(`Unknown executionId: ${executionId}`);

    // simulate async completion
    await new Promise(r => setTimeout(r, 800));

    return {
      status: "SUCCEEDED",
      output: { ok: true, executionId },
      providerJobId: meta.providerJobId,
      logs: "[mock] completed"
    };
  }
}

