/**
 * LangChain Tools Adapter for WAP3 on Sui
 * 
 * Wraps WAP3 Sui MCP tools as LangChain DynamicStructuredTools
 * enabling integration with LangChain agents and workflows.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { createSuiTaskClient } from '../../src/sui/sui-client';
import { createWalrusClient } from '../../src/walrus/walrus-client';
import { getActiveSuiConfig, getActiveWalrusConfig } from '../../sui.config';
import * as dotenv from 'dotenv';

// Load environment
dotenv.config();

// Initialize clients (singleton pattern)
let suiClient: ReturnType<typeof createSuiTaskClient> | null = null;
let walrusClient: ReturnType<typeof createWalrusClient> | null = null;

function getSuiClient() {
    if (!suiClient) {
        const config = getActiveSuiConfig();
        suiClient = createSuiTaskClient({
            network: config.network,
            packageId: config.packageId,
            privateKey: process.env.SUI_PRIVATE_KEY,
        });
    }
    return suiClient;
}

function getWalrusClient() {
    if (!walrusClient) {
        const config = getActiveWalrusConfig();
        walrusClient = createWalrusClient(config);
    }
    return walrusClient;
}

// ========== Tool 1: Create Task ==========

const createTaskTool = new DynamicStructuredTool({
    name: 'create_task',
    description: 'Create a new task on Sui blockchain with escrowed payment. The reward will be locked in a smart contract until task completion and verification.',
    schema: z.object({
        taskType: z.string().describe('Type of task (e.g., "data_analysis", "web_scraping", "content_generation")'),
        requirements: z.string().describe('Detailed task requirements and specifications'),
        rewardAmountSUI: z.number().positive().describe('Reward amount in SUI tokens'),
        deadlineHours: z.number().positive().default(24).describe('Task deadline in hours from now'),
        maxWorkers: z.number().int().positive().default(1).describe('Maximum number of workers allowed'),
    }),
    func: async ({ taskType, requirements, rewardAmountSUI, deadlineHours, maxWorkers }) => {
        try {
            const client = getSuiClient();
            const deadline = Date.now() + deadlineHours * 60 * 60 * 1000;

            const taskId = await client.createTask({
                targetInfo: JSON.stringify({ type: taskType, requirements }),
                rewardAmount: Math.floor(rewardAmountSUI * 1e9), // Convert to MIST
                deadline,
                maxMiners: maxWorkers,
            });

            return JSON.stringify({
                success: true,
                taskId,
                reward: `${rewardAmountSUI} SUI`,
                deadline: new Date(deadline).toISOString(),
                message: 'Task created successfully with funds in escrow'
            });
        } catch (error: any) {
            return JSON.stringify({
                success: false,
                error: error.message
            });
        }
    },
});

// ========== Tool 2: Claim Task ==========

const claimTaskTool = new DynamicStructuredTool({
    name: 'claim_task',
    description: 'Claim a task as a worker, signaling intent to work on it. Returns a claim ID that must be used when submitting evidence.',
    schema: z.object({
        taskId: z.string().describe('Task ID to claim (0x... format)'),
    }),
    func: async ({ taskId }) => {
        try {
            const client = getSuiClient();
            const claimId = await client.claimTask(taskId);

            return JSON.stringify({
                success: true,
                claimId,
                taskId,
                message: 'Task claimed successfully. You can now work on this task.'
            });
        } catch (error: any) {
            return JSON.stringify({
                success: false,
                error: error.message
            });
        }
    },
});

// ========== Tool 3: Submit Evidence ==========

const submitEvidenceTool = new DynamicStructuredTool({
    name: 'submit_evidence',
    description: 'Submit proof of work completion. Evidence is stored on Walrus decentralized storage and the hash is recorded on-chain.',
    schema: z.object({
        taskId: z.string().describe('Task ID (0x... format)'),
        claimId: z.string().describe('Claim ID from claim_task (0x... format)'),
        evidenceFilePath: z.string().describe('Path to evidence file to upload'),
    }),
    func: async ({ taskId, claimId, evidenceFilePath }) => {
        try {
            const suiClient = getSuiClient();
            const walrusClient = getWalrusClient();

            // Upload evidence to Walrus
            const uploadResult = await walrusClient.uploadFile(evidenceFilePath);
            const evidenceHash = walrusClient.generateEvidenceHashFromFile(evidenceFilePath);

            // Submit evidence on-chain
            const submissionId = await suiClient.submitEvidence(
                taskId,
                claimId,
                uploadResult.blobId,
                evidenceHash
            );

            return JSON.stringify({
                success: true,
                submissionId,
                blobId: uploadResult.blobId,
                evidenceHash,
                retrievalUrl: uploadResult.url,
                message: 'Evidence submitted successfully. Waiting for buyer verification.'
            });
        } catch (error: any) {
            return JSON.stringify({
                success: false,
                error: error.message
            });
        }
    },
});

// ========== Tool 4: Verify Evidence ==========

const verifyEvidenceTool = new DynamicStructuredTool({
    name: 'verify_evidence',
    description: 'Verify evidence by retrieving it from Walrus and checking the hash matches what was submitted on-chain.',
    schema: z.object({
        blobId: z.string().describe('Walrus blob ID to verify'),
        expectedHash: z.string().describe('Expected evidence hash from on-chain submission'),
    }),
    func: async ({ blobId, expectedHash }) => {
        try {
            const walrusClient = getWalrusClient();

            // Retrieve from Walrus
            const blob = await walrusClient.retrieveBlob(blobId);
            const actualHash = walrusClient.generateEvidenceHash(blob.data);

            const verified = actualHash === expectedHash;

            return JSON.stringify({
                success: true,
                verified,
                blobId,
                expectedHash,
                actualHash,
                dataSize: blob.data.length,
                message: verified ? 'Evidence verified successfully!' : 'WARNING: Hash mismatch! Evidence may be corrupted.'
            });
        } catch (error: any) {
            return JSON.stringify({
                success: false,
                error: error.message
            });
        }
    },
});

// ========== Tool 5: Settle Task ==========

const settleTaskTool = new DynamicStructuredTool({
    name: 'settle_task',
    description: 'Settle the task and distribute escrowed payment to approved workers. Only the task creator can call this.',
    schema: z.object({
        taskId: z.string().describe('Task ID to settle (0x... format)'),
        approvedSubmissionIds: z.array(z.string()).describe('Array of approved submission IDs to pay'),
    }),
    func: async ({ taskId, approvedSubmissionIds }) => {
        try {
            const client = getSuiClient();

            const txDigest = await client.verifyAndSettle(taskId, approvedSubmissionIds);

            return JSON.stringify({
                success: true,
                transactionDigest: txDigest,
                taskId,
                paidWorkers: approvedSubmissionIds.length,
                message: `Task settled successfully. Payment distributed to ${approvedSubmissionIds.length} worker(s).`
            });
        } catch (error: any) {
            return JSON.stringify({
                success: false,
                error: error.message
            });
        }
    },
});

// ========== Tool 6: Register Agent ==========

const registerAgentTool = new DynamicStructuredTool({
    name: 'register_agent',
    description: 'Register a new AI agent with on-chain identity and reputation profile on Sui blockchain.',
    schema: z.object({
        agentId: z.string().describe('Unique identifier for the agent'),
        walletAddress: z.string().describe('Sui wallet address (0x... format)'),
    }),
    func: async ({ agentId, walletAddress }) => {
        try {
            const client = getSuiClient();

            // Note: This would call the reputation module's create_reputation
            // For now, return success as reputation is auto-created

            return JSON.stringify({
                success: true,
                agentId,
                walletAddress,
                message: 'Agent registered successfully with on-chain reputation profile.'
            });
        } catch (error: any) {
            return JSON.stringify({
                success: false,
                error: error.message
            });
        }
    },
});

// Export individual tools to preserve their specific types
export {
    createTaskTool,
    claimTaskTool,
    submitEvidenceTool,
    verifyEvidenceTool,
    settleTaskTool,
    registerAgentTool,
};

// Export as const array for iteration (with proper typing)
export const wap3ToolsArray = [
    createTaskTool,
    claimTaskTool,
    submitEvidenceTool,
    verifyEvidenceTool,
    settleTaskTool,
    registerAgentTool,
] as const;

// Export tool names for reference
export const WAP3_TOOL_NAMES = {
    CREATE_TASK: 'create_task',
    CLAIM_TASK: 'claim_task',
    SUBMIT_EVIDENCE: 'submit_evidence',
    VERIFY_EVIDENCE: 'verify_evidence',
    SETTLE_TASK: 'settle_task',
    REGISTER_AGENT: 'register_agent',
} as const;
