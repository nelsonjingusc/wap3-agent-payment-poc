# Project Structure

```
wap3-agent-payment-poc/
├── VERSION                          # Semantic version number (0.5.0)
├── README.md                        # Project overview and quick start
├── LICENSE                          # MIT License
├── package.json                     # NPM configuration and scripts
├── tsconfig.json                    # TypeScript compiler configuration
├── hardhat.config.ts                # Hardhat (EVM) configuration
├── sui.config.ts                    # Sui blockchain configuration
├── test-all.sh                      # Automated test suite script
│
├── .env                             # Environment variables (gitignored)
├── .env.example                     # Environment template
├── .env.template                    # Alternative template
│
├── docs/                            # 📚 All documentation
│   ├── STATUS.md                    # Version history and roadmap
│   ├── REQUIREMENTS.md              # Formal requirements specification
│   ├── ARCHITECTURE.md              # Technical architecture (was TECHNICAL.md)
│   ├── TESTING.md                   # Comprehensive testing guide
│   ├── SUI_SETUP.md                 # Sui blockchain setup guide
│   ├── SUI_ARCHITECTURE.md          # Sui implementation details
│   ├── SETUP_INSTRUCTIONS.txt       # Quick setup notes
│   └── setup-env.txt                # Environment setup helper
│
├── contracts/                       # Smart contracts
│   ├── AgentEscrow.sol              # EVM Solidity contract
│   └── sui/                         # Sui Move contracts
│       ├── Move.toml                # Move package manifest
│       └── sources/
│           ├── task_contract.move   # Core task escrow
│           └── reputation.move      # Agent reputation system
│
├── src/                             # TypeScript source code
│   ├── protocol/                    # AP2 Intent + X402 Trigger schemas
│   ├── wap3/                        # WAP3 client library (EVM)
│   ├── sui/                         # Sui blockchain client
│   ├── walrus/                      # Walrus storage client
│   ├── mcp/                         # MCP server implementation
│   │   ├── server.ts                # MCP protocol server
│   │   ├── index.ts                 # Entry point
│   │   └── tools/                   # MCP tool definitions
│   └── utils/                       # Shared utilities
│
├── adapters/                        # 🔌 Framework integrations
│   ├── langchain-tools/             # LangChain adapter
│   │   ├── wap3-tools.ts            # 6 DynamicStructuredTool wrappers
│   │   └── README.md                # Usage documentation
│   ├── sui-langgraph/               # LangGraph adapter
│   │   ├── workflow.ts              # Stateful workflow nodes
│   │   └── README.md                # Workflow documentation
│   ├── langgraphjs/                 # Legacy LangGraph (EVM)
│   └── tool_agent/                  # Legacy tool agent (EVM)
│
├── demo/                            # 🎬 Demonstration scripts
│   ├── sui-demo.ts                  # Sui + Walrus end-to-end demo
│   ├── langchain-agent-demo.ts      # LangChain tools demo
│   ├── langgraph-workflow-demo.ts   # LangGraph workflow demo
│   ├── mcp-client-demo.ts           # MCP client demo
│   ├── run_mvp_demo.sh              # EVM demo script
│   └── out/                         # Demo output files
│
├── test/                            # Test suites
│   └── AgentEscrow.test.ts          # EVM contract tests
│
├── examples/                        # Code examples
├── execution/                       # Execution layer (Nosana, etc.)
├── scripts/                         # Utility scripts
└── node_modules/                    # Dependencies (gitignored)
```

## Key Directories

### `/docs` - Documentation Hub
All project documentation centralized here:
- **STATUS.md** - Release history and roadmap
- **REQUIREMENTS.md** - Formal specifications
- **ARCHITECTURE.md** - Technical design
- **TESTING.md** - Test guide
- **SUI_*.md** - Sui-specific guides

### `/adapters` - Framework Integrations
Agent framework adapters:
- **langchain-tools** - LangChain integration
- **sui-langgraph** - LangGraph workflow
- Legacy EVM adapters preserved

### `/demo` - Executable Demonstrations
Working demonstrations:
- Sui + Walrus complete workflow
- LangChain agent simulation
- LangGraph state management
- MCP protocol client

### `/src` - Core Implementation
TypeScript source organized by concern:
- **protocol/** - Protocol layer
- **sui/** - Blockchain interface
- **walrus/** - Storage interface
- **mcp/** - MCP server

## Root Directory Files

**Version Control**:
- `VERSION` - Semantic version (0.5.0)
- `.gitignore` - Git exclusions

**Configuration**:
- `package.json` - NPM config
- `tsconfig.json` - TypeScript config
- `sui.config.ts` - Sui config
- `hardhat.config.ts` - EVM config

**Environment**:
- `.env.example` - Template
- `.env.template` - Alternative template

**Testing**:
- `test-all.sh` - Automated test suite

**Documentation**:
- `README.md` - Entry point
- `LICENSE` - MIT license

## File Organization Principles

1. **Separation of Concerns**: Code, tests, docs, demos separated
2. **Framework Isolation**: Each adapter independent
3. **Chain Agnostic**: EVM and Sui implementations coexist
4. **Documentation Central**: All docs in `/docs`
5. **Clean Root**: Minimal root directory files

## Navigation Guide

**Getting Started**:
```
1. README.md → Quick overview
2. docs/SUI_SETUP.md → Blockchain setup
3. demo/sui-demo.ts → See it working
```

**Integration**:
```
1. docs/REQUIREMENTS.md → Understand specs
2. adapters/langchain-tools/README.md → LangChain guide
3. demo/langchain-agent-demo.ts → Working example
```

**Development**:
```
1. docs/ARCHITECTURE.md → System design
2. src/sui/sui-client.ts → Core implementation
3. contracts/sui/sources/ → Smart contracts
```

**Testing**:
```
1. docs/TESTING.md → Test guide
2. ./test-all.sh → Run all tests
3. npm run demo:* → Individual demos
```
