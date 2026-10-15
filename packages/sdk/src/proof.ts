import { keccak_256 } from "@noble/hashes/sha3";
import { utf8ToBytes } from "@noble/hashes/utils";
import { Group } from "@semaphore-protocol/group";
import type { Identity } from "@semaphore-protocol/identity";
import { generateProof, type SemaphoreProof, verifyProof } from "@semaphore-protocol/proof";

export type { SemaphoreProof };

/**
 * Every zPass group is proven with the depth-20 circuit (up to ~1M members).
 * One artefact set, served from our own origin (scripts/fetch-artifacts.mjs).
 */
export const PROOF_DEPTH = 20;

/** Where the self-hosted artefacts live: a URL in the browser, a path in Node. */
export interface Artifacts {
  wasm: string;
  zkey: string;
}

/** The web app's self-hosted copies (apps/web/public/artifacts). */
export const WEB_ARTIFACTS: Artifacts = {
  wasm: "/artifacts/semaphore-20.wasm",
  zkey: "/artifacts/semaphore-20.zkey",
};

/**
 * The field element a human scope id maps to (docs/05-BACKEND-SCHEMA.md §5.8):
 * keccak256(utf8(scopeId)) >> 8, as a decimal string. Semaphore v4 only fits
 * scope strings up to 31 bytes, and ids like `poll:<uuid>` are longer.
 */
export function scopeHash(scopeId: string): string {
  const digest = keccak_256(utf8ToBytes(scopeId));
  let n = 0n;
  for (const b of digest) n = (n << 8n) | BigInt(b);
  return (n >> 8n).toString();
}

export interface ProveArgs {
  identity: Identity;
  /** Every member commitment of the group, in leaf order (zeroed leaves included). */
  members: (bigint | string)[];
  /** Field element, e.g. a poll option index. */
  message: bigint | string | number;
  /** Field element from {@link scopeHash}. */
  scope: bigint | string;
  artifacts: Artifacts;
}

/**
 * Prove "I am a member of this group" for one scope and message. The proof
 * reveals the group root, the scope's nullifier and the message, nothing else.
 * Always pass self-hosted artefacts: Semaphore otherwise downloads them from a
 * third party, which zPass forbids during proving.
 */
export async function proveMembership(args: ProveArgs): Promise<SemaphoreProof> {
  const group = new Group(args.members.map((m) => BigInt(m)));
  if (group.indexOf(args.identity.commitment) === -1) {
    throw new Error("this identity is not a member of the group");
  }
  return generateProof(
    args.identity,
    group,
    BigInt(args.message),
    BigInt(args.scope),
    PROOF_DEPTH,
    args.artifacts,
  );
}

/** Cryptographic check only. Root freshness, anonymity set and nullifiers are @zpass/verify's job. */
export function checkProof(proof: SemaphoreProof): Promise<boolean> {
  return verifyProof(proof);
}
