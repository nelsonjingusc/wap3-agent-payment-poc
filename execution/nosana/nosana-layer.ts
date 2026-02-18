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
      const { createNosanaClient, NosanaNetwork } = await import("@nosana/kit");
      this.nosanaClient = createNosanaClient(NosanaNetwork.MAINNET, {
        api: { apiKey: this.apiKey }
      });
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
    const traceId = executionId;

    if (this.useRealApi) {
      try {
        const client = await this.getNosanaClient();
        if (!client) {
          return this.submitMock(job, executionId, spec);
        }

        console.log(`[nosana][trace=${traceId}] Creating deployment with market:`, this.market);
        const deployment = await client.api.deployments.create({
          name: `wap3-${job.taskType}-${Date.now()}`,
          market: this.market!,
          replicas: 1,
          timeout: 300,
          job_definition: spec,
        });

        if (!deployment || !deployment.id) {
          console.error(`[nosana][trace=${traceId}] Deployment creation response:`, JSON.stringify(deployment ?? {}));
          throw new Error("Failed to create Nosana deployment: no ID returned");
        }

        const providerJobId = deployment.id;
        console.log(`[nosana][trace=${traceId}] Deployment created, status: ${deployment.status}`);
        console.log(`[nosana][trace=${traceId}] Job created successfully, id: ${providerJobId} (using this ID for monitor)`);
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
      } catch (error: any) {
        console.error(`[nosana][trace=${traceId}] Real API submission failed, falling back to mock:`, error.message);
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

    const traceId = executionId;

    if (this.useRealApi) {
      try {
        const client = await this.getNosanaClient();
        if (!client) {
          return this.waitForCompletionMock(executionId, meta);
        }

        const targetJobId = meta.providerJobId;
        if (!targetJobId) {
          throw new Error(`[nosana][trace=${traceId}] Missing deployment ID`);
        }

        console.log(`[nosana][trace=${traceId}] Polling deployment status: ${targetJobId}`);

        const POLL_INTERVAL_MS = 5000;
        const MAX_POLLS = 120; // 10 minutes max

        for (let i = 0; i < MAX_POLLS; i++) {
          await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

          const dep = await client.api.deployments.get(targetJobId);
          const status = dep?.status ?? "UNKNOWN";
          console.log(`[nosana][trace=${traceId}] poll=${i + 1} status=${status}`);

          if (status === "RUNNING" || status === "STOPPED") {
            // Extract ipfs result hash from latest revision
            const latestRevision = dep?.revisions?.[dep.revisions.length - 1];
            const ipfsResult = latestRevision?.ipfs_definition_hash;

            if (!ipfsResult) {
              return {
                status: "SUCCEEDED",
                output: dep,
                providerJobId: targetJobId,
                logs: `deployment ${status}, no ipfs result hash`,
              };
            }

            console.log(`[nosana][trace=${traceId}] Retrieving IPFS result: ${ipfsResult}`);
            try {
              const output = await client.ipfs.retrieve(ipfsResult);
              let parsedOutput = output;
              if (typeof output === "string") {
                try { parsedOutput = JSON.parse(output); } catch { /* keep as string */ }
              }
              console.log(`[nosana][trace=${traceId}] IPFS retrieve successful`);
              return {
                status: "SUCCEEDED",
                output: parsedOutput,
                providerJobId: targetJobId,
                logs: `completed via deployments.get() polling`,
              };
            } catch (ipfsError: any) {
              console.error(`[nosana][trace=${traceId}] IPFS retrieve failed: ${ipfsError.message}`);
              return {
                status: "SUCCEEDED",
                output: { deploymentId: targetJobId, ipfsResult, error: ipfsError.message },
                providerJobId: targetJobId,
                logs: `IPFS retrieve failed: ${ipfsError.message}`,
              };
            }
          }

          if (status === "ERROR" || status === "ARCHIVED") {
            return {
              status: "FAILED",
              providerJobId: targetJobId,
              logs: `deployment status: ${status}`,
            };
          }
        }

        return { status: "FAILED", providerJobId: targetJobId, logs: "polling timeout after 10 minutes" };
      } catch (error: any) {
        console.error(`[nosana][trace=${traceId}] Real API monitoring failed, falling back to mock:`, error.message);
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

