import { createAxiosClient } from '../network/network';
import type { FilecoinRpcResponse, FilecoinBackupResult } from '../types';
import { FilecoinRsBindings } from '../filecoin-rs-bindings';
import type { AxiosError } from 'axios';

// Configuration
const FILECOIN_RPC_URL = process.env.FILECOIN_RPC_URL || 'https://api.node.glif.io/rpc/v0';
const FILECOIN_API_TOKEN = process.env.FILECOIN_API_TOKEN || '';

// Axios client for Filecoin RPC
const axiosFilecoinClient = createAxiosClient(FILECOIN_RPC_URL, FILECOIN_API_TOKEN);

// Define a type for data vectors
interface DataVector {
    id: string;
    value: string | Uint8Array;
    metadata?: {
        path?: string;
        encrypted?: boolean;
        size?: number;
    };
}

/**
 * Connects to the Filecoin network via RPC.
 * @throws Error if connection fails or environment variables are missing.
 */
export async function connectToFilecoin(): Promise<void> {
    if (!FILECOIN_RPC_URL || !FILECOIN_API_TOKEN) {
        throw new Error('Filecoin RPC URL or API token not configured in environment variables');
    }

    try {
        const response = await axiosFilecoinClient.post('', {
            jsonrpc: '2.0',
            method: 'Filecoin.Version',
            params: [],
            id: 1
        });

        const data: FilecoinRpcResponse = response.data;
        if (data.error || !data.result) {
            throw new Error(`Filecoin RPC error: ${data.error?.message || 'No version returned'}`);
        }

        console.log('Connected to Filecoin network successfully:', data.result);
    } catch (error) {
        const err = error as AxiosError;
        console.error('Error connecting to Filecoin network:', err.response?.data || err.message);
        throw error;
    }
}

/**
 * Checks the connection status to the Filecoin network.
 * @returns True if connected, false otherwise.
 */
export async function checkFilecoinConnection(): Promise<boolean> {
    if (!FILECOIN_RPC_URL || !FILECOIN_API_TOKEN) {
        console.warn('Filecoin RPC URL or API token not configured');
        return false;
    }

    try {
        const response = await axiosFilecoinClient.post('', {
            jsonrpc: '2.0',
            method: 'Filecoin.Version',
            params: [],
            id: 1
        });

        const data: FilecoinRpcResponse = response.data;
        const isConnected = !data.error && data.result !== null;
        console.log('Filecoin connection check:', isConnected ? 'Connected' : 'Disconnected');
        return isConnected;
    } catch (error) {
        console.error('Error checking Filecoin connection:', (error as AxiosError).message);
        return false;
    }
}

/**
 * Fetches and processes Filecoin data vectors by creating a backup.
 * @returns An array of data vectors derived from the backup.
 * @throws Error if initialization, backup, or processing fails.
 */
export async function fetchFilecoinDataVectors(): Promise<DataVector[]> {
    try {
        await FilecoinRsBindings.initialize();
        const backupResult = await FilecoinRsBindings.backupDataLocal({
            path: '../backup',
            encrypted: true,
            data: '' // Placeholder; replace with actual data if needed
        });

        // Process the backup result to extract data vectors
        return processBackupResult(backupResult);
    } catch (error) {
        console.error('Error fetching Filecoin data vectors:', error);
        throw error;
    }
}

/**
 * Processes a Filecoin backup result to extract data vectors.
 * @param backupResult - The result of a Filecoin backup operation.
 * @returns An array of data vectors extracted from the backup.
 */
function processBackupResult(backupResult: FilecoinBackupResult): DataVector[] {
    const vectors: DataVector[] = [];

    if (!backupResult.success || !backupResult.metadata.path) {
        console.warn('Backup failed or no path available, returning empty vectors');
        return vectors;
    }

    const vector: DataVector = {
        id: backupResult.metadata.path.split('/').pop() || 'unknown', // Use filename as ID
        value: backupResult.data || Buffer.from(''), // Fallback to empty buffer
        metadata: {
            path: backupResult.metadata.path,
            encrypted: backupResult.metadata.encrypted,
            size: backupResult.metadata.size
        }
    };

    vectors.push(vector);
    return vectors;
}

/**
 * Searches Filecoin chain data using a query.
 * @param query - The search query (e.g., CID, address, or keyword).
 * @returns An array of search results as data vectors.
 * @throws Error if the search operation fails.
 */
export async function searchFilecoinData(query: string): Promise<DataVector[]> {
    console.log(`Searching Filecoin data with query: ${query}`);

    try {
        await connectToFilecoin(); // Ensure connection before searching

        const vectors: DataVector[] = [];
        
        // Example: Handle CID queries
        if (query.match(/^(ipfs|filecoin):\/\//)) {
            const cid = query.split('://')[1];
            const data = await FilecoinRsBindings.retrieveDataWithMachine(cid);
            vectors.push({
                id: cid,
                value: data,
                metadata: { path: query }
            });
        } else {
            // Query Filecoin chain (e.g., messages or state)
            const response = await axiosFilecoinClient.post('', {
                jsonrpc: '2.0',
                method: 'Filecoin.ChainGetMessage',
                params: [{ '/': query }], // Example: Query by CID or message ID
                id: 1
            });

            const data: FilecoinRpcResponse = response.data;
            if (data.error) {
                console.warn(`Chain query failed: ${data.error.message}`);
                return vectors;
            }

            vectors.push({
                id: query,
                value: JSON.stringify(data.result),
                metadata: {}
            });
        }

        return vectors;
    } catch (error) {
        console.error('Error searching Filecoin data:', (error as AxiosError).message);
        throw error;
    }
}