/**
 * Sui Type Definitions matching Move contract structures
 */

export interface SuiTaskConfig {
    network: 'testnet' | 'devnet' | 'mainnet' | 'localnet';
    packageId: string;
    privateKey?: string;
}

export interface TaskCreationParams {
    targetInfo: string;
    rewardAmount: number;
    deadline: number;
    maxMiners: number;
}

export interface TaskInfo {
    id: string;
    creator: string;
    rewardPool: number;
    deadline: number;
    maxMiners: number;
    status: number;
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

export interface ReputationInfo {
    id: string;
    agent: string;
    score: number;
    tasksCompleted: number;
    tasksSuccessful: number;
    totalEarned: number;
}
