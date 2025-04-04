// packages/plugin-filecoin/src/test.ts
import { backupDataLocal } from '../src/types';

async function run() {
  const result = await backupDataLocal({ path: "test", encrypted: true });
  console.log(result);
}
run();