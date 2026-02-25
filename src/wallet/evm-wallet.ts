import { Wallet, JsonRpcProvider, hashMessage, getBytes } from "ethers";
import { bytesToHex } from "./key-manager";

export class EVMWallet {
  private _wallet: Wallet;
  private _address: string;

  constructor(privateKey: Uint8Array) {
    const hex = "0x" + bytesToHex(privateKey);
    this._wallet = new Wallet(hex);
    this._address = this._wallet.address;
  }

  get address(): string {
    return this._address;
  }

  get privateKeyHex(): string {
    return this._wallet.privateKey;
  }

  connect(rpcUrl: string): Wallet {
    const provider = new JsonRpcProvider(rpcUrl);
    return this._wallet.connect(provider);
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    return this._wallet.signMessage(message);
  }

  async signTypedData(domain: any, types: any, value: any): Promise<string> {
    return this._wallet.signTypedData(domain, types, value);
  }

  async signTransaction(tx: any): Promise<string> {
    return this._wallet.signTransaction(tx);
  }

  async sendTransaction(rpcUrl: string, tx: any): Promise<string> {
    const connected = this.connect(rpcUrl);
    const response = await connected.sendTransaction(tx);
    return response.hash;
  }
}
