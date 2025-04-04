import { init, run as wasmRun, backup_data as wasmBackupData, restore_from_backup as wasmRestoreFromBackup, MyMachine } from '../filecoin-rs/pkg/filecoin_rs';
import fs from 'fs/promises';
import { storagePlugin } from '@storacha/elizaos-plugin';
import { BackupMetadata as WasmBackupMetadata, FilecoinBackupResult as WasmFilecoinBackupResult } from '../filecoin-rs/pkg/filecoin_rs';
import { RestoreOptions, FilecoinBackupResult } from './types';
import { decrypt, encrypt } from './encryption';
import { downloadFromStoracha } from './database/storacha';
import logger from './logs/logger';
import * as dotenv from 'dotenv';

dotenv.config();

export const getFilecoinClient = () => new storagePlugin({ token: process.env.FILECOIN_API_TOKEN || '' });

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
            throw error;
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
            throw error;
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
            return {
                cid: '',
                encrypted,
                success: false,
                metadata: {
                    path,
                    encrypted,
                    compressionLevel: undefined,
                    size: undefined,
                },
                data: undefined,
            };
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
            return false;
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