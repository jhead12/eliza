// packages/plugin-filecoin/src/types.ts

import type { CID } from 'multiformats/cid';

export type FilecoinCID = CID;

type HashMap<K, V> = Map<K, V>;

export interface BackupMetadata {
    path?: string;
    encrypted?: boolean;
    compressionLevel?: number;
    size?: number;
}

export interface FilecoinBackupResult {
    cid: string;
    encrypted: boolean;
    success: boolean;
    metadata: {
        path: string | undefined; // Allow undefined
        encrypted: boolean | undefined; // Allow undefined
        compressionLevel?: number;
        size?: number;
    };
    data?: string | Uint8Array;
}

export interface RestoreOptions {
    backupPath: string;
    destinationPath?: string;
    decryptionKey?: string;
}



export interface PerformanceMetrics {
    responseTime: number;
    throughput: number;
    errorRate: number;
    latency: number;
    memoryUsage: number;
    cpuUtilization: number;
    networkTraffic: number;
    diskIO: number;
    backupSize?: number;
    uploadTime?: number;
    retrievalLatency?: number;
    cid?: string;
}

export interface BackupOptions {
    path: string;
    encrypted?: boolean;
}

export interface WasmBackupResult {
    success: boolean;
    metadata: {
        path: string;
        compressionLevel?: number;
        size?: number;
    };
}

export function convertWasmBackupResult(wasmResult: FilecoinBackupResult): FilecoinBackupResult {
    return {
        cid: 'mock-cid', // Updated later with real CID
        encrypted: wasmResult.metadata.encrypted ?? false, // Default to false if undefined
        success: wasmResult.success,
        metadata: {
            path: wasmResult.metadata.path ?? '', // Default to empty string if undefined
            encrypted: wasmResult.metadata.encrypted ?? false,
            compressionLevel: wasmResult.metadata.compressionLevel,
            size: wasmResult.metadata.size,
        },
    };
}

export interface FilecoinClient {
    storage: CID;
    upload(data: Uint8Array): Promise<string>;
    download(cid: string): Promise<Uint8Array>;
}

export interface ActorState {
    balance: number;
    accounts: HashMap<string, any>;
}

export interface Transfer {
    to: FilecoinCID;
    amount: number;
}

export interface Mint {
    to: FilecoinCID;
    amount: number;
}

export interface Burn {
    from: FilecoinCID;
    amount: number;
}

export interface SetData {
    key: string;
    value: Uint8Array;
}

export interface Delegate {
    from: FilecoinCID;
    to: FilecoinCID;
    permissions: Permissions;
}

export interface Revoke {
    from: FilecoinCID;
    to: FilecoinCID;
}

export interface BatchTransfer {
    transfers: Transfer[];
}

export interface QueryBalance {
    account: FilecoinCID;
}

export interface Vote {
    proposal_id: string;
    voter: FilecoinCID;
    support: boolean;
}

export interface Withdraw {
    from: FilecoinCID;
    amount: number;
}

export interface Custom {
    data: any;
}

export type Message =
    | { kind: 'Transfer'; payload: Transfer }
    | { kind: 'Mint'; payload: Mint }
    | { kind: 'Burn'; payload: Burn }
    | { kind: 'SetData'; payload: SetData }
    | { kind: 'Delegate'; payload: Delegate }
    | { kind: 'Revoke'; payload: Revoke }
    | { kind: 'BatchTransfer'; payload: BatchTransfer }
    | { kind: 'QueryBalance'; payload: QueryBalance }
    | { kind: 'Vote'; payload: Vote }
    | { kind: 'Withdraw'; payload: Withdraw }
    | { kind: 'Custom'; payload: Custom };

export interface Permissions {
    [key: string]: boolean | string | number;
}