/**
 * Sui Configuration
 * Network settings and package deployment addresses
 */

export interface SuiNetworkConfig {
    network: 'testnet' | 'devnet' | 'mainnet' | 'localnet';
    rpcUrl?: string;
    packageId: string;
    faucetUrl?: string;
}

export interface WalrusNetworkConfig {
    aggregatorUrl: string;
    storageUrl: string;
    network: 'testnet' | 'devnet' | 'mainnet';
}

// ========== Sui Network Configurations ==========

export const SUI_NETWORKS: Record<string, SuiNetworkConfig> = {
    testnet: {
        network: 'testnet',
        packageId: process.env.SUI_TESTNET_PACKAGE_ID || '',
        faucetUrl: 'https://faucet.testnet.sui.io/gas',
    },
    devnet: {
        network: 'devnet',
        packageId: process.env.SUI_DEVNET_PACKAGE_ID || '',
        faucetUrl: 'https://faucet.devnet.sui.io/gas',
    },
    localnet: {
        network: 'localnet',
        rpcUrl: 'http://127.0.0.1:9000',
        packageId: process.env.SUI_LOCAL_PACKAGE_ID || '',
    },
    mainnet: {
        network: 'mainnet',
        packageId: process.env.SUI_MAINNET_PACKAGE_ID || '',
    },
};

// ========== Walrus Network Configurations ==========

export const WALRUS_NETWORKS: Record<string, WalrusNetworkConfig> = {
    testnet: {
        network: 'testnet',
        aggregatorUrl: 'https://aggregator.walrus-testnet.walrus.space',
        storageUrl: 'https://walrus-testnet.walrus.space',
    },
    devnet: {
        network: 'devnet',
        aggregatorUrl: 'https://aggregator.walrus-devnet.walrus.space',
        storageUrl: 'https://walrus-devnet.walrus.space',
    },
    mainnet: {
        network: 'mainnet',
        aggregatorUrl: 'https://aggregator.walrus.space',
        storageUrl: 'https://walrus.space',
    },
};

// ========== Active Configuration ==========

export function getActiveSuiConfig(): SuiNetworkConfig {
    const network = (process.env.SUI_NETWORK || 'testnet') as keyof typeof SUI_NETWORKS;
    const config = SUI_NETWORKS[network];

    if (!config) {
        throw new Error(`Unknown Sui network: ${network}`);
    }

    // Override with custom package ID if provided
    if (process.env.SUI_PACKAGE_ID) {
        config.packageId = process.env.SUI_PACKAGE_ID;
    }

    if (!config.packageId) {
        throw new Error(`Package ID not configured for network: ${network}`);
    }

    return config;
}

export function getActiveWalrusConfig(): WalrusNetworkConfig {
    const network = (process.env.WALRUS_NETWORK || 'testnet') as keyof typeof WALRUS_NETWORKS;
    const config = WALRUS_NETWORKS[network];

    if (!config) {
        throw new Error(`Unknown Walrus network: ${network}`);
    }

    // Override with custom URLs if provided
    if (process.env.WALRUS_AGGREGATOR_URL) {
        config.aggregatorUrl = process.env.WALRUS_AGGREGATOR_URL;
    }
    if (process.env.WALRUS_STORAGE_URL) {
        config.storageUrl = process.env.WALRUS_STORAGE_URL;
    }

    return config;
}

export default {
    sui: getActiveSuiConfig,
    walrus: getActiveWalrusConfig,
};
