import { SolanaWallet } from "../wallet/solana-wallet";
import {
  type ConfirmMode,
  type LogLevel,
  ProviderRpcError,
  RPC_ERRORS,
} from "./types";
import bs58 from "bs58";

interface SolanaProviderConfig {
  wallet: SolanaWallet;
  cluster: string;
  confirmMode: ConfirmMode;
  logLevel: LogLevel;
}

type Listener = (...args: any[]) => void;

const CLUSTER_URLS: Record<string, string> = {
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  localnet: "http://localhost:8899",
};

/**
 * Lightweight PublicKey implementation for the provider interface.
 * Avoids importing the full @solana/web3.js just for this type.
 */
class PublicKeyLike {
  private _bytes: Uint8Array;
  private _base58: string;

  constructor(value: Uint8Array | string) {
    if (typeof value === "string") {
      this._bytes = bs58.decode(value);
      this._base58 = value;
    } else {
      this._bytes = value;
      this._base58 = bs58.encode(value);
    }
  }

  toBytes(): Uint8Array {
    return this._bytes;
  }

  toBase58(): string {
    return this._base58;
  }

  toString(): string {
    return this._base58;
  }

  toJSON(): string {
    return this._base58;
  }

  equals(other: PublicKeyLike): boolean {
    return this._base58 === other._base58;
  }

  toBuffer(): Buffer {
    return Buffer.from(this._bytes);
  }
}

export class InjectedSolanaProvider {
  readonly isPhantom = true;
  readonly _isInjectedTestWallet = true;

  private wallet: SolanaWallet;
  private _clusterUrl: string;
  private confirmMode: ConfirmMode;
  private logLevel: LogLevel;
  private _isConnected = false;
  private _publicKey: PublicKeyLike;
  private listeners: Map<string, Set<Listener>> = new Map();

  constructor(config: SolanaProviderConfig) {
    this.wallet = config.wallet;
    this._clusterUrl = CLUSTER_URLS[config.cluster] ?? config.cluster;
    this.confirmMode = config.confirmMode;
    this.logLevel = config.logLevel;
    this._publicKey = new PublicKeyLike(this.wallet.publicKey);
  }

  get publicKey(): PublicKeyLike | null {
    return this._isConnected ? this._publicKey : null;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: PublicKeyLike }> {
    if (this._isConnected) {
      return { publicKey: this._publicKey };
    }

    this.log("info", `Connecting wallet: ${this.wallet.publicKeyBase58}`);
    this._isConnected = true;
    this.emit("connect", this._publicKey);
    return { publicKey: this._publicKey };
  }

  async disconnect(): Promise<void> {
    this._isConnected = false;
    this.log("info", "Disconnected");
    this.emit("disconnect");
  }

  async signTransaction(transaction: any): Promise<any> {
    this.requireConnected();
    this.requireConfirmation("signTransaction");

    if (typeof transaction.serialize === "function" && typeof transaction.addSignature === "function") {
      const message = transaction.serializeMessage();
      const signature = this.wallet.signTransaction(message);
      transaction.addSignature(this._publicKey, Buffer.from(signature));
      return transaction;
    }

    // Fallback: sign raw bytes
    if (transaction instanceof Uint8Array) {
      const sig = this.wallet.signTransaction(transaction);
      return sig;
    }

    throw new ProviderRpcError(
      RPC_ERRORS.INVALID_PARAMS,
      "Transaction must have serialize/addSignature methods or be Uint8Array"
    );
  }

  async signAllTransactions(transactions: any[]): Promise<any[]> {
    this.requireConnected();
    this.requireConfirmation("signAllTransactions");
    return Promise.all(transactions.map((tx) => this.signTransaction(tx)));
  }

  async signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }> {
    this.requireConnected();
    this.requireConfirmation("signMessage");

    const signature = this.wallet.signMessage(message);
    this.log("info", "Signed message");
    return { signature };
  }

  async signAndSendTransaction(
    transaction: any,
    options?: { skipPreflight?: boolean; preflightCommitment?: string }
  ): Promise<{ signature: string }> {
    this.requireConnected();
    this.requireConfirmation("signAndSendTransaction");

    const signed = await this.signTransaction(transaction);
    const serialized = typeof signed.serialize === "function"
      ? signed.serialize()
      : signed;

    const encodedTx = typeof serialized === "string"
      ? serialized
      : bs58.encode(serialized instanceof Uint8Array ? serialized : new Uint8Array(serialized));

    const result = await this.rpcCall("sendTransaction", [
      encodedTx,
      {
        encoding: "base58",
        skipPreflight: options?.skipPreflight ?? false,
        preflightCommitment: options?.preflightCommitment ?? "confirmed",
      },
    ]);

    this.log("info", `Transaction sent: ${result}`);
    return { signature: result };
  }

  // -- Event emitter --

  on(event: string, listener: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  removeListener(event: string, listener: Listener): void {
    this.off(event, listener);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  private emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(...args);
      } catch (e) {
        console.error(`[InjectedWallet:Solana] Event listener error (${event}):`, e);
      }
    });
  }

  // -- Helpers --

  private requireConnected(): void {
    if (!this._isConnected) {
      throw new ProviderRpcError(RPC_ERRORS.DISCONNECTED, "Wallet not connected");
    }
  }

  private requireConfirmation(method: string): void {
    if (this.confirmMode === "reject") {
      throw new ProviderRpcError(
        RPC_ERRORS.USER_REJECTED,
        `User rejected ${method} (confirmMode=reject)`
      );
    }
    if (this.confirmMode === "log") {
      this.log("info", `Auto-approved: ${method}`);
    }
  }

  private async rpcCall(method: string, params: any[]): Promise<any> {
    const response = await fetch(this._clusterUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params,
      }),
    });
    const json = await response.json();
    if (json.error) {
      throw new ProviderRpcError(
        json.error.code || RPC_ERRORS.INTERNAL_ERROR,
        json.error.message,
        json.error.data
      );
    }
    return json.result;
  }

  private log(level: "info" | "debug", message: string, data?: any): void {
    if (this.logLevel === "silent") return;
    if (this.logLevel === "info" && level === "debug") return;

    const prefix = "[InjectedWallet:Solana]";
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }
}
