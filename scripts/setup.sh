#!/usr/bin/env bash
# One time setup. Run from the repo root after cloning or unzipping.
set -euo pipefail

git rev-parse --git-dir >/dev/null 2>&1 || { echo "Not a git repo. Run: git init"; exit 1; }

chmod +x scripts/*.sh .githooks/*
git config core.hooksPath .githooks

echo "Hooks installed at .githooks (pre-commit and pre-push)."
echo
echo "Verifying scanner runs:"
./scripts/scan-secrets.sh tree || true
echo
echo "Setup complete. The pre-commit hook now blocks any commit containing"
echo "flagged content, and pre-push rescans the working tree and full history."
