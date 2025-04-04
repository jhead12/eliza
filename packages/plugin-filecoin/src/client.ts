// packages/plugin-filecoin/src/client.ts

import { getFilecoinClient } from './filecoin-rs-bindings';


const filecoinClient = getFilecoinClient();

/**
 * Connects to the Filecoin network.
 */
export async function connectToFilecoin(): Promise<void> {
    try {
        const success = await filecoinClient.connect();
        if (!success) throw new Error('Connection failed');
        console.log('Connected to Filecoin network');
    } catch (error) {
        console.error('Failed to connect to Filecoin network:', error);
        throw error;
    }
}

/**
 * Checks if connected to the Filecoin network.
 * @returns True if connected, false otherwise.
 */
export async function checkFilecoinConnection(): Promise<boolean> {
    try {
        return await filecoinClient.isConnected();
    } catch (error) {
        console.error('Failed to check Filecoin connection:', error);
        return false;
    }
}