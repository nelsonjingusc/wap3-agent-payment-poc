/**
 * LangGraph Workflow for WAP3 on Sui
 * 
 * Implements a stateful workflow graph for managing agent tasks
 * with payment automation on Sui blockchain.
 */

import { createSuiTaskClient } from '../../src/sui/sui-client';
import { createWalrusClient } from '../../src/walrus/walrus-client';
import { getActiveSuiConfig, getActiveWalrusConfig } from '../../sui.config';
import * as dotenv from 'dotenv';

dotenv.config();

// ========== Workflow State Definition ==========

export interface WorkflowState {
    // Task info
    taskType?: string;
    requirements?: string;
    rewardSUI?: number;
    taskId?: string;

    // Claim info
    claimId?: string;

    // Evidence info
    evidenceFilePath?: string;
    blobId?: string;
    evidenceHash?: string;
    submissionId?: string;

    // Settlement info
    transactionDigest?: string;

    // Status tracking
    currentStep?: string;
    error?: string;
    completed: boolean;
}

// ========== Workflow Nodes ==========

/**
 * Node 1: Create Task
 * Initializes a new task with escrowed payment
 */
export async function createTaskNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
    try {
        console.log(`\n📋 Node: Create Task`);
        console.log(`   Type: ${state.taskType}`);
        console.log(`   Reward: ${state.rewardSUI} SUI`);

        const config = getActiveSuiConfig();
        const client = createSuiTaskClient({
            network: config.network,
            packageId: config.packageId,
            privateKey: process.env.SUI_PRIVATE_KEY,
        });

        const deadline = Date.now() + 24 * 60 * 60 * 1000;
        const taskId = await client.createTask({
            targetInfo: JSON.stringify({
                type: state.taskType,
                requirements: state.requirements,
            }),
            rewardAmount: Math.floor(state.rewardSUI! * 1e9),
            deadline,
            maxMiners: 1,
        });

        console.log(`   ✓ Task created: ${taskId}\n`);

        return {
            taskId,
            currentStep: 'task_created',
        };
    } catch (error: any) {
        console.error(`   ✗ Failed: ${error.message}\n`);
        return {
            error: error.message,
            currentStep: 'failed',
        };
    }
}

/**
 * Node 2: Claim Task
 * Worker signals intent to work on the task
 */
export async function claimTaskNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
    try {
        console.log(`\n👷 Node: Claim Task`);
        console.log(`   Task ID: ${state.taskId}`);

        const config = getActiveSuiConfig();
        const client = createSuiTaskClient({
            network: config.network,
            packageId: config.packageId,
            privateKey: process.env.SUI_WORKER_PRIVATE_KEY || process.env.SUI_PRIVATE_KEY,
        });

        // Wait a bit for task to be indexed
        await new Promise(resolve => setTimeout(resolve, 2000));

        const claimId = await client.claimTask(state.taskId!);

        console.log(`   ✓ Task claimed: ${claimId}\n`);

        return {
            claimId,
            currentStep: 'task_claimed',
        };
    } catch (error: any) {
        console.error(`   ✗ Failed: ${error.message}\n`);
        return {
            error: error.message,
            currentStep: 'failed',
        };
    }
}

/**
 * Node 3: Execute Work
 * Simulates worker completing the task
 */
export async function executeWorkNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
    console.log(`\n⚙️  Node: Execute Work`);
    console.log(`   Simulating task execution...`);

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Create evidence file (simplified for demo)
    const fs = require('fs');
    const path = require('path');

    const evidence = {
        task_type: state.taskType,
        completed_at: new Date().toISOString(),
        results: 'Work completed successfully',
    };

    const outputDir = path.join(__dirname, '../demo/out');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const evidencePath = path.join(outputDir, 'langgraph_evidence.json');
    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));

    console.log(`   ✓ Work completed`);
    console.log(`   Evidence: ${evidencePath}\n`);

    return {
        evidenceFilePath: evidencePath,
        currentStep: 'work_completed',
    };
}

/**
 * Node 4: Submit Evidence
 * Upload proof to Walrus and record on-chain
 */
export async function submitEvidenceNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
    try {
        console.log(`\n📤 Node: Submit Evidence`);
        console.log(`   File: ${state.evidenceFilePath}`);

        const suiConfig = getActiveSuiConfig();
        const walrusConfig = getActiveWalrusConfig();

        const suiClient = createSuiTaskClient({
            network: suiConfig.network,
            packageId: suiConfig.packageId,
            privateKey: process.env.SUI_WORKER_PRIVATE_KEY || process.env.SUI_PRIVATE_KEY,
        });

        const walrusClient = createWalrusClient(walrusConfig);

        // Upload to Walrus
        const uploadResult = await walrusClient.uploadFile(state.evidenceFilePath!);
        const evidenceHash = walrusClient.generateEvidenceHashFromFile(state.evidenceFilePath!);

        // Wait for claim to be indexed
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Submit on-chain
        const submissionId = await suiClient.submitEvidence(
            state.taskId!,
            state.claimId!,
            uploadResult.blobId,
            evidenceHash
        );

        console.log(`   ✓ Evidence submitted`);
        console.log(`   Blob ID: ${uploadResult.blobId}`);
        console.log(`   Submission ID: ${submissionId}\n`);

        return {
            blobId: uploadResult.blobId,
            evidenceHash,
            submissionId,
            currentStep: 'evidence_submitted',
        };
    } catch (error: any) {
        console.error(`   ✗ Failed: ${error.message}\n`);
        return {
            error: error.message,
            currentStep: 'failed',
        };
    }
}

