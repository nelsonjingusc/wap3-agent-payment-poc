# WAP3 × Nosana — Meeting Q&A

---

## Compute

**Q: How much are you spending on compute currently to run your AI workloads?**

Current GPU usage is validation-focused rather than production-scale.

We've been running live end-to-end execution tests — container build, Nosana job submission, monitoring, IPFS retrieval, proof hash generation, and settlement — to validate the complete execution loop.

What we have not turned on yet is sustained recurring workload coverage across large sets of live markets. The execution pipeline itself is fully functional; the transition ahead is scaling that validated loop into continuous, programmatic usage.

---

## GPU Workloads

**Q: What GPU workloads and models will you run?**

We run three recurring workload types, all containerized and integrated into the Nosana execution pipeline:

1. **Outcome pricing**
   Mapping prediction markets to option-style pricing models and running Monte Carlo simulations to estimate risk-neutral probability ranges.

2. **Market matching**
   Converting market descriptions into embedding vectors (e.g., `sentence-transformers/all-MiniLM-L6-v2`) and identifying semantically equivalent markets across venues using similarity scoring plus structural compatibility filters.

3. **News digest**
   Fetching relevant articles and running a lightweight open-weight LLM (e.g., Llama or Mistral via Ollama) to produce structured summaries tied directly to a market's resolution criteria.

Market matching and news digest are already integrated and running in the demo through Nosana-backed container jobs. Outcome pricing follows the same execution pattern and is next in the integration queue.

Each workflow follows the same deterministic lifecycle:

> WAP3 agent triggers task → `nosana-layer.ts` builds job definition → `client.api.deployments.create()` submits → model runs on a Nosana GPU node → results written to IPFS → WAP3 retrieves and validates output → escrow settlement triggers.

---

## Compute Growth Forecast

**Q: What's your forecast for how much your compute needs will grow?**

- **Months 1–2:** 50–100 GPU-hours total, validating execution on live market data.
- **Months 3–4:** 2,000–2,500 GPU-hours per month from recurring agent workflows.
- **Months 5–6:** 4,500–5,000 GPU-hours per month as pilot coverage scales.

The scaling model is straightforward:

> (active markets) × (jobs per market per day) × (average GPU time per job)

Each additional market covered by an agent produces additional Nosana jobs. Usage scales linearly with market coverage rather than through isolated batch spikes.

---

## Built So Far

**Q: What have you built so far? Show us.**

A significant portion of the core infrastructure is already operational:

- **Smart contract escrow** (`AgentEscrow.sol`) — create escrow, lock funds, submit proof, release payment, refund. Deployed and tested.
- **WAP3Client** (TypeScript) — wraps the contract with `createEscrow()`, `submitProof()`, `settle()`, and `getEscrow()` using typechain-generated bindings.
- **Nosana execution layer** — wraps `@nosana/kit` v2. Submits containerized jobs via `client.api.deployments.create()`, polls via `client.api.deployments.get()`, retrieves results from IPFS via `client.ipfs.retrieve()`, generates a proof hash, and passes it to WAP3 settlement.
- **AP2 intent + X402 trigger protocol** — structured intent and payment trigger objects hashed and linked on-chain for provenance.
- **Agent framework adapters** — LangGraph adapter and tool-agent adapter integrated into the full WAP3 lifecycle.
- **Two end-to-end GPU workflows** — market similarity (embedding search) and news digest (LLM summary), both running through Nosana in the demo environment.

We can run `npm run demo:nosana-live` and walk through job submission, monitoring, IPFS retrieval, proof hash generation, and escrow settlement in real time.

The next step is connecting to a live Nosana market with production API credentials and expanding recurring workloads.

---

## Commitment

**Q: How much time can you realistically commit?**

Full-time (100%). This is my primary and only project. I hold a PhD in Computer Science and have over 20 years of production engineering experience in distributed systems, financial infrastructure, and AI pipelines.

---

## Budget

**Q: Walk us through your budget — why these numbers?**

Total request: $35,000 over six months

- **Phase 1 ($10k):** Execution validation on live Nosana markets — real jobs, auditable outputs, full proof-of-flow.
- **Phase 2 ($15k):** Core integration depth — conditional settlement expansion, additional workload types, recurring agent workflows on live data.
- **Phase 3 ($10k):** Reference workflows, pilot support, onboarding early users.

At least 50% (~$17k–18k) is expected to translate directly into Nosana compute credits. The remaining allocation supports engineering required to generate and sustain recurring workload demand.

The objective is simple: development effort converts directly into sustained, programmatic GPU usage on Nosana.

---

## First Deliverable

**Q: What's your first deliverable, and how will we verify it?**

Milestone 1 is a fully verifiable end-to-end proof-of-flow running against the live Nosana API:

1. Agent dispatches a job
2. Job runs on a Nosana GPU node
3. Result is written to IPFS
4. WAP3 retrieves output and generates proof hash
5. Escrow settlement triggers correctly

Verification is straightforward: run the demo script using an API key and market address you provide. Job IDs, IPFS hashes, and proof hashes are logged and auditable.

---

## Risk

**Q: Biggest risk to this project?**

Execution speed as a single-founder project.

Mitigation strategy:

- Strict scope discipline (two active workflows, one reference vertical)
- Reuse of validated infrastructure rather than new invention
- Focus on integration depth rather than feature breadth

The core architecture is already built and validated. Remaining work is scaling, live data integration, and pilot expansion — not foundational research.

---

## Nosana Benefit

**Q: How does Nosana benefit if you succeed?**

**Direct impact:**
Sustained, programmatic GPU demand driven by autonomous agent workflows. WAP3 generates recurring workloads per market, per agent, per strategy — not one-off jobs.

**Structural impact:**
WAP3 demonstrates Nosana as the execution backend for an economic coordination system. Compute is not just rented; it becomes part of a verifiable payment, settlement, and provenance loop.

That positions Nosana as infrastructure for the emerging agent economy, not merely as decentralized GPU capacity.
