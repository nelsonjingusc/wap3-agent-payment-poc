#!/bin/bash

# WAP3 MVP Demo - One-command end-to-end demo
# This script runs the complete agent transaction lifecycle:
# AP2 Intent → X402 Trigger → Escrow → Proof → Settlement → Audit

set -e

# Opening caption for demo
echo "WAP3 MVP Demo: Agent Escrow → Proof → Settlement → Audit"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Unset proxy variables to avoid hardhat/undici proxy issues
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY 2>/dev/null || true

# Default: skip compile for reliability, but auto-compile if it succeeds quickly.
HARDHAT_RUN_EXTRA="--no-compile"

try_compile() {
  echo "Checking whether Hardhat compile is available..."
  # Try compile once; if it succeeds, we will run without --no-compile.
  # Keep logs for debugging.
  if npx hardhat compile >/tmp/wap3_compile.log 2>&1; then
    echo "Compile OK. Running with compilation enabled."
    HARDHAT_RUN_EXTRA=""
  else
    echo "Compile failed. Falling back to --no-compile."
    echo "(See /tmp/wap3_compile.log for details.)"
    HARDHAT_RUN_EXTRA="--no-compile"
  fi
}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  WAP3 MVP Demo - AP2 Intent → X402 Trigger → Escrow →     ║${NC}"
echo -e "${GREEN}║  Proof → Settlement → Audit                               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check if Hardhat node is running
echo -e "${YELLOW}[1/7] Checking Hardhat node...${NC}"
if ! curl -s http://127.0.0.1:8545 > /dev/null 2>&1; then
    echo -e "${YELLOW}Starting Hardhat node in background...${NC}"
    npm run node > /dev/null 2>&1 &
    HARDHAT_PID=$!
    sleep 5
    
    # Wait for node to be ready
    for i in {1..30}; do
        if curl -s http://127.0.0.1:8545 > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    if ! curl -s http://127.0.0.1:8545 > /dev/null 2>&1; then
        echo -e "${RED}Error: Failed to start Hardhat node${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Hardhat node started (PID: $HARDHAT_PID)${NC}"
else
    echo -e "${GREEN}✓ Hardhat node already running${NC}"
    HARDHAT_PID=""
fi

# Step 2: Try compile (auto-detect if compilation is available)
echo -e "${YELLOW}[2/7] Checking compilation availability...${NC}"
try_compile
if [ -z "$HARDHAT_RUN_EXTRA" ]; then
    echo -e "${GREEN}✓ Compilation enabled${NC}"
else
    echo -e "${YELLOW}⚠ Using --no-compile mode (compile not available)${NC}"
fi

# Step 3: Start agent service in background
echo -e "${YELLOW}[3/7] Starting agent service...${NC}"
npx hardhat run $HARDHAT_RUN_EXTRA demo/agent-service.ts --network localhost > /tmp/wap3_agent.log 2>&1 &
AGENT_PID=$!
sleep 3

# Extract contract and agent addresses from agent output
echo -e "${YELLOW}Waiting for agent service to initialize...${NC}"
for i in {1..30}; do
    if grep -q "MVP_INFO" /tmp/wap3_agent.log 2>/dev/null; then
        break
    fi
    sleep 1
done

CONTRACT_ADDR=$(grep "MVP_INFO" /tmp/wap3_agent.log 2>/dev/null | head -1 | sed -n 's/.*contract=\([^ ]*\).*/\1/p')
AGENT_ADDR=$(grep "MVP_INFO" /tmp/wap3_agent.log 2>/dev/null | head -1 | sed -n 's/.*agent=\([^ ]*\).*/\1/p')

if [ -z "$CONTRACT_ADDR" ] || [ -z "$AGENT_ADDR" ]; then
    echo -e "${RED}Error: Failed to extract contract/agent addresses${NC}"
    echo "Agent service output:"
    cat /tmp/wap3_agent.log
    kill $AGENT_PID 2>/dev/null || true
    exit 1
fi

# Wait for agent to write mvp_runtime.json file
RUNTIME_FILE="demo/out/mvp_runtime.json"
echo -e "${YELLOW}Waiting for runtime file...${NC}"
for i in {1..10}; do
    if [ -f "$RUNTIME_FILE" ]; then
        break
    fi
    sleep 1
done

if [ ! -f "$RUNTIME_FILE" ]; then
    echo -e "${RED}Error: Runtime file not created by agent${NC}"
    kill $AGENT_PID 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✓ Agent service started (PID: $AGENT_PID)${NC}"
echo -e "${GREEN}  Contract: $CONTRACT_ADDR${NC}"
echo -e "${GREEN}  Agent: $AGENT_ADDR${NC}"
echo -e "${GREEN}  Runtime file: $RUNTIME_FILE${NC}"

# Step 4: Run buyer client (non-interactive, reads from mvp_runtime.json)
echo -e "${YELLOW}[4/7] Creating escrow and triggering payment...${NC}"
BUYER_OUTPUT=$(npx hardhat run $HARDHAT_RUN_EXTRA demo/buyer-client.ts --network localhost 2>&1)

