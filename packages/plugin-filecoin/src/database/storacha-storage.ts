import { uploadToStoracha, downloadFromStoracha } from './storacha';

export class StorachaStorage implements StorageProvider {
    async upload(data: string): Promise<string> {
        return uploadToStoracha(data);
    }

    async download(cid: string): Promise<Uint8Array> {
        return downloadFromStoracha(cid);
    }
}