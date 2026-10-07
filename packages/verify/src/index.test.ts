import { describe, expect, it } from "vitest";
import type { VerifyErrorCode } from "./index";

describe("@zpass/verify", () => {
  it("exposes every rejection code from the implementation plan", () => {
    const codes: VerifyErrorCode[] = [
      "INVALID_PROOF",
      "UNKNOWN_ROOT",
      "STALE_ROOT",
      "ANON_SET_TOO_SMALL",
      "SCOPE_MISMATCH",
      "MESSAGE_MISMATCH",
      "NULLIFIER_USED",
    ];
    expect(codes).toHaveLength(7);
  });

  it.todo("task 3.1: one test per rejection code with fixture proofs");
});
