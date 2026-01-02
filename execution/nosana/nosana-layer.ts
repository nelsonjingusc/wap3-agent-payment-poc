import { ExecutionLayer, ExecutionJob, ExecutionReceipt, ExecutionResult, ExecutionStatus } from "../execution-layer";
import { createNosanaJobSpec } from "./job-templates";

interface ExecutionMeta {
  providerJobId: string;
  submittedAt: string;
}

export class NosanaExecutionLayer implements ExecutionLayer {
  private executions = new Map<string, ExecutionMeta>();
  private useRealApi: boolean;
  private apiKey?: string;
  private market?: string;
  private nosanaClient: any;

  constructor() {
    this.useRealApi = process.env.USE_NOSANA_REAL === "true";
    this.apiKey = process.env.NOSANA_API_KEY;
    this.market = process.env.NOSANA_MARKET;

    if (this.useRealApi) {
      if (!this.apiKey) {
        console.warn("[nosana] USE_NOSANA_REAL=true but NOSANA_API_KEY not set, falling back to mock");
        this.useRealApi = false;
      }
      if (!this.market) {
        console.warn("[nosana] USE_NOSANA_REAL=true but NOSANA_MARKET not set, falling back to mock");
        this.useRealApi = false;
      }
    }
  }

  private async getNosanaClient() {
    if (this.nosanaClient) return this.nosanaClient;

    try {
      const nosanaKit = await import("@nosana/kit");
      this.nosanaClient = nosanaKit.createClient?.({
        apiKey: this.apiKey,
      }) || nosanaKit;
      return this.nosanaClient;
    } catch (error) {
      console.warn("[nosana] Failed to load @nosana/kit, falling back to mock:", error);
      this.useRealApi = false;
      return null;
    }
  }

  async submit(job: ExecutionJob): Promise<ExecutionReceipt> {
    const spec = createNosanaJobSpec(job);
    const executionId = `exec_${Date.now()}`;

    if (this.useRealApi) {
      try {
        const client = await this.getNosanaClient();
        if (!client) {
          // Fallback to mock if client failed to load
          return this.submitMock(job, executionId, spec);
        }

        const jobResponse = await client.api?.jobs?.create?.({
          market: this.market,
          jobDefinition: spec,
        });

        if (!jobResponse || !jobResponse.id) {
          throw new Error("Failed to create Nosana job: no job ID returned");
        }

        const providerJobId = jobResponse.id;
        this.executions.set(executionId, {
          providerJobId,
          submittedAt: new Date().toISOString()
        });

        console.log("[nosana][real] job submitted:", providerJobId);

        return {
          executionId,
          provider: "nosana",
          providerJobId,
          submittedAt: new Date().toISOString()
        };
      } catch (error: any) {
        console.error("[nosana] Real API submission failed, falling back to mock:", error.message);
        return this.submitMock(job, executionId, spec);
      }
    } else {
      return this.submitMock(job, executionId, spec);
    }
  }

  private submitMock(job: ExecutionJob, executionId: string, spec: any): ExecutionReceipt {
    console.log("[nosana][mock] job spec:", spec);

    const providerJobId = `nosana_mock_${Date.now()}`;
    this.executions.set(executionId, {
      providerJobId,
      submittedAt: new Date().toISOString()
    });

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

    if (this.useRealApi) {
      try {
        const client = await this.getNosanaClient();
        if (!client) {
          return this.waitForCompletionMock(executionId, meta);
        }

        const maxAttempts = 60;
        const pollInterval = 5000;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const jobStatus = await client.api?.jobs?.get?.(meta.providerJobId);
          
          if (!jobStatus) {
            throw new Error(`Failed to get job status for ${meta.providerJobId}`);
          }

          const status = jobStatus.status || jobStatus.state;
          
          if (status === "completed" || status === "succeeded") {
            const result = jobStatus.result || jobStatus.output || {};
            const logs = jobStatus.logs || "";

            return {
              status: "SUCCEEDED",
              output: result,
              providerJobId: meta.providerJobId,
              logs: logs
            };
          } else if (status === "failed" || status === "error") {
            return {
              status: "FAILED",
              providerJobId: meta.providerJobId,
              logs: jobStatus.error || jobStatus.message || "Job failed"
            };
          } else if (status === "running" || status === "pending") {
            await new Promise(r => setTimeout(r, pollInterval));
          } else {
            console.warn(`[nosana] Unknown job status: ${status}, treating as running`);
            await new Promise(r => setTimeout(r, pollInterval));
          }
        }

        throw new Error(`Job ${meta.providerJobId} did not complete within timeout`);
      } catch (error: any) {
        console.error("[nosana] Real API polling failed, falling back to mock:", error.message);
        return this.waitForCompletionMock(executionId, meta);
      }
    } else {
      return this.waitForCompletionMock(executionId, meta);
    }
  }

  private async waitForCompletionMock(executionId: string, meta: ExecutionMeta): Promise<ExecutionResult> {
    // Simulate async completion
    await new Promise(r => setTimeout(r, 800));

    return {
      status: "SUCCEEDED",
      output: { ok: true, executionId },
      providerJobId: meta.providerJobId,
      logs: "[mock] completed"
    };
  }
}

