/**
 * MCP Tool: Settle Task
 * Trigger on-chain settlement and reward distribution
 */

import { SuiTaskClient } from '../../sui/sui-client';

export interface SettleTaskInput {
    taskId: string;
    approvedSubmissionIds: string[];
}

export interface SettleTaskResult {
    success: boolean;
    transaction?: string;
    totalPaid?: number;
    numWorkers?: number;
    error?: string;
}

export async function settleTask(
    client: SuiTaskClient,
    params: SettleTaskInput
): Promise<SettleTaskResult> {
    try {
        if (params.approvedSubmissionIds.length === 0) {
            throw new Error('No approved submissions provided');
        }

        console.log(`💰 Settling task...`);
        console.log(`  Task: ${params.taskId}`);
        console.log(`  Approved Workers: ${params.approvedSubmissionIds.length}`);

        const transaction = await client.verifyAndSettle(
            params.taskId,
            params.approvedSubmissionIds
        );

        // Fetch task to get reward info
        const task = await client.getTask(params.taskId);

        return {
            success: true,
            transaction,
            totalPaid: task?.rewardPool || 0,
            numWorkers: params.approvedSubmissionIds.length,
        };
    } catch (error: any) {
        console.error('Failed to settle task:', error.message);
        return {
            success: false,
            error: error.message,
        };
    }
}

export const settleTaskTool = {
    name: 'mpp_settle_task',
    description: 'Settle task and distribute rewards to approved workers on Sui blockchain',
    inputSchema: {
        type: 'object',
        properties: {
            taskId: {
                type: 'string',
                description: 'Sui object ID of the task to settle',
            },
            approvedSubmissionIds: {
                type: 'array',
                items: {
                    type: 'string',
                },
                description: 'Array of Sui object IDs for approved submissions',
            },
        },
        required: ['taskId', 'approvedSubmissionIds'],
    },
};
