#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Rocket Realty Portal — Developer Setup
# ============================================

echo ""
echo "  Rocket Realty Portal — Setup"
echo "  =============================="
echo ""

# --- Check Node version ---
REQUIRED_NODE_MAJOR=18

if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is not installed. Please install Node.js $REQUIRED_NODE_MAJOR+ and try again."
  exit 1
fi

NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")

if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
  echo "ERROR: Node.js $REQUIRED_NODE_MAJOR+ is required. You have Node.js $(node --version)."
  exit 1
fi

echo "  Node.js $(node --version) — OK"

# --- Copy .env.local.example if needed ---
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "  Created .env.local from .env.local.example"
else
  echo "  .env.local already exists — skipping"
fi

# --- Install dependencies ---
echo ""
echo "  Installing dependencies..."
npm install

# --- Done ---
echo ""
echo "  Setup complete!"
echo ""
echo "  Next steps:"
echo "    1. Fill in your environment variables in .env.local"
echo "    2. Run the dev server: npm run dev"
echo "    3. Open http://localhost:3000"
echo ""
