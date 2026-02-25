import { describe, it, expect } from "vitest";
import { SolanaWallet } from "../src/wallet/solana-wallet";

const TEST_SEED = new Uint8Array(32).fill(2);

describe("SolanaWallet", () => {
  it("derives a valid public key from 32-byte seed", () => {
    const wallet = new SolanaWallet(TEST_SEED);
    expect(wallet.publicKeyBase58).toBeTruthy();
    expect(wallet.publicKey.length).toBe(32);
  });

  it("returns a 64-byte secret key", () => {
    const wallet = new SolanaWallet(TEST_SEED);
    expect(wallet.secretKey.length).toBe(64);
  });

  it("signs a message", () => {
    const wallet = new SolanaWallet(TEST_SEED);
    const msg = new TextEncoder().encode("hello");
    const sig = wallet.signMessage(msg);
    expect(sig.length).toBe(64);
  });

  it("produces deterministic signatures", () => {
    const wallet = new SolanaWallet(TEST_SEED);
    const msg = new TextEncoder().encode("test");
    const sig1 = wallet.signMessage(msg);
    const sig2 = wallet.signMessage(msg);
    expect(Array.from(sig1)).toEqual(Array.from(sig2));
  });
});
