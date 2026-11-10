import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authErrorMessage, isValidEmail, newPasswordProblem } from "./authForm";

describe("isValidEmail", () => {
  it("accepts an address with surrounding spaces", () => {
    assert.equal(isValidEmail(" user@example.com "), true);
  });

  it("rejects text without a domain", () => {
    assert.equal(isValidEmail("user@example"), false);
    assert.equal(isValidEmail("user"), false);
  });
});

describe("newPasswordProblem", () => {
  it("requires six characters and a matching repeat", () => {
    assert.match(newPasswordProblem("12345", "12345") ?? "", /щонайменше 6/);
    assert.match(newPasswordProblem("123456", "123457") ?? "", /не збігаються/);
    assert.equal(newPasswordProblem("123456", "123456"), null);
  });
});

describe("authErrorMessage", () => {
  it("explains a lost connection on web and native", () => {
    assert.match(authErrorMessage(new Error("Failed to fetch")), /зв'язку/);
    assert.match(authErrorMessage(new Error("Network request failed")), /зв'язку/);
  });

  it("translates a rejected form and keeps server messages", () => {
    assert.match(authErrorMessage(new Error("Invalid request")), /Перевірте/);
    assert.equal(authErrorMessage(new Error("Поточний пароль введено неправильно.")), "Поточний пароль введено неправильно.");
  });
});
