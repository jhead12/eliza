import axios, { AxiosError } from 'axios';
import { encrypt, decrypt, ENCRYPTION_KEY, ALGORITHM } from '../encryption';
import { FilecoinBackupResult } from '../types'; // Keep if needed elsewhere

// Environment variables (loaded via dotenv in index.ts)
const STORACHA_API_TOKEN = process.env.STORACHA_API_TOKEN || '';
const STORACHA_API_ENDPOINT = process.env.STORACHA_API_ENDPOINT || 'https://api.storacha.network';
const FILECOIN_RPC_URL = process.env.FILECOIN_RPC_URL || 'https://api.node.glif.io/rpc/v0';
const FILECOIN_API_TOKEN = process.env.FILECOIN_API_TOKEN || '';

// Axios instance for Filecoin RPC
const axiosFilecoinClient = axios.create({
    baseURL: FILECOIN_RPC_URL,
    headers: {
        'Authorization': `Bearer ${FILECOIN_API_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

// Axios instance for Storacha API
const storachaClient = axios.create({
    baseURL: STORACHA_API_ENDPOINT,
    headers: {
        'Authorization': `Bearer ${STORACHA_API_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

// Placeholder Filecoin network client
const filecoinClient = {
    connect: async () => true,
    isConnected: async () => true
};

/**
 * Uploads encrypted data to Storacha and returns the data ID or CID.
 * @param data - The data to encrypt and upload.
 * @returns The identifier (e.g., CID) of the uploaded data.
 * @throws Error if upload fails or environment variables are missing.
 */
export async function uploadToStoracha(data: string): Promise<string> {
    if (!STORACHA_API_TOKEN || !STORACHA_API_ENDPOINT) {
        throw new Error('Storacha API token or endpoint not configured in environment variables');
    }

    try {
        const encryptedData = encrypt(data); // Returns Uint8Array or string, adjust based on encryption.ts
        const response = await storachaClient.post('/data', { data: encryptedData });

        const dataId = response.data.id || response.data.cid;
        if (!dataId) throw new Error('No data ID returned from Storacha');
        
        console.log('Data uploaded to Storacha successfully:', dataId);
        return dataId;
    } catch (error) {
        const err = error as AxiosError;
        console.error('Error uploading data to Storacha:', err.response?.data || err.message);
        throw error;
    }
}

/**
 * Downloads and decrypts data from Storacha by ID or CID.
 * @param cid - The identifier (e.g., CID) of the data to download.
 * @returns The decrypted data as a Uint8Array.
 * @throws Error if download fails or environment variables are missing.
 */
export async function downloadFromStoracha(cid: string): Promise<Uint8Array> {
    if (!STORACHA_API_TOKEN || !STORACHA_API_ENDPOINT) {
        throw new Error('Storacha API token or endpoint not configured in environment variables');
    }

    try {
        const response = await storachaClient.get(`/data/${cid}`);
        const encryptedData = response.data.data; // Adjust based on Storacha API response structure
        
        if (!encryptedData) throw new Error('No data returned from Storacha');
        
        const decryptedData = decrypt(encryptedData); // Ensure decrypt returns Uint8Array
        console.log(`Data downloaded from Storacha (ID: ${cid}):`, decryptedData);
        return decryptedData;
    } catch (error) {
        const err = error as AxiosError;
        console.error('Error downloading data from Storacha:', err.response?.data || err.message);
        throw error;
    }
}