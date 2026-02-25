# Web3 Browser Testing — Troubleshooting

## Page won't load / network error / Cloudflare block

**Symptom**: Page shows a network error, JSON error, blank page, or Cloudflare challenge instead of the dApp.

**Cause**: Production dApps use Cloudflare or anti-bot systems that block headless browsers.

**Fix**: Use `--headed` mode:

```bash
agent-browser open https://app.uniswap.org --headed
```

Always use `--headed` for production dApps. Only omit it for localhost dev servers.

## dApp doesn't detect the wallet

**Symptom**: "No wallet detected" or "Install MetaMask" message persists after injection.

**Cause**: The wallet was injected after the dApp's JavaScript already checked for `window.ethereum`.

**Fix**: The injection must happen before the dApp's JS runs. Use the inject-reload-reinject pattern:

```bash
BUNDLE=~/.cursor/skills/browser-wallet/inject.bundle.js
agent-browser eval "window.__WEB3_WALLET_CONFIG__ = {...};" && cat $BUNDLE | agent-browser eval --stdin && agent-browser reload && agent-browser wait 1000 && agent-browser eval "window.__WEB3_WALLET_CONFIG__ = {...};" && cat $BUNDLE | agent-browser eval --stdin
```

If the dApp still doesn't detect it, it may use EIP-6963 only. Trigger a re-announcement:

```bash
agent-browser eval "setTimeout(() => window.dispatchEvent(new Event('eip6963:requestProvider')), 500)"
```

## Can't find or click the wallet in the connect modal

**Symptom**: After clicking "Connect Wallet", a modal appears but the injected wallet option can't be found in `snapshot`.

**Cause**: Wallet modals often use custom overlays without accessible roles, making them invisible to `snapshot -i`.

**Fix**: Use `screenshot` to see the modal visually, then `eval` to click programmatically:

```bash
# See what's on screen
agent-browser screenshot

# Click by data-testid (works for Uniswap and many dApps)
agent-browser eval "document.querySelector('[data-testid=\"wallet-option-injected\"]')?.click()"

# Or fall back to text matching
agent-browser eval "[...document.querySelectorAll('button,[role=button],div[class*=wallet],div[class*=option]')].find(el => /injected|browser.wallet|detected/i.test(el.textContent))?.click()"

# Or use agent-browser's find command
agent-browser find text "Injected" click
agent-browser find text "MetaMask" click
```

## Transaction fails with "insufficient funds"

**Cause**: The generated wallet has no funds on the target chain.

**Fix**:
- Use a local node (Hardhat/Anvil) where you can fund the account
- Use a testnet faucet to fund the generated address
- Use a known funded test key:

```bash
# Hardhat default account #0 (has 10000 ETH on local node)
privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
```

## "Unknown chain" error on wallet_switchEthereumChain

**Cause**: The target chain wasn't configured in the `chains` map.

**Fix**: Add the chain to the config:

```javascript
evm: {
  chainId: 1,
  rpcUrl: "...",
  chains: {
    137: { rpcUrl: "https://polygon-rpc.com", name: "Polygon" }
  }
}
```

Or let the dApp add it — the provider supports `wallet_addEthereumChain`.

## Solana dApp says "Phantom not found"

**Cause**: The dApp may use `@solana/wallet-adapter` which discovers wallets via the Wallet Standard, not `window.solana`.

**Fix**: The injected provider sets `window.solana` with `isPhantom: true`. Most dApps check this. If using a newer wallet adapter, trigger a manual connect:

```bash
agent-browser eval "window.solana.connect()"
```

## Signed message verification fails

**Cause**: The dApp may expect a specific signing scheme or the address doesn't match.

**Fix**: Verify the active address:

```bash
agent-browser eval "window.ethereum.selectedAddress"
```

The injected wallet supports `personal_sign`, `eth_sign`, and `eth_signTypedData_v4`.

## Bundle injection fails

**Cause**: The path to `inject.bundle.js` is wrong, or the file can't be read.

**Fix**: Verify the file exists:

```bash
ls -la ~/.cursor/skills/browser-wallet/inject.bundle.js
```

If the path differs, adjust accordingly. Alternative injection method:

```bash
# Use base64 encoding to avoid shell escaping issues
agent-browser eval -b "$(base64 < ~/.cursor/skills/browser-wallet/inject.bundle.js)"
```

## Wallet disconnects after page navigation

**Cause**: Single-page app navigated to a new URL, clearing `window.ethereum`.

**Fix**: Re-inject using the same config + bundle after any full-page navigation:

```bash
BUNDLE=~/.cursor/skills/browser-wallet/inject.bundle.js
agent-browser eval "window.__WEB3_WALLET_CONFIG__ = {...};" && cat $BUNDLE | agent-browser eval --stdin
```

For SPAs that don't do full-page reloads, the wallet persists automatically.
