import { describe, it, expect } from "bun:test";
import { getDateRange, getRelDateRange } from "./common";
import { trimAccountName } from "./common";

describe("getDateRange", () => {
  it("should return Jan 1 to today for dates after Feb", () => {
    const today = new Date("2024-06-15T12:00:00Z"); // June 15, 2024
    const [start, end] = getDateRange(today);
    expect(start.getFullYear()).toBe(2024);
    expect(start.getMonth()).toBe(0); // January
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(2024);
    expect(end.getMonth()).toBe(5); // June
    expect(end.getDate()).toBe(15);
  });

  it("should return July 1 last year to today for Jan/Feb", () => {
    const today = new Date("2024-01-10T12:00:00Z"); // Jan 10, 2024
    const [start, end] = getDateRange(today);
    expect(start.getFullYear()).toBe(2023);
    expect(start.getMonth()).toBe(6); // July
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(2024);
    expect(end.getMonth()).toBe(0); // January
    expect(end.getDate()).toBe(10);
  });

  it("should move end date to previous Friday if today is Sunday and endOnBusiness=true", () => {
    const today = new Date("2024-06-16T12:00:00Z"); // Sunday
    const [start, end] = getDateRange(today, true);
    expect(end.getDay()).toBe(5); // Friday
    expect(end.getDate()).toBe(14); // June 14, 2024
  });

  it("should move end date to previous Friday if today is Saturday and endOnBusiness=true", () => {
    const today = new Date("2024-06-15T12:00:00Z"); // Saturday
    const [start, end] = getDateRange(today, true);
    expect(end.getDay()).toBe(5); // Friday
    expect(end.getDate()).toBe(14); // June 14, 2024
  });

  it("should move end date to previous business day if today is Monday and endOnBusiness=true", () => {
    const today = new Date("2024-06-17T12:00:00Z"); // Monday
    const [start, end] = getDateRange(today, true);
    expect(end.getDay()).toBe(5); // Friday
    expect(end.getDate()).toBe(14); // June 14, 2024
  });

  it("should move end date to previous day if today is Tuesday and endOnBusiness=true", () => {
    const today = new Date("2024-06-18T12:00:00Z"); // Tuesday
    const [start, end] = getDateRange(today, true);
    expect(end.getDay()).toBe(1); // Monday
    expect(end.getDate()).toBe(17); // June 17, 2024
  });
});

describe("getRelDateRange", () => {
  it("should return correct range for 12 month pushback without endOnBusiness", () => {
    const today = new Date("2024-06-15T12:00:00Z");
    const [start, end] = getRelDateRange(today, 12);
    expect(start.getFullYear()).toBe(2023);
    expect(start.getMonth()).toBe(5); // June
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(2024);
    expect(end.getMonth()).toBe(5); // June
    expect(end.getDate()).toBe(15);
  });
  it("should return correct range for 3 month pushback without endOnBusiness", () => {
    const today = new Date("2024-06-15T12:00:00Z");
    const [start, end] = getRelDateRange(today, 3);
    expect(start.getFullYear()).toBe(2024);
    expect(start.getMonth()).toBe(2); // March
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(2024);
    expect(end.getMonth()).toBe(5); // June
    expect(end.getDate()).toBe(15);
  });

  it("should return correct range for 0 month pushback without endOnBusiness", () => {
    const today = new Date("2024-06-15T12:00:00Z");
    const [start, end] = getRelDateRange(today, 0);
    expect(start.getFullYear()).toBe(2024);
    expect(start.getMonth()).toBe(5); // June
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(2024);
    expect(end.getMonth()).toBe(5); // June
    expect(end.getDate()).toBe(15);
  });

  it("should move end date to previous Friday if today is Sunday and endOnBusiness=true", () => {
    const today = new Date("2024-06-16T12:00:00Z"); // Sunday
    const [start, end] = getRelDateRange(today, 2, true);
    expect(end.getDay()).toBe(5); // Friday
    expect(end.getDate()).toBe(14); // June 14, 2024
    expect(start.getMonth()).toBe(3); // April
    expect(start.getDate()).toBe(1);
  });

  it("should move end date to previous Friday if today is Saturday and endOnBusiness=true", () => {
    const today = new Date("2024-06-15T12:00:00Z"); // Saturday
    const [start, end] = getRelDateRange(today, 1, true);
    expect(end.getDay()).toBe(5); // Friday
    expect(end.getDate()).toBe(14); // June 14, 2024
    expect(start.getMonth()).toBe(4); // May
    expect(start.getDate()).toBe(1);
  });

  it("should move end date to previous business day if today is Monday and endOnBusiness=true", () => {
    const today = new Date("2024-06-17T12:00:00Z"); // Monday
    const [start, end] = getRelDateRange(today, 1, true);
    expect(end.getDay()).toBe(5); // Friday
    expect(end.getDate()).toBe(14); // June 14, 2024
    expect(start.getMonth()).toBe(4); // May
    expect(start.getDate()).toBe(1);
  });

  it("should move end date to previous day if today is Tuesday and endOnBusiness=true", () => {
    const today = new Date("2024-06-18T12:00:00Z"); // Tuesday
    const [start, end] = getRelDateRange(today, 1, true);
    expect(end.getDay()).toBe(1); // Monday
    expect(end.getDate()).toBe(17); // June 17, 2024
    expect(start.getMonth()).toBe(4); // May
    expect(start.getDate()).toBe(1);
  });
});

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
