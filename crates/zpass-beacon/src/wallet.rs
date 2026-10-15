//! A seeded spending wallet: the beacon wallet (posts roots to its own address,
//! its incoming viewing key is public) and, separately, the challenge wallet
//! (sends enrolment codes; never published). Adapted from sealForge's
//! `sealforge-chain` dev wallet, proven on a local regtest chain.

use std::{num::NonZeroUsize, path::Path, str::FromStr};

use anyhow::{anyhow, Context};
use rand10::{rand_core::UnwrapErr, rngs::SysRng};
use secrecy::{ExposeSecret, SecretVec};
use zcash_address::ZcashAddress;
use zcash_client_backend::{
    data_api::{
        wallet::{
            create_proposed_transactions, decrypt_and_store_transaction,
            input_selection::{GreedyInputSelector, GreedyInputSelectorError, SpendPolicy},
            propose_transfer, ConfirmationsPolicy, SpendingKeys,
        },
        Account, AccountBirthday, TransactionDataRequest, TransactionStatus, WalletCommitmentTrees,
        WalletRead, WalletWrite,
    },
    fees::{standard::MultiOutputChangeStrategy, DustOutputPolicy, SplitPolicy, StandardFeeRule},
    proto::service::{BlockId, RawTransaction, TxFilter},
    sync,
    util::SystemClock,
    wallet::OvkPolicy,
};
use zcash_client_sqlite::{wallet::init::init_wallet_db, WalletDb};
use zcash_keys::keys::{UnifiedAddressRequest, UnifiedSpendingKey};
use zcash_primitives::transaction::Transaction;
use zcash_proofs::prover::LocalTxProver;
use zcash_protocol::{
    consensus::{BlockHeight, BranchId},
    memo::{Memo, MemoBytes},
    value::Zatoshis,
    ShieldedPool,
};
use zip321::{Payment, TransactionRequest};

use crate::{cache::MemBlockCache, ChainParams, Client};

/// The OS RNG, as the wallet library recommends: nothing to seed or leak.
type Rng = UnwrapErr<SysRng>;
type Db = WalletDb<rusqlite::Connection, ChainParams, SystemClock, Rng>;

fn rng() -> Rng {
    UnwrapErr(SysRng)
}

pub struct SpendingWallet {
    db: Db,
    params: ChainParams,
    usk: UnifiedSpendingKey,
}

impl SpendingWallet {
    /// Open the wallet at `path`, creating it from `seed` (born at `birthday_height`)
    /// the first time.
    pub async fn open_or_create(
        path: &Path,
        params: ChainParams,
        seed: &[u8; 32],
        birthday_height: u32,
        client: &mut Client,
    ) -> anyhow::Result<Self> {
        let existed = path.exists();
        let mut db = WalletDb::for_path(path, params, SystemClock, rng())
            .with_context(|| format!("opening wallet db {}", path.display()))?;
        init_wallet_db(&mut db, None).map_err(|e| anyhow!("initialising wallet db: {e:?}"))?;
        let seed = SecretVec::new(seed.to_vec());
        let usk = if existed {
            UnifiedSpendingKey::from_seed(&params, seed.expose_secret(), zip32::AccountId::ZERO)
                .map_err(|e| anyhow!("{e:?}"))?
        } else {
            let tree_state = client
                .get_tree_state(BlockId {
                    height: u64::from(birthday_height.saturating_sub(1)),
                    hash: vec![],
                })
                .await?
                .into_inner();
            let birthday = AccountBirthday::from_treestate(tree_state, None)
                .map_err(|e| anyhow!("birthday: {e:?}"))?;
            let (_, usk) = db
                .create_account("zpass", &seed, &birthday, None)
                .map_err(|e| anyhow!("creating account: {e:?}"))?;
            usk
        };
        Ok(Self { db, params, usk })
    }

    /// Unified Address with an Orchard receiver (received into Ironwood).
    pub fn address(&self) -> anyhow::Result<String> {
        let (ua, _) = self
            .usk
            .to_unified_full_viewing_key()
            .default_address(UnifiedAddressRequest::ORCHARD)
            .map_err(|e| anyhow!("{e:?}"))?;
        Ok(ua.encode(&self.params))
    }

    /// Unified incoming viewing key: the beacon publishes this so anyone can
    /// read the roots it posts to itself. It does not reveal what it spends.
    pub fn uivk(&self) -> anyhow::Result<String> {
        self.usk
            .to_unified_full_viewing_key()
            .to_unified_incoming_viewing_key()
            .encode(&self.params)
            .map_err(|e| anyhow!("encoding viewing key: {e:?}"))
    }

    pub async fn sync(&mut self, client: &mut Client) -> anyhow::Result<()> {
        let cache = MemBlockCache::default();
        sync::run(client, &self.params, &cache, &mut self.db, 1_000)
            .await
            .map_err(|e| anyhow!("sync failed: {e}"))?;
        self.enhance(client).await
    }

