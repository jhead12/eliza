use crate::messages::Message;
use cid::Cid;
use std::collections::HashMap;

#[derive(Debug)]
pub struct ActorState {
    pub balance: u64,
    accounts: HashMap<Cid, ActorAccount>,
}

#[derive(Debug)]
struct ActorAccount {
    balance: u64,
}

impl ActorAccount {
    fn delegate(&mut self, _to: Cid, _permissions: Vec<String>) {
        unimplemented!()
    }

    fn revoke(&mut self, _to: Cid) {
        unimplemented!()
    }

    fn vote(&mut self, proposal_id: String, support: bool) {
        // Adjusted to expect String for proposal_id
        unimplemented!()
    }

    fn withdraw(&mut self, _amount: &u64) {
        unimplemented!()
    }
}

impl ActorState {
    pub fn new() -> Self {
        ActorState {
            balance: 0,
            accounts: HashMap::new(),
        }
    }

    pub fn set_data(&mut self, key: String, value: Vec<u8>) {
        println!("Setting data: key = {}, value = {:?}", key, value);
    }

    pub fn handle_message(&mut self, msg: &Message) {
        match msg {
            Message::Transfer { to, amount } => {
                if let Some(account) = self.get_account(to.clone()) {
                    account.balance += amount;
                }
                self.balance -= amount;
            }
            Message::Mint { to, amount } => {
                if let Some(account) = self.get_account(to.clone()) {
                    account.balance += amount;
                }
            }
            Message::Burn { from, amount } => {
                if let Some(account) = self.get_account(from.clone()) {
                    if account.balance >= *amount {
                        account.balance -= amount;
                    }
                }
            }
            Message::SetData { key, value } => {
                self.set_data(key.clone(), value.clone().into());
            }
            Message::Delegate { from, to, permissions } => {
                if let Some(from_account) = self.get_account(from.clone()) {
                    from_account.delegate(to.clone(), permissions.clone());
                }
            }
            Message::Revoke { from, to } => {
                if let Some(from_account) = self.get_account(from.clone()) {
                    from_account.revoke(to.clone());
                }
            }
            Message::BatchTransfer { transfers } => {
                for &(to, amount) in transfers {
                    self.handle_message(&Message::Transfer { to, amount });
                }
            }
            Message::QueryBalance { account } => {
                if let Some(account) = self.get_account(account.clone()) {
                    // Use {:?} for Debug formatting instead of Display
                    println!("Balance of {:?}: {}", account, account.balance);
                }
            }
            Message::Vote { proposal_id, voter, support } => {
                if let Some(voter_account) = self.get_account(voter.clone()) {
                    // Convert u64 to String if needed, or adjust Message::Vote type
                    voter_account.vote(proposal_id.to_string(), *support);
                }
            }
            Message::Withdraw { from, amount } => {
                if let Some(account) = self.get_account(from.clone()) {
                    account.withdraw(amount);
                }
            }
            Message::Custom { data } => {
                println!("Received custom message: {:?}", data);
            }
        }
    }

    fn get_account(&mut self, account_id: Cid) -> Option<&mut ActorAccount> {
        self.accounts
            .entry(account_id)
            .or_insert(ActorAccount { balance: 0 })
            .into()
    }
}