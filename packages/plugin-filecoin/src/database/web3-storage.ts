// import { create } from '@web3-storage/w3up-client';

// export class createProvider implements StorageProvider {
//     private client: create;

//     constructor(token: string) {
//         this.client = new create({ token });
//     }

//     async upload(data: string): Promise<string> {
//         const blob = new Blob([data], { type: 'text/plain' });
//         const cid = await this.client.put([new File([blob], 'data.txt')]);
//         return cid;
//     }

//     async download(cid: string): Promise<Uint8Array> {
//         const res = await this.client.get(cid);
//         if (!res || !res.ok) throw new Error(`Failed to retrieve CID: ${cid}`);
//         const files = await res.files();
//         const file = files[0];
//         const arrayBuffer = await file.arrayBuffer();
//         return new Uint8Array(arrayBuffer);
//     }
// }