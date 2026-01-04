/**
 * Sui Task Client - TypeScript SDK for interacting with Sui Move task contracts
 */

import {
    SuiClient,
    getFullnodeUrl,
} from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { blobIdToBytes, evidenceHashToBytes } from '../walrus/walrus-client';

// ========== Type Definitions ==========

export interface SuiTaskConfig {
    network: 'testnet' | 'devnet' | 'mainnet' | 'localnet';
    packageId: string;                    // Deployed package address
    privateKey?: string;                  // Optional: for signing transactions
}

export interface TaskCreationParams {
    targetInfo: string;                   // Task description
    rewardAmount: number;                 // SUI amount in MIST (1 SUI = 10^9 MIST)
    deadline: number;                     // Unix timestamp in milliseconds
    maxMiners: number;                    // Maximum workers allowed
}

export interface TaskInfo {
    id: string;
    creator: string;
    rewardPool: number;
    deadline: number;
    maxMiners: number;
    status: number;                       // 0=Active, 1=Completed, 2=Cancelled
}

export interface SubmissionInfo {
    id: string;
    taskId: string;
    worker: string;
    blobId: string;
    evidenceHash: string;
    verified: boolean;
}

export interface ClaimInfo {
    id: string;
    taskId: string;
    worker: string;
    claimedAt: number;
}

// ========== Sui Task Client Class ==========

export class SuiTaskClient {
    private client: SuiClient;
    private config: SuiTaskConfig;
    private keypair?: Ed25519Keypair;

    constructor(config: SuiTaskConfig) {
        this.config = config;

        // Initialize Sui client
        const rpcUrl = this.getRpcUrl(config.network);
        this.client = new SuiClient({ url: rpcUrl });

        // Initialize keypair if private key provided
        if (config.privateKey) {
            this.keypair = Ed25519Keypair.fromSecretKey(
                Buffer.from(config.privateKey, 'hex')
            );
        }
    }

    /**
     * Create a new task and lock funds in escrow
     */
    async createTask(params: TaskCreationParams): Promise<string> {
        if (!this.keypair) {
            throw new Error('Private key required to create task');
        }

        const tx = new Transaction();

        // Split coin for payment
        const [coin] = tx.splitCoins(tx.gas, [tx.pure(params.rewardAmount)]);

        // Call create_task function
        tx.moveCall({
            target: `${this.config.packageId}::task_contract::create_task`,
            arguments: [
                tx.pure(Array.from(Buffer.from(params.targetInfo, 'utf-8'))),  // target_info
                coin,                                                            // reward
                tx.pure(params.deadline),                                       // deadline
                tx.pure(params.maxMiners),                                      // max_miners
                tx.object('0x6'),                                               // clock object
            ],
        });

        const result = await this.client.signAndExecuteTransaction({
            signer: this.keypair,
            transactionBlock: tx,
            options: {
                showEffects: true,
                showObjectChanges: true,
            },
        });

        // Extract task ID from created objects
        const taskId = this.extractCreatedObjectId(result, 'Task');

        console.log(`✓ Task created on Sui: ${taskId}`);
        console.log(`  Transaction: ${result.digest}`);

        return taskId;
    }

    /**
     * Claim a task as a worker
     */
    async claimTask(taskId: string): Promise<string> {
        if (!this.keypair) {
            throw new Error('Private key required to claim task');
        }

        const tx = new Transaction();

        tx.moveCall({
            target: `${this.config.packageId}::task_contract::claim_task`,
            arguments: [
                tx.object(taskId),      // task
                tx.object('0x6'),       // clock
            ],
        });

        const result = await this.client.signAndExecuteTransaction({
            signer: this.keypair,
            transactionBlock: tx,
            options: {
                showEffects: true,
                showObjectChanges: true,
            },
        });

        const claimId = this.extractCreatedObjectId(result, 'Claim');

        console.log(`✓ Task claimed: ${claimId}`);
        console.log(`  Transaction: ${result.digest}`);

        return claimId;
    }

    /**
     * Submit evidence of completed work
     */
    async submitEvidence(
        taskId: string,
        claimId: string,
        blobId: string,
        evidenceHash: string
    ): Promise<string> {
        if (!this.keypair) {
            throw new Error('Private key required to submit evidence');
        }

        const tx = new Transaction();

        const blobIdBytes = blobIdToBytes(blobId);
        const evidenceHashBytes = evidenceHashToBytes(evidenceHash);

        tx.moveCall({
            target: `${this.config.packageId}::task_contract::submit_evidence`,
            arguments: [
                tx.object(taskId),                          // task
                tx.object(claimId),                         // claim
                tx.pure(Array.from(blobIdBytes)),          // blob_id
                tx.pure(Array.from(evidenceHashBytes)),    // evidence_hash
                tx.object('0x6'),                          // clock
            ],
        });

        const result = await this.client.signAndExecuteTransaction({
            signer: this.keypair,
            transactionBlock: tx,
            options: {
                showEffects: true,
                showObjectChanges: true,
            },
        });

        const submissionId = this.extractCreatedObjectId(result, 'Submission');

        console.log(`✓ Evidence submitted: ${submissionId}`);
        console.log(`  Blob ID: ${blobId}`);
        console.log(`  Transaction: ${result.digest}`);

        return submissionId;
    }

