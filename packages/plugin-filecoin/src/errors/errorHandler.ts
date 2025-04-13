import { init, run as wasmRun, backup_data as wasmBackupData, restore_from_backup as wasmRestoreFromBackup, MyMachine } from '../../filecoin-rs/pkg/filecoin_rs';
import fs from 'fs/promises';
import { storagePlugin } from '@storacha/elizaos-plugin';
import { BackupMetadata as WasmBackupMetadata, type FilecoinBackupResult as WasmFilecoinBackupResult } from '../../filecoin-rs/pkg/filecoin_rs';
import type { RestoreOptions, FilecoinBackupResult } from '../types';
import { decrypt, encrypt } from '../encryption';
import { downloadFromStoracha } from '../database/storacha';
import logger from '../logger';
import * as dotenv from 'dotenv';

dotenv.config();

// Define an interface for the Filecoin client
interface FilecoinClient {
  put(files: File[]): Promise<string>; // Adjust return type if needed (e.g., CID)
  get(cid: string): Promise<{ files(): Promise<{ arrayBuffer(): Promise<ArrayBuffer> }[]> }>; // Adjust based on actual API
}

// Initialize Filecoin client
export const getFilecoinClient = (): FilecoinClient => {
  // TODO: Replace with actual initialization logic from @storacha/elizaos-plugin
  // Example: return storagePlugin.create({ token: process.env.FILECOIN_API_TOKEN || '' });
  // For now, throw an error with a note to implement this
  throw new Error('storagePlugin initialization not implemented. Please refer to @storacha/elizaos-plugin documentation.');
  
  // If you have the correct initialization, it might look like this:
  // return storagePlugin.create({ token: process.env.FILECOIN_API_TOKEN || '' });
};

const ERROR_CODES = {
  INIT_FAILED: 'INIT_FAILED',
  BATCH_DOWNLOAD_FAILED: 'BATCH_DOWNLOAD_FAILED',
  BACKUP_DATA_LOCAL_FAILED: 'BACKUP_DATA_LOCAL_FAILED',
  RESTORE_FROM_BACKUP_FAILED: 'RESTORE_FROM_BACKUP_FAILED',
};

export function convertWasmBackupResult(wasmResult: WasmFilecoinBackupResult): FilecoinBackupResult {
  return {
    cid: 'mock-cid', // Updated later with real CID
    encrypted: wasmResult.metadata.encrypted ?? false,
    success: wasmResult.success,
    metadata: {
      path: wasmResult.metadata.path ?? '',
      encrypted: wasmResult.metadata.encrypted ?? false,
      compressionLevel: wasmResult.metadata.compressionLevel,
      size: wasmResult.metadata.size,
    },
  };
}

export class FilecoinRsBindings {
  static async initialize(): Promise<void> {
    try {
      await init();
      logger.info('WASM module initialized');
    } catch (error) {
      logger.error(`Failed to initialize WASM module: ${error}`);
      throw new Error(ERROR_CODES.INIT_FAILED);
    }
  }

  static async batch_download(cids: string[]): Promise<Uint8Array[]> {
    try {
      const machine = new MyMachine(1024);
      const results: Uint8Array[] = [];
      for (const cid of cids) {
        const data = await machine.retrieve_data(cid);
        results.push(data);
      }
      logger.info(`Batch downloaded ${cids.length} items`);
      return results;
    } catch (error) {
      logger.error(`Batch download failed: ${error}`);
      throw new Error(ERROR_CODES.BATCH_DOWNLOAD_FAILED);
    }
  }

  static async backupDataLocal({
    path = 'backup.bin',
    encrypted = false,
    data = 'Default backup data',
  }: {
    path?: string;
    encrypted?: boolean;
    data?: string | Uint8Array;
  } = {}): Promise<FilecoinBackupResult> {
    try {
      const inputString = typeof data === 'string' ? data : Buffer.from(data).toString('utf8');
      const backupData = encrypted ? encrypt(inputString) : Buffer.from(inputString);

      const wasmResult = wasmBackupData(backupData);
      const result = convertWasmBackupResult(wasmResult);

      const client = getFilecoinClient();
      const blob = new Blob([backupData], { type: 'application/octet-stream' });
      const file = new File([blob], path);
      const cid = await client.put([file]);

      await fs.writeFile(path, backupData);
      logger.info(`Backup successful. CID: ${cid}, Path: ${path}`);
      return { ...result, cid, encrypted, data: backupData };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Backup failed: ${errorMsg}`);
      throw new Error(ERROR_CODES.BACKUP_DATA_LOCAL_FAILED);
    }
  }

  static async restoreFromBackup({
    backupPath,
    destinationPath = 'restored_data',
    decryptionKey,
  }: RestoreOptions): Promise<boolean> {
    try {
      let dataToRestore: Uint8Array;

      if (backupPath.startsWith('ipfs://') || backupPath.startsWith('filecoin://')) {
        const cid = backupPath.split('://')[1];
        const client = getFilecoinClient();
        const res = await client.get(cid);
        const files = await res.files();
        dataToRestore = new Uint8Array(await files[0].arrayBuffer());
      } else {
        dataToRestore = await fs.readFile(backupPath);
      }

      if (decryptionKey) {
        dataToRestore = decrypt(dataToRestore, Buffer.from(decryptionKey, 'hex'));
      } else if (dataToRestore.length > 16) {
        dataToRestore = decrypt(dataToRestore);
      }

      wasmRestoreFromBackup(backupPath, destinationPath, decryptionKey || null);
      await fs.writeFile(destinationPath, dataToRestore);
      logger.info(`Restored data to ${destinationPath}`);
      return true;
    } catch (error) {
      logger.error(`Restore failed: ${error}`);
      throw new Error(ERROR_CODES.RESTORE_FROM_BACKUP_FAILED);
    }
  }

  static async storeDataWithMachine(data: Uint8Array): Promise<string> {
    const machine = new MyMachine(1024);
    return machine.store_data(data);
  }

  static async retrieveDataWithMachine(cid: string): Promise<Uint8Array> {
    const machine = new MyMachine(1024);
    return machine.retrieve_data(cid);
  }
}

export const run = wasmRun;
export const backupDataLocal = FilecoinRsBindings.backupDataLocal;
export const filecoinRsRestoreFunction = FilecoinRsBindings.restoreFromBackup;
export const initialize = FilecoinRsBindings.initialize;
export const batchDownload = FilecoinRsBindings.batch_download;