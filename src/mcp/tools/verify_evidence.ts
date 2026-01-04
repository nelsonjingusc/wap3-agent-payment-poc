/**
 * MCP Tool: Verify Evidence
 * Buyer validates work by checking Walrus content
 */

import { WalrusClient } from '../../walrus/walrus-client';

export interface VerifyEvidenceInput {
    submissionId: string;
    blobId: string;
    expectedHash: string;
    approved: boolean;
}

export interface VerifyEvidenceResult {
    success: boolean;
    verified: boolean;
    approved: boolean;
    evidenceSize?: number;
    error?: string;
}

export async function verifyEvidence(
    walrusClient: WalrusClient,
    params: VerifyEvidenceInput
): Promise<VerifyEvidenceResult> {
    try {
        console.log(`🔍 Verifying evidence from Walrus...`);
        console.log(`  Blob ID: ${params.blobId}`);

        // Retrieve from Walrus
        const blob = await walrusClient.retrieveBlob(params.blobId);

        // Verify hash
        const actualHash = walrusClient.generateEvidenceHash(blob.data);
        const hashMatches = actualHash === params.expectedHash;

        console.log(`✓ Evidence retrieved from Walrus`);
        console.log(`  Size: ${blob.data.length} bytes`);
        console.log(`  Hash Match: ${hashMatches ? '✓' : '✗'}`);
        console.log(`  Approved: ${params.approved ? '✓' : '✗'}`);

        // In a real implementation, buyer would review the content here
        // and make the approval decision

        return {
            success: true,
            verified: hashMatches,
            approved: params.approved && hashMatches,
            evidenceSize: blob.data.length,
        };
    } catch (error: any) {
        console.error('Failed to verify evidence:', error.message);
        return {
            success: false,
            verified: false,
            approved: false,
            error: error.message,
        };
    }
}

export const verifyEvidenceTool = {
    name: 'mpp_verify_evidence',
    description: 'Verify submitted evidence by retrieving from Walrus and checking integrity',
    inputSchema: {
        type: 'object',
        properties: {
            submissionId: {
                type: 'string',
                description: 'Sui object ID of the submission',
            },
            blobId: {
                type: 'string',
                description: 'Walrus blob identifier',
            },
            expectedHash: {
                type: 'string',
                description: 'Expected evidence hash for integrity check',
            },
            approved: {
                type: 'boolean',
                description: 'Whether to approve this submission for payment',
            },
        },
        required: ['submissionId', 'blobId', 'expectedHash', 'approved'],
    },
};
