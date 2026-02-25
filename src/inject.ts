import { deriveKeys } from "./wallet/key-manager";
import { EVMWallet } from "./wallet/evm-wallet";
import { SolanaWallet } from "./wallet/solana-wallet";
import { InjectedEVMProvider } from "./providers/evm-provider";
import { InjectedSolanaProvider } from "./providers/solana-provider";
import type { WalletConfig, InjectedWalletInfo } from "./providers/types";

declare global {
  interface Window {
    __WEB3_WALLET_CONFIG__?: WalletConfig;
    __injectedWallet?: InjectedWalletInfo;
    ethereum?: any;
    solana?: any;
  }
}

(function injectWallet() {
  const config = window.__WEB3_WALLET_CONFIG__;
  if (!config) {
    console.error("[InjectedWallet] No config found at window.__WEB3_WALLET_CONFIG__");
    return;
  }

  const logLevel = config.logLevel ?? "info";
  const confirmMode = config.confirmMode ?? "auto";
  const providers = config.providers ?? ["evm", "solana"];

  const log = (msg: string, ...args: any[]) => {
    if (logLevel !== "silent") {
      console.log("[InjectedWallet]", msg, ...args);
    }
  };

  try {
    const keys = deriveKeys(config);
    const walletInfo: InjectedWalletInfo = {};

    if (keys.mnemonic) {
      walletInfo.mnemonic = keys.mnemonic;
      log("Mnemonic:", keys.mnemonic);
    }

    // -- EVM Provider --
    if (providers.includes("evm") && keys.evmPrivateKey) {
      const evmConfig = config.evm ?? {
        chainId: 1,
        rpcUrl: "https://eth.llamarpc.com",
      };

      const evmWallet = new EVMWallet(keys.evmPrivateKey);
      const evmProvider = new InjectedEVMProvider({
        wallet: evmWallet,
        chainId: evmConfig.chainId,
        rpcUrl: evmConfig.rpcUrl,
        chains: evmConfig.chains,
        confirmMode,
        logLevel,
      });

      walletInfo.address = evmWallet.address;
      walletInfo.chainId = evmConfig.chainId;

      // Inject as window.ethereum with MetaMask-like proxy
      const proxyHandler: ProxyHandler<InjectedEVMProvider> = {
        get(target, prop) {
          if (prop === "providers") return undefined;
          // Some dApps check for provider.request being a function
          return Reflect.get(target, prop, target);
        },
      };

      window.ethereum = new Proxy(evmProvider, proxyHandler);

      // Also set on the EIP-6963 event for modern dApp discovery
      announceEIP6963(evmProvider);

      log(`EVM wallet injected: ${evmWallet.address} on chain ${evmConfig.chainId}`);
    }

    // -- Solana Provider --
    if (providers.includes("solana") && keys.solanaPrivateKey) {
      const solConfig = config.solana ?? { cluster: "devnet" };

      const solWallet = new SolanaWallet(keys.solanaPrivateKey);
      const solProvider = new InjectedSolanaProvider({
        wallet: solWallet,
        cluster: solConfig.cluster,
        confirmMode,
        logLevel,
      });

      walletInfo.publicKey = solWallet.publicKeyBase58;
      walletInfo.cluster = solConfig.cluster;

      window.solana = solProvider;

      log(`Solana wallet injected: ${solWallet.publicKeyBase58} on ${solConfig.cluster}`);
    }

    window.__injectedWallet = walletInfo;
    log("Wallet injection complete", walletInfo);
  } catch (err) {
    console.error("[InjectedWallet] Failed to inject:", err);
  }
})();

/**
 * EIP-6963: Multi Injected Provider Discovery.
 * Announces the provider so modern dApps can discover it.
 */
function announceEIP6963(provider: InjectedEVMProvider) {
  const info = {
    uuid: "d4efc804-3a7b-4a2b-8b9c-2c5d3a8f9e01",
    name: "Browser Wallet Agent",
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect width='32' height='32' rx='6' fill='%234F46E5'/><text x='16' y='22' font-size='18' text-anchor='middle' fill='white'>W</text></svg>",
    rdns: "local.browser-wallet-agent",
  };

  const detail = Object.freeze({ info, provider });

  window.dispatchEvent(
    new CustomEvent("eip6963:announceProvider", {
      detail,
    })
  );

  window.addEventListener("eip6963:requestProvider", () => {
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail,
      })
    );
  });
}
