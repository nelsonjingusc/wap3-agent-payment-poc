# Agent Framework Integration - Testing Guide

Complete testing guide for reviewers to validate all agent framework integration features.

---

## 🎯 Quick Validation (5 minutes)

**For reviewers who want to quickly verify the integration works:**

```bash
# 1. Verify compilation (should show 0 errors)
npx tsc --noEmit

# 2. Run LangChain demo (most comprehensive test)
npm run demo:langchain

# 3. Check git commits
git log --oneline -5
```

**Expected Results**:
- ✅ Zero TypeScript compilation errors
- ✅ LangChain demo completes all 6 steps successfully
- ✅ Real Sui testnet transactions visible

---

## 🔧 Environment Setup

### Prerequisites
```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Verify .env file exists
cat .env

# Required variables:
# SUI_NETWORK=testnet
# SUI_PRIVATE_KEY=suiprivkey1...
# SUI_PACKAGE_ID=0x4a344bda6321eeee474976330460eb8d9cb68e33091efe9a272aa151dc679067
# WALRUS_MOCK_MODE=true
```

### If .env is missing:
```bash
# Copy template
cp .env.example .env

# Edit and add your Sui private key
# Get it from: sui keytool export --key-identity <address>
```

---

## 📋 Complete Test Suite

### Test 1: TypeScript Compilation ⚡ (30 seconds)

**Purpose**: Verify all type errors are fixed

```bash
npx tsc --noEmit
```

**Expected Output**:
```
# Should complete silently with no errors
# Exit code: 0
```

**Validation Points**:
- ✅ No "error TS" messages
- ✅ All new files compile successfully
- ✅ No type assertion issues

---

### Test 2: LangChain Agent Demo 🤖 (2-3 minutes)

**Purpose**: Verify LangChain tools integration works end-to-end

```bash
npm run demo:langchain
```

**Expected Output**:
```
╔══════════════════════════════════════════════════════════╗
║  LangChain Agent Demo - WAP3 on Sui                      ║
╚══════════════════════════════════════════════════════════╝

🤖 Agent Reasoning:
   Input: "Analyze user behavior patterns in e-commerce dataset"
   Reward: 0.15 SUI

💭 Decision: I should create a task for this work...

✓ Task created on Sui: 0x...
✅ Tool: create_task
   Result: Task 0x... created

💭 Decision: I can do this task. Let me claim it...

✓ Task claimed: 0x...
✅ Tool: claim_task
   Result: Claim 0x... created

⚙️  Worker agent executes task...
   ✓ Evidence saved: .../agent_work_results.json

💭 Decision: Work complete. Time to submit evidence...

✓ Evidence submitted: 0x...
✅ Tool: submit_evidence
   Result: Submission 0x...

💭 Decision: Let me verify the evidence quality...

✅ Tool: verify_evidence
   Verified: ✓ YES

💭 Decision: Evidence verified. Releasing payment...

✓ Task settled: 0x...
✅ Tool: settle_task
   Transaction: [TX_HASH]

╔══════════════════════════════════════════════════════════╗
║  ✓ Demo Completed Successfully!                          ║
╚══════════════════════════════════════════════════════════╝

Blockchain Records:
  Task ID: 0x...
  Submission ID: 0x...
  Settlement Tx: [TX_HASH]
```

**Validation Points**:
- ✅ All 6 tools execute successfully
- ✅ Task ID, Claim ID, and Submission ID are generated
- ✅ Settlement transaction hash is returned
- ✅ Evidence file created in `demo/out/`
- ✅ Demo completes with success message

**Verify on Blockchain**:
```bash
# Copy the settlement transaction hash and visit:
open "https://suiscan.xyz/testnet/tx/[TX_HASH]"
```

---

### Test 3: LangGraph Workflow Demo 📊 (2 minutes)

**Purpose**: Verify stateful workflow execution

```bash
npm run demo:langgraph
```

**Expected Output**:
```
╔══════════════════════════════════════════════════════════╗
║  LangGraph Workflow - WAP3 on Sui                        ║
║  Stateful Task Execution with Payment                    ║
╚══════════════════════════════════════════════════════════╝

📋 Node: Create Task
   Type: sentiment_analysis
   Reward: 0.12 SUI
   ✓ Task created: 0x...

👷 Node: Claim Task
   Task ID: 0x...
   ✓ Task claimed: 0x...

⚙️  Node: Execute Work
   Simulating task execution...
   ✓ Work completed
   Evidence: .../langgraph_evidence.json

📤 Node: Submit Evidence
   File: .../langgraph_evidence.json
   ✓ Evidence submitted
   Blob ID: mock_...
   Submission ID: 0x...

🔍 Node: Verify Evidence
   Blob ID: mock_...
   Hash Match: ✓ YES
   Data Size: ... bytes

💰 Node: Settle Task
   Task ID: 0x...
   ✓ Payment released
   Transaction: [TX_HASH]

╔══════════════════════════════════════════════════════════╗
║  ✓ Workflow Completed Successfully!                      ║
╚══════════════════════════════════════════════════════════╝

Workflow Summary:
  Task Type: sentiment_analysis
  Reward: 0.12 SUI
  ...

State Transitions:
  1. initial → task_created
  2. task_created → task_claimed
  3. task_claimed → work_completed
  4. work_completed → evidence_submitted
  5. evidence_submitted → evidence_verified
  6. evidence_verified → settled
```

