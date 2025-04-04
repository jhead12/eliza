use cid::Cid;
use multihash_codetable::{Code, MultihashDigest};
use std::collections::HashMap;
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::JsValue;

#[cfg(target_arch = "wasm32")]
use console_log;
#[cfg(target_arch = "wasm32")]
use log;

pub mod actor_state {
    use std::collections::HashMap;
    pub struct ActorState {
        pub balance: u64,
        pub accounts: HashMap<String, u64>,
    }
}

pub mod messages;
pub mod native;
#[cfg(target_arch = "wasm32")]
pub mod wasm;

#[cfg(not(target_arch = "wasm32"))]
use std::sync::Arc;
#[cfg(not(target_arch = "wasm32"))]
use anyhow::Result;
#[cfg(not(target_arch = "wasm32"))]
pub use fvm_ipld_blockstore::{MemoryBlockstore, Blockstore};

#[cfg(not(target_arch = "wasm32"))]
pub type BlockstoreType = Arc<MemoryBlockstore>;

#[cfg(target_arch = "wasm32")]
pub type BlockstoreType = HashMap<Cid, Vec<u8>>;

use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct DataLineage {
    cid: String,
    origin: String,
    creator: String,
    created_at: u64,
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub struct FilecoinClient {
    // Fields (if any)
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
impl FilecoinClient {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        FilecoinClient {}
    }

    pub async fn upload(&self, _data: Vec<u8>) -> Result<String, JsValue> {
        // Placeholder implementation
        Ok("bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi".to_string())
    }

    pub async fn download(&self, _cid: String) -> Result<Vec<u8>, JsValue> {
        // Placeholder implementation
        Ok(vec![1, 2, 3])
    }
    pub async fn execute_agent_intent(
        &self,
        action: String,
        data: Vec<u8>,
    ) -> Result<String, JsValue> {
        match action.as_str() {
            "store" => self.upload(data).await,
            "provenance" => {
                self.track_provenance(data, "agent".to_string(), "agent-001".to_string())
                    .await
            }
            _ => Err(JsValue::from_str("Unsupported intent")),
        }
    }
    pub async fn transfer_to_chain(
        &self,
        cid: String,
        destination_chain: String,
    ) -> Result<String, JsValue> {
        // Placeholder: Implement cross-chain transfer (e.g., using a bridge like Axelar)
        println!(
            "Transferring data with CID {} to chain {}",
            cid, destination_chain
        );
        Ok("tx-hash".to_string())
    }

    pub async fn track_provenance(
        &self,
        data: Vec<u8>,
        origin: String,
        creator: String,
    ) -> Result<String, JsValue> {
        let cid = self.upload(data).await?;
        let lineage = DataLineage {
            cid: cid.clone(),
            origin,
            creator,
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map_err(|e| JsValue::from_str(&e.to_string()))?
                .as_secs(),
        };
        let lineage_data = serde_json::to_vec(&lineage)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        let lineage_cid = self.upload(lineage_data).await?;
        println!("Lineage CID for data CID {}: {}", cid, lineage_cid);
        Ok(cid)
    }
}

pub struct NoopLimiter {
    limit: usize,
}

impl NoopLimiter {
    pub fn new(limit: usize) -> Self {
        NoopLimiter { limit }
    }

    pub fn check_limit(&self, data_size: usize) -> bool {
        data_size <= self.limit
    }
}

const DAG_CBOR: u64 = 0x71;

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub struct MyMachine {
    blockstore: BlockstoreType,
    limiter: NoopLimiter,
    actors: HashMap<Cid, actor_state::ActorState>,
}

#[cfg(not(target_arch = "wasm32"))]
pub struct MyMachine {
    blockstore: BlockstoreType,
    limiter: NoopLimiter,
    actors: HashMap<Cid, actor_state::ActorState>,
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
impl MyMachine {
    #[wasm_bindgen(constructor)]
    pub fn new(limit: usize) -> Self {
        Self {
            blockstore: HashMap::new(),
            limiter: NoopLimiter::new(limit),
            actors: HashMap::new(),
        }
    }

    pub fn store_data(&mut self, data: Vec<u8>) -> Result<String, JsValue> {
        if !self.limiter.check_limit(data.len()) {
            return Err(JsValue::from_str("Data size exceeds limit"));
        }
        let hash = Code::Sha2_256.digest(&data);
        let cid = Cid::new_v1(DAG_CBOR, hash);
        let actor_state = actor_state::ActorState {
            balance: 0,
            accounts: HashMap::new(),
        };
        self.actors.insert(cid, actor_state);
        self.blockstore.insert(cid, data);
        Ok(cid.to_string())
    }

    pub fn retrieve_data(&self, cid_str: String) -> Result<Vec<u8>, JsValue> {
        let cid = cid_str.parse::<Cid>().map_err(|e| JsValue::from_str(&e.to_string()))?;
        self.blockstore
            .get(&cid)
            .ok_or_else(|| JsValue::from_str("Data not found"))
            .map(|data| data.clone())
    }
}

#[cfg(not(target_arch = "wasm32"))]
impl MyMachine {
    pub fn new(blockstore: BlockstoreType, limit: usize) -> Self {
        MyMachine {
            blockstore,
            limiter: NoopLimiter::new(limit),
            actors: HashMap::new(),
        }
    }

    pub fn store_data(&mut self, data: Vec<u8>) -> Result<String, anyhow::Error> {
        if !self.limiter.check_limit(data.len()) {
            return Err(anyhow::anyhow!("Data size exceeds limit"));
        }
        let hash = Code::Sha2_256.digest(&data);
        let cid = Cid::new_v1(DAG_CBOR, hash);
        let actor_state = actor_state::ActorState {
            balance: 0,
            accounts: HashMap::new(),
        };
        self.actors.insert(cid, actor_state);
        self.blockstore.put_keyed(&cid, &data)?;
        Ok(cid.to_string())
    }

    pub fn retrieve_data(&self, cid_str: String) -> Result<Vec<u8>, anyhow::Error> {
        let cid = cid_str.parse::<Cid>()?;
        self.blockstore
            .get(&cid)?
            .ok_or_else(|| anyhow::anyhow!("Data not found"))
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(start)]
pub async fn init() -> Result<(), JsValue> {
    console_log::init_with_level(log::Level::Debug)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    Ok(())
}

#[cfg(not(target_arch = "wasm32"))]
pub fn run() {
    native::run_native();
}