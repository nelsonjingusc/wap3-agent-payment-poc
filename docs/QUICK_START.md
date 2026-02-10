# WAP3 MVP Quick Start

## 🚀 One-Command Demo

```bash
./demo/run_mvp_demo.sh
```

That's it! The script will:
1. Start Hardhat node (if needed)
2. Deploy contract
3. Start agent service
4. Create escrow with AP2 intent + X402 trigger
5. Wait for agent to complete
6. Generate audit JSON

## 📋 Expected Output

You should see these key lines:

```
MVP:AP2_INTENT_ID=0x1234...
MVP:X402_PAYMENT_ID=0x5678...
MVP:ESCROW_ID=0
MVP:PROOF_HASH=0xabcd...
MVP:SETTLE_TX=0xef01...
MVP:AUDIT_JSON=demo/out/audit_0.json
```

## 📚 More Information

- **Full README**: [../README.md](../README.md)
- **Demo README**: [../demo/README.md](../demo/README.md)
- **Product Overview**: [PRODUCT_OVERVIEW.md](PRODUCT_OVERVIEW.md)
- **Architecture Overview**: [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)

## 🔧 Troubleshooting

### Hardhat node already running
```bash
pkill -f "hardhat node"
./demo/run_mvp_demo.sh
```

### Port 8545 in use
```bash
lsof -ti:8545 | xargs kill -9
./demo/run_mvp_demo.sh
```

### Agent service not starting
Check `/tmp/wap3_agent.log` for errors:
```bash
cat /tmp/wap3_agent.log
```

## 🎯 Key Features Demonstrated

1. **AP2 Intent** - Google AP2 (2025 Q3) style intent negotiation
2. **X402 Trigger** - Coinbase X402 (2025 Q2) style payment trigger
3. **Programmable Escrow** - On-chain escrow with smart contract automation
4. **Proof Submission** - Cryptographic proof of work completion
5. **Automatic Settlement** - Payment release upon proof verification
6. **Audit Trail** - Complete JSON audit record with all transaction details
