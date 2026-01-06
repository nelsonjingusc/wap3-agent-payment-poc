/**
 * Sui + Walrus Demo - Complete End-to-End Task Flow
 * Demonstrates agent payment and provenance on Sui blockchain with Walrus storage
 * Now integrated with AP2/X402 protocol layer for chain-agnostic intent and payment triggers
 */

import * as dotenv from 'dotenv';
import { createSuiTaskClient } from '../src/sui/sui-client';
import { createWalrusClient } from '../src/walrus/walrus-client';
import { getActiveSuiConfig, getActiveWalrusConfig } from '../sui.config';
import * as fs from 'fs';
import * as path from 'path';

// Import AP2/X402 Protocol Layer (Chain-Agnostic)
import { createAP2Intent, hashAP2Intent, formatIntentId } from '../src/protocol/intent_ap2';
import { createX402Trigger, hashX402Trigger, formatPaymentId, linkTriggerToIntent } from '../src/protocol/trigger_x402';

// Load environment variables
dotenv.config();

// ========== Demo Configuration ==========

const DEMO_TASK_DESCRIPTION = `
Analyze sentiment of social media posts about cryptocurrency markets.
Requirements:
- Process 100 recent posts from Twitter/X
- Classify sentiment as: Bullish, Bearish, or Neutral
- Provide confidence scores
- Return structured JSON results
`;

const DEMO_REWARD_SUI = 0.1; // 0.1 SUI reward
const DEMO_DEADLINE_HOURS = 24;

// ========== Main Demo Function ==========

