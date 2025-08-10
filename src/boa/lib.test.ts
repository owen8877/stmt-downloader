import { trimAccountName } from "./lib";
import { describe, it, expect } from "bun:test";

describe("trimAccountName", () => {
  it("should trim leading and trailing spaces", () => {
    expect(trimAccountName("  My Account  ")).toBe("MyAccount");
  });

  it("should replace spaces with underscores", () => {
    expect(trimAccountName("Checking Account")).toBe("CheckingAccount");
  });

  it("should replace multiple spaces and hyphens with a single underscore", () => {
    expect(trimAccountName("Savings  -  Account")).toBe("SavingsAccount");
    expect(trimAccountName("A  - B -  C")).toBe("ABC");
  });

  it("should handle names with no spaces or hyphens", () => {
    expect(trimAccountName("Account123")).toBe("Account123");
  });

  it("should handle empty string", () => {
    expect(trimAccountName("")).toBe("");
  });

  it("should handle string with only spaces and hyphens", () => {
    expect(trimAccountName("   -   ")).toBe("");
  });
});
