import { describe, expect, it } from "vitest";
import { deriveItemIdentity } from "./identity";

const master = new Uint8Array(32).fill(7);

describe("deriveItemIdentity", () => {
  it("is deterministic per (group, item)", async () => {
    const a = await deriveItemIdentity(master, "zksnarks-demo", 1234);
    const b = await deriveItemIdentity(master, "zksnarks-demo", 1234);
    expect(a.commitment).toBe(b.commitment);
  });

  it("gives different identities for different items and groups", async () => {
    const a = await deriveItemIdentity(master, "zksnarks-demo", 1);
    const b = await deriveItemIdentity(master, "zksnarks-demo", 2);
    const c = await deriveItemIdentity(master, "zcon7-demo", 1);
    expect(new Set([a.commitment, b.commitment, c.commitment]).size).toBe(3);
  });

  it("rejects short secrets", async () => {
    await expect(deriveItemIdentity(new Uint8Array(8), "g", 1)).rejects.toThrow();
  });
});
