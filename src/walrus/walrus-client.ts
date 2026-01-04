/**
 * Walrus Storage Client - TypeScript interface for Walrus decentralized storage
 * Handles file upload, retrieval, and evidence hash generation
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ========== Type Definitions ==========

export interface WalrusConfig {
  aggregatorUrl: string;      // Walrus aggregator endpoint
  storageUrl: string;         // Walrus storage/retrieval endpoint
  network: 'testnet' | 'devnet' | 'mainnet';
}

export interface UploadResponse {
  blobId: string;             // Unique blob identifier
  size: number;               // File size in bytes
  created: number;            // Timestamp
  url: string;                // Retrieval URL
}

export interface WalrusBlob {
  blobId: string;
  data: Buffer;
  mimeType?: string;
}

// ========== Default Configuration ==========

const DEFAULT_CONFIG: WalrusConfig = {
  aggregatorUrl: process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space',
  storageUrl: process.env.WALRUS_STORAGE_URL || 'https://walrus-testnet.walrus.space',
  network: (process.env.WALRUS_NETWORK as any) || 'testnet',
};

// ========== Walrus Client Class ==========

export class WalrusClient {
  private config: WalrusConfig;
  private httpClient: AxiosInstance;

  constructor(config?: Partial<WalrusConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });
  }

  /**
   * Upload a file from filesystem to Walrus
   * @param filePath - Path to file to upload
   * @returns Upload response with blob_id
   */
  async uploadFile(filePath: string): Promise<UploadResponse> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    return this.uploadBuffer(fileBuffer, fileName);
  }

  /**
   * Upload raw buffer data to Walrus
   * @param buffer - Data to upload
   * @param filename - Optional filename for metadata
   * @returns Upload response with blob_id
   */
  async uploadBuffer(buffer: Buffer, filename?: string): Promise<UploadResponse> {
    try {
      // In testnet, we use PUT request to upload
      const response = await this.httpClient.put(
        `${this.config.aggregatorUrl}/v1/store`,
        buffer,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          maxBodyLength: Infinity,
        }
      );

      // Parse response based on Walrus testnet format
      const blobId = this.extractBlobId(response.data);
      const retrievalUrl = `${this.config.storageUrl}/v1/${blobId}`;

      const uploadResponse: UploadResponse = {
        blobId,
        size: buffer.length,
        created: Date.now(),
        url: retrievalUrl,
      };

      console.log(`✓ Uploaded to Walrus: ${blobId} (${buffer.length} bytes)`);
      
      return uploadResponse;
    } catch (error: any) {
      console.error('Walrus upload failed:', error.message);
      
      // Fallback to mock mode for development
      if (process.env.WALRUS_MOCK_MODE === 'true') {
        console.log('⚠️  Using mock Walrus mode');
        return this.mockUpload(buffer, filename);
      }
      
      throw new Error(`Walrus upload failed: ${error.message}`);
    }
  }

  /**
   * Retrieve blob data from Walrus
   * @param blobId - Walrus blob identifier
   * @returns Blob data and metadata
   */
  async retrieveBlob(blobId: string): Promise<WalrusBlob> {
    try {
      const url = `${this.config.storageUrl}/v1/${blobId}`;
      const response = await this.httpClient.get(url, {
        responseType: 'arraybuffer',
      });

      return {
        blobId,
        data: Buffer.from(response.data),
        mimeType: response.headers['content-type'],
      };
    } catch (error: any) {
      console.error('Walrus retrieval failed:', error.message);
      
      // Fallback to mock mode
      if (process.env.WALRUS_MOCK_MODE === 'true') {
        return this.mockRetrieve(blobId);
      }
      
      throw new Error(`Walrus retrieval failed: ${error.message}`);
    }
  }

  /**
   * Generate evidence hash for on-chain verification
   * @param data - Data to hash
   * @returns Hex-encoded hash
   */
  generateEvidenceHash(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate evidence hash from file
   * @param filePath - Path to file
   * @returns Hex-encoded hash
   */
  generateEvidenceHashFromFile(filePath: string): string {
    const buffer = fs.readFileSync(filePath);
    return this.generateEvidenceHash(buffer);
  }

  /**
   * Verify evidence integrity
   * @param blobId - Walrus blob identifier
   * @param expectedHash - Expected evidence hash
   * @returns true if hash matches
   */
  async verifyEvidence(blobId: string, expectedHash: string): Promise<boolean> {
    const blob = await this.retrieveBlob(blobId);
    const actualHash = this.generateEvidenceHash(blob.data);
    return actualHash === expectedHash;
  }

  // ========== Private Helper Methods ==========

  /**
   * Extract blob ID from Walrus response
   * Handles different response formats from testnet/devnet
   */
  private extractBlobId(responseData: any): string {
    // Handle different response formats
    if (typeof responseData === 'string') {
      return responseData;
    }
    
    if (responseData.newlyCreated?.blobObject?.blobId) {
      return responseData.newlyCreated.blobObject.blobId;
    }
    
    if (responseData.alreadyCertified?.blobId) {
      return responseData.alreadyCertified.blobId;
    }
    
    if (responseData.blobId) {
      return responseData.blobId;
    }

    throw new Error('Could not extract blob ID from Walrus response');
  }

  /**
   * Mock upload for testing/development
   */
  private mockUpload(buffer: Buffer, filename?: string): UploadResponse {
    const hash = this.generateEvidenceHash(buffer);
    const mockBlobId = `mock_${hash.substring(0, 16)}`;
    
    // Store in memory or filesystem for mock retrieval
    this.storeMockBlob(mockBlobId, buffer);
    
    return {
      blobId: mockBlobId,
      size: buffer.length,
      created: Date.now(),
      url: `mock://walrus/${mockBlobId}`,
    };
  }

  /**
   * Mock retrieval for testing/development
   */
  private mockRetrieve(blobId: string): WalrusBlob {
    const data = this.getMockBlob(blobId);
    
    if (!data) {
      throw new Error(`Mock blob not found: ${blobId}`);
    }
    
    return {
      blobId,
      data,
      mimeType: 'application/octet-stream',
    };
  }

  // Simple in-memory storage for mock mode
  private static mockStorage = new Map<string, Buffer>();

  private storeMockBlob(blobId: string, data: Buffer): void {
    WalrusClient.mockStorage.set(blobId, data);
  }

  private getMockBlob(blobId: string): Buffer | undefined {
    return WalrusClient.mockStorage.get(blobId);
  }
}

// ========== Utility Functions ==========

/**
 * Create a Walrus client with configuration from environment
 */
export function createWalrusClient(config?: Partial<WalrusConfig>): WalrusClient {
  return new WalrusClient(config);
}

/**
 * Helper to convert blob_id to bytes for Sui Move contract
 */
export function blobIdToBytes(blobId: string): Uint8Array {
  return Buffer.from(blobId, 'utf-8');
}

/**
 * Helper to convert evidence hash to bytes for Sui Move contract
 */
export function evidenceHashToBytes(hash: string): Uint8Array {
  return Buffer.from(hash, 'hex');
}

export default WalrusClient;
