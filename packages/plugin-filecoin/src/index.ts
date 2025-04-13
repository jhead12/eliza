import { initialize, run, backupDataLocal, filecoinRsRestoreFunction } from './filecoin-rs-bindings';
import fs from 'fs/promises';
import path from 'path';
import { encrypt, decrypt } from './encryption';
import { connectToFilecoin, checkFilecoinConnection } from './database/filecoin';
import { StorachaStorage } from './database/storacha-storage';
import { FilecoinDatabaseAdapter } from './database/filecoin-adapter';
import { v4 as uuidv4 } from 'uuid';
import { AgentRuntime, type Character, ModelProviderName } from '@elizaos/core';
import logger from './logger';
import 'dotenv/config';

// Define UUID type for clarity
type UUID = `${string}-${string}-${string}-${string}-${string}`;

// Modular storage setup
function getStorageProvider(): StorachaStorage {
    const storageType = process.env.STORAGE_TYPE || 'storacha';
    return new StorachaStorage();
}

// Initialize AgentRuntime with FilecoinDatabaseAdapter
async function initializeAgentRuntime(db: FilecoinDatabaseAdapter): Promise<AgentRuntime> {
    const character: Character = {
        id: uuidv4() as UUID,
        name: 'FilecoinAgent',
        username: 'filecoin',
        modelProvider: ModelProviderName.OLLAMA,
        bio: 'An agent managing Filecoin storage and backups',
        lore: ['Default lore about Filecoin integration'],
        messageExamples: [],
        postExamples: [],
        topics: ['filecoin', 'storage', 'backup'],
        adjectives: ['helpful', 'reliable'],
        plugins: [],
        style: {
            all: ['professional', 'concise'],
            chat: ['friendly'],
            post: ['informative'],
        },
        settings: {},
    };

    const runtime = new AgentRuntime({
        token: process.env.AGENT_TOKEN || 'default-token',
        modelProvider: ModelProviderName.OLLAMA,
        character,
        databaseAdapter: db,
    });

    await runtime.initialize();
    return runtime;
}

// Utility to ensure a directory exists
async function ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
        await fs.mkdir(dirPath, { recursive: true });
        logger.info(`Directory ensured: ${dirPath}`);
    } catch (err) {
        const errnoErr = err as NodeJS.ErrnoException;
        if (errnoErr.code !== 'EEXIST') {
            throw err;
        }
    }
}

async function main(): Promise<void> {
    // Validate environment variables
    const requiredEnvVars = ['STORACHA_API_TOKEN', 'FILECOIN_RPC_URL', 'ENCRYPTION_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Initialize storage and database
    const storage = getStorageProvider();
    const db = new FilecoinDatabaseAdapter(storage);
    await db.init();

    // Initialize AgentRuntime
    const runtime = await initializeAgentRuntime(db);

    await initialize(); // Initialize WebAssembly module

    // Connect to Filecoin network
    try {
        await connectToFilecoin();
        logger.info('Connected to Filecoin network');
    } catch (error) {
        logger.error('Failed to connect to Filecoin network:', error);
    }

    // Define paths
    const backupDir = path.resolve(__dirname, process.env.BACKUP_DIR || '../backup');
    const backupPath = path.join(backupDir, process.env.BACKUP_SUBPATH || 'backup.bin');
    const destinationPath = path.resolve(__dirname, process.env.DESTINATION_PATH || '../public');

    // Ensure directories exist
    await ensureDirectoryExists(backupDir);
    await ensureDirectoryExists(destinationPath);

    // Example: Backup and encrypt data
    const dataToBackup = process.env.DATA_TO_BACKUP || 'Default sensitive data';
    const encryptedData = Buffer.from(encrypt(dataToBackup)).toString('hex'); // Hex string for storage.upload

    // Check Filecoin connection
    const isConnected = await checkFilecoinConnection();
    logger.info('Is connected to Filecoin network?', isConnected);

    // Upload to Storacha
    let storageDataId: string | undefined;
    try {
        storageDataId = await storage.upload(encryptedData); // Upload hex-encoded encrypted data
        logger.info('Data uploaded with ID:', storageDataId);
    } catch (error) {
        logger.error('Failed to upload data:', error);
    }

    // Download and verify
    if (storageDataId) {
        try {
            const downloadedData = await storage.download(storageDataId); // Uint8Array from Storacha
            const decryptedData = decrypt(downloadedData); // Decrypt Uint8Array directly
            const decryptedString = new TextDecoder().decode(decryptedData); // Convert to string for comparison
            logger.info('Data downloaded (hex):', Buffer.from(downloadedData).toString('hex'));
            logger.info('Decrypted data matches original?', decryptedString === dataToBackup);
        } catch (error) {
            logger.error('Failed to download or decrypt data:', error);
        }
    } else {
        logger.warn('Skipping download due to missing data ID');
    }

    // Generate roomId and userId with proper typing
    const roomId: UUID = uuidv4() as UUID;
    const userId: UUID = uuidv4() as UUID;

    // Example: Use the adapter with UUIDs from AgentRuntime
    try {
        await db.createMemory(
            {
                id: runtime.agentId,
                agentId: runtime.agentId,
                roomId,
                content: { text: dataToBackup }, // Plaintext stored in memory
                embedding: [],
                createdAt: Date.now(),
                userId,
            },
            'memories'
        );
        logger.info('Memory created in FilecoinDatabaseAdapter with runtime UUIDs');
    } catch (error) {
        logger.error('Failed to create memory:', error);
    }

    // Execute WebAssembly backup
    try {
        const backupResult = await backupDataLocal({
            path: backupPath,
            encrypted: true,
            data: dataToBackup,
        });
        logger.info('Backup Success:', backupResult.success, 'Path:', backupResult.metadata.path);
    } catch (error) {
        logger.error('Backup failed:', error);
    }

    // Restore from backup
    try {
        const restoreSuccess = await filecoinRsRestoreFunction({
            backupPath,
            destinationPath,
            decryptionKey: process.env.ENCRYPTION_KEY!, // Hex string for WASM
        });
        logger.info(`Restored from ${backupPath} to ${destinationPath}: ${restoreSuccess}`);
    } catch (error) {
        logger.error('Restore failed:', error);
    }

    run(); // Optional WASM run
}

main().catch((err: Error) => logger.error('Error:', err));

// Export for module use
export { run, backupDataLocal, filecoinRsRestoreFunction };