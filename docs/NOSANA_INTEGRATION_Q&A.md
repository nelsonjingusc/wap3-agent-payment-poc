# WAP3 × Nosana — Integration Q&A

---

## Q1: Nosana Centrality

**Is the plan that Nosana will be the exclusive launch GPU provider for WAP3?**

For the WAP3 launch, the plan is to treat Nosana as the primary and effectively exclusive GPU provider for GPU-backed agent workloads.

On the product / go-to-market side, I do not plan to run or manage my own GPU fleet. When an agent needs GPU compute, the default path will be "send this job to Nosana."

On the protocol level, WAP3 stays technically compute-agnostic, but for this grant phase and for the first production pilots I'm designing the execution layer based on Nosana's markets and SDK, not against a mix of providers. If later there is a strong reason to support another backend, that would be an extension, not the default. So from WAP3's practical usage point of view, Nosana is the GPU execution backend I want to build around.

---

## Q2: Execution Layer vs. Settlement Layer

**Could you provide some clarification of the difference between Nosana as the execution layer and WAP3 as the settlement layer?**

The separation I have in mind and am developing against is:

### a. Nosana as Execution Layer

Nosana runs the actual jobs: a containerized task is scheduled into a GPU market, runs to completion, and writes its result to IPFS together with metadata such as job id, state, and resource usage.

Regarding the typical jobs, on top of WAP3, I am building a reference implementation that is essentially a prediction-market–oriented agent system: an intelligence layer where agents look for opportunities in prediction markets and, when it makes sense, execute on those opportunities on behalf of the user.

In that context, the typical jobs I have in mind for agent workloads include:

- **Option-style pricing and outcome distribution tasks.**
  For markets whose payoff can be described as "above X", "below X", or "within a range", the job maps the market to a digital or barrier option, runs the pricing or distribution computation (sometimes using Monte Carlo or grid-based methods), and returns a risk-neutral probability range that the agent can use to judge mispricing.

- **Market similarity and clustering jobs.**
  In these jobs, market descriptions and related news are embedded into high-dimensional vectors and compared across many markets to identify which events are effectively referring to the same real-world outcome.

- **Heavier agent signal and scenario jobs.**
  These jobs simulate different paths or run more expensive models, such as large embedding models or smaller open-weight language models in a loop, to generate trading or risk signals that feed back into the agent's decision about whether to act.

All of these can be expressed as container jobs that run on Nosana's GPU markets via `client.api.deployments.create(...)`, monitored by polling `client.api.deployments.get(...)`, and results retrieved through `client.ipfs.retrieve(...)` in the SDK.

### b. WAP3 as Settlement / Coordination Layer

WAP3 does not run the compute. It:

- Locks funds in escrow before dispatching a job.
- Waits for a verifiable completion signal from Nosana (job id, state, IPFS result).
- Applies per-task settlement rules (e.g., "pay if job completed successfully and returned a valid output," or more advanced conditions later).
- Writes a provenance record: which agent requested what, which Nosana job was run, what result came back, and why funds were released or refunded.

So simply put: Nosana runs the containers and GPUs; WAP3 holds and releases the money, and keeps the audit trail.

---

## Q3: Compute Needs

**Could you please provide some clarification on how much compute you are currently using and how much compute you predict WAP3 will be using?**

Right now, actual GPU usage on Nosana is still small, because I just finished wiring the Nosana execution layer into the WAP3 prototype and I'm only running small integration tests.

For the grant period, a more concrete picture is:

### Months 1–2 — Milestone 1: Internal Tests and Proof-of-Flow

During the first two months, Nosana usage will remain intentionally modest, on the order of roughly **50–100 GPU-hours** in total. This phase is focused on validating the end-to-end execution loop rather than driving volume. Jobs at this stage are small but real: containerized tasks are submitted through the Nosana SDK, monitored to completion, results are retrieved from IPFS, and settlement is triggered correctly in WAP3. The goal here is to fully de-risk the execution, monitoring, and settlement path before scaling usage.

### Months 3–4 — Milestone 2: Core Integration and Closed Beta

