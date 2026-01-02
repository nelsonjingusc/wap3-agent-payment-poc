import { ExecutionJob } from "../execution-layer";

export interface NosanaJobDefinition {
  version: string;
  type: string;
  meta: {
    trigger: string;
    system_requirements?: {
      required_vram?: number;
    };
  };
  global?: {
    work_dir?: string;
  };
  ops: Array<{
    type: string;
    id: string;
    args: {
      gpu: boolean;
      image: string;
      cmd: string[];
      env?: Record<string, string>;
      volumes?: Array<{
        name: string;
        dest: string;
      }>;
    };
  }>;
}

export function createNosanaJobSpec(job: ExecutionJob): NosanaJobDefinition {
  const taskType = job.taskType || "market_similarity";
  const inputsJson = JSON.stringify(job.inputs ?? {});

  const baseSpec: NosanaJobDefinition = {
    version: "0.1",
    type: "container",
    meta: {
      trigger: "api",
      system_requirements: {
        required_vram: 8
      }
    },
    global: {
      work_dir: "/workspace"
    },
    ops: [
      {
        type: "container/run",
        id: `wap3-${taskType}-task`,
        args: {
          gpu: true,
          image: "python:3.10-slim",
          cmd: [
            "/bin/sh",
            "-lc",
            `python -c "import json; import os; result = {'ok': True, 'task': '${taskType}', 'inputs': json.loads(os.environ.get('INPUTS_JSON', '{}'))}; print(json.dumps(result))" > /nosana/output/result.json`
          ],
          env: {
            TASK_TYPE: taskType,
            INPUTS_JSON: inputsJson
          },
          volumes: [
            {
              name: "nosana-output",
              dest: "/nosana/output"
            }
          ]
        }
      }
    ]
  };

  return baseSpec;
}

