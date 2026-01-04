# Sui Setup Guide

This guide helps you set up the Sui development environment and deploy the Agent Payment & Provenance contracts.

## Prerequisites

- **Node.js 18+** and npm
- **Sui CLI** tools
- **Sui Wallet** (for testnet interaction)

---

## 1. Install Sui CLI

### macOS

```bash
brew install sui
```

### Linux / WSL

```bash
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet sui
```

### Verify Installation

```bash
sui --version
```

Expected output: `sui X.X.X`

---

## 2. Create Sui Wallet

### Initialize Sui Client

```bash
sui client
```

This creates a default wallet at `~/.sui/sui_config/client.yaml`

### Create New Address

```bash
sui client new-address ed25519
```

This generates a new Sui address for testnet/devnet.

### View Active Address

```bash
sui client active-address
```

### Export Private Key

```bash
sui keytool export --key-identity <ADDRESS>
```

Copy the private key (without `0x` prefix) for `.env` configuration.

---

## 3. Get Testnet SUI

### Testnet Faucet

```bash
sui client faucet
```

Or visit: https://faucet.testnet.sui.io/gas

### Check Balance

```bash
sui client gas
```

---

## 4. Deploy Move Contracts

### Build Contracts

```bash
cd contracts/sui
sui move build
```

### Deploy to Testnet

```bash
sui client publish --gas-budget 100000000
```

**Save the Package ID** from the output!

Example output:
```
----- Transaction Effects ----
Status : Success
Created Objects:
  - ID: 0xabcd1234... , Owner: Immutable
  
Package: 0xabcd1234...  <-- This is your PACKAGE_ID
```

### Update Configuration

Copy the Package ID to your `.env` file:

```env
SUI_PACKAGE_ID=0xabcd1234...
SUI_NETWORK=testnet
```

---

## 5. Configure Environment

### Copy Example Environment File

```bash
cp .env.example .env
```

### Edit `.env`

```env
# Sui Configuration
SUI_NETWORK=testnet
SUI_PRIVATE_KEY=your_private_key_here  # From step 2
SUI_PACKAGE_ID=0x...                   # From step 4

# Walrus Configuration (Testnet)
WALRUS_NETWORK=testnet
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
WALRUS_STORAGE_URL=https://walrus-testnet.walrus.space

# Optional: Enable mock mode for testing without Walrus
WALRUS_MOCK_MODE=false
```

---

## 6. Install Node Dependencies

```bash
npm install
```

This installs:
- `@mysten/sui.js` - Sui TypeScript SDK
- `axios` - HTTP client for Walrus
- `dotenv` - Environment variable management

---

## 7. Test the Setup

### Build Move Contracts

```bash
npm run build:sui
```

### Run Move Tests

```bash
npm run test:sui
```

### Run End-to-End Demo

```bash
npm run demo:sui
```

Expected output:
```
✓ Task created on Sui: 0x...
✓ Worker claimed task
✓ Evidence uploaded to Walrus: blob_ABC123
✓ Evidence submitted on-chain
✓ Buyer verified Walrus content
✓ Settlement completed
```

---

## 8. Walrus Testnet Access

### Current Status

Walrus is in testnet phase. The demo includes:
- **Mock mode** for offline development
- **Testnet integration** when available

### Enable Mock Mode

If Walrus testnet is unavailable:

```env
WALRUS_MOCK_MODE=true
```

This simulates Walrus upload/retrieval locally.

---

## 9. Sui Explorer

View your transactions on-chain:

**Testnet**: https://suiexplorer.com/?network=testnet
**Devnet**: https://suiexplorer.com/?network=devnet

Search by:
- Transaction hash
- Object ID (Task, Submission)
- Address

---

## 10. Common Issues

### Issue: "Insufficient gas"

**Solution**: Get more testnet SUI from faucet
```bash
sui client faucet
```

### Issue: "Package not found"

**Solution**: Verify package ID in `.env` matches deployed package

### Issue: "Walrus upload failed"

**Solution**: Enable mock mode or check Walrus testnet status
```env
WALRUS_MOCK_MODE=true
```

### Issue: "sui: command not found"

**Solution**: Ensure Sui CLI is in PATH
```bash
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

---

## Next Steps

- ✅ Read [Sui Architecture Documentation](./SUI_ARCHITECTURE.md)
- ✅ Explore [MCP Tools](../src/mcp/tools/)
- ✅ Run examples in `examples/sui/`
- ✅ Review Move contracts in `contracts/sui/sources/`

---

## Resources

- **Sui Documentation**: https://docs.sui.io
- **Sui Wallet**: https://suiwallet.com
- **Walrus Docs**: https://docs.walrus.site
- **Sui Discord**: https://discord.gg/sui
