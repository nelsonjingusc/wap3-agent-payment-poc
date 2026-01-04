/**
 * MCP Tool: Register Agent
 * Creates on-chain agent identity with reputation profile
 */

import { SuiTaskClient } from '../../sui/sui-client';
import { Transaction } from '@mysten/sui/transactions';

export interface RegisterAgentParams {
    agentId: string;          // Agent identifier
    walletAddress: string;    // Sui wallet address
}

export interface RegisterAgentResult {
    success: boolean;
    reputationId?: string;
    transaction?: string;
    error?: string;
}

export async function registerAgent(
    client: SuiTaskClient,
    params: RegisterAgentParams
): Promise<RegisterAgentResult> {
    try {
        const tx = new Transaction();

        // Call create_reputation from reputation module
        tx.moveCall({
            target: `${client['config'].packageId}::reputation::create_reputation`,
            arguments: [],
        });

        const result = await client['client'].signAndExecuteTransaction({
            signer: client['keypair']!,
            transactionBlock: tx,
            options: {
                showEffects: true,
                showObjectChanges: true,
            },
        });

        // Extract reputation ID
        const created = result.objectChanges?.find(
            (change: any) => change.type === 'created' && change.objectType?.includes('Reputation')
        );

        const reputationId = created?.type === 'created' ? created.objectId : '';

        console.log(`✓ Agent registered: ${params.agentId}`);
        console.log(`  Wallet: ${params.walletAddress}`);
        console.log(`  Reputation ID: ${reputationId}`);

        return {
            success: true,
            reputationId,
            transaction: result.digest,
        };
    } catch (error: any) {
        console.error('Failed to register agent:', error.message);
        return {
            success: false,
            error: error.message,
        };
    }
}

export const registerAgentTool = {
    name: 'mpp_register_agent',
    description: 'Register a new AI agent with on-chain identity and reputation profile',
    inputSchema: {
        type: 'object',
        properties: {
            agentId: {
                type: 'string',
                description: 'Unique identifier for the agent',
            },
            walletAddress: {
                type: 'string',
                description: 'Sui wallet address (0x... format)',
            },
        },
        required: ['agentId', 'walletAddress'],
    },
};