# Extract escrow ID and session directory from output
ESCROW_ID=$(echo "$BUYER_OUTPUT" | grep "MVP:ESCROW_ID=" | head -1 | sed -n 's/.*ESCROW_ID=\([0-9]*\).*/\1/p')
SESSION_DIR=$(echo "$BUYER_OUTPUT" | grep "MVP:SESSION_DIR=" | head -1 | sed -n 's/.*SESSION_DIR=\([^ ]*\).*/\1/p')

if [ -z "$ESCROW_ID" ]; then
    echo -e "${RED}Error: Failed to create escrow${NC}"
    echo "$BUYER_OUTPUT"
    kill $AGENT_PID 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✓ Escrow created (ID: $ESCROW_ID)${NC}"
if [ -n "$SESSION_DIR" ]; then
    echo -e "${GREEN}  Session directory: $SESSION_DIR${NC}"
fi

# Step 5: Wait for agent to complete and settle
echo -e "${YELLOW}[5/7] Waiting for agent to complete task...${NC}"
# Wait for proof submission (check logs)
PROOF_FOUND=0
for i in {1..40}; do
    if grep -q "MVP:PROOF_HASH=" /tmp/wap3_agent.log 2>/dev/null; then
        echo -e "${GREEN}✓ Proof submitted${NC}"
        PROOF_FOUND=1
        break
    fi
    if [ $((i % 5)) -eq 0 ]; then
        echo -e "${YELLOW}  Still waiting for proof... (${i}s)${NC}"
    fi
    sleep 1
done

if [ "$PROOF_FOUND" -eq 0 ]; then
    echo -e "${YELLOW}⚠ Proof not found in logs after 40s, checking agent status...${NC}"
    tail -10 /tmp/wap3_agent.log 2>/dev/null || true
fi

# Wait a bit more for proof to be confirmed on-chain
echo -e "${YELLOW}Waiting for on-chain confirmation...${NC}"
sleep 3

# Settle payment after proof is submitted
echo -e "${YELLOW}Settling payment...${NC}"
# Temporarily disable set -e for this command (settle may fail if escrow not ready)
set +e
SETTLE_OUTPUT=$(ESCROW_ID=$ESCROW_ID npx hardhat run $HARDHAT_RUN_EXTRA demo/settle.ts --network localhost 2>&1)
SETTLE_EXIT_CODE=$?
set -e

if [ $SETTLE_EXIT_CODE -eq 0 ]; then
    SETTLE_TX=$(echo "$SETTLE_OUTPUT" | grep "MVP:SETTLE_TX=" | head -1 | sed -n 's/.*SETTLE_TX=\([^ ]*\).*/\1/p')
    if [ -n "$SETTLE_TX" ] && [ "$SETTLE_TX" != "already_settled" ]; then
        echo -e "${GREEN}✓ Payment settled (TX: $SETTLE_TX)${NC}"
    else
        echo -e "${GREEN}✓ Payment already settled${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Settlement failed. Error output:${NC}"
    echo "$SETTLE_OUTPUT" | tail -10
    echo -e "${YELLOW}Continuing to audit step...${NC}"
fi

# Store SETTLE_OUTPUT for final verification
export SETTLE_OUTPUT

# Step 6: Run audit script (reads from mvp_runtime.json and finds latest session)
# IMPORTANT: Audit must complete before cleanup
echo -e "${YELLOW}[6/7] Generating audit record...${NC}"

# Create out directory if it doesn't exist
mkdir -p demo/out

# Run audit and redirect stderr to log file to avoid stack traces in terminal
AUDIT_ERROR_LOG="demo/out/audit_error.log"
AUDIT_OUTPUT=$(ESCROW_ID=$ESCROW_ID SESSION_DIR="$SESSION_DIR" npx hardhat run $HARDHAT_RUN_EXTRA demo/audit.ts --network localhost 2>"$AUDIT_ERROR_LOG")
AUDIT_EXIT_CODE=$?

# Extract audit file path from MVP:AUDIT_JSON= output
AUDIT_FILE=$(echo "$AUDIT_OUTPUT" | grep "MVP:AUDIT_JSON=" | head -1 | sed -n 's/.*AUDIT_JSON=\([^ ]*\).*/\1/p')

if [ $AUDIT_EXIT_CODE -eq 0 ] && [ -n "$AUDIT_FILE" ] && [ -f "$AUDIT_FILE" ]; then
    echo -e "${GREEN}✓ Audit record generated: $AUDIT_FILE${NC}"
    # Print the MVP:AUDIT_JSON line for machine parsing
    echo "$AUDIT_OUTPUT" | grep "MVP:AUDIT_JSON=" || true
