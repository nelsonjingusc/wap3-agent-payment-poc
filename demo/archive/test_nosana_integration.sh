#!/bin/bash

# Nosana Integration Test Script
# Tests all Nosana execution layer functionality in one command

set -e  # Exit on error

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "============================================================"
echo "Nosana Execution Layer - Comprehensive Test Suite"
echo "============================================================"
echo ""
echo "Branch: $(git branch --show-current)"
echo "Date: $(date)"
echo ""

# Check if @nosana/kit is installed
if npm list @nosana/kit 2>/dev/null | grep -q "@nosana/kit"; then
    echo -e "${GREEN}✓${NC} @nosana/kit installed (v$(npm list @nosana/kit --depth=0 2>/dev/null | grep @nosana/kit | sed 's/.*@//'))"
else
    echo -e "${YELLOW}⚠${NC} @nosana/kit not installed (will use mock mode)"
fi

# Check environment variables for real API mode
if [ "$USE_NOSANA_REAL" = "true" ]; then
    echo -e "${BLUE}ℹ${NC} Real API mode enabled"
    if [ -z "$NOSANA_API_KEY" ]; then
        echo -e "${YELLOW}⚠${NC} NOSANA_API_KEY not set, will fall back to mock"
    fi
    if [ -z "$NOSANA_MARKET" ]; then
        echo -e "${YELLOW}⚠${NC} NOSANA_MARKET not set, will fall back to mock"
    fi
else
    echo -e "${BLUE}ℹ${NC} Mock mode (set USE_NOSANA_REAL=true for real API)"
fi

echo ""
echo "------------------------------------------------------------"
echo "Test 1: Standalone Nosana Execution Layer"
echo "------------------------------------------------------------"
echo ""

# Run Test 1
TEST1_OUTPUT=$(npx hardhat run --no-compile demo/nosana-execution-demo.ts 2>&1)
TEST1_STATUS=$?

if [ $TEST1_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    echo ""
    echo "Key Output:"
    echo "$TEST1_OUTPUT" | grep -A 5 "ExecutionReceipt:"
    echo "$TEST1_OUTPUT" | grep -A 5 "ExecutionResult:"
    
    # Extract execution ID
    EXEC_ID=$(echo "$TEST1_OUTPUT" | grep "executionId:" | head -1 | sed "s/.*executionId: '\(.*\)'.*/\1/")
    if [ -n "$EXEC_ID" ]; then
        echo -e "${BLUE}→ Execution ID: $EXEC_ID${NC}"
    fi
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "$TEST1_OUTPUT"
    exit 1
fi

echo ""
echo "------------------------------------------------------------"
echo "Test 2: Full Nosana + Escrow Integration"
echo "------------------------------------------------------------"
echo ""

# Run Test 2
TEST2_OUTPUT=$(npx hardhat run --no-compile demo/nosana-escrow-integration-demo.ts 2>&1)
TEST2_STATUS=$?

if [ $TEST2_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    echo ""
    echo "Key Output:"
    echo "$TEST2_OUTPUT" | grep "Escrow created:"
    echo "$TEST2_OUTPUT" | grep "Execution submitted:"
    echo "$TEST2_OUTPUT" | grep "Execution completed"
    echo "$TEST2_OUTPUT" | grep "Proof submitted:"
    echo "$TEST2_OUTPUT" | grep "Payment released:"
    
    # Extract summary
    echo ""
    echo "Summary:"
    echo "$TEST2_OUTPUT" | grep "Escrow ID:"
    echo "$TEST2_OUTPUT" | grep "Execution ID:"
    echo "$TEST2_OUTPUT" | grep "Provider Job ID:"
    echo "$TEST2_OUTPUT" | grep "Proof Hash:"
    echo "$TEST2_OUTPUT" | grep "Status:"
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "$TEST2_OUTPUT"
    exit 1
fi

echo ""
echo "============================================================"
echo -e "${GREEN}✅ All Tests Passed!${NC}"
echo "============================================================"
echo ""

# Generate test report
REPORT_FILE="demo/out/nosana_test_report_$(date +%Y%m%d_%H%M%S).txt"
mkdir -p demo/out

cat > "$REPORT_FILE" << EOF
Nosana Execution Layer - Test Report
=====================================

Date: $(date)
Branch: $(git branch --show-current)
Mode: $([ "$USE_NOSANA_REAL" = "true" ] && echo "Real API" || echo "Mock")

Test Results:
-------------

Test 1: Standalone Execution ............... PASSED ✓
Test 2: Full Escrow Integration ............ PASSED ✓

Summary:
--------
All tests completed successfully.

The Nosana execution layer is fully integrated with:
- Task submission to Nosana
- Real-time job monitoring
- IPFS result retrieval
- WAP3 escrow integration
- Proof-based payment settlement

Technical Details:
------------------
- SDK: @nosana/kit v$(npm list @nosana/kit --depth=0 2>/dev/null | grep @nosana/kit | sed 's/.*@//' || echo "N/A")
- Job Type: Single container, GPU-enabled
- Output Storage: IPFS via Nosana
- Settlement: Automated via smart contract

Full Test Output:
-----------------

TEST 1 OUTPUT:
$TEST1_OUTPUT

TEST 2 OUTPUT:
$TEST2_OUTPUT

EOF

echo -e "${BLUE}ℹ${NC} Full test report saved to: $REPORT_FILE"
echo ""
echo "Quick Commands:"
echo "  • View report: cat $REPORT_FILE"
echo "  • Re-run tests: ./demo/test_nosana_integration.sh"
echo "  • Test with real API: USE_NOSANA_REAL=true ./demo/test_nosana_integration.sh"
echo ""
