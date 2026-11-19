import { describe, expect, it } from "vitest";
import { looksLikeSecret } from "./secrets";
import { likePattern } from "./queries/search";

describe("looksLikeSecret", () => {
  it.each([
    "CMS login password: hunter2",
    "pwd=abc123",
    "api_key: 1234abcd",
    "sb_secret_abcdefghijklmnop",
    "-----BEGIN RSA PRIVATE KEY-----",
    "token = eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
    "here: AbCdEfGhIjKlMnOpQrStUvWxYz0123456789AbCdEf==",
  ])("flags %s", (text) => {
    expect(looksLikeSecret(text)).not.toBeNull();
  });

  it.each([
    "Verified CMS admin access with the Systems Analyst",
    "Password reset process documented; access confirmed",
    "https://www.gov.kn/wp-content/themes/govkn/assets/images/hero-banner",
    "Switched Solarise test environment to the backend database",
  ])("allows %s", (text) => {
    expect(looksLikeSecret(text)).toBeNull();
  });
});

describe("likePattern", () => {
  it("escapes LIKE wildcards", () => {
    expect(likePattern("50%_done")).toBe("%50\\%\\_done%");
  });
});
