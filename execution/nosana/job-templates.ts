import { ExecutionJob } from "../execution-layer";

export interface NosanaJobSpec {
  image: string;
  command: string[];
  env?: Record<string, string>;
  resources?: { gpu?: boolean };
}

export function createNosanaJobSpec(job: ExecutionJob): NosanaJobSpec {
  if (job.taskType === "market_similarity") {
    return {
      image: "python:3.10-slim",
      command: [
        "python",
        "-c",
        `import json; print(json.dumps({"ok": True, "task":"market_similarity"}))`
      ],
      resources: { gpu: true },
      env: {
        WAP3_TASK_INPUT: JSON.stringify(job.inputs ?? {})
      }
    };
  }

  throw new Error(`Unsupported taskType: ${job.taskType}`);
}

