import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
// @ts-ignore - wordlist module exists at runtime
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { HDKey } from "@scure/bip32";
import type { WalletConfig } from "../providers/types";

const DEFAULT_EVM_PATH = "m/44'/60'/0'/0/0";
const DEFAULT_SOLANA_PATH = "m/44'/501'/0'/0'";

export interface DerivedKeys {
  evmPrivateKey?: Uint8Array;
  solanaPrivateKey?: Uint8Array;
  mnemonic?: string;
}

export function deriveKeys(config: WalletConfig): DerivedKeys {
  const providers = config.providers ?? ["evm", "solana"];
  const needsEvm = providers.includes("evm");
  const needsSolana = providers.includes("solana");

  if (config.generate) {
    return deriveFromMnemonic(generateMnemonic(wordlist, 128), config, needsEvm, needsSolana);
  }

  if (config.mnemonic) {
    if (!validateMnemonic(config.mnemonic, wordlist)) {
      throw new Error("Invalid mnemonic phrase");
    }
    return deriveFromMnemonic(config.mnemonic, config, needsEvm, needsSolana);
  }

  if (config.privateKey) {
    return deriveFromPrivateKey(config.privateKey, needsEvm, needsSolana);
  }

  return deriveFromMnemonic(generateMnemonic(wordlist, 128), config, needsEvm, needsSolana);
}

function deriveFromMnemonic(
  mnemonic: string,
  config: WalletConfig,
  needsEvm: boolean,
  needsSolana: boolean
): DerivedKeys {
  const seed = mnemonicToSeedSync(mnemonic);
  const result: DerivedKeys = { mnemonic };

  if (needsEvm) {
    const evmPath = config.hdPath ?? DEFAULT_EVM_PATH;
    const evmKey = HDKey.fromMasterSeed(seed).derive(evmPath);
    if (!evmKey.privateKey) throw new Error("Failed to derive EVM key");
    result.evmPrivateKey = evmKey.privateKey;
  }

  if (needsSolana) {
    const solPath = config.hdPath ?? DEFAULT_SOLANA_PATH;
    const solKey = HDKey.fromMasterSeed(seed).derive(solPath);
    if (!solKey.privateKey) throw new Error("Failed to derive Solana key");
    result.solanaPrivateKey = solKey.privateKey;
  }

  return result;
}

function deriveFromPrivateKey(
  pk: string,
  needsEvm: boolean,
  needsSolana: boolean
): DerivedKeys {
  const result: DerivedKeys = {};
  const cleaned = pk.startsWith("0x") ? pk.slice(2) : pk;
  const bytes = hexToBytes(cleaned);

  if (needsEvm) {
    result.evmPrivateKey = bytes;
  }
  if (needsSolana) {
    result.solanaPrivateKey = bytes;
  }

  return result;
}

function hexToBytes(hex: string): Uint8Array {
  const len = hex.length;
  const bytes = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
