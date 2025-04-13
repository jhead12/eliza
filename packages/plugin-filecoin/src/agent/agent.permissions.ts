import { injectable, inject } from 'tsyringe';
import uuidv4 from 'uuid/v4'; // Dependency injection
import { validate } from 'class-validator'; // For data validation
import { plainToClass } from 'class-transformer';

// Configuration interface
interface StorageConfig {
  encryptionAlgorithm: string;
  maxRetryAttempts: number;
  retryDelayMs: number;
}

// Data validation classes
export class AudioAssetDTO {
  id!: string;
  data!: string;
  name!: string;
  type!: string;
  ownerId!: string;
  createdAt!: number;
}

export class CommMessageDTO {
  senderId!: string;
  recipientId!: string;
  assetId!: string;
  message!: string;
  timestamp!: number;
}

// Default mock client for testing
const defaultFilecoinClient: FilecoinClient = {
  upload: async (data: Uint8Array): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
    return uuidv4();
  },
  download: async (id: string): Promise<Uint8Array> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return new Uint8Array(Buffer.from('mock data'));
  },
};

// Utility functions with proper error handling
const encryptData = (data: string, algorithm = 'AES-GCM'): Uint8Array => {
  try {
    return new TextEncoder().encode(data);
    // Add real encryption implementation here (e.g., Web Crypto API)
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const decryptData = (data: Uint8Array): string => {
  try {
    return new TextDecoder().decode(data);
    // Add real decryption implementation here
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

@injectable()
export class AgentStorage {
  private readonly config: StorageConfig;

  constructor(
    @inject('FilecoinClient') private readonly client: FilecoinClient,
    @inject('Logger') private readonly logger: Logger,
    config: StorageConfig = {
      encryptionAlgorithm: 'AES-GCM',
      maxRetryAttempts: 3,
      retryDelayMs: 1000,
    }
  ) {
    this.config = config;
  }

  private async withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= this.config.maxRetryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`${operationName} failed (attempt ${attempt}/${this.config.maxRetryAttempts}): ${lastError.message}`);
        if (attempt < this.config.maxRetryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
        }
      }
    }
    throw new Error(`${operationName} failed after ${this.config.maxRetryAttempts} attempts: ${lastError?.message}`);
  }

  async upload(data: string): Promise<string> {
    return this.withRetry(async () => {
      const encryptedData = encryptData(data, this.config.encryptionAlgorithm);
      const storageId = await this.client.upload(encryptedData);
      this.logger.info('File uploaded successfully', { storageId });
      return storageId;
    }, 'Storage upload');
  }

  async download(storageId: string): Promise<string> {
    return this.withRetry(async () => {
      const data = await this.client.download(storageId);
      const decrypted = decryptData(data);
      this.logger.info('File downloaded successfully', { storageId });
      return decrypted;
    }, 'Storage download');
  }

  async backup(data: string, path: string): Promise<FilecoinBackupResult> {
    return this.withRetry(async () => {
      const result = await filecoinRsBindings.backupDataLocal({
        path,
        encrypted: true,
        data: encryptData(data, this.config.encryptionAlgorithm).toString('hex'),
      });
      this.logger.info('Backup completed', { path: result.metadata.path });
      return result;
    }, 'Backup operation');
  }

  async restore(backupPath: string, destinationPath: string, decryptionKey: string): Promise<boolean> {
    return this.withRetry(async () => {
      const success = await filecoinRsBindings.filecoinRsRestoreFunction({
        backupPath,
        destinationPath,
        decryptionKey,
      });
      this.logger.info('Restore completed', { backupPath, destinationPath, success });
      return success;
    }, 'Restore operation');
  }

  async storeAudioAsset(asset: Omit<AudioAssetDTO, 'id' | 'createdAt'>): Promise<AudioAssetDTO> {
    const audioAsset = plainToClass(AudioAssetDTO, {
      ...asset,
      id: uuidv4(),
      createdAt: Date.now(),
    });

    const errors = await validate(audioAsset);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.map(e => e.toString()).join(', ')}`);
    }

    const assetData = JSON.stringify(audioAsset);
    const storageId = await this.upload(assetData);
    this.logger.info('Audio asset stored', { name: asset.name, storageId });
    return audioAsset;
  }

  async getAudioAsset(storageId: string): Promise<AudioAssetDTO> {
    const data = await this.download(storageId);
    const asset = plainToClass(AudioAssetDTO, JSON.parse(data));
    const errors = await validate(asset);
    if (errors.length > 0) {
      throw new Error(`Invalid audio asset data: ${errors.map(e => e.toString()).join(', ')}`);
    }
    return asset;
  }

  async storeCommMessage(message: Omit<CommMessageDTO, 'timestamp'>): Promise<string> {
    const commMessage = plainToClass(CommMessageDTO, {
      ...message,
      timestamp: Date.now(),
    });

    const errors = await validate(commMessage);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.map(e => e.toString()).join(', ')}`);
    }

    const messageData = JSON.stringify(commMessage);
    const storageId = await this.upload(messageData);
    this.logger.info('Communication message stored', { assetId: message.assetId, storageId });
    return storageId;
  }
}

// Export instance with default client for convenience
export const storage = new AgentStorage(defaultFilecoinClient, logger);