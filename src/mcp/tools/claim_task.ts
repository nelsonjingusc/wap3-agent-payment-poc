/**
 * MCP Tool: Claim Task
 * Worker signals intent to work on a task
 */

import { SuiTaskClient } from '../../sui/sui-client';

export interface ClaimTaskInput {
    taskId: string;
    agentId: string;
}

export interface ClaimTaskResult {
    success: boolean;
    claimId?: string;
    transaction?: string;
    error?: string;
}

export async function claimTask(
    client: SuiTaskClient,
    params: ClaimTaskInput
): Promise<ClaimTaskResult> {
    try {
        const claimId = await client.claimTask(params.taskId);

        console.log(`✓ Task claimed successfully`);
        console.log(`  Agent: ${params.agentId}`);
        console.log(`  Task: ${params.taskId}`);

        return {
            success: true,
            claimId,
        };
    } catch (error: any) {
        console.error('Failed to claim task:', error.message);
        return {
            success: false,
            error: error.message,
        };
    }
}

export const claimTaskTool = {
    name: 'mpp_claim_task',
    description: 'Claim a task to signal intent to work on it',
    inputSchema: {
        type: 'object',
        properties: {
            taskId: {
                type: 'string',
                description: 'Sui object ID of the task to claim',
            },
            agentId: {
                type: 'string',
                description: 'Agent identifier',
            },
        },
        required: ['taskId', 'agentId'],
    },
};
