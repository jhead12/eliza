#[cfg(not(target_arch = "wasm32"))]
use std::sync::Arc;
#[cfg(not(target_arch = "wasm32"))]
use crate::MyMachine;
#[cfg(not(target_arch = "wasm32"))]
use fvm_ipld_blockstore::MemoryBlockstore;

#[cfg(not(target_arch = "wasm32"))]
pub fn run_native() {
    let store = MemoryBlockstore::new();
    let blockstore = Arc::new(MemoryBlockstore::default());
    let _machine = MyMachine::new(blockstore, 1024); // Example usage
}