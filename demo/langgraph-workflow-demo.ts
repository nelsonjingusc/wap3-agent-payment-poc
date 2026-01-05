/**
 * LangGraph Workflow Demo - WAP3 on Sui
 * 
 * Demonstrates a stateful workflow for agent task execution
 * with payment automation on Sui blockchain.
 */

import { runWorkflow } from '../adapters/sui-langgraph/workflow';

async function runLangGraphDemo() {
    console.log('Starting LangGraph Workflow Demo...\n');

    try {
        const result = await runWorkflow({
            taskType: 'sentiment_analysis',
            requirements: 'Analyze sentiment in 500 social media posts about blockchain technology',
            rewardSUI: 0.12,
        });

        if (result.completed) {
            console.log('╔══════════════════════════════════════════════════════════╗');
            console.log('║  ✓ Workflow Completed Successfully!                      ║');
            console.log('╚══════════════════════════════════════════════════════════╝\n');

            console.log('Workflow Summary:');
            console.log(`  Task Type: ${result.taskType}`);
            console.log(`  Reward: ${result.rewardSUI} SUI`);
            console.log(`  Task ID: ${result.taskId}`);
            console.log(`  Claim ID: ${result.claimId}`);
            console.log(`  Submission ID: ${result.submissionId}`);
            console.log(`  Blob ID: ${result.blobId}`);
            console.log(`  Transaction: ${result.transactionDigest}\n`);

            console.log('State Transitions:');
            console.log('  1. initial → task_created');
            console.log('  2. task_created → task_claimed');
            console.log('  3. task_claimed → work_completed');
            console.log('  4. work_completed → evidence_submitted');
            console.log('  5. evidence_submitted → evidence_verified');
            console.log('  6. evidence_verified → settled\n');

            console.log('💡 Key Benefits of LangGraph Approach:');
            console.log('   ✓ Stateful execution with full history');
            console.log('   ✓ Conditional branching based on state');
            console.log('   ✓ Error recovery at any node');
            console.log('   ✓ Parallel execution where possible');
            console.log('   ✓ Easy integration with LLM decision-making\n');

        } else {
            console.error(`Workflow failed at step: ${result.currentStep}`);
            console.error(`Error: ${result.error}\n`);
        }

    } catch (error: any) {
        console.error('\n❌ Demo failed:', error.message);
        console.error('\nTroubleshooting:');
        console.error('  1. Ensure .env is configured');
        console.error('  2. Check Sui testnet accessibility');
        console.error('  3. Verify SUI_PACKAGE_ID is correct');
        console.error('  4. Set WALRUS_MOCK_MODE=true\n');
        process.exit(1);
    }
}

// Run demo
if (require.main === module) {
    runLangGraphDemo().catch(console.error);
}

export default runLangGraphDemo;
