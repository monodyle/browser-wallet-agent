import nacl from "tweetnacl";
import bs58 from "bs58";

export class SolanaWallet {
  private _keypair: nacl.SignKeyPair;
  private _publicKeyBase58: string;

  constructor(privateKey: Uint8Array) {
    if (privateKey.length === 32) {
      this._keypair = nacl.sign.keyPair.fromSeed(privateKey);
    } else if (privateKey.length === 64) {
      this._keypair = nacl.sign.keyPair.fromSecretKey(privateKey);
    } else {
      throw new Error(`Invalid Solana private key length: ${privateKey.length}`);
    }
    this._publicKeyBase58 = bs58.encode(this._keypair.publicKey);
  }

  get publicKey(): Uint8Array {
    return this._keypair.publicKey;
  }

  get publicKeyBase58(): string {
    return this._publicKeyBase58;
  }

  get secretKey(): Uint8Array {
    return this._keypair.secretKey;
  }

  signMessage(message: Uint8Array): Uint8Array {
    return nacl.sign.detached(message, this._keypair.secretKey);
  }

  signTransaction(transactionBytes: Uint8Array): Uint8Array {
    return nacl.sign.detached(transactionBytes, this._keypair.secretKey);
  }
}
