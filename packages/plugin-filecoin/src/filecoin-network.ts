// packages/plugin-filecoin/src/filecoin-rs-bindings.ts

import { init, run as wasmRun, backup_data as wasmBackupData, restore_from_backup as wasmRestoreFromBackup, MyMachine } from '../filecoin-rs/pkg/filecoin_rs';
import fs from 'fs/promises';
import { BackupMetadata as WasmBackupMetadata, FilecoinBackupResult as WasmFilecoinBackupResult } from '../filecoin-rs/pkg/filecoin_rs';
import { RestoreOptions, FilecoinBackupResult } from './types';
import { decrypt, encrypt, ENCRYPTION_KEY } from './encryption';
import { downloadFromStoracha } from './database/storacha';

function convertWasmBackupResult(wasmResult: WasmFilecoinBackupResult): FilecoinBackupResult {
    return {
        success: wasmResult.success,
        metadata: {
            path: wasmResult.metadata.path,
            encrypted: wasmResult.metadata.encrypted,
            compressionLevel: wasmResult.metadata.compressionLevel,
            size: wasmResult.metadata.size
        }
    };
}

export class FilecoinRsBindings {
    static async initialize(): Promise<void> {
        try {
            await init();
            console.log('WASM module initialized');
        } catch (error) {
            console.error('Failed to initialize WASM module:', error);
            throw error;
        }
    }

    static async backupDataLocal({
        path = 'backup.bin',
        encrypted = false,
        data = 'Default backup data'
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

            await fs.writeFile(path, backupData);
            result.metadata.path = path;

            return result;
        } catch (error) {
            console.error('Backup failed:', error);
            return {
                success: false,
                metadata: {
                    path,
                    encrypted,
                    compressionLevel: undefined,
                    size: undefined
                },
                data: undefined
            };
        }
    }

    static async restoreFromBackup({
        backupPath,
        destinationPath = 'restored_data',
        decryptionKey
    }: RestoreOptions): Promise<boolean> {
        try {
            let dataToRestore: Uint8Array;

            if (backupPath.startsWith('ipfs://') || backupPath.startsWith('filecoin://')) {
                const cid = backupPath.split('://')[1];
                dataToRestore = await downloadFromStoracha(cid);
            } else {
                dataToRestore = await fs.readFile(backupPath);
            }

            if (decryptionKey) {
                dataToRestore = decrypt(dataToRestore, Buffer.from(decryptionKey, 'hex'));
            } else if (dataToRestore.length > 16) {
                dataToRestore = decrypt(dataToRestore);
            }

            wasmRestoreFromBackup(backupPath, destinationPath, decryptionKey || null);
            await fs.access(destinationPath);
            console.log(`Restored data to ${destinationPath}`);
            return true;
        } catch (error) {
            console.error('Restore failed:', error);
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