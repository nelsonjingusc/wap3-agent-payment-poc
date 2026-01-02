# Nosana Execution Layer

This directory contains the Nosana execution provider implementation for WAP3.

## Usage

### Mock Mode (Default)

By default, the execution layer runs in mock mode:

```bash
npx hardhat run --no-compile demo/nosana-execution-demo.ts
```

### Real API Mode

To use the real Nosana API, set the following environment variables:

```bash
export USE_NOSANA_REAL=true
export NOSANA_API_KEY=your_api_key_here
export NOSANA_MARKET=your_market_address_here

npx hardhat run --no-compile demo/nosana-execution-demo.ts
```

If `@nosana/kit` is not installed or the API call fails, the layer will automatically fall back to mock mode.

## Installation

To enable real Nosana API support, install the package:

```bash
npm install @nosana/kit
```

**Note**: API calls in `nosana-layer.ts` may need adjustment based on the `@nosana/kit` API version.

## Architecture

- `job-templates.ts`: Maps WAP3 task types to Nosana job specifications
- `nosana-layer.ts`: Implements the `ExecutionLayer` interface with both mock and real API support

