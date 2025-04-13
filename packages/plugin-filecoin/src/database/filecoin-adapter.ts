import { DatabaseAdapter, type IDatabaseAdapter } from '@elizaos/core';
import type { Account, Goal, Memory, Participant, Relationship, RAGKnowledgeItem, UUID } from '@elizaos/core';
import fs from 'fs/promises';
import path from 'path';
import type { StorageProvider } from './storage';
import { v4 as uuidv4 } from 'uuid';

class NotImplementedError extends Error {
    constructor(method: string) {
        super(`${method} is not implemented in FilecoinDatabaseAdapter`);
        this.name = 'NotImplementedError';
    }
}

export class FilecoinDatabaseAdapter extends DatabaseAdapter<any> implements IDatabaseAdapter {
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
            return JSON.parse(new TextDecoder().decode(data)) as Account;
        }, `getAccountById(${userId})`);
    }

    async createAccount(account: Account): Promise<boolean> {
        return this.withCircuitBreaker(async () => {
            const data = new TextEncoder().encode(JSON.stringify(account));
            const cid = await this.storage.upload(Buffer.from(data).toString('hex'));
            await this.storeCidForKey(`account:${account.id}`, cid);
            return true;
        }, `createAccount(${account.id})`);
    }

    async createMemory(memory: Memory, tableName: string, unique?: boolean): Promise<void> {
        return this.withCircuitBreaker(async () => {
            const plaintext = JSON.stringify(memory);
            const encryptedData = encrypt(plaintext); // Encrypt to Uint8Array
            const encryptedHex = Buffer.from(encryptedData).toString('hex'); // Convert to hex string
            const cid = await this.storage.upload(encryptedHex);
    
            // Track provenance
            const lineage = {
                cid,
                origin: `memory:${tableName}`,
                creator: memory.userId || 'unknown',
                created_at: Date.now(),
                type: 'text',
            };
            const lineageData = new TextEncoder().encode(JSON.stringify(lineage));
            const lineageCid = await this.storage.upload(Buffer.from(lineageData).toString('hex'));
            await this.storeCidForKey(`lineage:${cid}`, lineageCid);
    
            const key = unique ? `memory:${tableName}:${memory.id}` : `memory:${tableName}:${memory.id}-${Date.now()}`;
            await this.storeCidForKey(key, cid);
        }, `createMemory(${memory.id})`);
    }

    async getMemoryById(id: UUID): Promise<Memory | null> {
        return this.withCircuitBreaker(async () => {
            const cids = await this.listCidsForPrefix(`memory:`);
            for (const cid of cids) {
                const data = await this.storage.download(cid); // Uint8Array
                const decryptedData = decrypt(data); // Decrypt to Uint8Array
                const memory = JSON.parse(new TextDecoder().decode(decryptedData)) as Memory;
                if (memory.id === id) return memory;
            }
            return null;
        }, `getMemoryById(${id})`);
    }

    async getMemories(params: {
        roomId: UUID;
        count?: number;
        unique?: boolean;
        tableName: string;
        agentId: UUID;
        start?: number;
        end?: number;
    }): Promise<Memory[]> {
        return this.withCircuitBreaker(async () => {
            const cids = await this.listCidsForPrefix(`memory:${params.tableName}:`);
            const memories: Memory[] = [];
            for (const cid of cids) {
                const data = await this.storage.download(cid);
                const memory = JSON.parse(new TextDecoder().decode(data)) as Memory;
                if (memory.roomId === params.roomId && memory.agentId === params.agentId) {
                    if (params.unique && memories.some(m => m.id === memory.id)) continue;
                    memories.push(memory);
                }
            }
            const start = params.start || 0;
            const end = params.end || memories.length;
            return memories.slice(start, end).slice(0, params.count);
        }, `getMemories(${params.roomId})`);
    }

    async getMemoriesByIds(memoryIds: UUID[], tableName?: string): Promise<Memory[]> {
        return this.withCircuitBreaker(async () => {
            const prefix = tableName ? `memory:${tableName}:` : 'memory:';
            const cids = await this.listCidsForPrefix(prefix);
            const memories: Memory[] = [];
            for (const cid of cids) {
                const data = await this.storage.download(cid);
                const memory = JSON.parse(new TextDecoder().decode(data)) as Memory;
                if (memoryIds.includes(memory.id)) memories.push(memory);
            }
            return memories;
        }, `getMemoriesByIds`);
    }

    async getMemoriesByRoomIds(params: { tableName: string; agentId: UUID; roomIds: UUID[]; limit?: number }): Promise<Memory[]> {
        return this.withCircuitBreaker(async () => {
            const cids = await this.listCidsForPrefix(`memory:${params.tableName}:`);
            const memories: Memory[] = [];
            for (const cid of cids) {
                const data = await this.storage.download(cid);
                const memory = JSON.parse(new TextDecoder().decode(data)) as Memory;
                if (params.roomIds.includes(memory.roomId) && memory.agentId === params.agentId) {
                    memories.push(memory);
                }
            }
            return params.limit ? memories.slice(0, params.limit) : memories;
        }, `getMemoriesByRoomIds`);
    }

    async createGoal(goal: Goal): Promise<void> {
        return this.withCircuitBreaker(async () => {
            const data = new TextEncoder().encode(JSON.stringify(goal));
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
                const goal = JSON.parse(new TextDecoder().decode(data)) as Goal;
                // Removed goal.agentId check since it’s not in Goal type
                if (goal.roomId === params.roomId) {
                    if (params.onlyInProgress && goal.status !== 'IN_PROGRESS') continue;
                    if (params.userId && goal.userId !== params.userId) continue;
                    goals.push(goal);
                }
            }
            return params.count ? goals.slice(0, params.count) : goals;
        }, `getGoals(${params.agentId}, ${params.roomId})`);
    }

    async updateGoal(goal: Goal): Promise<void> {
        return this.withCircuitBreaker(async () => {
            const data = new TextEncoder().encode(JSON.stringify(goal));
            const cid = await this.storage.upload(Buffer.from(data).toString('hex'));
            await this.storeCidForKey(`goal:${goal.id}`, cid);
        }, `updateGoal(${goal.id})`);
    }

    async removeGoal(goalId: UUID): Promise<void> {
        return this.withCircuitBreaker(async () => {
            const filePath = path.join(this.baseDir, `goal:${goalId}.cid`);
            await fs.unlink(filePath);
        }, `removeGoal(${goalId})`);
    }

    async removeAllGoals(roomId: UUID): Promise<void> {
        return this.withCircuitBreaker(async () => {
            const cids = await this.listCidsForPrefix(`goal:`);
            for (const cid of cids) {
                const data = await this.storage.download(cid);
                const goal = JSON.parse(new TextDecoder().decode(data)) as Goal;
                if (goal.roomId === roomId) {
                    const filePath = path.join(this.baseDir, `goal:${goal.id}.cid`);
                    await fs.unlink(filePath);
                }
            }
        }, `removeAllGoals(${roomId})`);
    }

    async getRoom(roomId: UUID): Promise<UUID | null> {
        return this.withCircuitBreaker(async () => {
            const cid = await this.getCidForKey(`room:${roomId}`);
            return cid ? roomId : null;
        }, `getRoom(${roomId})`);
    }

    async createRoom(roomId?: UUID): Promise<UUID> {
        return this.withCircuitBreaker(async () => {
            const id = roomId || (uuidv4() as UUID); // Ensure id is always defined
            await this.storeCidForKey(`room:${id}`, 'placeholder');
            return id;
        }, `createRoom`);
    }

    async removeRoom(roomId: UUID): Promise<void> {
        return this.withCircuitBreaker(async () => {
            const filePath = path.join(this.baseDir, `room:${roomId}.cid`);
            await fs.unlink(filePath);
        }, `removeRoom(${roomId})`);
    }

    async getRoomsForParticipant(userId: UUID): Promise<UUID[]> {
        return this.withCircuitBreaker(async () => {
            const cids = await this.listCidsForPrefix(`participant:${userId}:`);
            return cids.map(cid => cid.split(':')[2] as UUID);
        }, `getRoomsForParticipant(${userId})`);
    }

    async getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]> {
        return this.withCircuitBreaker(async () => {
            const roomSets = await Promise.all(userIds.map(uid => this.getRoomsForParticipant(uid)));
            const roomSet = new Set(roomSets.flat());
            return Array.from(roomSet);
        }, `getRoomsForParticipants`);
    }

    async addParticipant(userId: UUID, roomId: UUID): Promise<boolean> {
        return this.withCircuitBreaker(async () => {
            const key = `participant:${userId}:${roomId}`;
            await this.storeCidForKey(key, 'placeholder');
            return true;
        }, `addParticipant(${userId}, ${roomId})`);
    }

    async removeParticipant(userId: UUID, roomId: UUID): Promise<boolean> {
        return this.withCircuitBreaker(async () => {
            const filePath = path.join(this.baseDir, `participant:${userId}:${roomId}.cid`);
            await fs.unlink(filePath);
            return true;
        }, `removeParticipant(${userId}, ${roomId})`);
    }

    async getParticipantsForAccount(userId: UUID): Promise<Participant[]> {
        return this.withCircuitBreaker(async () => {
            const cids = await this.listCidsForPrefix(`participant:${userId}:`);
            const participants: Participant[] = [];
            for (const cid of cids) {
                const roomId = cid.split(':')[2] as UUID;
                const account = await this.getAccountById(userId);
                if (account) {
                    participants.push({ id: uuidv4() as UUID, account });
                }
            }
            return participants;
        }, `getParticipantsForAccount(${userId})`);
    }

    async getParticipantsForRoom(roomId: UUID): Promise<UUID[]> {
        return this.withCircuitBreaker(async () => {
            const cids = await this.listCidsForPrefix(`participant:`);
            const userIds: UUID[] = [];
            for (const cid of cids) {
                const parts = cid.split(':');
                if (parts[2] === roomId) {
                    userIds.push(parts[1] as UUID);
                }
            }
            return userIds;
        }, `getParticipantsForRoom(${roomId})`);
    }

    async getParticipantUserState(roomId: UUID, userId: UUID): Promise<"FOLLOWED" | "MUTED" | null> {
        return this.withCircuitBreaker(async () => null, `getParticipantUserState(${roomId}, ${userId})`);
    }

    async setParticipantUserState(roomId: UUID, userId: UUID, state: "FOLLOWED" | "MUTED" | null): Promise<void> {
        return this.withCircuitBreaker(async () => {
            // Minimal implementation: Could store state in Filecoin if needed
        }, `setParticipantUserState(${roomId}, ${userId})`);
    }

    async createRelationship(params: { userA: UUID; userB: UUID }): Promise<boolean> {
        return this.withCircuitBreaker(async () => {
            const relationship: Relationship = {
                id: uuidv4() as UUID,
                userA: params.userA,
                userB: params.userB,
                userId: params.userA,
                roomId: uuidv4() as UUID,
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
            };
            const data = new TextEncoder().encode(JSON.stringify(relationship));
            const cid = await this.storage.upload(Buffer.from(data).toString('hex'));
            await this.storeCidForKey(`relationship:${relationship.id}`, cid);
            return true;
        }, `createRelationship`);
    }

    async getRelationship(params: { userA: UUID; userB: UUID }): Promise<Relationship | null> {
        return this.withCircuitBreaker(async () => {
            const cids = await this.listCidsForPrefix(`relationship:`);
            for (const cid of cids) {
                const data = await this.storage.download(cid);
                const rel = JSON.parse(new TextDecoder().decode(data)) as Relationship;
                if (rel.userA === params.userA && rel.userB === params.userB) return rel;
            }
            return null;
        }, `getRelationship`);
    }

    async getRelationships(params: { userId: UUID }): Promise<Relationship[]> {
        return this.withCircuitBreaker(async () => {
            const cids = await this.listCidsForPrefix(`relationship:`);
            const relationships: Relationship[] = [];
            for (const cid of cids) {
                const data = await this.storage.download(cid);
                const rel = JSON.parse(new TextDecoder().decode(data)) as Relationship;
                if (rel.userId === params.userId) relationships.push(rel);
            }
            return relationships;
        }, `getRelationships(${params.userId})`);
    }

    async getKnowledge(params: { id?: UUID; agentId: UUID; limit?: number; query?: string; conversationContext?: string }): Promise<RAGKnowledgeItem[]> {
        return this.withCircuitBreaker(async () => [], `getKnowledge`);
    }

    async searchKnowledge(params: { agentId: UUID; embedding: Float32Array; match_threshold: number; match_count: number; searchText?: string }): Promise<RAGKnowledgeItem[]> {
        return this.withCircuitBreaker(async () => [], `searchKnowledge`);
    }

    async createKnowledge(knowledge: RAGKnowledgeItem): Promise<void> {
        return this.withCircuitBreaker(async () => {
            const data = new TextEncoder().encode(JSON.stringify(knowledge));
            const cid = await this.storage.upload(Buffer.from(data).toString('hex'));
            await this.storeCidForKey(`knowledge:${knowledge.id}`, cid);
        }, `createKnowledge(${knowledge.id})`);
    }

    async removeKnowledge(id: UUID): Promise<void> {
        return this.withCircuitBreaker(async () => {
            const filePath = path.join(this.baseDir, `knowledge:${id}.cid`);
            await fs.unlink(filePath);
        }, `removeKnowledge(${id})`);
    }

    async clearKnowledge(agentId: UUID, shared?: boolean): Promise<void> {
        return this.withCircuitBreaker(async () => {
            const cids = await this.listCidsForPrefix(`knowledge:`);
            for (const cid of cids) {
                const data = await this.storage.download(cid);
                const knowledge = JSON.parse(new TextDecoder().decode(data)) as RAGKnowledgeItem;
                if (knowledge.agentId === agentId) {
                    const filePath = path.join(this.baseDir, `knowledge:${knowledge.id}.cid`);
                    await fs.unlink(filePath);
                }
            }
        }, `clearKnowledge(${agentId})`);
    }

    async getCachedEmbeddings(params: any): Promise<{ embedding: number[]; levenshtein_score: number }[]> {
        return this.withCircuitBreaker(async () => [], `getCachedEmbeddings`);
    }

    async log(params: { body: { [key: string]: unknown }; userId: UUID; roomId: UUID; type: string }): Promise<void> {
        return this.withCircuitBreaker(async () => {
            const logData = new TextEncoder().encode(JSON.stringify(params));
            const cid = await this.storage.upload(Buffer.from(logData).toString('hex'));
            await this.storeCidForKey(`log:${params.roomId}:${Date.now()}`, cid);
        }, `log(${params.roomId})`);
    }

    async getActorDetails(params: { roomId: UUID }): Promise<any[]> {
        return this.withCircuitBreaker(async () => [], `getActorDetails(${params.roomId})`);
    }

    async searchMemories(params: { tableName: string; agentId: UUID; roomId: UUID; embedding: number[]; match_threshold: number; match_count: number; unique: boolean }): Promise<Memory[]> {
        return this.withCircuitBreaker(async () => [], `searchMemories`);
    }

    async updateGoalStatus(params: { goalId: UUID; status: string }): Promise<void> {
        return this.withCircuitBreaker(async () => {
            if (!params.goalId) throw new Error('goalId is required');
            const cid = await this.getCidForKey(`goal:${params.goalId}`);
            if (cid) {
                const data = await this.storage.download(cid);
                const goal = JSON.parse(new TextDecoder().decode(data)) as Goal;
                goal.status = params.status as any;
                const newCid = await this.storage.upload(Buffer.from(new TextEncoder().encode(JSON.stringify(goal))).toString('hex'));
                await this.storeCidForKey(`goal:${params.goalId}`, newCid);
            }
        }, `updateGoalStatus(${params.goalId})`);
    }

    async searchMemoriesByEmbedding(embedding: number[], params: { match_threshold?: number; count?: number; roomId?: UUID; agentId?: UUID; unique?: boolean; tableName: string }): Promise<Memory[]> {
        return this.withCircuitBreaker(async () => [], `searchMemoriesByEmbedding`);
    }

    async removeMemory(memoryId: UUID, tableName: string): Promise<void> {
        return this.withCircuitBreaker(async () => {
            const cids = await this.listCidsForPrefix(`memory:${tableName}:`);
            for (const cid of cids) {
                const data = await this.storage.download(cid);
                const memory = JSON.parse(new TextDecoder().decode(data)) as Memory;
                if (memory.id === memoryId) {
                    const filePath = path.join(this.baseDir, `memory:${tableName}:${memoryId}.cid`);
                    await fs.unlink(filePath);
                    break;
                }
            }
        }, `removeMemory(${memoryId})`);
    }

    async removeAllMemories(roomId: UUID, tableName: string): Promise<void> {
        return this.withCircuitBreaker(async () => { // Fixed syntax error: Added '{'
            const cids = await this.listCidsForPrefix(`memory:${tableName}:`);
            for (const cid of cids) {
                const data = await this.storage.download(cid);
                const memory = JSON.parse(new TextDecoder().decode(data)) as Memory;
                if (memory.roomId === roomId) {
                    const filePath = path.join(this.baseDir, `memory:${tableName}:${memory.id}.cid`);
                    await fs.unlink(filePath);
                }
            }
        }, `removeAllMemories(${roomId})`);
    }

    async countMemories(roomId: UUID, unique?: boolean, tableName?: string): Promise<number> {
        return this.withCircuitBreaker(async () => {
            const prefix = tableName ? `memory:${tableName}:` : 'memory:';
            const cids = await this.listCidsForPrefix(prefix);
            const memories = new Set<string>();
            for (const cid of cids) {
                const data = await this.storage.download(cid);
                const memory = JSON.parse(new TextDecoder().decode(data)) as Memory;
                if (memory.roomId === roomId) {
                    if (unique) memories.add(memory.id);
                    else memories.add(`${memory.id}-${cid}`);
                }
            }
            return memories.size;
        }, `countMemories(${roomId})`);
    }

    private async storeCidForKey(key: string, cid: string): Promise<void> {
        const filePath = path.join(this.baseDir, `${key}.cid`);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
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
        const files = await fs.readdir(this.baseDir, { recursive: true });
        const cids: string[] = [];
        for (const file of files) {
            if (file.startsWith(prefix)) {
                const cid = await fs.readFile(path.join(this.baseDir, file), 'utf8');
                cids.push(cid);
            }
        }
        return cids;
    }
}