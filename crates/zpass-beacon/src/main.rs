//! `zpass-beacon`: post roots, send challenge notes, and rebuild the root log.

use clap::{Parser, Subcommand};

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

#[derive(Debug, Subcommand)]
enum Command {
    /// Post a group root in a shielded memo to the beacon address (task 2.6).
    Post {
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
    SendChallenge {
        #[arg(long)]
        to: String,
        #[arg(long)]
        code: String,
    },
    /// Rebuild the root log from the beacon's public viewing key and print JSON lines (task 2.7).
    Scan {
        #[arg(long, env = "ZPASS_BEACON_UFVK")]
        ufvk: String,
        #[arg(long, default_value_t = 0)]
        from: u32,
    },
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    let _ = (&cli.endpoint, &cli.network);
    anyhow::bail!(
        "`{:?}` is not implemented yet (see docs/06-IMPLEMENTATION-PLAN.md)",
        cli.command
    )
}
