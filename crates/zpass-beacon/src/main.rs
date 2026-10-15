//! `zpass-beacon`: post roots, send challenge notes, and rebuild the root log.
//!
//! The issuer calls `post` and `send-challenge` (each with its own wallet);
//! the verifier and anyone else call `scan` with the published viewing key.
//! Every command prints one JSON object (or JSON lines for `scan`).

use std::path::{Path, PathBuf};

use anyhow::{anyhow, bail, Context};
use clap::{Parser, Subcommand};
use serde_json::json;
use zpass_beacon::{
    chain_tip, connect,
    memo::{encode_challenge, BeaconRoot},
    scan::scan_incoming,
    wallet::SpendingWallet,
    ChainParams, Client,
};

/// Amount each memo carries. Root posts pay it back to the beacon itself;
/// a challenge pays it to the holder.
const MEMO_AMOUNT_ZAT: u64 = 10_000;

#[derive(Debug, Parser)]
#[command(name = "zpass-beacon", version, about = "zPass Zcash root beacon")]
struct Cli {
    /// Zaino / lightwalletd gRPC endpoint.
    #[arg(
        long,
        global = true,
        env = "ZPASS_ZAINO_URL",
        default_value = "http://127.0.0.1:8137"
    )]
    endpoint: String,
    /// regtest | testnet | mainnet
    #[arg(long, global = true, env = "ZPASS_NETWORK", default_value = "testnet")]
    network: String,
    #[command(subcommand)]
    command: Command,
}

/// A seeded wallet: its SQLite database and the file holding its 32-byte seed (hex, 0600).
#[derive(Debug, clap::Args)]
struct WalletArgs {
    /// Wallet database (created on first use).
    #[arg(long)]
    wallet: PathBuf,
    /// Seed file. `init` creates it if missing; never commit or share it.
    #[arg(long)]
    seed_file: PathBuf,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Create a wallet (and its seed file if missing). Prints its address and,
    /// for the beacon wallet, the incoming viewing key to publish.
    Init {
        #[command(flatten)]
        w: WalletArgs,
        /// Birthday height (default: the current tip).
        #[arg(long)]
        birthday: Option<u32>,
    },
    /// Sync and print the address, viewing key and spendable balance.
    Info {
        #[command(flatten)]
        w: WalletArgs,
    },
    /// Post a group root in a shielded memo to the beacon's own address (task 2.6).
    Post {
        #[command(flatten)]
        w: WalletArgs,
        #[arg(long)]
        group: String,
        #[arg(long)]
        epoch: u32,
        /// Root as 64 hex chars (big-endian field element).
        #[arg(long)]
        root: String,
        #[arg(long)]
        size: u32,
    },
    /// Send an enrolment challenge memo to a holder's address on record (task 2.3).
    /// Use the challenge wallet, never the beacon wallet.
    SendChallenge {
        #[command(flatten)]
        w: WalletArgs,
        #[arg(long)]
        to: String,
        #[arg(long)]
        code: String,
    },
    /// Rebuild the root log from the beacon's public viewing key; prints JSON lines (task 2.7).
    Scan {
        #[arg(long, env = "ZPASS_BEACON_UIVK")]
        uivk: String,
        #[arg(long, default_value_t = 1)]
        from: u32,
        /// Last block (default: the current tip).
        #[arg(long)]
        to: Option<u32>,
        /// Print every payment and memo, not only beacon roots (debugging,
        /// or a holder checking a challenge with their own viewing key).
        #[arg(long)]
        raw: bool,
    },
}

fn params(network: &str) -> anyhow::Result<ChainParams> {
    Ok(match network {
        "mainnet" => ChainParams::Mainnet,
        "testnet" => ChainParams::Testnet,
        "regtest" => ChainParams::regtest(),
        other => bail!("unknown network {other:?}"),
    })
}

/// Read a seed file, or create one (0600) when `create` is set.
fn seed(path: &Path, create: bool) -> anyhow::Result<[u8; 32]> {
    if !path.exists() {
        if !create {
            bail!("no seed file at {} (run `init` first)", path.display());
        }
        let mut seed = [0u8; 32];
        getrandom(&mut seed)?;
        write_private(path, hex::encode(seed).as_bytes())?;
        return Ok(seed);
    }
    let text =
        std::fs::read_to_string(path).with_context(|| format!("reading {}", path.display()))?;
    hex::decode(text.trim())?
        .try_into()
        .map_err(|_| anyhow!("{} is not a 32-byte hex seed", path.display()))
}

