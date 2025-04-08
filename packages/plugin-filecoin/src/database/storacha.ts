import axios, { AxiosError } from 'axios';
import { encrypt, decrypt, ENCRYPTION_KEY, ALGORITHM } from '../encryption';
import { FilecoinBackupResult } from '../types'; // Keep if needed elsewhere

// Environment variables (loaded via dotenv in index.ts)
const STORACHA_HTTP_BRIDGE_URL = process.env.STORACHA_HTTP_BRIDGE_URL || '';
const STORACHA_AUTH_HEADER = process.env.STORACHA_AUTH_HEADER || '';
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

// Placeholder Filecoin network client
const filecoinClient = {
    connect: async () => true,
    isConnected: async () => true
};

/**
 * Uploads encrypted data to Storacha via HTTP Bridge and returns the upload URL.
 * @param data - The data to encrypt and upload.
 * @returns The upload URL for the encrypted data.
 * @throws Error if upload fails or environment variables are missing.
 */
export async function uploadToStoracha(data: string): Promise<string> {
    if (!STORACHA_HTTP_BRIDGE_URL) {
        throw new Error('Storacha HTTP Bridge URL not configured in environment variables');
    }

    try {
        const encryptedData = encrypt(data); // Returns Uint8Array or string, adjust based on encryption.ts

        // Step 1: Generate a token for uploading
        const generateTokenResponse = await axios.post(`${STORACHA_HTTP_BRIDGE_URL}/generate-token`, {
            did: 'did:key:z6Mkabc123' // Replace with actual DID
        });

        const authToken = generateTokenResponse.data.token;

        if (!authToken) throw new Error('No auth token returned from Storacha');

        // Step 2: Store the data
        const storeDataResponse = await axios.post(`${STORACHA_HTTP_BRIDGE_URL}/store/add`, {
            did: 'did:key:z6Mkabc123', // Replace with actual DID
            link: 'CID of the encrypted data' // CID of the encrypted data, replace placeholder
        }, {
            headers: {
                'X-Auth-Secret': authToken,
                'Authorization': `Bearer ${authToken}`
            }
        });

        const storeResult = storeDataResponse.data;

        if (storeResult.status !== 'done') {
            console.log('Status is not "done", need to upload file.');

            // Step 3: Upload the encrypted data
            await axios.put(storeResult.url, encryptedData, {
                headers: storeResult.headers
            });

            // Step 4: Register the upload
            const registerUploadResponse = await axios.post(`${STORACHA_HTTP_BRIDGE_URL}/upload/add`, {
                did: 'did:key:z6Mkabc123', // Replace with actual DID
                link: storeResult.link,
                root: 'CID of the encrypted data', // CID of the encrypted data, replace placeholder
                shards: [storeResult.link] // CID of the encrypted data, replace placeholder
            }, {
                headers: {
                    'X-Auth-Secret': authToken,
                    'Authorization': `Bearer ${authToken}`
                }
            });

            console.log('Data uploaded to Storacha successfully:', registerUploadResponse.data);
        }

        return storeResult.url;
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
    if (!STORACHA_HTTP_BRIDGE_URL) {
        throw new Error('Storacha HTTP Bridge URL not configured in environment variables');
    }

    try {
        // Step 1: Generate a token for downloading
        const generateTokenResponse = await axios.post(`${STORACHA_HTTP_BRIDGE_URL}/generate-token`, {
            did: 'did:key:z6Mkabc123' // Replace with actual DID
        });

        const authToken = generateTokenResponse.data.token;

        if (!authToken) throw new Error('No auth token returned from Storacha');

        // Step 2: Download the data
        const response = await axios.get(`${STORACHA_HTTP_BRIDGE_URL}/data/${cid}`, {
            headers: {
                'X-Auth-Secret': authToken,
                'Authorization': `Bearer ${authToken}`
            }
        });

        const encryptedData = response.data; // Adjust based on Storacha API response structure
        
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