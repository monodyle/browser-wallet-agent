# Web3 Browser Wallet

Injectable wallet provider for browser-based web3 testing and automation.

Injects a realistic **MetaMask-like** (EVM) and **Phantom-like** (Solana) wallet into any browser page — no extension required. Designed to work with [agent-browser](https://agent-browser.dev/).

## Features

- **EVM**: Full EIP-1193 provider, MetaMask-compatible (`window.ethereum`)
- **Solana**: Phantom-compatible interface (`window.solana`)
- **Key management**: Generate wallets, import private keys, mnemonics, HD derivation
- **Configurable**: Auto-approve, log, or reject signing requests
- **Single file**: Bundles into one injectable JS file (~430KB)
- **EIP-6963**: Modern multi-provider discovery support
- **Realistic**: Events, chain switching, error codes, legacy method support

## Development

```bash
# Install dependencies
pnpm install

# Build the injectable bundle
pnpm run build

# Run tests
pnpm test
```

## Usage with agent-browser

```bash
# Open a dApp
agent-browser open https://app.uniswap.org

# Configure and inject
agent-browser evaluate "
  window.__WEB3_WALLET_CONFIG__ = {
    generate: true,
    providers: ['evm'],
    evm: { chainId: 1, rpcUrl: 'https://eth.llamarpc.com' },
    confirmMode: 'auto'
  };
"
agent-browser evaluate-file dist/inject.bundle.js
agent-browser reload

# Re-inject after reload
agent-browser evaluate "window.__WEB3_WALLET_CONFIG__ = { generate: true, providers: ['evm'], evm: { chainId: 1, rpcUrl: 'https://eth.llamarpc.com' }, confirmMode: 'auto' };"
agent-browser evaluate-file dist/inject.bundle.js

# Interact with the dApp
agent-browser snapshot -i
agent-browser click @e5  # Connect Wallet
```

## Example Prompt

Once the skill is installed, just ask your AI agent naturally:

> Use browser-wallet skill, go to 'app.uniswap.org', connect a wallet, and try swapping ETH for USDC. Verify the UI shows the correct token pair and amount input works.

The agent will automatically:

1. Open the dApp in a headed browser
2. Inject the wallet provider with a generated key
3. Find and click the "Connect Wallet" button
4. Select the injected wallet option
5. Interact with the swap UI and verify behavior

No manual wallet setup, no browser extensions, no seed phrases to manage.

You can also provide your own private key for utilize the assets and funds provided:

> Use the browser-wallet skill, open: https://sepolia.etherscan.io/address/<ERC_20_CONTRACT>, check the ERC-20 token allowance granted from my wallet address for the spender contract: <SPENDER_CONTRACT>. Report the current allowance amount and the token contract address (if applicable). My private key is: <YOUR_WALLET_PRIVATE_KEY>

Or seed phrases ([Generate new one](https://iancoleman.io/bip39/)):

> Use browser-wallet skill with the mnemonic `crack robust what hen ... company` on Polygon (chain 137) to open QuickSwap and approve a token.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `generate` | boolean | false | Generate a fresh random wallet |
| `privateKey` | string | — | Hex private key |
| `mnemonic` | string | — | BIP-39 mnemonic phrase |
| `hdPath` | string | per-chain default | Custom HD derivation path |
| `providers` | string[] | `["evm", "solana"]` | Which providers to inject |
| `confirmMode` | string | `"auto"` | `"auto"` / `"log"` / `"reject"` |
| `logLevel` | string | `"info"` | `"silent"` / `"info"` / `"debug"` |
| `evm.chainId` | number | 1 | Default EVM chain ID |
| `evm.rpcUrl` | string | — | RPC endpoint URL |
| `evm.chains` | object | — | Additional chains for switching |
| `solana.cluster` | string | `"devnet"` | Solana cluster |

## Installation

The `skills/` directory contains an agent skill that works with any AI coding tool that supports the `SKILL.md` format.

### Manual install

```bash
git clone --depth 1 https://github.com/monodyle/browser-wallet-agent.git browser-wallet-agent && cd browser-wallet-agent

# Claude Code
cp -r skills/browser-wallet ~/.claude/skills/browser-wallet/

# Cursor
cp -r skills/browser-wallet ~/.cursor/skills/browser-wallet/

# OpenCode
cp -r skills/browser-wallet ~/.config/opencode/skills/browser-wallet/

rm -rf browser-wallet-agent # cleanup
```

### Let your agent install it

Ask your AI agent:

```
Install the browser-wallet skill from https://raw.githubusercontent.com/monodyle/browser-wallet-agent/refs/heads/main/INSTALL.md
```

The agent will automatically discover and use the skill for web3 dApp testing.

## License

MIT
