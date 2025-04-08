// packages/plugin-filecoin/src/types.ts
import { CID } from 'multiformats/CID';

export type FilecoinCID = CID;

type HashMap<K, V> = Map<K, V>;

// Updated BackupMetadata to include cid
export interface BackupMetadata {
    path?: string;
    cid?: string;  // Added to match WASM expectations
    encrypted?: boolean;
    compressionLevel?: number;
    size?: number;
}

// Updated FilecoinBackupResult to ensure consistency
export interface FilecoinBackupResult {
    cid: string;  // Always required
    encrypted: boolean;  // Always required
    success: boolean;
    metadata: {
        path?: string;  // Made fully optional
        encrypted?: boolean;  // Made fully optional
        cid?: string;  // Added to match BackupMetadata
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

export interface WasmFilecoinBackupResult {
    success: boolean;
    metadata: {
        path?: string;
        cid?: string;
        encrypted?: boolean;
        compressionLevel?: number;
        size?: number;
    };
}

// Updated conversion function with proper defaults
export function convertWasmBackupResult(wasmResult: WasmFilecoinBackupResult): FilecoinBackupResult {
    return {
        cid: wasmResult.metadata.cid || 'mock-cid',  // Provide default if undefined
        encrypted: wasmResult.metadata.encrypted ?? false,  // Default to false
        success: wasmResult.success,
        metadata: {
            path: wasmResult.metadata.path,
            cid: wasmResult.metadata.cid,
            encrypted: wasmResult.metadata.encrypted ?? false,
            compressionLevel: wasmResult.metadata.compressionLevel,
            size: wasmResult.metadata.size,
        },
    };
}

// Rest of the interfaces remain unchanged...
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