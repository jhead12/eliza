// packages/plugin-filecoin/src/restore.ts

import { RestoreOptions } from './types';
import { filecoinRsRestoreFunction as wasmRestoreFunction } from './filecoin-rs-bindings';
import logger from './logs/logger';

export async function restoreFilecoin(options: RestoreOptions): Promise<boolean> {
    try {
        const success = await wasmRestoreFunction({
            backupPath: options.backupPath,
            destinationPath: options.destinationPath || 'restored_data',
            decryptionKey: options.decryptionKey
        });
        console.log(`Restored from ${options.backupPath} to ${options.destinationPath}: ${success}`);
        return success;
    } catch (error) {
        logger.error('Failed to restore Filecoin data:', error);
        throw error;
    }
}