/**
 * Node 5: Verify Evidence
 * Buyer checks evidence integrity
 */
export async function verifyEvidenceNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
    try {
        console.log(`\n🔍 Node: Verify Evidence`);
        console.log(`   Blob ID: ${state.blobId}`);

        const walrusConfig = getActiveWalrusConfig();
        const walrusClient = createWalrusClient(walrusConfig);

        const blob = await walrusClient.retrieveBlob(state.blobId!);
        const actualHash = walrusClient.generateEvidenceHash(blob.data);

        const verified = actualHash === state.evidenceHash;

        console.log(`   Hash Match: ${verified ? '✓ YES' : '✗ NO'}`);
        console.log(`   Data Size: ${blob.data.length} bytes\n`);

        if (!verified) {
            throw new Error('Evidence verification failed');
        }

        return {
            currentStep: 'evidence_verified',
        };
    } catch (error: any) {
        console.error(`   ✗ Failed: ${error.message}\n`);
        return {
            error: error.message,
            currentStep: 'failed',
        };
    }
}

/**
 * Node 6: Settle Task
 * Release escrowed payment to worker
 */
export async function settleTaskNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
    try {
        console.log(`\n💰 Node: Settle Task`);
        console.log(`   Task ID: ${state.taskId}`);

        const config = getActiveSuiConfig();
        const client = createSuiTaskClient({
            network: config.network,
            packageId: config.packageId,
            privateKey: process.env.SUI_PRIVATE_KEY,
        });

        // Wait for submission to be indexed
        await new Promise(resolve => setTimeout(resolve, 2000));

        const txDigest = await client.verifyAndSettle(
            state.taskId!,
            [state.submissionId!]
        );

        console.log(`   ✓ Payment released`);
        console.log(`   Transaction: ${txDigest}\n`);

        return {
            transactionDigest: txDigest,
            currentStep: 'settled',
            completed: true,
        };
    } catch (error: any) {
        console.error(`   ✗ Failed: ${error.message}\n`);
        return {
            error: error.message,
            currentStep: 'failed',
        };
    }
}

// ========== Workflow Runner (Simplified LangGraph-style) ==========

/**
 * Simple workflow runner
 * In production, this would use actual @langchain/langgraph StateGraph
 */
export async function runWorkflow(initialState: Partial<WorkflowState>): Promise<WorkflowState> {
    let state: WorkflowState = {
        ...initialState,
        completed: false,
    };

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  LangGraph Workflow - WAP3 on Sui                        ║');
    console.log('║  Stateful Task Execution with Payment                    ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    // Execute workflow nodes in sequence
    const nodes = [
        { name: 'Create Task', fn: createTaskNode },
        { name: 'Claim Task', fn: claimTaskNode },
        { name: 'Execute Work', fn: executeWorkNode },
        { name: 'Submit Evidence', fn: submitEvidenceNode },
        { name: 'Verify Evidence', fn: verifyEvidenceNode },
        { name: 'Settle Task', fn: settleTaskNode },
    ];

    for (const node of nodes) {
        if (state.error) break;

        const updates = await node.fn(state);
        state = { ...state, ...updates };

        // In real LangGraph, state transitions would be managed by the graph
    }

    return state;
}

// ========== Production LangGraph Integration Example ==========

/**
 * Example of how this would look with real @langchain/langgraph
 * 
 * import { StateGraph } from '@langchain/langgraph';
 * 
 * const workflow = new StateGraph<WorkflowState>()
 *   .addNode('createTask', createTaskNode)
 *   .addNode('claimTask', claimTaskNode)
 *   .addNode('executeWork', executeWorkNode)
 *   .addNode('submitEvidence', submitEvidenceNode)
 *   .addNode('verifyEvidence', verifyEvidenceNode)
 *   .addNode('settleTask', settleTaskNode)
 *   .addEdge('createTask', 'claimTask')
 *   .addEdge('claimTask', 'executeWork')
 *   .addEdge('executeWork', 'submitEvidence')
 *   .addEdge('submitEvidence', 'verifyEvidence')
 *   .addConditionalEdges('verifyEvidence', (state) => {
 *     return state.error ? 'END' : 'settleTask';
 *   })
 *   .addEdge('settleTask', 'END')
 *   .setEntryPoint('createTask');
 * 
 * const app = workflow.compile();
 * const result = await app.invoke(initialState);
 */
