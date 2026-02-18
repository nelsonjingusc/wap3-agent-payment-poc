/**
 * WAP3 × Nosana — Interactive Demo  (press Enter to advance each step)
 *
 * Same content as nosana-demo.ts, but pauses at each step and waits
 * for you to press Enter before continuing — ideal for live walkthroughs.
 *
 * Run (mock mode, no credentials needed):
 *   npm run demo:nosana-live
 *
 * Run (real Nosana API):
 *   USE_NOSANA_REAL=true NOSANA_API_KEY=<key> NOSANA_MARKET=<market> npm run demo:nosana-live
 */

import { getExecutionLayer } from "../execution";
import * as readline from "readline";

// ── Terminal colors ──────────────────────────────────────────────────────────
const C = {
  reset:   "\x1b[0m",
  bold:    "\x1b[1m",
  dim:     "\x1b[2m",
  cyan:    "\x1b[36m",
  green:   "\x1b[32m",
  yellow:  "\x1b[33m",
  blue:    "\x1b[34m",
  magenta: "\x1b[35m",
  red:     "\x1b[31m",
};

const W = 64;
const DLINE = "═".repeat(W);

function c(color: string, text: string) { return `${color}${text}${C.reset}`; }
function bold(text: string)  { return c(C.bold, text); }
function dim(text: string)   { return c(C.dim, text); }
function ok(text: string)    { return c(C.green + C.bold, `✓ ${text}`); }
function label(text: string) { return c(C.magenta, text); }

// ── Wait for Enter key ───────────────────────────────────────────────────────
function waitForEnter(prompt = "Press Enter to continue...") {
  return new Promise<void>(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    process.stdout.write(`\n  ${c(C.yellow + C.bold, "▷")} ${c(C.dim, prompt)} `);
    rl.once("line", () => { rl.close(); resolve(); });
  });
}

function printBox(title: string, color: string) {
  console.log(`\n${c(color, DLINE)}`);
  console.log(c(color + C.bold, `  ${title}`));
  console.log(c(color, DLINE));
}

function printStepHeader(n: number, total: number, title: string) {
  console.log(`\n  ${c(C.cyan, `[${n}/${total}]`)} ${bold(title)}`);
}

function printJson(obj: any) {
  JSON.stringify(obj, null, 2).split("\n")
    .forEach(line => console.log(dim("  " + line)));
}

