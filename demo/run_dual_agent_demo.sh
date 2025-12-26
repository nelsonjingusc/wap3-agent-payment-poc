#!/bin/bash

# WAP3 Dual-Agent Demo - Buyer Agent (LangGraph) + Service Agent
# This demonstrates two agents collaborating:
# - Buyer Agent: Uses LangGraph to orchestrate task creation
# - Service Agent: Executes tasks and submits proof

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Unset proxy variables
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY 2>/dev/null || true

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  WAP3 Dual-Agent Demo - Buyer Agent (LangGraph) +         ║${NC}"
echo -e "${GREEN}║  Service Agent Collaboration                              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check Hardhat node
echo -e "${YELLOW}[1/6] Checking Hardhat node...${NC}"
if ! curl -s http://127.0.0.1:8545 > /dev/null 2>&1; then
    echo -e "${YELLOW}Starting Hardhat node...${NC}"
    npm run node > /dev/null 2>&1 &
    HARDHAT_PID=$!
    sleep 5
    echo -e "${GREEN}✓ Hardhat node started${NC}"
else
    echo -e "${GREEN}✓ Hardhat node already running${NC}"
fi

# Step 2: Compile contracts
echo -e "${YELLOW}[2/6] Compiling contracts...${NC}"
if npm run compile > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Contracts compiled${NC}"
else
    echo -e "${YELLOW}⚠ Using --no-compile mode${NC}"
fi

# Step 3: Start Service Agent
echo -e "${YELLOW}[3/6] Starting Service Agent...${NC}"
npm run demo:agent > /tmp/wap3_service_agent.log 2>&1 &
SERVICE_AGENT_PID=$!
sleep 3

echo -e "${YELLOW}Waiting for Service Agent to initialize...${NC}"
for i in {1..30}; do
    if grep -q "MVP_INFO" /tmp/wap3_service_agent.log 2>/dev/null; then
        break
    fi
    sleep 1
done

if ! grep -q "MVP_INFO" /tmp/wap3_service_agent.log 2>/dev/null; then
    echo -e "${RED}Error: Service Agent failed to start${NC}"
    kill $SERVICE_AGENT_PID 2>/dev/null || true
    exit 1
fi

CONTRACT_ADDR=$(grep "MVP_INFO" /tmp/wap3_service_agent.log 2>/dev/null | head -1 | sed -n 's/.*contract=\([^ ]*\).*/\1/p')
AGENT_ADDR=$(grep "MVP_INFO" /tmp/wap3_service_agent.log 2>/dev/null | head -1 | sed -n 's/.*agent=\([^ ]*\).*/\1/p')

echo -e "${GREEN}✓ Service Agent started (PID: $SERVICE_AGENT_PID)${NC}"
echo -e "  Contract: $CONTRACT_ADDR"
echo -e "  Agent: $AGENT_ADDR"
echo ""

# Step 4: Run Buyer Agent (LangGraph)
echo -e "${YELLOW}[4/6] Starting Buyer Agent (LangGraph)...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

BUYER_OUTPUT=$(npx hardhat run --no-compile demo/buyer-agent-langgraph.ts --network localhost 2>&1)
echo "$BUYER_OUTPUT"

# Extract escrow ID from buyer output
ESCROW_ID=$(echo "$BUYER_OUTPUT" | grep "MVP:ESCROW_ID=" | sed -n 's/.*MVP:ESCROW_ID=\([^ ]*\).*/\1/p' || echo "")

if [ -z "$ESCROW_ID" ]; then
    echo -e "${RED}Error: Failed to extract ESCROW_ID from Buyer Agent output${NC}"
    kill $SERVICE_AGENT_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Buyer Agent completed (Escrow ID: $ESCROW_ID)${NC}"
echo ""

# Step 5: Wait for Service Agent to complete
echo -e "${YELLOW}[5/6] Waiting for Service Agent to complete task...${NC}"
PROOF_FOUND=0
for i in {1..60}; do
    if grep -q "MVP:PROOF_HASH=" /tmp/wap3_service_agent.log 2>/dev/null; then
        PROOF_FOUND=1
        break
    fi
    if [ $((i % 5)) -eq 0 ]; then
        echo -e "${YELLOW}  Still waiting for proof... (${i}s)${NC}"
    fi
    sleep 1
done

if [ $PROOF_FOUND -eq 1 ]; then
    echo -e "${GREEN}✓ Service Agent submitted proof${NC}"
    echo ""
    
    # Settle payment
    echo -e "${YELLOW}Settling payment...${NC}"
    SETTLE_OUTPUT=$(ESCROW_ID=$ESCROW_ID npx hardhat run --no-compile demo/settle.ts --network localhost 2>&1)
    SETTLE_EXIT=$?
    
    if [ $SETTLE_EXIT -eq 0 ]; then
        echo "$SETTLE_OUTPUT"
        echo -e "${GREEN}✓ Payment settled${NC}"
    else
        echo -e "${YELLOW}⚠ Settlement failed or already settled${NC}"
        echo "$SETTLE_OUTPUT" | tail -5
    fi
else
    echo -e "${YELLOW}⚠ Proof not found in Service Agent logs after 60s${NC}"
    echo -e "${YELLOW}  Service Agent may still be processing...${NC}"
fi

# Step 6: Summary
echo ""
echo -e "${YELLOW}[6/6] Demo Summary${NC}"
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              DUAL-AGENT DEMO COMPLETE                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Agents:"
echo "  🤖 Buyer Agent (LangGraph): Task planning → Intent → Trigger → Escrow"
echo "  🤖 Service Agent: Listen → Execute → Submit Proof"
echo "  💰 Settlement: Automatic after proof verification"
echo ""
echo "Key Outputs:"
echo "  Contract: $CONTRACT_ADDR"
echo "  Service Agent: $AGENT_ADDR"
echo "  Escrow ID: $ESCROW_ID"
echo ""
echo -e "${GREEN}✓ Two agents successfully collaborated!${NC}"
echo ""

# Cleanup function
CLEANUP_DONE=0
cleanup() {
    if [ $CLEANUP_DONE -eq 1 ]; then
        return
    fi
    CLEANUP_DONE=1
    
    if [ ! -z "$SERVICE_AGENT_PID" ]; then
        echo -e "${YELLOW}Stopping Service Agent...${NC}"
        kill $SERVICE_AGENT_PID 2>/dev/null || true
    fi
    if [ ! -z "$HARDHAT_PID" ]; then
        kill $HARDHAT_PID 2>/dev/null || true
    fi
}

trap cleanup EXIT

# Stop Service Agent and exit cleanly
cleanup

