import { EVMWallet } from "../wallet/evm-wallet";
import {
  type RequestArgs,
  type ConfirmMode,
  type LogLevel,
  type EVMChainConfig,
  ProviderRpcError,
  RPC_ERRORS,
} from "./types";

interface EVMProviderConfig {
  wallet: EVMWallet;
  chainId: number;
  rpcUrl: string;
  chains?: Record<number, EVMChainConfig>;
  confirmMode: ConfirmMode;
  logLevel: LogLevel;
}

type Listener = (...args: any[]) => void;

export class InjectedEVMProvider {
  readonly isMetaMask = true;
  readonly _isInjectedTestWallet = true;

  private wallet: EVMWallet;
  private _chainId: number;
  private _rpcUrl: string;
  private chains: Record<number, EVMChainConfig>;
  private confirmMode: ConfirmMode;
  private logLevel: LogLevel;
  private connected = false;
  private listeners: Map<string, Set<Listener>> = new Map();

  constructor(config: EVMProviderConfig) {
    this.wallet = config.wallet;
    this._chainId = config.chainId;
    this._rpcUrl = config.rpcUrl;
    this.chains = { ...config.chains };
    if (!this.chains[config.chainId]) {
      this.chains[config.chainId] = { rpcUrl: config.rpcUrl };
    }
    this.confirmMode = config.confirmMode;
    this.logLevel = config.logLevel;
  }

  get selectedAddress(): string | null {
    return this.connected ? this.wallet.address : null;
  }

  get chainId(): string {
    return "0x" + this._chainId.toString(16);
  }

  get networkVersion(): string {
    return this._chainId.toString();
  }

  // -- EIP-1193 --

  async request(args: RequestArgs): Promise<any> {
    const { method, params = [] } = args;
    this.log("debug", `request: ${method}`, params);

    switch (method) {
      case "eth_requestAccounts":
      case "eth_accounts":
        return this.handleAccounts();

      case "eth_chainId":
        return this.chainId;

      case "net_version":
        return this.networkVersion;

      case "eth_coinbase":
        return this.wallet.address.toLowerCase();

      case "personal_sign":
        return this.handlePersonalSign(params);

      case "eth_sign":
        return this.handleEthSign(params);

      case "eth_signTypedData":
      case "eth_signTypedData_v3":
      case "eth_signTypedData_v4":
        return this.handleSignTypedData(params);

      case "eth_sendTransaction":
        return this.handleSendTransaction(params);

      case "eth_signTransaction":
        return this.handleSignTransaction(params);

      case "wallet_switchEthereumChain":
        return this.handleSwitchChain(params);

      case "wallet_addEthereumChain":
        return this.handleAddChain(params);

      case "wallet_requestPermissions":
        return this.handleRequestPermissions(params);

      case "wallet_getPermissions":
        return this.handleGetPermissions();

      case "wallet_watchAsset":
        return true;

      case "web3_clientVersion":
        return "InjectedTestWallet/0.1.0";

      case "eth_getBalance":
      case "eth_getTransactionCount":
      case "eth_getCode":
      case "eth_getStorageAt":
      case "eth_call":
      case "eth_estimateGas":
      case "eth_blockNumber":
      case "eth_getBlockByNumber":
      case "eth_getBlockByHash":
      case "eth_getTransactionByHash":
      case "eth_getTransactionReceipt":
      case "eth_getLogs":
      case "eth_gasPrice":
      case "eth_maxPriorityFeePerGas":
      case "eth_feeHistory":
      case "eth_createAccessList":
        return this.proxyToRpc(method, params);

      default:
        return this.proxyToRpc(method, params);
    }
  }

  // -- Legacy methods --

  async enable(): Promise<string[]> {
    return this.handleAccounts();
  }

  async send(methodOrPayload: string | any, paramsOrCallback?: any): Promise<any> {
    if (typeof methodOrPayload === "string") {
      return this.request({ method: methodOrPayload, params: paramsOrCallback });
    }
    // JSON-RPC payload object
    const result = await this.request({
      method: methodOrPayload.method,
      params: methodOrPayload.params,
    });
    if (typeof paramsOrCallback === "function") {
      paramsOrCallback(null, { id: methodOrPayload.id, jsonrpc: "2.0", result });
    }
    return { id: methodOrPayload.id, jsonrpc: "2.0", result };
  }

  sendAsync(payload: any, callback: (error: any, response: any) => void): void {
    this.request({ method: payload.method, params: payload.params })
      .then((result) => {
        callback(null, { id: payload.id, jsonrpc: "2.0", result });
      })
      .catch((err) => {
        callback(err, null);
      });
  }

  // -- Event emitter --