In months three and four, usage begins to shift from validation to continuous workloads. At this stage, I expect usage to reach approximately **2,000–2,500 GPU-hours per month** (roughly 4,000–5,000 GPU-hours total over this milestone). This comes from a small number of always-on agent workflows running on live data: option-style pricing and probability estimation jobs, market similarity and clustering jobs, and periodic heavier runs for backfilling and backtesting. Importantly, these workloads are no longer one-off tests; they are recurring jobs triggered automatically by agent logic, which creates steady and repeatable demand for Nosana compute.

### Months 5–6 — Milestone 3: Pilot-Ready Usage

By months five and six, as the system becomes pilot-ready and early users or strategies are onboarded, expected usage increases to roughly **4,500–5,000 GPU-hours per month** (roughly 9,000–10,000 GPU-hours total over this milestone). At this stage, the default path for any GPU-backed agent task in WAP3 is execution on Nosana. Each additional active agent, strategy, or covered market directly translates into more Nosana jobs, without additional integration work. While the initial pilot numbers are still conservative, the architecture is designed so that GPU usage scales naturally with agent activity rather than manual operation, allowing compute demand to ramp quickly as adoption grows.

These numbers are conservative but realistic for a single-founder project that is actually shipping and running live workflows. If usage ramps faster with early users, the GPU hours go up proportionally, because each additional market / wallet / strategy just means more Nosana jobs.

---

## Q4: Budget and Compute Allocation

**How much does WAP3 intend to spend on compute?**

Agree that a large chunk of the grant should go into compute credits, so out of the requested USD 35,000:

- At least **50% of the grant value** will end up as Nosana compute credits over the 6-month period (roughly USD 17,000–18,000 equivalent).
- The remaining **50%** would cover engineering time and basic infra needed to actually generate that usage: integrating the SDK, maintaining the agent workflows, improving job definitions, and supporting pilots. The goal is that grant funds translate directly into real compute usage, not just abstract development.

If the Grants team feels the allocation should be adjusted further, I'm open to discussing your recommendations and aligning on a structure that makes sense for both sides.

---

## Q5: Post-Grant Sustainability / Monetization

**How do you foresee this project will continue to run after the allocation of the grant funds?**

Compute is an operating cost. In the long run, it should be covered by users whose agents are consuming GPU resources.

On top of the core WAP3 layer, I plan to ship the prediction-market–oriented analytics product that uses these agent workloads to price events, analyze markets, and track wallets. That gives us two main revenue paths:

- **Usage-based fees** for agent workloads that run on Nosana (per-task or per-job pricing).
- **Subscription tiers** for higher-end / institutional users, where the subscription fee bundles an expected amount of Nosana compute plus a margin for support and feature work.

In other words, the grant helps me fund the initial integration and the first 6 months of GPU usage. After that, the plan is to have paying users on top of the agent workflows, and part of that revenue simply flows back into Nosana usage to keep the jobs running.

---

## Q6: Current Use of the Nosana SDK

**Could you provide some info on how you are currently using the Nosana SDK?**

Right now I am working towards a dedicated execution layer in the WAP3 prototype that wraps the `@nosana/kit` v2 client:

1. Initialize a Nosana client with an API key on MAINNET, using `createNosanaClient(NosanaNetwork.MAINNET, { api: { apiKey: ... } })`.

2. Agents submit tasks with `execution_layer: "nosana"`. The execution layer translates this into a Nosana job definition (single-container job with GPU enabled) and calls `client.api.deployments.create({ market, job_definition, ... })` via the Nosana REST API, which returns a deployment object with an `id`.

3. The deployment is monitored by polling `client.api.deployments.get(deploymentId)` every 5 seconds. When the status reaches `RUNNING` or `STOPPED`, the result IPFS hash is extracted from the latest revision.

4. I call `client.ipfs.retrieve(ipfsHash)` to fetch the output payload.

> **Note:** The REST API path (`deployments.create`) requires only a `NOSANA_API_KEY` and is suitable for the current integration and demo phase. The on-chain path (`ipfs.pin` → `jobs.post` → `monitor()`) requires a Solana wallet with NOS tokens and is the planned path for full production use.

5. The result and metadata are passed back into the WAP3 settlement logic, which decides whether to release escrowed funds or not and records a provenance entry.
