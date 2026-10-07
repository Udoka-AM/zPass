import { Identity } from "@semaphore-protocol/identity";

const encoder = new TextEncoder();

/**
 * Derive the identity for one held item from the vault's master secret
 * (docs/05-BACKEND-SCHEMA.md §5.6):
 *
 *   identity(g, n) = Identity(HKDF-SHA256(master, info = "zpass/v1/" + g + "/" + n))
 *
 * One identity per item gives "one vote per item" without the server learning
 * which items share an owner. Runs entirely on the client.
 */
export async function deriveItemIdentity(
  masterSecret: Uint8Array,
  groupSlug: string,
  itemNumber: number,
): Promise<Identity> {
  if (masterSecret.length < 32) throw new Error("master secret must be at least 32 bytes");
  const key = await crypto.subtle.importKey("raw", masterSecret as BufferSource, "HKDF", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: encoder.encode(`zpass/v1/${groupSlug}/${itemNumber}`),
    },
    key,
    256,
  );
  return new Identity(new Uint8Array(bits));
}

/** Generate a fresh 32-byte master secret for a new vault. */
export function generateMasterSecret(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}