async function main() {
  const { ethers } = await import("ethers");
  const mode = process.env.USE_NOSANA_REAL === "true" ? "REAL (Nosana Mainnet)" : "MOCK";

  // ── INTRO ────────────────────────────────────────────────────────────────
  console.log(`\n${c(C.blue + C.bold, DLINE)}`);
  console.log(c(C.blue + C.bold, "  WAP3 × Nosana — GPU Execution Integration Demo"));
  console.log(c(C.blue + C.bold, DLINE));
  console.log(`
  ${bold("What this demo shows:")}

  WAP3 is a decentralized agent payment protocol. When an AI agent
  needs GPU compute, WAP3 dispatches the job to ${c(C.green + C.bold, "Nosana")} — its
  default GPU execution backend — and holds funds in escrow until
  the job is verifiably complete.

  This demo walks through ${bold("two real GPU workflows")} powered by Nosana:

    ${c(C.cyan + C.bold, "Workflow #1 — Market Matching")}
      Given a prediction market, find equivalent markets on other
      venues using GPU-accelerated text matching and scoring.

    ${c(C.cyan + C.bold, "Workflow #2 — News Digest")}
      Fetch relevant news for a market, then run a GPU language
      model to produce a structured summary tied to contract terms.

  ${bold("Two-layer architecture:")}

    ${c(C.blue + C.bold, "WAP3 (Escrow & Provenance)")}
      Locks funds before dispatch. Generates a proof from the job
      result. Releases payment after verification. Keeps an
      on-chain record of every job run.

    ${c(C.green + C.bold, "Nosana (GPU Execution)")}
      Runs containerized GPU jobs on decentralized compute.
      Stores results on IPFS. Returns job ID + result hash to WAP3.

  ${label("Mode    :")} ${bold(mode)}
  ${label("Market  :")} ${process.env.NOSANA_MARKET ?? dim("(mock)")}
  ${label("API Key :")} ${process.env.NOSANA_API_KEY ? ok("set") : dim("(mock)")}
`);

  await waitForEnter("Ready? Press Enter to start Workflow #1...");

  const layer = getExecutionLayer("nosana");

  // ── WORKFLOW #1: Market Matching ─────────────────────────────────────────
  printBox("WORKFLOW #1 — Market Matching  (GPU: text matching + scoring)", C.cyan);
  console.log(`
  ${bold("Scenario:")}
  An agent found a prediction market on Polymarket and wants to know
  if the same market exists on other venues (Kalshi, Manifold, etc.)
  so it can compare prices and find trading opportunities.

  A Nosana GPU job is sent to do the following:
    1. Normalize the seed and candidate markets into a common format
    2. Convert market descriptions into numeric vectors (embeddings)
    3. Score how similar each candidate is to the seed market
    4. Drop markets that don't match on outcome type or expiry date
    5. Return the top matches with scores and a yes/no equivalence call
`);

  await waitForEnter("Press Enter to see the job input...");

  const matchingInput = {
    seed_market: {
      venue: "polymarket",
      market_id: "pm_001",
      title: "Will the Fed cut rates before Q3 2025?",
      description: "Federal Reserve interest rate decision",
      outcomes: ["Yes", "No"],
      time_window: { start: "2025-01-01", end: "2025-07-01" }
    },
    candidates: [
      {
        venue: "kalshi",
        market_id: "kx_fed_rate_q3",
        title: "Fed rate cut by July 2025?",
        outcomes: ["Yes", "No"]
      }
    ],
    top_k: 3
  };

  printStepHeader(1, 3, "Input — seed market + candidate markets");
  printJson(matchingInput);

  await waitForEnter("Press Enter to submit the GPU job to Nosana...");

  printStepHeader(2, 3, "Submitting GPU job to Nosana");
  console.log(dim("  → WAP3 builds a job spec (containerized, GPU enabled)"));
  console.log(dim("  → job is sent to Nosana API"));
  console.log(dim("  → Nosana assigns it to an available GPU node"));
  const matchReceipt = await layer.submit({
    taskType: "market_matching",
    inputs: matchingInput
  });
  console.log(`\n  ${ok("Job submitted to Nosana")}`);
  console.log(`  ${label("WAP3 Execution ID :")} ${c(C.yellow, matchReceipt.executionId)}`);
  console.log(`  ${label("Nosana Job ID     :")} ${c(C.yellow, matchReceipt.providerJobId)}`);
  console.log(`  ${label("Submitted At      :")} ${matchReceipt.submittedAt}`);

  await waitForEnter("Press Enter to wait for the job to finish and fetch the result...");

  printStepHeader(3, 3, "Waiting for job to finish → fetching result from IPFS");
  console.log(dim("  → WAP3 checks job status every 5 seconds"));
  console.log(dim("  → once the GPU node finishes, it writes the result to IPFS"));
  console.log(dim("  → WAP3 fetches the result JSON from IPFS"));
  const matchResult = await layer.waitForCompletion(matchReceipt.executionId);

  if (matchResult.status !== "SUCCEEDED") {
    console.error(`\n  ${c(C.red + C.bold, "✗ Job failed:")} ${matchResult.logs}`);
    process.exit(1);
  }
  console.log(`\n  ${ok("GPU job finished — " + matchResult.status)}`);
  console.log(`\n  ${bold("Result fetched from IPFS:")}`);
  printJson(matchResult.output);

  await waitForEnter("Press Enter to generate the WAP3 proof hash...");

  console.log(`\n  ${c(C.yellow + C.bold, "▶ WAP3 Settlement:")} generating proof hash`);
  console.log(dim("  → WAP3 hashes the job ID + output into a single proof"));
  console.log(dim("  → this proof is submitted on-chain to the WAP3 Escrow contract"));
  console.log(dim("  → once verified, the escrow releases payment to the agent"));
  const proofData1 = {
    executionId: matchReceipt.executionId,
    providerJobId: matchResult.providerJobId,
    output: matchResult.output,
    completedAt: new Date().toISOString()
  };
  const proofHash1 = (await import("ethers")).ethers.id(JSON.stringify(proofData1));
  console.log(`\n  ${ok("Proof hash ready for on-chain submission")}`);
  console.log(`  ${label("Proof Hash :")} ${dim(proofHash1)}`);

  await waitForEnter("Press Enter to start Workflow #2 — News Digest...");

  // ── WORKFLOW #2: News Digest ─────────────────────────────────────────────
  printBox("WORKFLOW #2 — News Digest  (GPU: LLM summarization)", C.magenta);
  console.log(`
  ${bold("Scenario:")}
  For the same market, the agent wants to read the latest news and
  understand how current events relate to whether the market resolves
  Yes or No. We run a GPU LLM on Nosana to do this.

  ${bold("Two steps:")}
    ${c(C.blue, "Step 1 — local (CPU)")}
      Fetch news articles from RSS feeds and free search sources.
      No paid APIs needed.

    ${c(C.green, "Step 2 — Nosana (GPU)")}
      Send the articles to a GPU node running a small LLM.
      The LLM groups similar articles, pulls out the key facts,
      builds a timeline, and explains how the news connects to the
      market's resolution criteria.
`);

  await waitForEnter("Press Enter to see the job input...");

  const digestInput = {
    market: {
      title: "Will the Fed cut rates before Q3 2025?",
      description: "Federal Reserve interest rate decision"
    },
    articles: [
      {
        title: "Fed signals potential rate cut amid cooling inflation",
        url: "https://example.com/article1",
        source: "Reuters",
        timestamp: "2025-02-15T10:00:00Z",
        body: "Federal Reserve officials signaled willingness to cut rates..."
      },
      {
        title: "Inflation data supports Fed easing timeline",
        url: "https://example.com/article2",
        source: "Bloomberg",
        timestamp: "2025-02-16T09:30:00Z",
        body: "Latest CPI figures show inflation trending toward 2% target..."
      }
    ],
    keywords: ["Federal Reserve", "interest rates", "inflation", "CPI"]
  };

  printStepHeader(1, 3, "Input — market + fetched news articles");
  printJson(digestInput);

  await waitForEnter("Press Enter to submit the GPU job to Nosana...");

  printStepHeader(2, 3, "Submitting GPU job to Nosana");
  console.log(dim("  → articles are packed into the job input"));
  console.log(dim("  → GPU node loads the LLM and runs the analysis"));
  const digestReceipt = await layer.submit({
    taskType: "news_digest",
    inputs: digestInput
  });
  console.log(`\n  ${ok("Job submitted to Nosana")}`);
  console.log(`  ${label("WAP3 Execution ID :")} ${c(C.yellow, digestReceipt.executionId)}`);
  console.log(`  ${label("Nosana Job ID     :")} ${c(C.yellow, digestReceipt.providerJobId)}`);

  await waitForEnter("Press Enter to wait for the job to finish and fetch the result...");

  printStepHeader(3, 3, "Waiting for job to finish → fetching result from IPFS");
  const digestResult = await layer.waitForCompletion(digestReceipt.executionId);

  if (digestResult.status !== "SUCCEEDED") {
    console.error(`\n  ${c(C.red + C.bold, "✗ Job failed:")} ${digestResult.logs}`);
    process.exit(1);
  }
  console.log(`\n  ${ok("GPU job finished — " + digestResult.status)}`);
  console.log(`\n  ${bold("Result fetched from IPFS:")}`);
  printJson(digestResult.output);

  await waitForEnter("Press Enter to generate the WAP3 proof hash...");

  console.log(`\n  ${c(C.yellow + C.bold, "▶ WAP3 Settlement:")} generating proof hash`);
  const proofData2 = {
    executionId: digestReceipt.executionId,
    providerJobId: digestResult.providerJobId,
    output: digestResult.output,
    completedAt: new Date().toISOString()
  };
  const proofHash2 = ethers.id(JSON.stringify(proofData2));
  console.log(`\n  ${ok("Proof hash ready for on-chain submission")}`);
  console.log(`  ${label("Proof Hash :")} ${dim(proofHash2)}`);

  await waitForEnter("Press Enter to see the final summary...");

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  printBox("SUMMARY — End-to-End Flow Complete", C.green);
  console.log(`
  Both GPU workflows ran successfully through the WAP3 × Nosana stack.

  ${bold("Nosana Execution Layer — jobs dispatched and completed:")}
  ┌───────────────────┬──────────────────────────────────────────┬───────────┐
  │ Workflow          │ Job ID                                   │ Status    │
  ├───────────────────┼──────────────────────────────────────────┼───────────┤
  │ Market Matching   │ ${matchReceipt.providerJobId.slice(0,40).padEnd(40)} │ ${c(C.green + C.bold, "SUCCEEDED")} │
  │ News Digest       │ ${digestReceipt.providerJobId.slice(0,40).padEnd(40)} │ ${c(C.green + C.bold, "SUCCEEDED")} │
  └───────────────────┴──────────────────────────────────────────┴───────────┘

  ${bold("WAP3 Settlement Layer — proof hashes generated:")}
  ${label("Market Matching :")} ${dim(proofHash1)}
  ${label("News Digest     :")} ${dim(proofHash2)}

  ${dim("In production, these hashes are submitted on-chain to the WAP3")}
  ${dim("Escrow contract, triggering payment release to the agent.")}

  ${bold("This is the core WAP3 × Nosana loop:")}
  ${c(C.blue, "WAP3")} locks funds → ${c(C.green, "Nosana")} runs GPU job → ${c(C.blue, "WAP3")} verifies + settles
`);

  console.log(c(C.blue + C.bold, DLINE));
  console.log(c(C.blue + C.bold, "  Demo complete.  Run with USE_NOSANA_REAL=true to use live Nosana API."));
  console.log(c(C.blue + C.bold, DLINE) + "\n");
}

main().catch(err => {
  console.error(c(C.red + C.bold, "\n[error]"), err.message ?? err);
  process.exit(1);
});
