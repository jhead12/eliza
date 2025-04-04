export interface StorageProvider {
    upload(data: string): Promise<string>; // Returns CID or identifier
    download(cid: string): Promise<Uint8Array>; // Retrieves data
}