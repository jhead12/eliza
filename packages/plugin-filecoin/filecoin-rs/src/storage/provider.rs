use async_trait::async_trait;

#[async_trait]
pub trait StorageProvider {
    async fn upload(&self, data: Vec<u8>) -> Result<String, String>; // Returns CID
    async fn download(&self, cid: &str) -> Result<Vec<u8>, String>;
}