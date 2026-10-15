//! zPass Zcash beacon (docs/02-TRD.md §2.6, docs/05-BACKEND-SCHEMA.md §5.8).
//!
//! - [`memo`]: memo formats shared by the poster, the scanner and the issuer.
//! - [`wallet`]: seeded spending wallets. The beacon wallet posts each group
//!   root to its own address; its incoming viewing key is public. A separate,
//!   private challenge wallet sends enrolment codes, so publishing the beacon
//!   key never reveals which addresses were challenged.
//! - [`scan`]: rebuild the root log from the public viewing key alone.

pub mod cache;
pub mod memo;
pub mod params;
pub mod scan;
pub mod wallet;

pub use params::ChainParams;

use zcash_client_backend::proto::service::compact_tx_streamer_client::CompactTxStreamerClient;

pub type Client = CompactTxStreamerClient<tonic::transport::Channel>;

/// Connect to a lightwalletd-compatible gRPC server, e.g. `http://127.0.0.1:8137`.
pub async fn connect(url: &str) -> anyhow::Result<Client> {
    let channel = tonic::transport::Channel::from_shared(url.to_owned())?
        .connect()
        .await?;
    Ok(CompactTxStreamerClient::new(channel))
}

/// The chain tip height.
pub async fn chain_tip(client: &mut Client) -> anyhow::Result<u32> {
    let block = client
        .get_latest_block(zcash_client_backend::proto::service::ChainSpec {})
        .await?
        .into_inner();
    Ok(block.height as u32)
}
