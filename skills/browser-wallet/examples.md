# Web3 Browser Wallet — Examples

All examples use `--headed` mode (recommended for production dApps). The `BUNDLE` variable points to the inject script.

## Setup variable (run once per session)

Set `BUNDLE` based on your tool:

| Tool | Command |
|------|---------|
| Cursor | `BUNDLE=~/.cursor/skills/browser-wallet/inject.bundle.js` |
| Claude Code | `BUNDLE=~/.claude/skills/browser-wallet/inject.bundle.js` |
| OpenCode | `BUNDLE=~/.config/opencode/skills/browser-wallet/inject.bundle.js` |

## Example 1: Uniswap Token Swap (EVM)

```bash
# Open and inject
agent-browser open https://app.uniswap.org --headed
agent-browser eval "window.__WEB3_WALLET_CONFIG__ = { generate: true, providers: ['evm'], evm: { chainId: 1, rpcUrl: 'https://eth.llamarpc.com' }, confirmMode: 'log' };" && cat $BUNDLE | agent-browser eval --stdin && agent-browser reload && agent-browser wait 1000 && agent-browser eval "window.__WEB3_WALLET_CONFIG__ = { generate: true, providers: ['evm'], evm: { chainId: 1, rpcUrl: 'https://eth.llamarpc.com' }, confirmMode: 'log' };" && cat $BUNDLE | agent-browser eval --stdin

# Verify
agent-browser eval "JSON.stringify(window.__injectedWallet)"

# Connect — snapshot to find the Connect button, click it, then select injected wallet
agent-browser wait 2000 && agent-browser snapshot -i
agent-browser click @<connect-ref>
agent-browser wait 1000 && agent-browser screenshot
agent-browser eval "document.querySelector('[data-testid=\"wallet-option-injected\"]')?.click() || [...document.querySelectorAll('button,[role=button],div[class*=wallet]')].find(el => /injected|browser/i.test(el.textContent))?.click()"

# Select token pair — snapshot to find token selector and input refs
agent-browser wait 1000 && agent-browser snapshot -i
agent-browser click @<token-selector-ref>
agent-browser type @<search-input-ref> "USDC"
agent-browser click @<usdc-option-ref>
agent-browser type @<amount-input-ref> "100"

# Execute swap
agent-browser click @<swap-button-ref>
agent-browser wait 1000 && agent-browser snapshot -i
```

## Example 2: Local dApp with Known Test Key (Hardhat)

```bash
agent-browser open http://localhost:3000

# Use Hardhat's default account #0 (has 10000 ETH on local node)
agent-browser eval "window.__WEB3_WALLET_CONFIG__ = { privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', providers: ['evm'], evm: { chainId: 31337, rpcUrl: 'http://localhost:8545' }, confirmMode: 'auto' };" && cat $BUNDLE | agent-browser eval --stdin && agent-browser reload && agent-browser wait 500 && agent-browser eval "window.__WEB3_WALLET_CONFIG__ = { privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', providers: ['evm'], evm: { chainId: 31337, rpcUrl: 'http://localhost:8545' }, confirmMode: 'auto' };" && cat $BUNDLE | agent-browser eval --stdin

# No --headed needed for localhost — headless works fine
agent-browser eval "JSON.stringify(window.__injectedWallet)"
agent-browser wait 1000 && agent-browser snapshot -i
```

## Example 3: Raydium Swap (Solana)

```bash
agent-browser open https://raydium.io/swap --headed
agent-browser eval "window.__WEB3_WALLET_CONFIG__ = { generate: true, providers: ['solana'], solana: { cluster: 'devnet' }, confirmMode: 'log' };" && cat $BUNDLE | agent-browser eval --stdin && agent-browser reload && agent-browser wait 1000 && agent-browser eval "window.__WEB3_WALLET_CONFIG__ = { generate: true, providers: ['solana'], solana: { cluster: 'devnet' }, confirmMode: 'log' };" && cat $BUNDLE | agent-browser eval --stdin

# Connect — look for "Connect Wallet" then "Phantom" option
agent-browser wait 2000 && agent-browser snapshot -i
agent-browser click @<connect-wallet-ref>
agent-browser wait 1000 && agent-browser screenshot
agent-browser find text "Phantom" click

agent-browser eval "JSON.stringify(window.__injectedWallet)"
```

## Example 4: Multi-Chain Setup (Chain Switching)

```bash
agent-browser eval "window.__WEB3_WALLET_CONFIG__ = { generate: true, providers: ['evm'], evm: { chainId: 1, rpcUrl: 'https://eth.llamarpc.com', chains: { 137: { rpcUrl: 'https://polygon-rpc.com', name: 'Polygon' }, 42161: { rpcUrl: 'https://arb1.arbitrum.io/rpc', name: 'Arbitrum' } } }, confirmMode: 'auto' };" && cat $BUNDLE | agent-browser eval --stdin && agent-browser reload && agent-browser wait 1000 && agent-browser eval "window.__WEB3_WALLET_CONFIG__ = { generate: true, providers: ['evm'], evm: { chainId: 1, rpcUrl: 'https://eth.llamarpc.com', chains: { 137: { rpcUrl: 'https://polygon-rpc.com', name: 'Polygon' }, 42161: { rpcUrl: 'https://arb1.arbitrum.io/rpc', name: 'Arbitrum' } } }, confirmMode: 'auto' };" && cat $BUNDLE | agent-browser eval --stdin
```

The dApp can now call `wallet_switchEthereumChain` and the provider emits `chainChanged` events.

## Example 5: Reject Mode (Error Handling Testing)

```bash
agent-browser eval "window.__WEB3_WALLET_CONFIG__ = { generate: true, providers: ['evm'], evm: { chainId: 1, rpcUrl: 'https://eth.llamarpc.com' }, confirmMode: 'reject' };" && cat $BUNDLE | agent-browser eval --stdin && agent-browser reload && agent-browser wait 1000 && agent-browser eval "window.__WEB3_WALLET_CONFIG__ = { generate: true, providers: ['evm'], evm: { chainId: 1, rpcUrl: 'https://eth.llamarpc.com' }, confirmMode: 'reject' };" && cat $BUNDLE | agent-browser eval --stdin
```

All signing and transaction requests return `USER_REJECTED` (code 4001). Use this to verify your dApp's error UI.

## Example 6: Both EVM + Solana

```bash
agent-browser eval "window.__WEB3_WALLET_CONFIG__ = { generate: true, providers: ['evm', 'solana'], evm: { chainId: 1, rpcUrl: 'https://eth.llamarpc.com' }, solana: { cluster: 'devnet' }, confirmMode: 'auto' };" && cat $BUNDLE | agent-browser eval --stdin && agent-browser reload && agent-browser wait 1000 && agent-browser eval "window.__WEB3_WALLET_CONFIG__ = { generate: true, providers: ['evm', 'solana'], evm: { chainId: 1, rpcUrl: 'https://eth.llamarpc.com' }, solana: { cluster: 'devnet' }, confirmMode: 'auto' };" && cat $BUNDLE | agent-browser eval --stdin
```

Both `window.ethereum` and `window.solana` will be available for multi-chain dApps.
