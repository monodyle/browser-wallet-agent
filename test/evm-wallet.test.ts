import { describe, it, expect } from "vitest";
import { EVMWallet } from "../src/wallet/evm-wallet";

const TEST_KEY = new Uint8Array(32).fill(1);

describe("EVMWallet", () => {
  it("derives a valid Ethereum address", () => {
    const wallet = new EVMWallet(TEST_KEY);
    expect(wallet.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("returns consistent address", () => {
    const wallet = new EVMWallet(TEST_KEY);
    expect(wallet.address).toBe(wallet.address);
  });

  it("signs a message", async () => {
    const wallet = new EVMWallet(TEST_KEY);
    const sig = await wallet.signMessage("hello");
    expect(sig).toMatch(/^0x[0-9a-fA-F]+$/);
    expect(sig.length).toBe(132); // 65 bytes = 130 hex chars + 0x prefix
  });

  it("signs a transaction", async () => {
    const wallet = new EVMWallet(TEST_KEY);
    const signed = await wallet.signTransaction({
      to: "0x0000000000000000000000000000000000000001",
      value: "0x0",
      gasLimit: "0x5208",
      gasPrice: "0x3B9ACA00",
      nonce: 0,
      chainId: 1,
    });
    expect(signed).toMatch(/^0x/);
  });
});
