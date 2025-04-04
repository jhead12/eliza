import { FilecoinClient } from '../../filecoin-rs/pkg';

export class AgentIntentHandler {
    private client: FilecoinClient;

    constructor() {
        this.client = new FilecoinClient();
    }

    async executeIntent(intent: { action: string, data: string }): Promise<string> {
        if (intent.action === "store") {
            const data = Buffer.from(intent.data);
            return await this.client.upload(data);
        }
        throw new Error("Unsupported intent");
    }
}