fn getrandom(buf: &mut [u8]) -> anyhow::Result<()> {
    use rand10::TryRng;
    rand10::rngs::SysRng
        .try_fill_bytes(buf)
        .map_err(|e| anyhow!("OS randomness unavailable: {e}"))
}

fn write_private(path: &Path, data: &[u8]) -> anyhow::Result<()> {
    use std::io::Write;
    let mut opts = std::fs::OpenOptions::new();
    opts.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        opts.mode(0o600);
    }
    opts.open(path)
        .with_context(|| format!("creating {}", path.display()))?
        .write_all(data)?;
    Ok(())
}

async fn open(
    w: &WalletArgs,
    params: ChainParams,
    client: &mut Client,
    create: bool,
    birthday: Option<u32>,
) -> anyhow::Result<SpendingWallet> {
    let seed = seed(&w.seed_file, create)?;
    let birthday = match birthday {
        Some(h) => h,
        None => chain_tip(client).await?,
    };
    let mut wallet =
        SpendingWallet::open_or_create(&w.wallet, params, &seed, birthday, client).await?;
    wallet.sync(client).await?;
    Ok(wallet)
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    let params = params(&cli.network)?;
    let mut client = connect(&cli.endpoint).await?;
    let out = match cli.command {
        Command::Init { w, birthday } => {
            let wallet = open(&w, params, &mut client, true, birthday).await?;
            json!({ "address": wallet.address()?, "uivk": wallet.uivk()? })
        }
        Command::Info { w } => {
            let wallet = open(&w, params, &mut client, false, None).await?;
            json!({
                "address": wallet.address()?,
                "uivk": wallet.uivk()?,
                "spendable_zat": wallet.spendable_zat()?,
            })
        }
        Command::Post {
            w,
            group,
            epoch,
            root,
            size,
        } => {
            let root: [u8; 32] = hex::decode(root.trim_start_matches("0x"))?
                .try_into()
                .map_err(|_| anyhow!("root must be 32 bytes (64 hex chars)"))?;
            let memo = BeaconRoot {
                group_slug: group,
                epoch,
                root,
                size,
            }
            .encode()?;
            let mut wallet = open(&w, params, &mut client, false, None).await?;
            let to = wallet.address()?;
            let txid = wallet
                .send(&mut client, &to, MEMO_AMOUNT_ZAT, &memo)
                .await?;
            json!({ "txid": txid, "memo": memo })
        }
        Command::SendChallenge { w, to, code } => {
            let memo = encode_challenge(&code)?;
            let mut wallet = open(&w, params, &mut client, false, None).await?;
            let txid = wallet
                .send(&mut client, &to, MEMO_AMOUNT_ZAT, &memo)
                .await?;
            json!({ "txid": txid })
        }
        Command::Scan {
            uivk,
            from,
            to,
            raw,
        } => {
            let to = match to {
                Some(h) => h,
                None => chain_tip(&mut client).await?,
            };
            for p in scan_incoming(&mut client, params, &uivk, from, to).await? {
                if raw {
                    let mut txid = p.txid;
                    txid.reverse();
                    println!(
                        "{}",
                        json!({
                            "block_height": p.block_height,
                            "txid": hex::encode(txid),
                            "amount_zat": p.amount_zat,
                            "memo": p.memo,
                        })
                    );
                    continue;
                }
                let Some(root) = p.memo.as_deref().and_then(|m| BeaconRoot::decode(m).ok()) else {
                    continue;
                };
                let mut txid = p.txid;
                txid.reverse();
                println!(
                    "{}",
                    json!({
                        "group_slug": root.group_slug,
                        "epoch": root.epoch,
                        "root": hex::encode(root.root),
                        "size": root.size,
                        "block_height": p.block_height,
                        "txid": hex::encode(txid),
                    })
                );
            }
            return Ok(());
        }
    };
    println!("{out}");
    Ok(())
}
