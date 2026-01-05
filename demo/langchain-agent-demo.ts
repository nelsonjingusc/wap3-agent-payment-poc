/**
 * LangChain Agent Demo - WAP3 on Sui
 * 
 * Demonstrates an AI agent using LangChain tools to complete
 * a full task lifecycle with payment automation on Sui blockchain.
 */

import {
    createTaskTool,
    claimTaskTool,
    submitEvidenceTool,
    verifyEvidenceTool,
    settleTaskTool,
    wap3ToolsArray,
} from '../adapters/langchain-tools/wap3-tools';
import * as fs from 'fs';
import * as path from 'path';

// Mock agent that simulates decision-making
class MockAgent {
    async invoke(input: { taskDescription: string; reward: number }) {
        // Step 1: Create task
        console.log('\n🤖 Agent Reasoning:');
        console.log(`   Input: "${input.taskDescription}"`);
        console.log(`   Reward: ${input.reward} SUI\n`);

        console.log('💭 Decision: I should create a task for this work...\n');
        const createResultStr = await createTaskTool.invoke({
            taskType: 'data_analysis',
            requirements: input.taskDescription,
            rewardAmountSUI: input.reward,
            deadlineHours: 24,
            maxWorkers: 1,
        });

        const createResult = JSON.parse(createResultStr);
        console.log('✅ Tool: create_task');
        console.log(`   Result: Task ${createResult.taskId} created\n`);

        if (!createResult.success) {
            throw new Error(`Failed to create task: ${createResult.error}`);
        }

        // Simulate worker receiving task notification
        await this.sleep(2000);
        console.log('📧 Worker agent receives task notification...\n');

        // Step 2: Claim task (as worker)
        console.log('💭 Decision: I can do this task. Let me claim it...\n');
        const claimResultStr = await claimTaskTool.invoke({
            taskId: createResult.taskId,
        });

        const claimResult = JSON.parse(claimResultStr);
        console.log('✅ Tool: claim_task');
        console.log(`   Result: Claim ${claimResult.claimId} created\n`);

        // Step 3: Execute work (simulated)
        await this.sleep(1000);
        console.log('⚙️  Worker agent executes task...\n');
        console.log('   → Processing data');
        console.log('   → Analyzing patterns');
        console.log('   → Generating results\n');

        // Create evidence file
        const evidence = {
            task: input.taskDescription,
            completed_at: new Date().toISOString(),
            results: {
                data_points_analyzed: 1000,
                patterns_found: 15,
                confidence_score: 0.94,
            }
        };

        const outputDir = path.join(__dirname, 'out');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const evidencePath = path.join(outputDir, 'agent_work_results.json');
        fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
        console.log(`   ✓ Evidence saved: ${evidencePath}\n`);

        // Step 4: Submit evidence
        console.log('💭 Decision: Work complete. Time to submit evidence...\n');
        const submitResultStr = await submitEvidenceTool.invoke({
            taskId: createResult.taskId,
            claimId: claimResult.claimId,
            evidenceFilePath: evidencePath,
        });

        const submitResult = JSON.parse(submitResultStr);
        console.log('✅ Tool: submit_evidence');
        console.log(`   Result: Submission ${submitResult.submissionId}`);
        console.log(`   Blob ID: ${submitResult.blobId}\n`);

        // Step 5: Verify evidence (as buyer)
        await this.sleep(1000);
        console.log('💭 Decision: Let me verify the evidence quality...\n');
        const verifyResultStr = await verifyEvidenceTool.invoke({
            blobId: submitResult.blobId,
            expectedHash: submitResult.evidenceHash,
        });

        const verifyResult = JSON.parse(verifyResultStr);
        console.log('✅ Tool: verify_evidence');
        console.log(`   Verified: ${verifyResult.verified ? '✓ YES' : '✗ NO'}`);
        console.log(`   Data size: ${verifyResult.dataSize} bytes\n`);

        if (!verifyResult.verified) {
            throw new Error('Evidence verification failed!');
        }

        // Step 6: Settle and pay
        await this.sleep(1000);
        console.log('💭 Decision: Evidence verified. Releasing payment...\n');
        const settleResultStr = await settleTaskTool.invoke({
            taskId: createResult.taskId,
            approvedSubmissionIds: [submitResult.submissionId],
        });

        const settleResult = JSON.parse(settleResultStr);
        console.log('✅ Tool: settle_task');
        console.log(`   Transaction: ${settleResult.transactionDigest}`);
        console.log(`   Workers paid: ${settleResult.paidWorkers}\n`);

        return {
            taskId: createResult.taskId,
            submissionId: submitResult.submissionId,
            transactionDigest: settleResult.transactionDigest,
            completed: true,
        };
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Main demo
async function runLangChainAgentDemo() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  LangChain Agent Demo - WAP3 on Sui                      ║');
    console.log('║  Simulated AI Agent with Tool Use                        ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    try {
        const agent = new MockAgent();

        const result = await agent.invoke({
            taskDescription: 'Analyze user behavior patterns in e-commerce dataset',
            reward: 0.15,
        });

        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║  ✓ Demo Completed Successfully!                          ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');

        console.log('Agent Workflow Summary:');
        console.log(`  1. Created task with 0.15 SUI escrow`);
        console.log(`  2. Claimed task as worker`);
        console.log(`  3. Executed work and generated evidence`);
        console.log(`  4. Uploaded evidence to Walrus`);
        console.log(`  5. Verified evidence integrity`);
        console.log(`  6. Released payment to worker\n`);

        console.log('Blockchain Records:');
        console.log(`  Task ID: ${result.taskId}`);
        console.log(`  Submission ID: ${result.submissionId}`);
        console.log(`  Settlement Tx: ${result.transactionDigest}\n`);

        console.log('💡 This demonstrates how a real LangChain agent could:');
        console.log('   - Autonomously create and manage tasks');
        console.log('   - Execute work and handle payments');
        console.log('   - Verify proof before releasing funds');
        console.log('   - All with cryptographic provenance on Sui\n');

    } catch (error: any) {
        console.error('\n❌ Demo failed:', error.message);
        console.error('\nTroubleshooting:');
        console.error('  1. Ensure .env is configured with SUI_PRIVATE_KEY');
        console.error('  2. Check Sui testnet is accessible');
        console.error('  3. Verify package ID is correct');
        console.error('  4. Set WALRUS_MOCK_MODE=true for offline testing\n');
        process.exit(1);
    }
}

// Run demo
if (require.main === module) {
    runLangChainAgentDemo().catch(console.error);
}

export default runLangChainAgentDemo;
