# Web3 Browser Wallet

Injectable wallet provider for browser-based web3 testing. Injects a realistic **MetaMask-like** (EVM) and **Phantom-like** (Solana) wallet into any browser page — no extension required.

Designed to work with [agent-browser](https://agent-browser.dev/) for AI-driven dApp testing and automation.

## Features

- **EVM**: Full EIP-1193 provider, MetaMask-compatible (`window.ethereum`)
- **Solana**: Phantom-compatible interface (`window.solana`)
- **Key management**: Generate wallets, import private keys, mnemonics, HD derivation
- **Configurable**: Auto-approve, log, or reject signing requests
- **Single file**: Bundles into one injectable JS file (~430KB)
- **EIP-6963**: Modern multi-provider discovery support
- **Realistic**: Events, chain switching, error codes, legacy method support

## Quick Start

```bash
# Install dependencies
npm install

# Build the injectable bundle
npm run build
# Output: dist/inject.bundle.js + skill/inject.bundle.js

# Run tests
npm test
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

## Agent Skill

The `skills/` directory contains an agent skill that works with any AI coding tool that supports the `SKILL.md` format. Install it for your tool:

```bash
# Claude Code
cp -r skills/browser-wallet ~/.claude/skills/browser-wallet/

# Cursor
cp -r skills/browser-wallet ~/.cursor/skills/browser-wallet/

# OpenCode
cp -r skills/browser-wallet ~/.config/opencode/skills/browser-wallet/
```

The agent will automatically discover and use the skill for web3 dApp testing.

## Architecture

```
src/
├── providers/
│   ├── evm-provider.ts       # EIP-1193 MetaMask-like provider
│   ├── solana-provider.ts    # Phantom-like Solana provider
│   └── types.ts              # Shared types
├── wallet/
│   ├── evm-wallet.ts         # ethers.js Wallet wrapper
│   ├── solana-wallet.ts      # tweetnacl Keypair wrapper
│   └── key-manager.ts        # Key generation & derivation
├── inject.ts                 # IIFE entry: config → providers → window
└── index.ts                  # Library exports
```

## License

MIT
