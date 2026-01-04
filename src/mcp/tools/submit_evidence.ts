/**
 * MCP Tool: Submit Evidence
 * Worker proves work completion by uploading to Walrus and submitting on-chain
 */

import { SuiTaskClient } from '../../sui/sui-client';
import { WalrusClient } from '../../walrus/walrus-client';
import fs from 'fs';

export interface SubmitEvidenceInput {
    taskId: string;
    claimId: string;
    evidence: string;         // File path or URL
    resultData?: any;         // Additional structured data
}

export interface SubmitEvidenceResult {
    success: boolean;
    submissionId?: string;
    blobId?: string;
    evidenceHash?: string;
    transaction?: string;
    error?: string;
}

export async function submitEvidence(
    suiClient: SuiTaskClient,
    walrusClient: WalrusClient,
    params: SubmitEvidenceInput
): Promise<SubmitEvidenceResult> {
    try {
        // Determine if evidence is a file path or data
        let evidenceData: Buffer;

        if (fs.existsSync(params.evidence)) {
            // Evidence is a file path
            evidenceData = fs.readFileSync(params.evidence);
            console.log(`📄 Loading evidence from file: ${params.evidence}`);
        } else {
            // Evidence is raw data/URL
            evidenceData = Buffer.from(params.evidence, 'utf-8');
        }

        // Include result data if provided
        if (params.resultData) {
            const resultJson = JSON.stringify(params.resultData, null, 2);
            const combinedData = Buffer.concat([
                evidenceData,
                Buffer.from('\n--- RESULT DATA ---\n'),
                Buffer.from(resultJson),
            ]);
            evidenceData = combinedData;
        }

        // Upload to Walrus
        console.log(`📤 Uploading evidence to Walrus...`);
        const uploadResult = await walrusClient.uploadBuffer(evidenceData);
        const blobId = uploadResult.blobId;

        // Generate evidence hash
        const evidenceHash = walrusClient.generateEvidenceHash(evidenceData);

        console.log(`✓ Evidence uploaded to Walrus`);
        console.log(`  Blob ID: ${blobId}`);
        console.log(`  Hash: ${evidenceHash}`);

        // Submit on-chain
        const submissionId = await suiClient.submitEvidence(
            params.taskId,
            params.claimId,
            blobId,
            evidenceHash
        );

        return {
            success: true,
            submissionId,
            blobId,
            evidenceHash,
        };
    } catch (error: any) {
        console.error('Failed to submit evidence:', error.message);
        return {
            success: false,
            error: error.message,
        };
    }
}

export const submitEvidenceTool = {
    name: 'mpp_submit_evidence',
    description: 'Submit proof of completed work by uploading evidence to Walrus and committing on-chain',
    inputSchema: {
        type: 'object',
        properties: {
            taskId: {
                type: 'string',
                description: 'Sui object ID of the task',
            },
            claimId: {
                type: 'string',
                description: 'Sui object ID of the claim',
            },
            evidence: {
                type: 'string',
                description: 'File path to evidence or raw evidence data',
            },
            resultData: {
                type: 'object',
                description: 'Optional structured result data to include',
            },
        },
        required: ['taskId', 'claimId', 'evidence'],
    },
};
