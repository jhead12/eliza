// src/index.ts
import { initialize, run, backupDataLocal, filecoinRsRestoreFunction } from './filecoin-rs-bindings';
import fs from 'fs/promises';
import path from 'path';
import { encrypt, decrypt } from './encryption';
import { connectToFilecoin, checkFilecoinConnection } from './database/filecoin';
import { StorachaStorage } from './database/storacha-storage';
// import { Web3StorageProvider } from './database/web3-storage';
import { FilecoinDatabaseAdapter } from './database/filecoin-adapter';
import { v4 as uuidv4 } from 'uuid';
import { AgentRuntime } from '@elizaos/core'; // Adjust import based on actual path
import logger from './logs/logger'; // Import the logger
import 'dotenv/config';

// Modular storage setup
function getStorageProvider(): StorachaStorage {
    const storageType = process.env.STORAGE_TYPE || 'storacha';
    // if (storageType === 'web3.storage') {
    //     const token = process.env.WEB3_STORAGE_TOKEN;
    //     if (!token) throw new Error('WEB3_STORAGE_TOKEN is required for web3.storage');
    //     return new Web3StorageProvider(token);
    // }
    return new StorachaStorage();
}

// Initialize AgentRuntime with FilecoinDatabaseAdapter
async function initializeAgentRuntime(db: FilecoinDatabaseAdapter): Promise<AgentRuntime> {
    const character = {
        id: 'agent-123',
        name: 'FilecoinAgent',
        username: 'filecoin',
        bio: 'An agent managing Filecoin storage',
        settings: {},
        plugins: [],
        modelProvider: 'OLLAMA' as const,
        lore: 'Default lore', // Add default value
        messageExamples: [], // Add default value
        postExamples: [], // Add default value
        topics: [], // Add default value
        // Add any other missing properties with default values
    };
    const runtime = new AgentRuntime({
        token: process.env.AGENT_TOKEN || 'default-token',
        serverUrl: 'http://localhost:7998',
        character: {
            conversationLength: undefined,
            agentId: uuidv4(),
            character: character,
            token: process.env.AGENT_TOKEN || 'default-token',
            serverUrl: 'http://localhost:7998',
            logging: true,
            actions: [], // Optional custom actions
            evaluators: [], // Optional custom evaluators
            plugins: [],
            providers: [],
            services: [],// Map of service name to service instance
            managers: [], // Map of table name to memory manager
            databaseAdapter: db,// The database adapter used for interacting with the database
            // Add any other missing properties with default values
    }
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
    const requiredEnvVars = ['STORACHA_API_TOKEN', 'FILECOIN_RPC_URL', 'DECRYPTION_KEY'];
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
    const encryptedData = encrypt(dataToBackup);

    // Check Filecoin connection
    const isConnected = await checkFilecoinConnection();
    logger.info('Is connected to Filecoin network?', isConnected);

    // Upload to storage
    let storageDataId: string | undefined;
    try {
        storageDataId = await storage.upload(encryptedData.toString());
        logger.info('Data uploaded with ID:', storageDataId);
    } catch (error) {
        logger.error('Failed to upload data:', error);
    }

    // Download and verify
    if (storageDataId) {
        try {
            const downloadedData = await storage.download(storageDataId);
            const decryptedData = decrypt(downloadedData, Buffer.from(process.env.DECRYPTION_KEY!, 'hex'));
            logger.info('Data downloaded:', Buffer.from(downloadedData).toString('utf8'));
            logger.info('Decrypted data matches original?', Buffer.from(decryptedData).toString('utf8') === dataToBackup);
        } catch (error) {
            logger.error('Failed to download or decrypt data:', error);
        }
    } else {
        logger.warn('Skipping download due to missing data ID');
    }

    // Example: Use the adapter with UUIDs from AgentRuntime
    try {
        await db.createMemory(
            {
                id: runtime.agentId,
                agentId: runtime.agentId,
                roomId: uuidv4(), // Generate a UUID for roomId
                content: { text: dataToBackup },
                embedding: [],
                createdAt: Date.now(), // Use createdAt instead of created
                userId: uuidv4()  // Generate a UUID for userId
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
            data: dataToBackup
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
            decryptionKey: process.env.DECRYPTION_KEY!
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