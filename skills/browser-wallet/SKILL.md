---
name: browser-wallet
description: Inject a realistic wallet provider (MetaMask/Phantom) into any browser page for seamless web3 dApp testing. Use when testing dApps, automating web3 interactions, or developing dApps without browser extension setup. Supports EVM (Ethereum, Polygon, BSC) and Solana chains.
---

# Web3 Browser Testing

Inject a test wallet into any browser page via `agent-browser`. No extension installs, no manual setup — dApps see a real MetaMask/Phantom wallet.

## Prerequisites

```bash
which agent-browser || npm install -g agent-browser
```

## Quick Start — EVM

**Step 1: Open dApp** — use `--headed` for production dApps (Cloudflare blocks headless browsers). Omit for localhost.

```bash
agent-browser open https://app.uniswap.org --headed
```

**Step 2: Inject wallet** — single chained command that sets config, injects bundle, reloads, and re-injects so the dApp discovers the wallet on init:

```bash
BUNDLE=~/.cursor/skills/browser-wallet/inject.bundle.js && agent-browser eval "window.__WEB3_WALLET_CONFIG__ = { generate: true, providers: ['evm'], evm: { chainId: 1, rpcUrl: 'https://eth.llamarpc.com' }, confirmMode: 'auto', logLevel: 'info' };" && cat $BUNDLE | agent-browser eval --stdin && agent-browser reload && agent-browser wait 1000 && agent-browser eval "window.__WEB3_WALLET_CONFIG__ = { generate: true, providers: ['evm'], evm: { chainId: 1, rpcUrl: 'https://eth.llamarpc.com' }, confirmMode: 'auto', logLevel: 'info' };" && cat $BUNDLE | agent-browser eval --stdin
```

**Step 3: Verify**

```bash
agent-browser eval "JSON.stringify(window.__injectedWallet)"
```

**Step 4: Connect wallet in the dApp**

```bash
agent-browser wait 2000 && agent-browser snapshot -i
```

Find the "Connect Wallet" button ref (e.g. `@e9`) and click it. A wallet selection modal appears — use `screenshot` to see it visually, then click the injected wallet:

```bash
agent-browser click @e9 && agent-browser wait 1000 && agent-browser screenshot
```

The injected wallet usually appears as **"Injected Test Wallet"** or **"Browser Wallet"** with a "Detected" badge. To click it:

```bash
# Try data-testid first (Uniswap, many dApps), then fall back to text matching
agent-browser eval "document.querySelector('[data-testid=\"wallet-option-injected\"]')?.click() || [...document.querySelectorAll('button,[role=button],div[class*=wallet],div[class*=option]')].find(el => /injected|browser.wallet|detected/i.test(el.textContent))?.click()"
```

If that doesn't work, use `agent-browser find text "Injected" click` or `agent-browser find text "MetaMask" click`.

## Quick Start — Solana

```bash
agent-browser open https://raydium.io/swap --headed
```

```bash
BUNDLE=~/.cursor/skills/browser-wallet/inject.bundle.js && agent-browser eval "window.__WEB3_WALLET_CONFIG__ = { generate: true, providers: ['solana'], solana: { cluster: 'devnet' }, confirmMode: 'auto', logLevel: 'info' };" && cat $BUNDLE | agent-browser eval --stdin && agent-browser reload && agent-browser wait 1000 && agent-browser eval "window.__WEB3_WALLET_CONFIG__ = { generate: true, providers: ['solana'], solana: { cluster: 'devnet' }, confirmMode: 'auto', logLevel: 'info' };" && cat $BUNDLE | agent-browser eval --stdin
```

Then find and click the "Connect Wallet" → "Phantom" option using the same snapshot/click approach.

## Configuration Reference

Set `window.__WEB3_WALLET_CONFIG__` before injecting. Pick **one** key source:

| Option | Example | Purpose |
|--------|---------|---------|
| `generate` | `true` | Fresh random wallet (recommended) |
| `privateKey` | `"0xabc..."` | Import existing key |
| `mnemonic` | `"word1 word2 ..."` | Import from seed phrase |
| `hdPath` | `"m/44'/60'/0'/0/0"` | Custom derivation path |

Chain and provider options:

| Option | Values |
|--------|--------|
| `providers` | `['evm']`, `['solana']`, `['evm','solana']` |
| `evm.chainId` | Chain ID number (e.g. `1`, `137`, `56`) |
| `evm.rpcUrl` | RPC endpoint URL |
| `evm.chains` | Extra chains: `{ 137: { rpcUrl: "...", name: "Polygon" } }` |
| `solana.cluster` | `"mainnet-beta"` \| `"devnet"` \| `"localnet"` \| custom URL |
| `confirmMode` | `"auto"` (approve all) \| `"log"` (approve + log) \| `"reject"` (reject all) |
| `logLevel` | `"silent"` \| `"info"` \| `"debug"` |

## What Gets Injected

**EVM** (`window.ethereum`): MetaMask-compatible EIP-1193 provider. `isMetaMask: true`. Supports `eth_requestAccounts`, `personal_sign`, `eth_signTypedData_v4`, `eth_sendTransaction`, `wallet_switchEthereumChain`, chain events, EIP-6963 discovery, and legacy `enable()`/`send()`/`sendAsync()`.

**Solana** (`window.solana`): Phantom-compatible provider. `isPhantom: true`. Supports `connect`, `disconnect`, `signTransaction`, `signAllTransactions`, `signMessage`, `signAndSendTransaction`.

**Info** (`window.__injectedWallet`): `address`, `publicKey`, `chainId`, `cluster`, `mnemonic`.

## Operational Tips

1. **Always `--headed` for production dApps** — Cloudflare/anti-bot blocks headless. Only skip for localhost.
2. **Wait before snapshots** — After `open` or `reload`, use `agent-browser wait 2000` before `snapshot`.
3. **Re-inject after navigation** — If the page navigates to a new URL, re-run the config + inject chain.
4. **Use `screenshot` when `snapshot` is unclear** — Wallet modals and overlays are often invisible in accessibility snapshots.
5. **Use `eval` to click stubborn elements** — Wallet modal buttons often lack accessible roles. Use `querySelector` via `eval` to click them.
6. **Verify connection** — After connecting, `agent-browser eval "window.ethereum.selectedAddress"` confirms the active address.

## Security

**NEVER use real private keys with mainnet funds.** Prefer `generate: true`. Use testnets or local nodes (Hardhat, Anvil, Solana localnet) for transaction testing.

## References

- [examples.md](examples.md) — Detailed workflow examples
- [troubleshooting.md](troubleshooting.md) — Common issues and fixes
