use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Listener {
    pub protocol: String,
    pub local_addr: String,
    pub port: u16,
    pub pid: u32,
    pub process_name: String,
    pub path: Option<String>,
    pub company: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum PortGuardError {
    #[error("{0}")]
    Message(String),
}

pub type Result<T> = std::result::Result<T, PortGuardError>;

pub fn list_listeners() -> Result<Vec<Listener>> {
    Ok(vec![])
}

pub fn listeners_on_port(port: u16) -> Result<Vec<Listener>> {
    Ok(list_listeners()?.into_iter().filter(|l| l.port == port).collect())
}

pub fn kill_pid(_pid: u32) -> Result<()> {
    Err(PortGuardError::Message("not implemented".into()))
}
