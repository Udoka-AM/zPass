/**
 * @zpass/verify (implementation plan task 3.1).
 *
 * A proof is accepted only if (PRD AC6):
 *  1. the Semaphore proof is valid,
 *  2. its Merkle root is a beacon root for the group, within the freshness window,
 *  3. the group size at that root is ≥ minAnonSet,
 *  4. its scope and message match what the caller expects,
 *  5. its nullifier has not been used for the scope (recorded atomically on success).
 */

export type VerifyErrorCode =
  | "INVALID_PROOF"
  | "UNKNOWN_ROOT"
  | "STALE_ROOT"
  | "ANON_SET_TOO_SMALL"
  | "SCOPE_MISMATCH"
  | "MESSAGE_MISMATCH"
  | "NULLIFIER_USED";

/** Semaphore v4 proof as produced by `generateProof`. Field elements are decimal strings. */
export interface MembershipProof {
  merkleTreeDepth: number;
  merkleTreeRoot: string;
  nullifier: string;
  message: string;
  scope: string;
  points: string[];
}

export interface BeaconRoot {
  groupSlug: string;
  epoch: number;
  root: string;
  size: number;
}

/** Roots come only from the Zcash beacon scanner, never from the issuer API. */
export interface RootStore {
  findRoot(groupSlug: string, root: string): Promise<BeaconRoot | undefined>;
  latestEpoch(groupSlug: string): Promise<number | undefined>;
}

export interface NullifierStore {
  /** Atomically record the nullifier. Returns false if it was already used for the scope. */
  consume(scopeId: string, nullifier: string): Promise<boolean>;
}

export interface VerifyOptions {
  group: string;
  /** Human scope id, e.g. "poll:<uuid>" or "tg:<chatId>". */
  scopeId: string;
  /** Field element the proof's scope must equal. */
  scopeHash: string;
  minAnonSet: number;
  /** How many epochs back a root may be. Default 24. */
  rootWindowEpochs?: number;
  /** If set, the proof's message must equal this field element. */
  expectedMessage?: string;
  roots: RootStore;
  nullifiers: NullifierStore;
}

export type VerifyResult =
  | { ok: true; nullifier: string; epoch: number }
  | { ok: false; code: VerifyErrorCode };

export async function verify(_proof: MembershipProof, _opts: VerifyOptions): Promise<VerifyResult> {
  throw new Error("Not implemented: task 3.1");
}
