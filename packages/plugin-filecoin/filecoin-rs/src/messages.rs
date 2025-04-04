use cid::Cid;




#[derive(Debug)]
pub enum Message {
    Transfer { to: Cid, amount: u64 },
    Mint { to: Cid, amount: u64 },
    Burn { from: Cid, amount: u64 },
    SetData { key: String, value: String },
    Delegate { from: Cid, to: Cid, permissions: Vec<String> },
    Revoke { from: Cid, to: Cid },
    BatchTransfer { transfers: Vec<(Cid, u64)> },
    QueryBalance { account: Cid },
    Vote { proposal_id: u64, voter: Cid, support: bool },
    Withdraw { from: Cid, amount: u64 },
    Custom { data: Vec<u8> },
}