    /// Fetch full transactions the wallet asked for (memos, statuses).
    async fn enhance(&mut self, client: &mut Client) -> anyhow::Result<()> {
        for _ in 0..10 {
            let requests = self
                .db
                .transaction_data_requests()
                .map_err(|e| anyhow!("listing data requests: {e:?}"))?;
            if requests.is_empty() {
                return Ok(());
            }
            for request in requests {
                let txid = match &request {
                    TransactionDataRequest::GetStatus(txid)
                    | TransactionDataRequest::Enhancement(txid) => *txid,
                    _ => continue,
                };
                let raw = match client
                    .get_transaction(TxFilter {
                        block: None,
                        index: 0,
                        hash: txid.as_ref().to_vec(),
                    })
                    .await
                {
                    Ok(r) => r.into_inner(),
                    Err(status) if status.code() == tonic::Code::NotFound => {
                        self.db
                            .set_transaction_status(txid, TransactionStatus::TxidNotRecognized)
                            .map_err(|e| anyhow!("{e:?}"))?;
                        continue;
                    }
                    Err(status) => return Err(status.into()),
                };
                let mined = (raw.height > 0 && raw.height < u64::from(u32::MAX))
                    .then(|| BlockHeight::from_u32(raw.height as u32));
                match request {
                    TransactionDataRequest::GetStatus(_) => {
                        let status = match mined {
                            Some(h) => TransactionStatus::Mined(h),
                            None => TransactionStatus::NotInMainChain,
                        };
                        self.db
                            .set_transaction_status(txid, status)
                            .map_err(|e| anyhow!("{e:?}"))?;
                    }
                    _ => {
                        let height = match mined {
                            Some(h) => h,
                            None => {
                                self.db
                                    .chain_height()
                                    .map_err(|e| anyhow!("{e:?}"))?
                                    .ok_or_else(|| anyhow!("wallet has no chain tip"))?
                                    + 1
                            }
                        };
                        let tx = Transaction::read(
                            &raw.data[..],
                            BranchId::for_height(&self.params, height),
                        )
                        .context("parsing transaction")?;
                        decrypt_and_store_transaction(&self.params, &mut self.db, &tx, mined)
                            .map_err(|e| anyhow!("storing transaction: {e:?}"))?;
                    }
                }
            }
        }
        Ok(())
    }

    fn account_id(&self) -> anyhow::Result<<Db as WalletRead>::AccountId> {
        let ours = self
            .usk
            .to_unified_full_viewing_key()
            .orchard()
            .map(|k| k.to_bytes());
        self.db
            .get_account_ids()
            .map_err(|e| anyhow!("{e:?}"))?
            .into_iter()
            .find(|id| {
                self.db
                    .get_account(*id)
                    .ok()
                    .flatten()
                    .and_then(|a| a.ufvk().cloned())
                    .is_some_and(|ufvk| ufvk.orchard().map(|k| k.to_bytes()) == ours)
            })
            .ok_or_else(|| anyhow!("wallet account not found"))
    }

    /// Spendable balance in zatoshi.
    pub fn spendable_zat(&self) -> anyhow::Result<u64> {
        let summary = self
            .db
            .get_wallet_summary(ConfirmationsPolicy::MIN)
            .map_err(|e| anyhow!("{e:?}"))?
            .ok_or_else(|| anyhow!("wallet not synced"))?;
        let id = self.account_id()?;
        Ok(summary
            .account_balances()
            .get(&id)
            .map(|b| u64::from(b.spendable_value()))
            .unwrap_or(0))
    }

    /// Send `amount_zat` to `to` with a text memo. Returns the txid (display order).
    pub async fn send(
        &mut self,
        client: &mut Client,
        to: &str,
        amount_zat: u64,
        memo: &str,
    ) -> anyhow::Result<String> {
        let payment = Payment::new(
            ZcashAddress::from_str(to).map_err(|e| anyhow!("bad recipient: {e}"))?,
            Some(Zatoshis::from_u64(amount_zat).map_err(|_| anyhow!("bad amount"))?),
            Some(MemoBytes::from(
                Memo::from_str(memo).map_err(|e| anyhow!("bad memo: {e:?}"))?,
            )),
            None,
            None,
            vec![],
        )
        .map_err(|e| anyhow!("payment: {e:?}"))?;
        let request =
            TransactionRequest::new(vec![payment]).map_err(|e| anyhow!("request: {e:?}"))?;
        let change = MultiOutputChangeStrategy::new(
            StandardFeeRule::Zip317,
            None,
            ShieldedPool::Ironwood,
            DustOutputPolicy::default(),
            SplitPolicy::with_min_output_value(NonZeroUsize::MIN, Zatoshis::const_from_u64(10_000)),
        );
        let account = self.account_id()?;
        let proposal = propose_transfer::<_, _, _, _, <Db as WalletCommitmentTrees>::Error>(
            &mut self.db,
            &self.params,
            account,
            &GreedyInputSelector::new(),
            &change,
            request,
            ConfirmationsPolicy::MIN,
            &SpendPolicy::default(),
            None,
            None,
        )
        .map_err(|e| anyhow!("proposing: {e}"))?;
        let prover = LocalTxProver::bundled();
        let txids = create_proposed_transactions::<
            _,
            _,
            GreedyInputSelectorError,
            _,
            std::convert::Infallible,
            _,
        >(
            &mut self.db,
            &self.params,
            &SystemClock,
            &mut rng(),
            &prover,
            &prover,
            &SpendingKeys::from_unified_spending_key(self.usk.clone()),
            OvkPolicy::Sender,
            &proposal,
            None,
        )
        .map_err(|e| anyhow!("building: {e}"))?;
        let txid = *txids.first();
        let tx = self
            .db
            .get_transaction(txid)
            .map_err(|e| anyhow!("{e:?}"))?
            .context("built transaction not found")?;
        let mut raw = RawTransaction::default();
        tx.write(&mut raw.data)?;
        let response = client.send_transaction(raw).await?.into_inner();
        if response.error_code != 0 {
            return Err(anyhow!(
                "broadcast failed ({}): {}",
                response.error_code,
                response.error_message
            ));
        }
        Ok(txid.to_string())
    }
}
