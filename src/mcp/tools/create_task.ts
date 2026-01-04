/**
 * MCP Tool: Create Task
 * Buyer posts a job with escrow payment
 */

import { SuiTaskClient, TaskCreationParams } from '../../sui/sui-client';

export interface CreateTaskInput {
    taskType: string;
    reward: {
        amount: number;         // Amount in SUI (will be converted to MIST)
        currency: 'SUI';
    };
    requirements: string;
    deadline?: string;        // ISO date string or relative time
    maxWorkers?: number;
}

export interface CreateTaskResult {
    success: boolean;
    taskId?: string;
    transaction?: string;
    error?: string;
}

const MIST_PER_SUI = 1_000_000_000;

export async function createTask(
    client: SuiTaskClient,
    params: CreateTaskInput
): Promise<CreateTaskResult> {
    try {
        // Convert deadline to timestamp
        let deadlineMs: number;
        if (params.deadline) {
            const deadlineDate = new Date(params.deadline);
            deadlineMs = deadlineDate.getTime();
        } else {
            // Default: 24 hours from now
            deadlineMs = Date.now() + 24 * 60 * 60 * 1000;
        }

        // Convert SUI to MIST
        const rewardInMist = Math.floor(params.reward.amount * MIST_PER_SUI);

        // Prepare task creation parameters
        const taskParams: TaskCreationParams = {
            targetInfo: JSON.stringify({
                type: params.taskType,
                requirements: params.requirements,
            }),
            rewardAmount: rewardInMist,
            deadline: deadlineMs,
            maxMiners: params.maxWorkers || 1,
        };

        const taskId = await client.createTask(taskParams);

        console.log(`✓ Task created successfully`);
        console.log(`  Type: ${params.taskType}`);
        console.log(`  Reward: ${params.reward.amount} SUI`);
        console.log(`  Max Workers: ${taskParams.maxMiners}`);

        return {
            success: true,
            taskId,
        };
    } catch (error: any) {
        console.error('Failed to create task:', error.message);
        return {
            success: false,
            error: error.message,
        };
    }
}

export const createTaskTool = {
    name: 'mpp_create_task',
    description: 'Create a new task with escrowed payment on Sui blockchain',
    inputSchema: {
        type: 'object',
        properties: {
            taskType: {
                type: 'string',
                description: 'Type of task (e.g., "data_analysis", "web_scraping")',
            },
            reward: {
                type: 'object',
                properties: {
                    amount: {
                        type: 'number',
                        description: 'Reward amount in SUI',
                    },
                    currency: {
                        type: 'string',
                        enum: ['SUI'],
                        description: 'Currency (currently only SUI supported)',
                    },
                },
                required: ['amount', 'currency'],
            },
            requirements: {
                type: 'string',
                description: 'Detailed task requirements and specifications',
            },
            deadline: {
                type: 'string',
                description: 'Task deadline (ISO 8601 format or relative time like "24h")',
            },
            maxWorkers: {
                type: 'number',
                description: 'Maximum number of workers allowed (default: 1)',
            },
        },
        required: ['taskType', 'reward', 'requirements'],
    },
};
