import { IntentHandler } from 'matrix-blend';
import { FilecoinClient } from './filecoin-client';

const agentIntents: IntentHandler[] = [
  {
    intent: "check_balance",
    executeIntent: async (intent) => {
      const client = new FilecoinClient();
      const balance = await client.getBalance();
      return `Your current balance is ${balance} FIL.`;
    }
  },
  {
    intent: "get_height",
    executeIntent: async (height) => {
      const client = new FilecoinClient();
      const chainHeight = await client.getHeight(height);
      return `The current blockchain height is ${chainHeight}.`;
    }
  }
];

export class AgentIntentHandler implements IntentHandler {
  constructor(private readonly filecoinClient: FilecoinClient) {}

  async handleIntent(intent: string): Promise<string> {
    switch (intent) {
      case "check_balance":
        const balance = await this.filecoinClient.getBalance();
        return `Your current balance is ${balance} FIL.`;
      case "get_height":
        const chainHeight = await this.filecoinClient.getHeight();
        return `The current blockchain height is ${chainHeight}.`;
      default:
        return "I'm sorry, I didn't understand that.";
    }
  }
}

// Use the FilecoinClient to interact with the Filecoin blockchain
const client = new FilecoinClient();
client.getBlockHeight().then(height => {
  console.log(`Current block height: ${height}`);
});

export class AgentIntentHandler {
    private client: FilecoinClient;

() {
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

// Use the FilecoinClient to interact with the Filecoin blockchain
const client = new FilecoinClient();
client.getBlockHeight().then(height => {
  console.log(`Current block height: ${height}`);
});

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