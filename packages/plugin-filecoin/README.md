# Filecoin Plugin

The Filecoin Plugin (`@elizaos/plugin-filecoin`) is a powerful software package designed to integrate Filecoin’s decentralized storage and blockchain capabilities into the ElizaOS ecosystem. It provides enterprises and developers with tools for secure, scalable, and cost-effective data management, leveraging Rust-based WebAssembly (WASM) bindings and TypeScript/JavaScript interfaces.

## Overview

This plugin enables interaction with the Filecoin blockchain and its Virtual Machine (FVM), offering features like encrypted backups, decentralized storage via Filecoin/Storacha, and performance monitoring. It’s ideal for enterprises seeking to reduce storage costs, ensure data sovereignty, and prepare for Web3 and decentralized AI workflows.


### Updated Instructions for `generate-pages.sh`

#### Setting Up `generate-pages.sh`

1. **Ensure Permissions**: Make sure the script has executable permissions. You can add them using:
   ```bash
   chmod +x packages/plugin-filecoin/bin/generate-pages.sh
   ```

2. **Run the Script**: Execute the script to generate the necessary pages:
   ```bash
   ./packages/plugin-filecoin/bin/generate-pages.sh
   ```

This will copy the template files from `packages/plugin-filecoin/templates` to `client/src/routes`.

#### Environment Variables

To ensure all environment variables are set up correctly, follow these steps:

1. **Create a `.env` File**: In the root of your project, create a `.env` file.

2. **Add Required Variables**: Add the necessary environment variables to this file. For example:
   ```plaintext
   DB_DIALECT=postgres
   DATABASE_URL=your_database_url
   ENCRYPTION_KEY=your_32_byte_key_here
   STORACHA_CLIENT_CONFIG=your_storacha_client_config
   ```

3. **Load Environment Variables**: Ensure your application loads these variables. In a Node.js environment, you can use `dotenv`:
   ```bash
   npm install dotenv
   ```
   Then in your entry file (e.g., `src/index.ts`), add:
   ```javascript
   require('dotenv').config();
   ```

4. **Verify Variables**: You can verify that the variables are set correctly by logging them:
   ```javascript
   console.log(process.env.DB_DIALECT);
   console.log(process.env.DATABASE_URL);
   console.log(process.env.ENCRYPTION_KEY);
   console.log(process.env.STORACHA_CLIENT_CONFIG);
   ```

#### Updated `README.md` Section

```markdown
## Getting Started

### Prerequisites
- **Rust**: Install via `rustup`.
- **wasm-pack**: `cargo install wasm-pack` for WASM compilation.
- **Node.js**: v14+ recommended.
- **npm**: For TypeScript dependencies.

### Installation
1. **Clone the Repository:**
   ```bash
   git clone https://github.com/elizaos-plugins/plugin-filecoin
   cd packages/plugin-filecoin
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Build the Plugin:**
   ```bash
   npm run build
   ```

4. **Update ElizaOS with the Plugin:**
   ```bash
   pnpm --filter "@elizaos/plugin-filecoin" build
   ```

### Setting Up `generate-pages.sh`
1. **Ensure Permissions**: Make sure the script has executable permissions.
   ```bash
   chmod +x packages/plugin-filecoin/bin/generate-pages.sh
   ```

2. **Run the Script**: Execute the script to generate the necessary pages.
   ```bash
   ./packages/plugin-filecoin/bin/generate-pages.sh
   ```

### Environment Variables

To ensure all environment variables are set up correctly, follow these steps:

1. **Create a `.env` File**: In the root of your project, create a `.env` file.

2. **Add Required Variables**: Add the necessary environment variables to this file.
   ```plaintext
   DB_DIALECT=postgres
   DATABASE_URL=your_database_url
   ENCRYPTION_KEY=your_32_byte_key_here
   STORACHA_CLIENT_CONFIG=your_storacha_client_config
   ```

3. **Load Environment Variables**: Ensure your application loads these variables. In a Node.js environment, you can use `dotenv`:
   ```bash
   npm install dotenv
   ```
   Then in your entry file (e.g., `src/index.ts`), add:
   ```javascript
   require('dotenv').config();
   ```

4. **Verify Variables**: You can verify that the variables are set correctly by logging them:
   ```javascript
   console.log(process.env.DB_DIALECT);
   console.log(process.env.DATABASE_URL);
   console.log(process.env.ENCRYPTION_KEY);
   console.log(process.env.STORACHA_CLIENT_CONFIG);
   ```

## Verification
Native Build: `cd filecoin-rs && cargo build` (multi-threaded runtime).

WASM Build: `cd filecoin-rs && cargo build --target wasm32-unknown-unknown --features wasm` (single-threaded runtime).

Web Target: `cd filecoin-rs && wasm-pack build --target web --out-dir pkg`.

## Usage Example
```javascript
import { initialize, backupDataLocal, filecoinRsRestoreFunction } from './src/index';

async function run() {
  await initialize();
  const backup = await backupDataLocal({ encrypted: true });
  console.log(`Backup CID: ${backup.metadata.path}`);
  const restored = await filecoinRsRestoreFunction({
    backupPath: backup.metadata.path,
    destinationPath: 'dest/path',
    decryptionKey: 'your_key'
  });
  console.log(`Restore success: ${restored}`);
}

run();
```

## Configuration
Database: Supports PostgreSQL (default) or SQLite via DB_DIALECT env var (see performance-monitoring.ts).

Encryption Key: Set a 32-byte key in encryption.ts or via env vars.

Storacha: Configure @storacha/client for decentralized storage (optional).

## Contributing
Fork the repo, submit PRs to https://github.com/elizaos-plugins/plugin-filecoin.
License
MIT License (or specify your license).
```

This should cover all the steps needed to set up the `generate-pages.sh` script and ensure that all environment variables are correctly configured. Let me know if you need further adjustments!





