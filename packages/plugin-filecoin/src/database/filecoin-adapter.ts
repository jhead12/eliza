import { DatabaseAdapter } from '@elizaos/core';
import type { Account, Goal, Memory, UUID } from '@elizaos/core';
import fs from 'fs/promises';
import path from 'path';
import { StorageProvider } from './storage';

class NotImplementedError extends Error {
    constructor(method: string) {
        super(`${method} is not implemented in FilecoinDatabaseAdapter`);
        this.name = 'NotImplementedError';
    }
}

export class FilecoinDatabaseAdapter extends DatabaseAdapter<any> {
    private storage: StorageProvider;
    private baseDir: string;

    constructor(storageProvider: StorageProvider) {
        super({
            failureThreshold: 5,
            resetTimeout: 60000,
            halfOpenMaxAttempts: 3,
        });
        this.storage = storageProvider;
        this.db = {}; // Placeholder
        this.baseDir = path.resolve(__dirname, '../../backup');
    }

    async init(): Promise<void> {
        await fs.mkdir(this.baseDir, { recursive: true });
        console.log('FilecoinDatabaseAdapter initialized');
    }

    async close(): Promise<void> {
        console.log('FilecoinDatabaseAdapter closed');
    }

    async getAccountById(userId: UUID): Promise<Account | null> {
        return this.withCircuitBreaker(async () => {
            const cid = await this.getCidForKey(`account:${userId}`);
            if (!cid) return null;
            const data = await this.storage.download(cid);
            return JSON.parse(Buffer.from(data).toString('utf8')) as Account;
        }, `getAccountById(${userId})`);
    }

    async createAccount(account: Account): Promise<boolean> {
        return this.withCircuitBreaker(async () => {
            const data = JSON.stringify(account);
            const cid = await this.storage.upload(Buffer.from(data).toString('hex'));
            await this.storeCidForKey(`account:${account.id}`, cid);
            return true;
        }, `createAccount(${account.id})`);
    }
    // Added Provenance tracking - when creating emories
    async createMemory(memory: Memory, tableName: string, unique?: boolean): Promise<void> {
        return this.withCircuitBreaker(async () => {
            const data = JSON.stringify(memory);
            const cid = await this.storage.upload(Buffer.from(data).toString('hex'));
    
            // Track provenance
            const lineage = {
                cid,
                origin: `memory:${tableName}`,
                creator: memory.userId || 'unknown',
                created_at: Date.now(),
                type: "text"
            };
            const lineageData = JSON.stringify(lineage);
            const lineageCid = await this.storage.upload(Buffer.from(lineageData).toString('hex'));
            await this.storeCidForKey(`lineage:${cid}`, lineageCid);
    
            await this.storeCidForKey(`memory:${tableName}:${memory.id}`, cid);
        }, `createMemory(${memory.id})`);
    }

    async getMemoryById(id: UUID): Promise<Memory | null> {
        return this.withCircuitBreaker(async () => {
            const cid = await this.getCidForKey(`memory:*:${id}`);
            if (!cid) return null;
            const data = await this.storage.download(cid);
            return JSON.parse(Buffer.from(data).toString('utf8')) as Memory;
        }, `getMemoryById(${id})`);
    }

    async createGoal(goal: Goal): Promise<void> {
        return this.withCircuitBreaker(async () => {
            const data = JSON.stringify(goal);
            const cid = await this.storage.upload(Buffer.from(data).toString('hex'));
            await this.storeCidForKey(`goal:${goal.id}`, cid);
        }, `createGoal(${goal.id})`);
    }

    async getGoals(params: {
        agentId: UUID;
        roomId: UUID;
        userId?: UUID | null;
        onlyInProgress?: boolean;
        count?: number;
    }): Promise<Goal[]> {
        return this.withCircuitBreaker(async () => {
            const cids = await this.listCidsForPrefix(`goal:`);
            const goals: Goal[] = [];
            for (const cid of cids) {
                const data = await this.storage.download(cid);
                const goal = JSON.parse(Buffer.from(data).toString('utf8')) as Goal;
                if (goal.agentId === params.agentId && goal.roomId === params.roomId) {
                    if (params.onlyInProgress && goal.status !== 'IN_PROGRESS') continue;
                    if (params.userId && goal.userId !== params.userId) continue;
                    goals.push(goal);
                }
            }
            return params.count ? goals.slice(0, params.count) : goals;
        }, `getGoals(${params.agentId}, ${params.roomId})`);
    }

    private async storeCidForKey(key: string, cid: string): Promise<void> {
        const filePath = path.join(this.baseDir, `${key}.cid`);
        await fs.writeFile(filePath, cid, 'utf8');
    }

