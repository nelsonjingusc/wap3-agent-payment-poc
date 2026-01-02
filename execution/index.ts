import { ExecutionLayer } from "./execution-layer";
import { NosanaExecutionLayer } from "./nosana/nosana-layer";

export function getExecutionLayer(name: string): ExecutionLayer {
  if (name === "nosana") return new NosanaExecutionLayer();
  throw new Error(`Unknown execution layer: ${name}`);
}

