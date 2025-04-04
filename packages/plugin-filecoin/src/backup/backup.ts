// packages/plugin-filecoin/src/backup.ts

import { BackupOptions, FilecoinBackupResult } from '../types';
import { backupDataLocal as wasmBackupDataLocal } from '../filecoin-rs-bindings';
import logger from '../logs/logger';

export async function backupFilecoin(options: BackupOptions): Promise<FilecoinBackupResult> {
    try {
        const result = await wasmBackupDataLocal({
            path: options.path,
            encrypted: options.encrypted || false
        });
        console.log('Backup Success:', result.success, 'Path:', result.metadata.path);
        return result;
    } catch (error) {
        logger.error('Failed to backup Filecoin data:', error);
        throw error;
    }
}