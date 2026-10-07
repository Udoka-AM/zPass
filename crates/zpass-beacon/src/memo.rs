//! Memo formats (ZIP-302 text memos, ≤ 512 bytes).
//!
//! - Beacon root:  `ZP1:<group_slug>:<epoch>:<root-hex64>:<size>`
//! - Challenge:    `ZPC:<8-char Crockford base32 code>`

use serde::{Deserialize, Serialize};
use thiserror::Error;

pub const MAX_MEMO_BYTES: usize = 512;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum MemoError {
    #[error("memo exceeds {MAX_MEMO_BYTES} bytes")]
    TooLong,
    #[error("not a zPass memo")]
    BadPrefix,
    #[error("malformed memo")]
    BadShape,
    #[error("invalid group slug")]
    BadSlug,
    #[error("invalid root")]
    BadRoot,
    #[error("invalid challenge code")]
    BadCode,
}

/// A group root published to the beacon.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct BeaconRoot {
    pub group_slug: String,
    pub epoch: u32,
    /// BN254 field element, big-endian.
    pub root: [u8; 32],
    pub size: u32,
}

fn valid_slug(s: &str) -> bool {
    (3..=32).contains(&s.len())
        && s.bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}

fn valid_code(s: &str) -> bool {
    s.len() == 8
        && s.bytes().all(|b| {
            matches!(b, b'0'..=b'9' | b'A'..=b'H' | b'J' | b'K' | b'M' | b'N' | b'P'..=b'T' | b'V'..=b'Z')
        })
}

impl BeaconRoot {
    pub fn encode(&self) -> Result<String, MemoError> {
        if !valid_slug(&self.group_slug) {
            return Err(MemoError::BadSlug);
        }
        Ok(format!(
            "ZP1:{}:{}:{}:{}",
            self.group_slug,
            self.epoch,
            hex::encode(self.root),
            self.size
        ))
    }

    pub fn decode(memo: &str) -> Result<Self, MemoError> {
        let memo = memo.trim_end_matches('\0');
        if memo.len() > MAX_MEMO_BYTES {
            return Err(MemoError::TooLong);
        }
        let parts: Vec<&str> = memo.split(':').collect();
        let [prefix, slug, epoch, root, size] = parts.as_slice() else {
            return Err(MemoError::BadShape);
        };
        if *prefix != "ZP1" {
            return Err(MemoError::BadPrefix);
        }
        if !valid_slug(slug) {
            return Err(MemoError::BadSlug);
        }
        let root: [u8; 32] = hex::decode(root)
            .ok()
            .and_then(|b| b.try_into().ok())
            .ok_or(MemoError::BadRoot)?;
        Ok(Self {
            group_slug: (*slug).to_owned(),
            epoch: epoch.parse().map_err(|_| MemoError::BadShape)?,
            root,
            size: size.parse().map_err(|_| MemoError::BadShape)?,
        })
    }
}

/// Encode an enrolment challenge memo.
pub fn encode_challenge(code: &str) -> Result<String, MemoError> {
    if !valid_code(code) {
        return Err(MemoError::BadCode);
    }
    Ok(format!("ZPC:{code}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn beacon_round_trip() {
        let r = BeaconRoot {
            group_slug: "zksnarks-demo".into(),
            epoch: 42,
            root: [0x1f; 32],
            size: 57,
        };
        let memo = r.encode().unwrap();
        assert_eq!(memo, format!("ZP1:zksnarks-demo:42:{}:57", "1f".repeat(32)));
        assert_eq!(BeaconRoot::decode(&format!("{memo}\0\0")).unwrap(), r);
    }

    #[test]
    fn beacon_rejects_bad_memos() {
        assert_eq!(BeaconRoot::decode("SF1:x"), Err(MemoError::BadShape));
        assert_eq!(
            BeaconRoot::decode(&format!("ZP2:abc:1:{}:1", "00".repeat(32))),
            Err(MemoError::BadPrefix)
        );
        assert_eq!(
            BeaconRoot::decode(&format!("ZP1:AB:1:{}:1", "00".repeat(32))),
            Err(MemoError::BadSlug)
        );
        assert_eq!(
            BeaconRoot::decode("ZP1:abc:1:00:1"),
            Err(MemoError::BadRoot)
        );
    }

    #[test]
    fn challenge_codes() {
        assert_eq!(encode_challenge("7K3QX9MZ").unwrap(), "ZPC:7K3QX9MZ");
        assert_eq!(encode_challenge("7K3QX9MI"), Err(MemoError::BadCode));
        assert_eq!(encode_challenge("short"), Err(MemoError::BadCode));
    }
}
