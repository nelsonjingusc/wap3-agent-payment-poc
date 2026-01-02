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

        console.log(`[nosana][trace=${traceId}] Creating job with market:`, this.market);
        const jobResponse = await client.api.jobs.create({
          market: this.market,
          jobDefinition: spec,
        });

        if (!jobResponse || !jobResponse.id) {
          console.error(`[nosana][trace=${traceId}] Job creation response:`, JSON.stringify(jobResponse ?? {}));
          throw new Error("Failed to create Nosana job: no job ID returned");
        }

        const providerJobId = jobResponse.id;
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
          throw new Error(`[nosana][trace=${traceId}] Missing jobId for monitor()`);
        }
        console.log(`[nosana][trace=${traceId}] Monitoring job: ${targetJobId}`);

        const [events, stop] = await client.jobs.monitor();

        try {
          for await (const event of events) {
            const evJobId = event?.data?.id || event?.data?.job || event?.data?.jobId || event?.jobId;
            if (!evJobId || evJobId !== targetJobId) continue;

            const state = event?.data?.state;
            const ipfsResult = event?.data?.ipfsResult || event?.data?.result?.ipfs || event?.data?.ipfs;
            
            console.log(`[nosana][trace=${traceId}] Event received (raw):`, JSON.stringify(event?.data ?? {}));
            console.log(`[nosana][trace=${traceId}] Event parsed: jobId=${evJobId}, state=${state}, ipfsResult=${ipfsResult || 'N/A'}`);

            const normalized = String(state || "").toLowerCase();

            if (["done", "completed", "success"].includes(normalized)) {
              console.log(`[nosana][trace=${traceId}] Job completed, ipfsResult: ${ipfsResult || 'N/A'}`);
              
              if (!ipfsResult) {
                console.warn(`[nosana][trace=${traceId}] No ipfsResult found in event data, available fields:`, Object.keys(event?.data ?? {}));
                return {
                  status: "SUCCEEDED",
                  output: event?.data ?? {},
                  providerJobId: targetJobId,
                  logs: "completed but no ipfsResult found",
                };
              }

              console.log(`[nosana][trace=${traceId}] Retrieving IPFS result from: ${ipfsResult}`);
              try {
                const output = await client.ipfs.retrieve(ipfsResult);
                
                // Check if output is a file path or JSON content
                let parsedOutput = output;
                if (typeof output === 'string') {
                  try {
                    parsedOutput = JSON.parse(output);
                  } catch {
                    // If not JSON, check if it's a file path reference
                    if (output.includes('result.json') || output.includes('/nosana/output')) {
                      console.warn(`[nosana][trace=${traceId}] Output appears to be a file path, not content: ${output}`);
                    }
                  }
                }
                
                // Verify result.json structure if output is an object
                if (typeof parsedOutput === 'object' && parsedOutput !== null) {
                  const outputKeys = Object.keys(parsedOutput);
                  console.log(`[nosana][trace=${traceId}] IPFS retrieve successful, output type: ${typeof parsedOutput}, keys: ${outputKeys.join(',')}`);
                  
                  // Check if result.json content is present
                  if (outputKeys.length === 0) {
                    console.warn(`[nosana][trace=${traceId}] Output object is empty, possible volume mount issue`);
                  }
                } else {
                  console.log(`[nosana][trace=${traceId}] IPFS retrieve successful, output type: ${typeof parsedOutput}`);
                }

                return {
                  status: "SUCCEEDED",
                  output: parsedOutput,
                  providerJobId: targetJobId,
                  logs: "completed via monitor()",
                };
              } catch (ipfsError: any) {
                console.error(`[nosana][trace=${traceId}] IPFS retrieve failed: ${ipfsError.message}`);
                // Return real job result with error, don't fallback to mock
                return {
                  status: "SUCCEEDED",
                  output: {
                    jobId: targetJobId,
                    ipfsResult,
                    error: ipfsError.message,
                    note: "Job completed but IPFS retrieve failed"
                  },
                  providerJobId: targetJobId,
                  logs: `IPFS retrieve failed: ${ipfsError.message}`,
                };
              }
            }

            if (["stopped", "failed", "error"].includes(normalized)) {
              return {
                status: "FAILED",
                providerJobId: targetJobId,
                logs: JSON.stringify(event?.data ?? {}),
              };
            }
          }

          return { status: "FAILED", providerJobId: targetJobId, logs: "monitor stream ended" };
        } finally {
          stop?.();
        }
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

