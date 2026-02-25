export type ConfirmMode = "auto" | "log" | "reject";
export type LogLevel = "silent" | "info" | "debug";

export interface EVMChainConfig {
  rpcUrl: string;
  name?: string;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl?: string;
}

export interface WalletConfig {
  privateKey?: string;
  mnemonic?: string;
  hdPath?: string;
  generate?: boolean;

  evm?: {
    chainId: number;
    rpcUrl: string;
    chains?: Record<number, EVMChainConfig>;
  };

  solana?: {
    cluster: string;
  };

  confirmMode?: ConfirmMode;
  providers?: Array<"evm" | "solana">;
  logLevel?: LogLevel;
}

export interface InjectedWalletInfo {
  address?: string;
  publicKey?: string;
  chainId?: number;
  cluster?: string;
  mnemonic?: string;
}

export interface RequestArgs {
  method: string;
  params?: any[];
}

export type ProviderEvent =
  | "connect"
  | "disconnect"
  | "accountsChanged"
  | "chainChanged"
  | "message";

export class ProviderRpcError extends Error {
  code: number;
  data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.code = code;
    this.data = data;
    this.name = "ProviderRpcError";
  }
}

export const RPC_ERRORS = {
  USER_REJECTED: 4001,
  UNAUTHORIZED: 4100,
  UNSUPPORTED_METHOD: 4200,
  DISCONNECTED: 4900,
  CHAIN_DISCONNECTED: 4901,
  CHAIN_NOT_ADDED: 4902,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;
