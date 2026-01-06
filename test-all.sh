#!/bin/bash

# WAP3 Agent Framework Integration - Automated Test Suite
# Run this script to verify all agent framework features

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=6

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  WAP3 Agent Framework - Automated Test Suite            ║"
echo "║  Testing all integration features                       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Function to print test header
print_test_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Test $1/$TESTS_TOTAL: $2${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
}

# Test 1: TypeScript Compilation
print_test_header 1 "TypeScript Compilation (Zero Errors)"
echo "Running: npx tsc --noEmit"
if npx tsc --noEmit 2>&1 | tee /tmp/tsc-output.txt | grep -q "error TS"; then
    echo -e "${RED}Compilation errors found:${NC}"
    cat /tmp/tsc-output.txt | grep "error TS" | head -10
    print_result 1
else
    echo "No compilation errors found"
    print_result 0
fi

# Test 2: Verify File Structure
print_test_header 2 "File Structure (All Files Exist)"
FILES_MISSING=0

echo "Checking adapter files..."
for file in "adapters/langchain-tools/wap3-tools.ts" \
            "adapters/langchain-tools/README.md" \
            "adapters/sui-langgraph/workflow.ts" \
            "adapters/sui-langgraph/README.md"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo -e "  ${RED}✗ $file (missing)${NC}"
        ((FILES_MISSING++))
    fi
done

echo "Checking demo files..."
for file in "demo/langchain-agent-demo.ts" \
            "demo/langgraph-workflow-demo.ts" \
            "demo/mcp-client-demo.ts"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo -e "  ${RED}✗ $file (missing)${NC}"
        ((FILES_MISSING++))
    fi
done

echo "Checking MCP server..."
for file in "src/mcp/server.ts" \
            "src/mcp/index.ts"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo -e "  ${RED}✗ $file (missing)${NC}"
        ((FILES_MISSING++))
    fi
done

if [ $FILES_MISSING -eq 0 ]; then
    print_result 0
else
    echo "Missing $FILES_MISSING file(s)"
    print_result 1
fi

# Test 3: Package.json Scripts
print_test_header 3 "NPM Scripts (All Demos Registered)"
SCRIPTS_MISSING=0

echo "Checking package.json scripts..."
for script in "demo:langchain" "demo:langgraph" "demo:mcp" "mcp:server"; do
    if grep -q "\"$script\"" package.json; then
        echo "  ✓ $script"
    else
        echo -e "  ${RED}✗ $script (missing)${NC}"
        ((SCRIPTS_MISSING++))
    fi
done

if [ $SCRIPTS_MISSING -eq 0 ]; then
    print_result 0
else
    echo "Missing $SCRIPTS_MISSING script(s)"
    print_result 1
fi

# Test 4: Documentation
print_test_header 4 "Documentation (README Updated)"
DOCS_OK=1

echo "Checking README.md updates..."
if grep -q "Agent Framework Integration" README.md; then
    echo "  ✓ Agent Framework section found"
else
    echo -e "  ${RED}✗ Agent Framework section missing${NC}"
    DOCS_OK=0
fi

if grep -q "demo:langchain" README.md; then
    echo "  ✓ LangChain demo documented"
else
    echo -e "  ${RED}✗ LangChain demo not documented${NC}"
    DOCS_OK=0
fi

if grep -q "MCP" README.md; then
    echo "  ✓ MCP documented"
else
    echo -e "  ${RED}✗ MCP not documented${NC}"
    DOCS_OK=0
fi

print_result $((1 - DOCS_OK))

# Test 5: Dependencies
print_test_header 5 "Dependencies (All Installed)"
DEPS_MISSING=0

echo "Checking required dependencies..."
for dep in "@langchain/core" "zod" "@modelcontextprotocol/sdk"; do
    if npm list "$dep" >/dev/null 2>&1; then
        echo "  ✓ $dep"
    else
        echo -e "  ${RED}✗ $dep (missing)${NC}"
        ((DEPS_MISSING++))
    fi
done

if [ $DEPS_MISSING -eq 0 ]; then
    print_result 0
else
    echo "Missing $DEPS_MISSING dependency(ies)"
    echo "Run: npm install"
    print_result 1
fi

# Test 6: LangChain Demo (Live Test)
print_test_header 6 "LangChain Demo (End-to-End Test)"

echo -e "${YELLOW}Running live demo (this may take 2-3 minutes)...${NC}"
echo "Command: npm run demo:langchain"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
    echo "Skipping live demo test (requires Sui configuration)"
    echo "To run this test, create .env file with:"
    echo "  SUI_PRIVATE_KEY=..."
    echo "  SUI_PACKAGE_ID=..."
    print_result 1
else
    # Run demo with timeout
    if timeout 180s npm run demo:langchain 2>&1 | tee /tmp/demo-output.txt | grep -q "Demo Completed Successfully"; then
        echo ""
        echo -e "${GREEN}Demo completed successfully!${NC}"
        
        # Extract key information
        TASK_ID=$(cat /tmp/demo-output.txt | grep "Task ID:" | tail -1 | awk '{print $3}')
        TX_HASH=$(cat /tmp/demo-output.txt | grep "Settlement Tx:" | tail -1 | awk '{print $3}')
        
        if [ ! -z "$TASK_ID" ]; then
            echo "  Task ID: $TASK_ID"
        fi
        if [ ! -z "$TX_HASH" ]; then
            echo "  Settlement Tx: $TX_HASH"
            echo "  View on explorer: https://suiscan.xyz/testnet/tx/$TX_HASH"
        fi
        
        print_result 0
    else
        echo ""
        echo -e "${RED}Demo failed or timed out${NC}"
        echo "Check output above for errors"
        echo "Common issues:"
        echo "  - Network connectivity"
        echo "  - SUI_PRIVATE_KEY not set correctly"
        echo "  - Insufficient testnet balance"
        print_result 1
    fi
fi

# Summary
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Test Summary                                            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo -e "Total Tests:  $TESTS_TOTAL"
echo -e "${GREEN}Passed:       $TESTS_PASSED${NC}"
echo -e "${RED}Failed:       $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ ALL TESTS PASSED - READY FOR REVIEW                  ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "The agent framework integration is working correctly!"
    echo "All features validated successfully."
    exit 0
else
    echo -e "${RED}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ SOME TESTS FAILED - REVIEW REQUIRED                  ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Please review the failed tests above."
    echo "See TESTING.md for troubleshooting guidance."
    exit 1
fi
