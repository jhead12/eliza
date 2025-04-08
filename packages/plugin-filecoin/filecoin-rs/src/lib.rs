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


#[derive(Serialize, Deserialize)]
#[wasm_bindgen]
pub struct BackupMetadata {
    path: Option<String>,
    cid: Option<String>,
    encrypted: Option<bool>,
    compression_level: Option<u32>, // Using u32 for simplicity, adjust as needed
    size: Option<u32>,             // Using u32 for simplicity, adjust as needed
}

#[wasm_bindgen]
impl BackupMetadata {
    #[wasm_bindgen(constructor)]
    pub fn new(
        path: Option<String>,
        cid: Option<String>,
        encrypted: Option<bool>,
        compression_level: Option<u32>,
        size: Option<u32>,
    ) -> Self {
        Self {
            path,
            cid,
            encrypted,
            compression_level,
            size,
        }
    }

      // Getters for JavaScript/TypeScript compatibility
      #[wasm_bindgen(getter)]
      pub fn path(&self) -> Option<String> {
          self.path.clone()
      }
  
      #[wasm_bindgen(getter)]
      pub fn cid(&self) -> Option<String> {
          self.cid.clone()
      }
  
      #[wasm_bindgen(getter)]
      pub fn encrypted(&self) -> Option<bool> {
          self.encrypted
      }
  
      #[wasm_bindgen(getter)]
      pub fn compression_level(&self) -> Option<u32> {
          self.compression_level
      }
  
      #[wasm_bindgen(getter)]
      pub fn size(&self) -> Option<u32> {
          self.size
      }
  }

  // Define the WasmFilecoinBackupResult struct
#[derive(Serialize, Deserialize)]
#[wasm_bindgen]
pub struct WasmFilecoinBackupResult {
    success: bool,
    metadata: BackupMetadata,
}

#[wasm_bindgen]
impl WasmFilecoinBackupResult {
    #[wasm_bindgen(constructor)]
    pub fn new(success: bool, metadata: BackupMetadata) -> Self {
        Self { success, metadata }
    }

    // Getters for JavaScript/TypeScript compatibility
    #[wasm_bindgen(getter)]
    pub fn success(&self) -> bool {
        self.success
    }

    #[wasm_bindgen(getter)]
    pub fn metadata(&self) -> BackupMetadata {
        self.metadata.clone()
    }
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

// DataDAO Member
#[derive(Serialize, Deserialize, Clone)]
#[wasm_bindgen]
pub struct DataDAOMember {
    id: String, // Could be a public key or address
    balance: u64, // Tokens for governance or rewards
    data_contributions: Vec<String>, // CIDs of contributed data
}

#[wasm_bindgen]
impl DataDAOMember {
    #[wasm_bindgen(constructor)]
    pub fn new(id: String) -> Self {
        Self {
            id,
            balance: 0,
            data_contributions: Vec::new(),
        }
    }

    #[wasm_bindgen(getter)]
    pub fn id(&self) -> String {
        self.id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn balance(&self) -> u64 {
        self.balance
    }

    #[wasm_bindgen(getter)]
    pub fn data_contributions(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.data_contributions).unwrap_or(JsValue::NULL)
    }
}

// DataDAO Structure
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub struct DataDAO {
    members: HashMap<String, DataDAOMember>,
    proposals: HashMap<String, bool>, // Proposal ID -> Approved status
    machine: MyMachine, // For storage operations
}

#[cfg(not(target_arch = "wasm32"))]
pub struct DataDAO {
    members: HashMap<String, DataDAOMember>,
    proposals: HashMap<String, bool>,
    machine: MyMachine,
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
impl DataDAO {
    #[wasm_bindgen(constructor)]
    pub fn new(limit: usize) -> Self {
        Self {
            members: HashMap::new(),
            proposals: HashMap::new(),
            machine: MyMachine::new(limit),
        }
    }

    // Add a member to the DAO
    pub fn add_member(&mut self, id: String) -> Result<(), JsValue> {
        if self.members.contains_key(&id) {
            return Err(JsValue::from_str("Member already exists"));
        }
        self.members.insert(id.clone(), DataDAOMember::new(id));
        Ok(())
    }

    // Contribute data to the DAO
    pub fn contribute_data(&mut self, member_id: String, data: Vec<u8>, encrypted: Option<bool>) -> Result<WasmFilecoinBackupResult, JsValue> {
        let member = self.members.get_mut(&member_id)
            .ok_or_else(|| JsValue::from_str("Member not found"))?;
        
        let backup_result = self.machine.backup_data(data.clone(), None, encrypted);
        if backup_result.success {
            if let Some(cid) = &backup_result.metadata.cid {
                member.data_contributions.push(cid.clone());
                member.balance += 10; // Reward for contribution (example)
            }
        }
        Ok(backup_result)
    }

    // Propose and vote (simplified governance)
    pub fn propose(&mut self, member_id: String, proposal_id: String) -> Result<(), JsValue> {
        if !self.members.contains_key(&member_id) {
            return Err(JsValue::from_str("Member not found"));
        }
        self.proposals.insert(proposal_id, false); // Not approved yet
        Ok(())
    }

    pub fn vote(&mut self, member_id: String, proposal_id: String, support: bool) -> Result<(), JsValue> {
        if !self.members.contains_key(&member_id) {
            return Err(JsValue::from_str("Member not found"));
        }
        if let Some(approved) = self.proposals.get_mut(&proposal_id) {
            *approved = support; // Simplified: one vote decides
            Ok(())
        } else {
            Err(JsValue::from_str("Proposal not found"))
        }
    }

    // Generate synthetic data (placeholder)
    pub fn generate_synthetic_data(&self, _base_data: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        // Placeholder: In a real implementation, use a model to generate synthetic data
        Ok(vec![1, 2, 3]) // Dummy data
    }

    pub fn apply_differential_privacy(&self, data: Vec<u8>, epsilon: f64) -> Result<Vec<u8>, JsValue> {
        // Placeholder: Implement differential privacy (e.g., add noise)
        Ok(data) // Return perturbed data
    }
    pub fn encrypt_data(&self, data: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        // Placeholder: Use a Rust HE library like `tfhe-rs`
        Ok(data) // Return encrypted data
    }

    pub fn generate_zk_proof(&self, data_cid: String) -> Result<String, JsValue> {
        // Placeholder: Use a ZK library like `bellman` or `arkworks`
        Ok("zk-proof".to_string()) // Return proof
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

  // New backup_data function returning WasmFilecoinBackupResult
  #[wasm_bindgen]
  pub fn backup_data(&mut self, data: Vec<u8>, path: Option<String>, encrypted: Option<bool>) -> WasmFilecoinBackupResult {
      if !self.limiter.check_limit(data.len()) {
          return WasmFilecoinBackupResult {
              success: false,
              metadata: BackupMetadata::new(path, None, encrypted, None, None),
          };
      }

      let hash = Code::Sha2_256.digest(&data);
      let cid = Cid::new_v1(DAG_CBOR, hash);
      let cid_str = cid.to_string();

      // Store the data
      let actor_state = actor_state::ActorState {
          balance: 0,
          accounts: HashMap::new(),
      };
      self.actors.insert(cid, actor_state);
      self.blockstore.insert(cid, data.clone());

      // Create metadata
      let metadata = BackupMetadata::new(
          path,
          Some(cid_str),
          encrypted,
          None, // compression_level (not implemented yet)
          Some(data.len() as u32), // size
      );

      WasmFilecoinBackupResult {
          success: true,
          metadata,
      }
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