  on(event: string, listener: Listener): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return this;
  }

  removeListener(event: string, listener: Listener): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  off(event: string, listener: Listener): this {
    return this.removeListener(event, listener);
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  private emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(...args);
      } catch (e) {
        console.error(`[InjectedWallet] Event listener error (${event}):`, e);
      }
    });
  }

  // -- Handlers --

  private handleAccounts(): string[] {
    if (!this.connected) {
      this.connected = true;
      this.emit("connect", { chainId: this.chainId });
      this.emit("accountsChanged", [this.wallet.address]);
    }
    return [this.wallet.address];
  }

  private async handlePersonalSign(params: any[]): Promise<string> {
    this.requireConfirmation("personal_sign");
    // personal_sign: params[0] = message (hex), params[1] = address
    const message = params[0];
    const msgBytes = hexToUint8Array(message);
    const textDecoder = new TextDecoder();
    const msgStr = textDecoder.decode(msgBytes);
    return this.wallet.signMessage(msgStr);
  }

  private async handleEthSign(params: any[]): Promise<string> {
    this.requireConfirmation("eth_sign");
    // eth_sign: params[0] = address, params[1] = message hash
    const msgHash = params[1];
    const msgBytes = hexToUint8Array(msgHash);
    return this.wallet.signMessage(msgBytes);
  }

  private async handleSignTypedData(params: any[]): Promise<string> {
    this.requireConfirmation("eth_signTypedData_v4");
    // params[0] = address, params[1] = JSON string of typed data
    const typedData = typeof params[1] === "string" ? JSON.parse(params[1]) : params[1];
    const { domain, types, message: value } = typedData;

    // Remove EIP712Domain from types if present (ethers handles it)
    const filteredTypes = { ...types };
    delete filteredTypes.EIP712Domain;

    return this.wallet.signTypedData(domain, filteredTypes, value);
  }

  private async handleSendTransaction(params: any[]): Promise<string> {
    this.requireConfirmation("eth_sendTransaction");
    const tx = params[0];
    return this.wallet.sendTransaction(this._rpcUrl, {
      to: tx.to,
      value: tx.value,
      data: tx.data,
      gasLimit: tx.gas || tx.gasLimit,
      gasPrice: tx.gasPrice,
      maxFeePerGas: tx.maxFeePerGas,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
      nonce: tx.nonce,
      chainId: this._chainId,
    });
  }

  private async handleSignTransaction(params: any[]): Promise<string> {
    this.requireConfirmation("eth_signTransaction");
    const tx = params[0];
    return this.wallet.signTransaction({
      to: tx.to,
      value: tx.value,
      data: tx.data,
      gasLimit: tx.gas || tx.gasLimit,
      gasPrice: tx.gasPrice,
      maxFeePerGas: tx.maxFeePerGas,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
      nonce: tx.nonce,
      chainId: this._chainId,
    });
  }

  private handleSwitchChain(params: any[]): null {
    const requested = parseInt(params[0].chainId, 16);
    const chainConfig = this.chains[requested];
    if (!chainConfig) {
      throw new ProviderRpcError(
        RPC_ERRORS.CHAIN_NOT_ADDED,
        `Chain ${requested} not configured. Add it with wallet_addEthereumChain first.`
      );
    }
    this._chainId = requested;
    this._rpcUrl = chainConfig.rpcUrl;
    this.log("info", `Switched to chain ${requested}`);
    this.emit("chainChanged", "0x" + requested.toString(16));
    return null;
  }

  private handleAddChain(params: any[]): null {
    const chain = params[0];
    const chainId = parseInt(chain.chainId, 16);
    this.chains[chainId] = {
      rpcUrl: chain.rpcUrls?.[0] ?? "",
      name: chain.chainName,
      nativeCurrency: chain.nativeCurrency,
      blockExplorerUrl: chain.blockExplorerUrls?.[0],
    };
    this.log("info", `Added chain ${chainId}: ${chain.chainName}`);
    return null;
  }

  private handleRequestPermissions(_params: any[]): any[] {
    return [
      {
        parentCapability: "eth_accounts",
        date: Date.now(),
        caveats: [
          {
            type: "restrictReturnedAccounts",
            value: [this.wallet.address],
          },
        ],
      },
    ];
  }

  private handleGetPermissions(): any[] {
    if (!this.connected) return [];
    return this.handleRequestPermissions([]);
  }

  // -- RPC proxy --

  private async proxyToRpc(method: string, params: any[]): Promise<any> {
    this.log("debug", `Proxying to RPC: ${method}`);
    const response = await fetch(this._rpcUrl, {
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

  // -- Helpers --

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

  private log(level: "info" | "debug", message: string, data?: any): void {
    if (this.logLevel === "silent") return;
    if (this.logLevel === "info" && level === "debug") return;

    const prefix = "[InjectedWallet:EVM]";
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }
}

function hexToUint8Array(hex: string): Uint8Array {
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.substring(i, i + 2), 16);
  }
  return bytes;
}
