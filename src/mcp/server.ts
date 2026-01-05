/**
 * MCP Server for WAP3 on Sui
 * 
 * Model Context Protocol server exposing WAP3 tools
 * for use by any MCP-compatible AI agent or application.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createSuiTaskClient } from '../sui/sui-client';
import { createWalrusClient } from '../walrus/walrus-client';
import { getActiveSuiConfig, getActiveWalrusConfig } from '../../sui.config';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize clients
const suiConfig = getActiveSuiConfig();
const walrusConfig = getActiveWalrusConfig();

let suiClient: ReturnType<typeof createSuiTaskClient> | null = null;
let walrusClient: ReturnType<typeof createWalrusClient> | null = null;

function getSuiClient() {
    if (!suiClient) {
        suiClient = createSuiTaskClient({
            network: suiConfig.network,
            packageId: suiConfig.packageId,
            privateKey: process.env.SUI_PRIVATE_KEY,
        });
    }
    return suiClient;
}

function getWalrusClient() {
    if (!walrusClient) {
        walrusClient = createWalrusClient(walrusConfig);
    }
    return walrusClient;
}

// ========== MCP Server Setup ==========

const server = new Server(
    {
        name: 'wap3-sui-server',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// ========== Tool Definitions ==========

const TOOLS = [
    {
        name: 'create_task',
        description: 'Create a new task on Sui blockchain with escrowed payment',
        inputSchema: {
            type: 'object',
            properties: {
                taskType: {
                    type: 'string',
                    description: 'Type of task (e.g., "data_analysis")',
                },
                requirements: {
                    type: 'string',
                    description: 'Detailed task requirements',
                },
                rewardAmountSUI: {
                    type: 'number',
                    description: 'Reward amount in SUI tokens',
                },
                deadlineHours: {
                    type: 'number',
                    description: 'Deadline in hours from now',
                    default: 24,
                },
                maxWorkers: {
                    type: 'number',
                    description: 'Maximum number of workers',
                    default: 1,
                },
            },
            required: ['taskType', 'requirements', 'rewardAmountSUI'],
        },
    },
    {
        name: 'claim_task',
        description: 'Claim a task as a worker',
        inputSchema: {
            type: 'object',
            properties: {
                taskId: {
                    type: 'string',
                    description: 'Task ID to claim (0x... format)',
                },
            },
            required: ['taskId'],
        },
    },
    {
        name: 'submit_evidence',
        description: 'Submit proof of work completion',
        inputSchema: {
            type: 'object',
            properties: {
                taskId: { type: 'string', description: 'Task ID' },
                claimId: { type: 'string', description: 'Claim ID' },
                evidenceFilePath: { type: 'string', description: 'Path to evidence file' },
            },
            required: ['taskId', 'claimId', 'evidenceFilePath'],
        },
    },
    {
        name: 'verify_evidence',
        description: 'Verify evidence integrity from Walrus',
        inputSchema: {
            type: 'object',
            properties: {
                blobId: { type: 'string', description: 'Walrus blob ID' },
                expectedHash: { type: 'string', description: 'Expected evidence hash' },
            },
            required: ['blobId', 'expectedHash'],
        },
    },
    {
        name: 'settle_task',
        description: 'Settle task and distribute payment',
        inputSchema: {
            type: 'object',
            properties: {
                taskId: { type: 'string', description: 'Task ID to settle' },
                approvedSubmissionIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Approved submission IDs',
                },
            },
            required: ['taskId', 'approvedSubmissionIds'],
        },
    },
    {
        name: 'register_agent',
        description: 'Register AI agent with on-chain identity',
        inputSchema: {
            type: 'object',
            properties: {
                agentId: { type: 'string', description: 'Agent identifier' },
                walletAddress: { type: 'string', description: 'Sui wallet address' },
            },
            required: ['agentId', 'walletAddress'],
        },
    },
];

// ========== Request Handlers ==========

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (!args) {
        throw new Error('Missing arguments');
    }

    try {
        switch (name) {
            case 'create_task': {
                const client = getSuiClient();
                const deadlineHours = (args.deadlineHours as number) || 24;
                const deadline = Date.now() + deadlineHours * 60 * 60 * 1000;

                const taskId = await client.createTask({
                    targetInfo: JSON.stringify({
                        type: args.taskType as string,
                        requirements: args.requirements as string,
                    }),
                    rewardAmount: Math.floor((args.rewardAmountSUI as number) * 1e9),
                    deadline,
                    maxMiners: (args.maxWorkers as number) || 1,
                });

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                taskId,
                                reward: `${args.rewardAmountSUI as number} SUI`,
                            }),
                        },
                    ],
                };
            }

            case 'claim_task': {
                const client = getSuiClient();
                const claimId = await client.claimTask(args.taskId as string);

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                claimId,
                                taskId: args.taskId as string,
                            }),
                        },
                    ],
                };
            }

            case 'submit_evidence': {
                const suiClient = getSuiClient();
                const walrusClient = getWalrusClient();

                const uploadResult = await walrusClient.uploadFile(args.evidenceFilePath as string);
                const evidenceHash = walrusClient.generateEvidenceHashFromFile(args.evidenceFilePath as string);

                const submissionId = await suiClient.submitEvidence(
                    args.taskId as string,
                    args.claimId as string,
                    uploadResult.blobId,
                    evidenceHash
                );

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                submissionId,
                                blobId: uploadResult.blobId,
                                evidenceHash,
                            }),
                        },
                    ],
                };
            }

            case 'verify_evidence': {
                const walrusClient = getWalrusClient();

                const blob = await walrusClient.retrieveBlob(args.blobId as string);
                const actualHash = walrusClient.generateEvidenceHash(blob.data);
                const verified = actualHash === (args.expectedHash as string);

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                verified,
                                actualHash,
                                dataSize: blob.data.length,
                            }),
                        },
                    ],
                };
            }

            case 'settle_task': {
                const client = getSuiClient();
                const txDigest = await client.verifyAndSettle(
                    args.taskId as string,
                    args.approvedSubmissionIds as string[]
                );

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                transactionDigest: txDigest,
                                paidWorkers: (args.approvedSubmissionIds as string[]).length,
                            }),
                        },
                    ],
                };
            }

            case 'register_agent': {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                agentId: args.agentId as string,
                                walletAddress: args.walletAddress as string,
                            }),
                        },
                    ],
                };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error: any) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: error.message,
                    }),
                },
            ],
            isError: true,
        };
    }
});

// ========== Server Startup ==========

async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('WAP3 MCP Server running on stdio');
}

runServer().catch(console.error);