**Validation Points**:
- ✅ All 6 workflow nodes execute in sequence
- ✅ State transitions logged correctly
- ✅ Evidence file generated
- ✅ Workflow completes successfully

---

### Test 4: MCP Server & Client Demo 🔌 (2 minutes)

**Purpose**: Verify MCP protocol integration

**Note**: This test requires running server and client. For quick testing, skip to checking the code structure instead.

**Quick Code Verification**:
```bash
# Check MCP server file exists and has correct structure
cat src/mcp/server.ts | grep "setRequestHandler" | wc -l
# Expected: 2 (ListToolsRequestSchema, CallToolRequestSchema)

# Check tool definitions
cat src/mcp/server.ts | grep "name:" | wc -l
# Expected: 6 (all 6 tools)
```

---

### Test 5: Code Structure Review 📁 (3 minutes)

**Purpose**: Verify all files are created correctly

```bash
# Check adapter files exist
ls -la adapters/langchain-tools/
# Expected: wap3-tools.ts, README.md

ls -la adapters/sui-langgraph/
# Expected: workflow.ts, README.md

# Check demo files exist
ls -la demo/ | grep -E "(langchain|langgraph|mcp)"
# Expected: 
#   langchain-agent-demo.ts
#   langgraph-workflow-demo.ts
#   mcp-client-demo.ts

# Check MCP server
ls -la src/mcp/
# Expected: server.ts, index.ts

# Verify package.json has new scripts
cat package.json | grep "demo:"
# Expected to see:
#   "demo:sui"
#   "demo:langchain"
#   "demo:langgraph"
#   "demo:mcp"
```

---

### Test 6: Documentation Review 📚 (2 minutes)

**Purpose**: Verify documentation is comprehensive

```bash
# Check README updates
cat README.md | grep -A 5 "Agent Framework"
# Should show new section with LangChain, LangGraph, MCP

# Check adapter READMEs exist
cat adapters/langchain-tools/README.md | head -20
cat adapters/sui-langgraph/README.md | head -20

# Check walkthrough
cat .gemini/antigravity/brain/*/walkthrough.md | grep "Agent Framework"
```

---

## 🎓 Advanced Testing (Optional)

### Test Real LangChain Integration

If reviewer wants to test actual LangChain integration:

```bash
# Install optional dependency
npm install @langchain/langgraph

# Modify adapters/sui-langgraph/workflow.ts to use real StateGraph
# (Example code is in comments in the file)
```

### Test MCP Server Manually

```bash
# Terminal 1: Start MCP server
npm run mcp:server

# Terminal 2: Run client demo
npm run demo:mcp
```

---

## ✅ Success Criteria

### Minimum Requirements (for approval):
- ✅ TypeScript compiles with 0 errors
- ✅ At least one demo runs successfully end-to-end
- ✅ All adapter files exist with proper structure
- ✅ Documentation is updated

### Full Validation (ideal):
- ✅ All 3 demos run successfully
- ✅ Transactions visible on Sui explorer
- ✅ Evidence files generated correctly
- ✅ Code follows TypeScript best practices
- ✅ No hardcoded values or security issues

---

## 🐛 Troubleshooting

### Issue: "Missing script" error
```bash
# Solution: Verify package.json has the script
cat package.json | grep demo:langchain

# If missing, the file wasn't saved properly
git status
git diff package.json
```

### Issue: "Cannot find module" error
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Demo fails with "notExists" error
```bash
# This is an RPC indexing delay (known issue)
# Solution: The demo has delays built in, but if it still fails:
# - Wait 30 seconds and try again
# - Check Sui network status: https://status.sui.io/
```

### Issue: Walrus connection error
```bash
# This is expected - Walrus testnet can be unstable
# The demos use WALRUS_MOCK_MODE=true by default
# Check .env file has: WALRUS_MOCK_MODE=true
```

---

## 📊 Test Results Summary

Create this checklist when reviewing:

```
[ ] TypeScript Compilation: 0 errors
[ ] LangChain Demo: ✓ Passed
[ ] LangGraph Demo: ✓ Passed (or N/A if skipped)
[ ] MCP Code Structure: ✓ Verified
[ ] All adapter files exist: ✓ Yes
[ ] Documentation updated: ✓ Yes
[ ] README reflects new features: ✓ Yes
[ ] Git commits are clean: ✓ Yes

Overall Status: APPROVED / NEEDS WORK
```

---

## 🎯 Quick Review Checklist

**For busy reviewers (2 minutes)**:

1. ✅ Run: `npx tsc --noEmit` → Should show 0 errors
2. ✅ Check: `git log --oneline -3` → Should see 3 recent commits
3. ✅ View: `cat README.md | grep "Agent Framework"` → Should see new section
4. ✅ Run: `npm run demo:langchain` → Should complete successfully

**If all 4 pass → APPROVED ✅**

---

## 📝 Notes for Reviewer

- **Time Required**: 5-15 minutes (depending on depth)
- **Internet Required**: Yes (for Sui testnet transactions)
- **SUI Tokens Required**: No (uses existing testnet balance)
- **Breaking Changes**: None (all new features, backwards compatible)
- **Migration Required**: None

**Any issues? Check troubleshooting section above or contact developer.**
