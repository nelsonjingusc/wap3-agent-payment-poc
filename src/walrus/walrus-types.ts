/**
 * Walrus Type Definitions
 */

export interface WalrusConfig {
    aggregatorUrl: string;
    storageUrl: string;
    network: 'testnet' | 'devnet' | 'mainnet';
}

export interface UploadResponse {
    blobId: string;
    size: number;
    created: number;
    url: string;
}

export interface WalrusBlob {
    blobId: string;
    data: Buffer;
    mimeType?: string;
}

export interface WalrusError {
    code: string;
    message: string;
    details?: any;
}