else
    # Audit failed - show clean error message
    echo -e "${RED}⚠ Audit failed. See $AUDIT_ERROR_LOG${NC}"
    # Show first few lines of error log if it exists and has content
    if [ -f "$AUDIT_ERROR_LOG" ] && [ -s "$AUDIT_ERROR_LOG" ]; then
        echo "Error summary:"
        head -3 "$AUDIT_ERROR_LOG" | sed 's/^/  /'
    fi
    echo ""
    echo -e "${RED}Demo failed at audit stage. Exiting.${NC}"
    exit 1
fi

# Step 7: Print summary
echo -e "${YELLOW}[7/7] Generating summary...${NC}"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    MVP DEMO COMPLETE                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Print key MVP outputs (formatted for video)
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Key MVP Outputs (for video):${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo "$BUYER_OUTPUT" | grep "MVP:" || echo "  (No MVP outputs found in buyer output)"
echo "$AUDIT_OUTPUT" | grep "MVP:" || echo "  (No MVP outputs found in audit output)"
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}Summary:${NC}"
echo "  Contract: $CONTRACT_ADDR"
echo "  Agent: $AGENT_ADDR"
echo "  Escrow ID: $ESCROW_ID"
echo "  Audit JSON: $AUDIT_FILE"
echo ""

# Cleanup function
CLEANUP_DONE=0
cleanup() {
    if [ $CLEANUP_DONE -eq 1 ]; then
        return
    fi
    CLEANUP_DONE=1
    
    if [ -n "$AGENT_PID" ]; then
        echo -e "${YELLOW}Stopping agent service...${NC}"
        kill $AGENT_PID 2>/dev/null || true
    fi
    if [ -n "$HARDHAT_PID" ]; then
        echo -e "${YELLOW}Stopping Hardhat node...${NC}"
        kill $HARDHAT_PID 2>/dev/null || true
    fi
}

# Trap cleanup on exit
trap cleanup EXIT

echo -e "${GREEN}✓ MVP Demo completed successfully!${NC}"
echo ""
echo -e "${GREEN}MVP DONE: verifiable agent transactions (AP2 + X402 + escrow)${NC}"
echo ""

# Show audit JSON preview
if [ -f "$AUDIT_FILE" ]; then
    echo -e "${YELLOW}Audit JSON Preview:${NC}"
    head -20 "$AUDIT_FILE" | sed 's/^/  /'
    echo ""
fi

# Quick success verification (for VC/accelerator demo)
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEMO SUCCESS VERIFICATION${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""

SUCCESS=1

# Check 1: MVP outputs
# Expected 6 core outputs: AP2_INTENT_ID, X402_PAYMENT_ID, ESCROW_ID, PROOF_HASH, SETTLE_TX, AUDIT_JSON
MVP_COUNT=$(echo "$BUYER_OUTPUT" "$AUDIT_OUTPUT" "$SETTLE_OUTPUT" 2>/dev/null | grep -c "MVP:" || echo "0")
if [ "$MVP_COUNT" -ge 6 ]; then
    echo -e "${GREEN}✓ MVP outputs: $MVP_COUNT (6 core outputs required)${NC}"
else
    echo -e "${RED}✗ MVP outputs: $MVP_COUNT (6 core outputs required, missing)${NC}"
    SUCCESS=0
fi

# Check 2: Audit JSON exists and is valid
if [ -f "$AUDIT_FILE" ]; then
    ESCROW_STATUS=$(cat "$AUDIT_FILE" 2>/dev/null | grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o 'settled' || echo "")
    ESCROW_ID_IN_AUDIT=$(cat "$AUDIT_FILE" 2>/dev/null | grep -o '"escrow_id"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*' || echo "")
    
    if [ "$ESCROW_STATUS" = "settled" ] && [ "$ESCROW_ID_IN_AUDIT" = "$ESCROW_ID" ]; then
        echo -e "${GREEN}✓ Audit JSON: exists, escrow status = settled, escrow_id matches${NC}"
    else
        echo -e "${YELLOW}⚠ Audit JSON: exists but validation failed${NC}"
        SUCCESS=0
    fi
else
    echo -e "${RED}✗ Audit JSON: missing${NC}"
    SUCCESS=0
fi

# Check 3: Session directory with intent/trigger
if [ -n "$SESSION_DIR" ] && [ -d "$SESSION_DIR" ]; then
    if [ -f "$SESSION_DIR/intent.json" ] && [ -f "$SESSION_DIR/trigger.json" ]; then
        echo -e "${GREEN}✓ Session files: intent.json + trigger.json exist${NC}"
    else
        echo -e "${YELLOW}⚠ Session files: directory exists but files may be missing${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Session directory: not found${NC}"
fi

echo ""
if [ "$SUCCESS" -eq 1 ]; then
    echo -e "${GREEN}🎉 DEMO SUCCESSFUL - All checks passed!${NC}"
    echo ""
    echo "Demo complete. See audit output above."
else
    echo -e "${RED}⚠ DEMO PARTIAL SUCCESS - Some checks failed${NC}"
    echo -e "${YELLOW}   Review output above for details${NC}"
fi
echo ""

# Audit is complete, script will exit naturally and trigger cleanup via EXIT trap
# No need to manually call cleanup - trap handles it automatically