    /**
     * Verify and settle task - distribute rewards to approved workers
     */
    async verifyAndSettle(taskId: string, approvedSubmissionIds: string[]): Promise<string> {
        if (!this.keypair) {
            throw new Error('Private key required to settle task');
        }

        const tx = new Transaction();

        // Create vector of submission objects
        const submissions = approvedSubmissionIds.map(id => tx.object(id));

        tx.moveCall({
            target: `${this.config.packageId}::task_contract::verify_and_settle`,
            arguments: [
                tx.object(taskId),                          // task
                tx.makeMoveVec({ objects: submissions }),   // approved_submissions vector
            ],
        });

        const result = await this.client.signAndExecuteTransaction({
            signer: this.keypair,
            transactionBlock: tx,
            options: {
                showEffects: true,
                showEvents: true,
            },
        });

        console.log(`✓ Task settled: ${taskId}`);
        console.log(`  Paid ${approvedSubmissionIds.length} worker(s)`);
        console.log(`  Transaction: ${result.digest}`);

        return result.digest;
    }

    /**
     * Cancel task and refund creator
     */
    async cancelTask(taskId: string): Promise<string> {
        if (!this.keypair) {
            throw new Error('Private key required to cancel task');
        }

        const tx = new Transaction();

        tx.moveCall({
            target: `${this.config.packageId}::task_contract::cancel_task`,
            arguments: [
                tx.object(taskId),      // task
            ],
        });

        const result = await this.client.signAndExecuteTransaction({
            signer: this.keypair,
            transactionBlock: tx,
            options: {
                showEffects: true,
            },
        });

        console.log(`✓ Task cancelled: ${taskId}`);
        console.log(`  Transaction: ${result.digest}`);

        return result.digest;
    }

    /**
     * Get task details (read-only)
     */
    async getTask(taskId: string): Promise<TaskInfo | null> {
        try {
            const object = await this.client.getObject({
                id: taskId,
                options: {
                    showContent: true,
                },
            });

            if (!object.data || object.data.content?.dataType !== 'moveObject') {
                return null;
            }

            const fields = (object.data.content as any).fields;

            return {
                id: taskId,
                creator: fields.creator,
                rewardPool: parseInt(fields.reward_pool),
                deadline: parseInt(fields.deadline),
                maxMiners: parseInt(fields.max_miners),
                status: parseInt(fields.status),
            };
        } catch (error) {
            console.error('Failed to fetch task:', error);
            return null;
        }
    }

    /**
     * Get address from keypair
     */
    getAddress(): string {
        if (!this.keypair) {
            throw new Error('No keypair configured');
        }
        return this.keypair.getPublicKey().toSuiAddress();
    }

    /**
     * Get SUI balance
     */
    async getBalance(address?: string): Promise<number> {
        const addr = address || this.getAddress();
        const balance = await this.client.getBalance({ owner: addr });
        return parseInt(balance.totalBalance);
    }

    // ========== Private Helper Methods ==========

    private getRpcUrl(network: string): string {
        switch (network) {
            case 'mainnet':
                return getFullnodeUrl('mainnet');
            case 'testnet':
                return getFullnodeUrl('testnet');
            case 'devnet':
                return getFullnodeUrl('devnet');
            case 'localnet':
                return 'http://127.0.0.1:9000';
            default:
                return getFullnodeUrl('testnet');
        }
    }

    private extractCreatedObjectId(
        result: SuiTransactionResponse,
        objectType: string
    ): string {
        const created = result.objectChanges?.find(
            (change: any) =>
                change.type === 'created' &&
                change.objectType?.includes(objectType)
        );

        if (!created || created.type !== 'created') {
            throw new Error(`Failed to find created ${objectType} object`);
        }

        return created.objectId;
    }
}

// ========== Utility Functions ==========

/**
 * Create Sui task client from configuration
 */
export function createSuiTaskClient(config: SuiTaskConfig): SuiTaskClient {
    return new SuiTaskClient(config);
}

/**
 * Create client from environment variables
 */
export function createSuiTaskClientFromEnv(): SuiTaskClient {
    const config: SuiTaskConfig = {
        network: (process.env.SUI_NETWORK as any) || 'testnet',
        packageId: process.env.SUI_PACKAGE_ID || '',
        privateKey: process.env.SUI_PRIVATE_KEY,
    };

    if (!config.packageId) {
        throw new Error('SUI_PACKAGE_ID environment variable required');
    }

    return new SuiTaskClient(config);
}

export default SuiTaskClient;
