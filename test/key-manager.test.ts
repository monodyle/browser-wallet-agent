import { describe, it, expect } from "vitest";
import { deriveKeys, bytesToHex } from "../src/wallet/key-manager";
import type { WalletConfig } from "../src/providers/types";

describe("deriveKeys", () => {
  it("generates a fresh wallet with mnemonic when generate=true", () => {
    const config: WalletConfig = { generate: true, providers: ["evm", "solana"] };
    const keys = deriveKeys(config);

    expect(keys.mnemonic).toBeDefined();
    expect(keys.mnemonic!.split(" ").length).toBe(12);
    expect(keys.evmPrivateKey).toBeDefined();
    expect(keys.evmPrivateKey!.length).toBe(32);
    expect(keys.solanaPrivateKey).toBeDefined();
    expect(keys.solanaPrivateKey!.length).toBe(32);
  });

  it("derives EVM key only when providers=['evm']", () => {
    const config: WalletConfig = { generate: true, providers: ["evm"] };
    const keys = deriveKeys(config);

    expect(keys.evmPrivateKey).toBeDefined();
    expect(keys.solanaPrivateKey).toBeUndefined();
  });

  it("derives Solana key only when providers=['solana']", () => {
    const config: WalletConfig = { generate: true, providers: ["solana"] };
    const keys = deriveKeys(config);

    expect(keys.evmPrivateKey).toBeUndefined();
    expect(keys.solanaPrivateKey).toBeDefined();
  });

  it("derives from a known mnemonic deterministically", () => {
    const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const config: WalletConfig = { mnemonic, providers: ["evm", "solana"] };

    const keys1 = deriveKeys(config);
    const keys2 = deriveKeys(config);

    expect(bytesToHex(keys1.evmPrivateKey!)).toBe(bytesToHex(keys2.evmPrivateKey!));
    expect(bytesToHex(keys1.solanaPrivateKey!)).toBe(bytesToHex(keys2.solanaPrivateKey!));
  });

  it("derives from a private key hex string", () => {
    const pk = "0x" + "ab".repeat(32);
    const config: WalletConfig = { privateKey: pk, providers: ["evm"] };
    const keys = deriveKeys(config);

    expect(keys.evmPrivateKey).toBeDefined();
    expect(bytesToHex(keys.evmPrivateKey!)).toBe("ab".repeat(32));
    expect(keys.mnemonic).toBeUndefined();
  });

  it("throws on invalid mnemonic", () => {
    const config: WalletConfig = { mnemonic: "invalid mnemonic phrase", providers: ["evm"] };
    expect(() => deriveKeys(config)).toThrow("Invalid mnemonic phrase");
  });

  it("falls back to generating when no key source is provided", () => {
    const config: WalletConfig = { providers: ["evm"] };
    const keys = deriveKeys(config);

    expect(keys.mnemonic).toBeDefined();
    expect(keys.evmPrivateKey).toBeDefined();
  });
});

describe("bytesToHex", () => {
  it("converts bytes to hex string", () => {
    expect(bytesToHex(new Uint8Array([0, 1, 15, 255]))).toBe("00010fff");
  });
});
