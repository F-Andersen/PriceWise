import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canResendResetCode, generateResetCode, hashResetCode, isResetCodeCorrect, isTokenVersionCurrent, RESET_RESEND_INTERVAL_MS } from "./passwordReset";

describe("generateResetCode", () => {
  it("is always six digits", () => {
    for (let i = 0; i < 200; i += 1) assert.match(generateResetCode(), /^\d{6}$/);
  });
});

describe("isResetCodeCorrect", () => {
  const stored = hashResetCode("012345", "secret");

  it("accepts the right code", () => {
    assert.equal(isResetCodeCorrect("012345", stored, "secret"), true);
  });

  it("rejects another code or a hash made with another key", () => {
    assert.equal(isResetCodeCorrect("012346", stored, "secret"), false);
    assert.equal(isResetCodeCorrect("012345", stored, "other"), false);
  });

  it("does not store the code itself", () => {
    assert.equal(stored.includes("012345"), false);
  });
});

describe("canResendResetCode", () => {
  const now = new Date("2026-11-10T12:00:00Z");

  it("allows the first code", () => {
    assert.equal(canResendResetCode(null, now), true);
  });

  it("waits for the interval between codes", () => {
    assert.equal(canResendResetCode(new Date(now.getTime() - 1000), now), false);
    assert.equal(canResendResetCode(new Date(now.getTime() - RESET_RESEND_INTERVAL_MS), now), true);
  });
});

describe("isTokenVersionCurrent", () => {
  it("keeps sessions issued before versions existed while the password is unchanged", () => {
    assert.equal(isTokenVersionCurrent(undefined, 0), true);
  });

  it("ends sessions from before a password change", () => {
    assert.equal(isTokenVersionCurrent(undefined, 1), false);
    assert.equal(isTokenVersionCurrent(0, 1), false);
    assert.equal(isTokenVersionCurrent(1, 1), true);
  });
});