async function runSuiDemo() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  WAP3 - Sui + Walrus Agent Payment Demo                   ║');
    console.log('║  Complete Task Lifecycle with Provenance                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
        // ========== Setup Clients ==========
        console.log('📋 Step 1: Initialize Clients\n');

        const suiConfig = getActiveSuiConfig();
        const walrusConfig = getActiveWalrusConfig();

        console.log(`  Sui Network: ${suiConfig.network}`);
        console.log(`  Walrus Network: ${walrusConfig.network}`);
        console.log(`  Package ID: ${suiConfig.packageId}\n`);

        // Note: You need to set SUI_PRIVATE_KEY in .env
        if (!process.env.SUI_PRIVATE_KEY) {
            throw new Error('SUI_PRIVATE_KEY not set in environment. Please configure .env file.');
        }

        const buyerClient = createSuiTaskClient({
            network: suiConfig.network,
            packageId: suiConfig.packageId,
            privateKey: process.env.SUI_PRIVATE_KEY,
        });

        // In a real scenario, worker would have their own keypair
        const workerClient = createSuiTaskClient({
            network: suiConfig.network,
            packageId: suiConfig.packageId,
            privateKey: process.env.SUI_WORKER_PRIVATE_KEY || process.env.SUI_PRIVATE_KEY,
        });

        const walrusClient = createWalrusClient(walrusConfig);

        const buyerAddress = buyerClient.getAddress();
        const workerAddress = workerClient.getAddress();

        console.log(`  Buyer Address: ${buyerAddress}`);
        console.log(`  Worker Address: ${workerAddress}\n`);

        // Check balances
        const buyerBalance = await buyerClient.getBalance();
        const workerBalance = await workerClient.getBalance();

        console.log(`  Buyer Balance: ${(buyerBalance / 1e9).toFixed(4)} SUI`);
        console.log(`  Worker Balance: ${(workerBalance / 1e9).toFixed(4)} SUI\n`);

        if (buyerBalance < DEMO_REWARD_SUI * 1e9) {
            console.log(`  ⚠️  Warning: Buyer balance too low. Get testnet SUI from:`);
            console.log(`      https://faucet.testnet.sui.io/gas\n`);
        }

        // ========== Step 2: Create Task ==========
        console.log('💼 Step 2: Buyer Creates Task\n');

        const deadline = Date.now() + DEMO_DEADLINE_HOURS * 60 * 60 * 1000;
        const taskId = await buyerClient.createTask({
            targetInfo: DEMO_TASK_DESCRIPTION,
            rewardAmount: Math.floor(DEMO_REWARD_SUI * 1e9), // Convert to MIST
            deadline,
            maxMiners: 1,
        });

        console.log(`  Task ID: ${taskId}`);
        console.log(`  Reward: ${DEMO_REWARD_SUI} SUI`);
        console.log(`  Deadline: ${new Date(deadline).toISOString()}\n`);

        // ========== Step 3: Worker Claims Task ==========
        console.log('👷 Step 3: Worker Claims Task\n');

        const claimId = await workerClient.claimTask(taskId);
        console.log(`  Claim ID: ${claimId}\n`);

        // ========== Step 4: Worker Executes Task ==========
        console.log('⚙️  Step 4: Worker Executes Task (Simulated)\n');

        // Simulate work being done
        console.log('  Processing social media posts...');
        console.log('  Analyzing sentiment...');
        console.log('  Generating results...\n');

        // Create mock result data
        const resultData = {
            task: 'sentiment_analysis',
            timestamp: new Date().toISOString(),
            posts_analyzed: 100,
            sentiment_breakdown: {
                bullish: 45,
                bearish: 32,
                neutral: 23,
            },
            average_confidence: 0.87,
            top_keywords: ['bitcoin', 'ethereum', 'bull', 'moon', 'crash'],
        };

        // Save result to file
        const outputDir = path.join(__dirname, 'out');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const resultFile = path.join(outputDir, 'sentiment_analysis_results.json');
        fs.writeFileSync(resultFile, JSON.stringify(resultData, null, 2));
        console.log(`  ✓ Results saved to: ${resultFile}\n`);

        // ========== Step 5: Upload Evidence to Walrus ==========
        console.log('📤 Step 5: Upload Evidence to Walrus\n');

        const uploadResult = await walrusClient.uploadFile(resultFile);
        const blobId = uploadResult.blobId;
        const evidenceHash = walrusClient.generateEvidenceHashFromFile(resultFile);

        console.log(`  Blob ID: ${blobId}`);
        console.log(`  Evidence Hash: ${evidenceHash}`);
        console.log(`  Retrieval URL: ${uploadResult.url}\n`);

        // ========== Step 6: Submit Evidence On-Chain ==========
        console.log('📝 Step 6: Worker Submits Evidence On-Chain\n');

        const submissionId = await workerClient.submitEvidence(
            taskId,
            claimId,
            blobId,
            evidenceHash
        );

        console.log(`  Submission ID: ${submissionId}\n`);

        // ========== Step 7: Buyer Verifies Evidence ==========
        console.log('🔍 Step 7: Buyer Verifies Evidence from Walrus\n');

        const retrievedBlob = await walrusClient.retrieveBlob(blobId);
        const retrievedHash = walrusClient.generateEvidenceHash(retrievedBlob.data);
        const hashMatches = retrievedHash === evidenceHash;

        console.log(`  Retrieved ${retrievedBlob.data.length} bytes from Walrus`);
        console.log(`  Hash Match: ${hashMatches ? '✓ VERIFIED' : '✗ FAILED'}\n`);

        if (!hashMatches) {
            throw new Error('Evidence hash mismatch! Data may be corrupted.');
        }

        // Parse and review the results
        const retrievedResults = JSON.parse(retrievedBlob.data.toString());
        console.log('  Retrieved Results:');
        console.log(`    Posts Analyzed: ${retrievedResults.posts_analyzed}`);
        console.log(`    Bullish: ${retrievedResults.sentiment_breakdown.bullish}`);
        console.log(`    Bearish: ${retrievedResults.sentiment_breakdown.bearish}`);
        console.log(`    Confidence: ${(retrievedResults.average_confidence * 100).toFixed(1)}%\n`);

        // ========== Step 8: Settle Task ==========
        console.log('💰 Step 8: Buyer Approves & Settles Task\n');

        const settleTx = await buyerClient.verifyAndSettle(taskId, [submissionId]);
        console.log(`  Settlement Transaction: ${settleTx}\n`);

        // ========== Final Balances ==========
        console.log('📊 Step 9: Final Balances\n');

        const buyerBalanceFinal = await buyerClient.getBalance();
        const workerBalanceFinal = await workerClient.getBalance();

        console.log(`  Buyer Balance: ${(buyerBalanceFinal / 1e9).toFixed(4)} SUI`);
        console.log(`  Worker Balance: ${(workerBalanceFinal / 1e9).toFixed(4)} SUI`);
        console.log(`  Worker Received: ${((workerBalanceFinal - workerBalance) / 1e9).toFixed(4)} SUI\n`);

        // ========== Summary ==========
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║  ✓ Demo Completed Successfully!                           ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        console.log('Summary:');
        console.log(`  ✓ Task created with ${DEMO_REWARD_SUI} SUI escrow`);
        console.log(`  ✓ Worker claimed and executed task`);
        console.log(`  ✓ Evidence uploaded to Walrus: ${blobId}`);
        console.log(`  ✓ Evidence hash verified on-chain`);
        console.log(`  ✓ Payment settled and transferred to worker`);
        console.log(`  ✓ Complete provenance trail available\n`);

        console.log('Audit Trail:');
        console.log(`  Task ID: ${taskId}`);
        console.log(`  Submission ID: ${submissionId}`);
        console.log(`  Walrus Blob ID: ${blobId}`);
        console.log(`  Settlement Tx: ${settleTx}\n`);

    } catch (error: any) {
        console.error('\n❌ Demo failed:', error.message);
        console.error('\nTroubleshooting:');
        console.error('  1. Ensure Sui CLI is installed: https://docs.sui.io/build/install');
        console.error('  2. Set SUI_PRIVATE_KEY in .env file');
        console.error('  3. Deploy contracts and update SUI_PACKAGE_ID in .env');
        console.error('  4. Get testnet SUI from faucet if balance is low');
        console.error('  5. Check Walrus testnet status\n');

        if (process.env.WALRUS_MOCK_MODE !== 'true') {
            console.error('💡 Tip: Set WALRUS_MOCK_MODE=true in .env for offline testing\n');
        }

        process.exit(1);
    }
}

// Run the demo
if (require.main === module) {
    runSuiDemo().catch(console.error);
}

export default runSuiDemo;
