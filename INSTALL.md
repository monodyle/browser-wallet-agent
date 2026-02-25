# Installing browser-wallet skill

This document is an instruction for AI agents to self-install the `browser-wallet` skill. Follow the steps below exactly.

## Step 1: Detect the target tool

Determine which AI coding tool you are running in. Check for these directories in order:

| Tool | Skill directory |
|------|----------------|
| Cursor | `~/.cursor/skills/browser-wallet/` |
| Claude Code | `~/.claude/skills/browser-wallet/` |
| OpenCode | `~/.config/opencode/skills/browser-wallet/` |

Use the first match. If uncertain, ask the user which tool they are using.

Set the variable `SKILL_DIR` to the appropriate path for the remaining steps.

## Step 2: Check if already installed

```bash
if [ -f "$SKILL_DIR/inject.bundle.js" ]; then
  echo "browser-wallet skill is already installed at $SKILL_DIR"
fi
```

If the skill is already installed, tell the user and stop. If the user wants to reinstall or update, continue to Step 3.

## Step 3: Clone and copy

```bash
TEMP_DIR=$(mktemp -d)
git clone --depth 1 https://github.com/monodyle/browser-wallet-agent.git "$TEMP_DIR/browser-wallet-agent"
mkdir -p "$SKILL_DIR"
cp -r "$TEMP_DIR/browser-wallet-agent/skills/browser-wallet/"* "$SKILL_DIR/"
rm -rf "$TEMP_DIR"
```

## Step 4: Verify installation

```bash
ls -la "$SKILL_DIR"
```

Confirm these 4 files exist:

- `SKILL.md` — main skill instructions
- `inject.bundle.js` — the injectable wallet bundle
- `examples.md` — workflow examples
- `troubleshooting.md` — common issues and fixes

## Step 5: Confirm to the user

Tell the user the skill is installed and ready. Include:

- The installation path
- A quick example prompt they can try:

> Use browser-wallet skill, go to app.uniswap.org, connect a wallet, and verify the swap UI loads correctly.

## Troubleshooting

If `git clone` fails (e.g. network issues, git not installed), try downloading the files directly:

```bash
mkdir -p "$SKILL_DIR"
BASE_URL="https://raw.githubusercontent.com/monodyle/browser-wallet-agent/refs/heads/main/skills/browser-wallet"
curl -fsSL "$BASE_URL/SKILL.md" -o "$SKILL_DIR/SKILL.md"
curl -fsSL "$BASE_URL/inject.bundle.js" -o "$SKILL_DIR/inject.bundle.js"
curl -fsSL "$BASE_URL/examples.md" -o "$SKILL_DIR/examples.md"
curl -fsSL "$BASE_URL/troubleshooting.md" -o "$SKILL_DIR/troubleshooting.md"
```
