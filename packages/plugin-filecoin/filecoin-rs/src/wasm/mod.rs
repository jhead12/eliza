use wasm_bindgen::prelude::*;

// BackupMetadata struct with Clone trait
#[wasm_bindgen]
#[derive(Clone)] // Added Clone derivation
pub struct BackupMetadata {
    path: Option<String>,
    encrypted: Option<bool>,
    compression_level: Option<i32>,
    size: Option<i32>,
}

#[wasm_bindgen]
impl BackupMetadata {
    #[wasm_bindgen(constructor)]
    pub fn new(path: Option<String>, encrypted: Option<bool>, compression_level: Option<i32>, size: Option<i32>) -> BackupMetadata {
        BackupMetadata { path, encrypted, compression_level, size }
    }

    #[wasm_bindgen(getter)]
    pub fn path(&self) -> Option<String> { self.path.clone() }
    #[wasm_bindgen(getter)]
    pub fn encrypted(&self) -> Option<bool> { self.encrypted }
    #[wasm_bindgen(getter = compressionLevel)]
    pub fn compression_level(&self) -> Option<i32> { self.compression_level }
    #[wasm_bindgen(getter)]
    pub fn size(&self) -> Option<i32> { self.size }
}

// FilecoinBackupResult struct
#[wasm_bindgen]
pub struct FilecoinBackupResult {
    success: bool,
    metadata: BackupMetadata,
}

#[wasm_bindgen]
impl FilecoinBackupResult {
    #[wasm_bindgen(constructor)]
    pub fn new(success: bool, metadata: BackupMetadata) -> FilecoinBackupResult {
        FilecoinBackupResult { success, metadata }
    }

    #[wasm_bindgen(getter)]
    pub fn success(&self) -> bool { self.success }
    #[wasm_bindgen(getter)]
    pub fn metadata(&self) -> BackupMetadata { self.metadata.clone() } // Now works with Clone
}

#[wasm_bindgen]
pub fn run() -> Result<(), JsValue> {
    console_log("Running filecoin-rs...");
    Ok(())
}

#[wasm_bindgen]
pub fn backup_data(data: &[u8]) -> Result<FilecoinBackupResult, JsValue> {
    let metadata = BackupMetadata::new(
        Some("backup/backup-file".to_string()),
        Some(true),
        None,
        Some(data.len() as i32),
    );
    console_log(&format!("Backup data of size {}", data.len()));
    Ok(FilecoinBackupResult::new(true, metadata))
}

#[wasm_bindgen]
pub fn restore_from_backup(backup_path: &str, destination_path: Option<String>, decryption_key: Option<String>) -> Result<(), JsValue> {
    if let Some(key) = decryption_key {
        console_log(&format!("Restoring with decryption key: {}", key));
    }
    console_log(&format!("Restoring from {} to {:?}", backup_path, destination_path));
    Ok(())
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

fn console_log(s: &str) {
    log(s);
}