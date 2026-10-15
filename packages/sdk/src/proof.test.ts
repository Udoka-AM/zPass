import { existsSync } from "node:fs";
import { join } from "node:path";
import { Identity } from "@semaphore-protocol/identity";
import { describe, expect, it } from "vitest";
import { deriveItemIdentity } from "./identity";
import { checkProof, PROOF_DEPTH, proveMembership, scopeHash } from "./proof";

// Self-hosted artefacts (node scripts/fetch-artifacts.mjs). Nothing is downloaded here.
const dir = join(import.meta.dirname, "../../../apps/web/public/artifacts");
const artifacts = {
  wasm: join(dir, "semaphore-20.wasm"),
  zkey: join(dir, "semaphore-20.zkey"),
};
const haveArtifacts = existsSync(artifacts.wasm) && existsSync(artifacts.zkey);

describe("scopeHash", () => {
  it("maps long scope ids to a field element deterministically", () => {
    const a = scopeHash("poll:0b8f6a3e-6f0c-4c62-9d55-0a3f3c1c2b1e");
    expect(a).toBe(scopeHash("poll:0b8f6a3e-6f0c-4c62-9d55-0a3f3c1c2b1e"));
    expect(a).not.toBe(scopeHash("poll:0b8f6a3e-6f0c-4c62-9d55-0a3f3c1c2b1f"));
    // keccak >> 8: at most 248 bits, so always below the BN254 field modulus.
    expect(BigInt(a) < 2n ** 248n).toBe(true);
  });
});

describe.skipIf(!haveArtifacts)("membership proofs (task 1.5 spike)", () => {
  it("proves membership in a 32-member group, verifies, and binds scope and message", async () => {
    const master = new Uint8Array(32).fill(9);
    const me = await deriveItemIdentity(master, "zksnarks-demo", 42);
    const others = Array.from({ length: 31 }, (_, i) => new Identity(`member-${i}`).commitment);
    const members = [...others.slice(0, 17), me.commitment, ...others.slice(17)];
    const scope = scopeHash("poll:demo");

    const started = performance.now();
    const proof = await proveMembership({ identity: me, members, message: 2, scope, artifacts });
    const ms = performance.now() - started;
    console.log(`depth-${PROOF_DEPTH} proof for a 32-member group in ${ms.toFixed(0)} ms (Node)`);

    expect(proof.merkleTreeDepth).toBe(PROOF_DEPTH);
    expect(proof.scope).toBe(scope);
    expect(proof.message).toBe("2");
    expect(await checkProof(proof)).toBe(true);

    // Same identity, same scope: same nullifier (one vote per item and scope).
    const again = await proveMembership({ identity: me, members, message: 1, scope, artifacts });
    expect(again.nullifier).toBe(proof.nullifier);
    // A different scope gives an unlinkable nullifier.
    const other = await proveMembership({
      identity: me,
      members,
      message: 2,
      scope: scopeHash("poll:other"),
      artifacts,
    });
    expect(other.nullifier).not.toBe(proof.nullifier);

    // Tampering with the message breaks the proof.
    expect(await checkProof({ ...proof, message: "3" })).toBe(false);
  }, 60_000);

  it("refuses to prove for a non-member", async () => {
    const outsider = new Identity("outsider");
    await expect(
      proveMembership({
        identity: outsider,
        members: [new Identity("a").commitment, new Identity("b").commitment],
        message: 0,
        scope: scopeHash("poll:x"),
        artifacts,
      }),
    ).rejects.toThrow(/not a member/);
  });
});