    private async getCidForKey(key: string): Promise<string | null> {
        const filePath = path.join(this.baseDir, `${key}.cid`);
        try {
            return await fs.readFile(filePath, 'utf8');
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
            throw err;
        }
    }

    private async listCidsForPrefix(prefix: string): Promise<string[]> {
        const files = await fs.readdir(this.baseDir);
        const cids: string[] = [];
        for (const file of files) {
            if (file.startsWith(prefix)) {
                const cid = await fs.readFile(path.join(this.baseDir, file), 'utf8');
                cids.push(cid);
            }
        }
        return cids;
    }

    // Stubbed methods (implement as needed)
    async getMemories(params: any): Promise<Memory[]> { throw new NotImplementedError('getMemories'); }
    async getMemoriesByRoomIds(params: any): Promise<Memory[]> { throw new NotImplementedError('getMemoriesByRoomIds'); }
    async getMemoriesByIds(memoryIds: UUID[], tableName?: string): Promise<Memory[]> { throw new NotImplementedError('getMemoriesByIds'); }
    async getCachedEmbeddings(params: any): Promise<any[]> { throw new NotImplementedError('getCachedEmbeddings'); }
    async log(params: any): Promise<void> { throw new NotImplementedError('log'); }
    async getActorDetails(params: any): Promise<any[]> { throw new NotImplementedError('getActorDetails'); }
    async searchMemories(params: any): Promise<Memory[]> { throw new NotImplementedError('searchMemories'); }
    async updateGoalStatus(params: any): Promise<void> { throw new NotImplementedError('updateGoalStatus'); }
    async searchMemoriesByEmbedding(embedding: number[], params: any): Promise<Memory[]> { throw new NotImplementedError('searchMemoriesByEmbedding'); }
    async removeMemory(memoryId: UUID, tableName: string): Promise<void> { throw new NotImplementedError('removeMemory'); }
    async removeAllMemories(roomId: UUID, tableName: string): Promise<void> { throw new NotImplementedError('removeAllMemories'); }
    async countMemories(roomId: UUID, unique?: boolean, tableName?: string): Promise<number> { throw new NotImplementedError('countMemories'); }
    async updateGoal(goal: Goal): Promise<void> { throw new NotImplementedError('updateGoal'); }
    async removeGoal(goalId: UUID): Promise<void> { throw new NotImplementedError('removeGoal'); }
    async removeAllGoals(roomId: UUID): Promise<void> { throw new NotImplementedError('removeAllGoals'); }
    async getRoom(roomId: UUID): Promise<UUID | null> { throw new NotImplementedError('getRoom'); }
    async createRoom(roomId?: UUID): Promise<UUID> { throw new NotImplementedError('createRoom'); }
    async removeRoom(roomId: UUID): Promise<void> { throw new NotImplementedError('removeRoom'); }
    async getRoomsForParticipant(userId: UUID): Promise<UUID[]> { throw new NotImplementedError('getRoomsForParticipant'); }
    async getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]> { throw new NotImplementedError('getRoomsForParticipants'); }
    async addParticipant(userId: UUID, roomId: UUID): Promise<boolean> { throw new NotImplementedError('addParticipant'); }
    async removeParticipant(userId: UUID, roomId: UUID): Promise<boolean> { throw new NotImplementedError('removeParticipant'); }
    async getParticipantsForAccount(userId: UUID): Promise<any[]> { throw new NotImplementedError('getParticipantsForAccount'); }
    async getParticipantsForRoom(roomId: UUID): Promise<UUID[]> { throw new NotImplementedError('getParticipantsForRoom'); }
    async getParticipantUserState(roomId: UUID, userId: UUID): Promise<"FOLLOWED" | "MUTED" | null> { throw new NotImplementedError('getParticipantUserState'); }
    async setParticipantUserState(roomId: UUID, userId: UUID, state: "FOLLOWED" | "MUTED" | null): Promise<void> { throw new NotImplementedError('setParticipantUserState'); }
    async createRelationship(params: any): Promise<boolean> { throw new NotImplementedError('createRelationship'); }
    async getRelationship(params: any): Promise<any | null> { throw new NotImplementedError('getRelationship'); }
    async getRelationships(params: any): Promise<any[]> { throw new NotImplementedError('getRelationships'); }
    async getKnowledge(params: any): Promise<any[]> { throw new NotImplementedError('getKnowledge'); }
    async searchKnowledge(params: any): Promise<any[]> { throw new NotImplementedError('searchKnowledge'); }
    async createKnowledge(knowledge: any): Promise<void> { throw new NotImplementedError('createKnowledge'); }
    async removeKnowledge(id: UUID): Promise<void> { throw new NotImplementedError('removeKnowledge'); }
    async clearKnowledge(agentId: UUID, shared?: boolean): Promise<void> { throw new NotImplementedError('clearKnowledge'); }
}