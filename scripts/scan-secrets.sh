#!/usr/bin/env bash
# Leak scanner for the homelab documentation repo.
#
# Usage:
#   scripts/scan-secrets.sh staged    # only content staged for commit (pre-commit hook uses this)
#   scripts/scan-secrets.sh tree      # the working tree as it stands
#   scripts/scan-secrets.sh history   # every commit reachable from any ref
#   scripts/scan-secrets.sh all       # tree + history + commit messages (run before publishing)
#
# Exit code 1 means something was found. Do not commit, do not publish.
#
# This is a net, not a guarantee. It catches shapes it knows about. It cannot catch a
# hostname that looks like an ordinary word, or a topology described too precisely in
# prose. Read your own files.

set -uo pipefail

MODE="${1:-all}"
FAIL=0
EXCLUDES=(":(exclude)scripts/scan-secrets.sh" ":(exclude).githooks/pre-commit")

# A line ending in this marker is exempt. Use it ONLY for documentation that has to name
# a pattern in order to explain it. Never use it to wave through a real value.
SCAN_ALLOW='scan-allow'


# ---------------------------------------------------------------------------
# Patterns. Each entry is "label|regex". Extend as the repo grows.
# ---------------------------------------------------------------------------
PATTERNS=(
  "RFC1918 10.x address|\\b10\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\b"
  "RFC1918 192.168 address|\\b192\\.168\\.[0-9]{1,3}\\.[0-9]{1,3}\\b"
  "RFC1918 172.16-31 address|\\b172\\.(1[6-9]|2[0-9]|3[01])\\.[0-9]{1,3}\\.[0-9]{1,3}\\b"
  "CGNAT / Tailscale 100.x address|\\b100\\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\\.[0-9]{1,3}\\.[0-9]{1,3}\\b"
  "IPv6 unique local|\\bfd[0-9a-f]{2}:[0-9a-f:]{4,}"
  "MAC address|\\b([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}\\b"
  "Private key block|BEGIN [A-Z ]*PRIVATE KEY"
  "SSH public key|ssh-(rsa|ed25519|dss|ecdsa) AAAA"
  "Certificate block|BEGIN CERTIFICATE"
  "Telegram bot token|\\b[0-9]{8,12}:[A-Za-z0-9_-]{30,}"
  "Slack webhook|https://hooks\\.slack\\.com/"
  "Discord webhook|https://(canary\\.|ptb\\.)?discord(app)?\\.com/api/webhooks/"
  "healthchecks.io ping URL|https://hc-ping\\.com/"
  "UUID inside a URL|https?://[^ )\"']*[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
  "Assigned secret|(?i)\\b(api[_-]?key|apikey|secret|passwd|password|token|bearer)\\b\\s*[:=]\\s*[\"'][^\"'<]{8,}"
  "AWS access key|\\bAKIA[0-9A-Z]{16}\\b"
  "Tailscale tailnet domain|\\.ts\\.net\\b"
  "Proxmox node path|/etc/pve/(nodes|qemu-server|lxc)/[A-Za-z0-9_-]+"
  "UniFi site id|/api/s/[a-z0-9]{6,}/"
  "mDNS hostname|\\b[a-z0-9][a-z0-9-]{1,30}\\.local\\b"
  "Street address shape|\\b[0-9]{1,5}\\s+[A-Z][a-z]+\\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\\b"
  "Client or prospect language|(?i)\\b(client list|prospect list|lead list|cold email)\\b"
)

# ---------------------------------------------------------------------------
# Private patterns.
#
# Some things that must never be published cannot be described as a shape. A business
# name, a bot name, a phone number: the only way to match them is to write them down.
# Writing them down in a tracked file would put them in the history of the repo they
# exist to keep them out of, and excluding this file from its own scan hides that rather
# than fixing it.
#
# So they live in scripts/patterns.private, which is gitignored and never committed.
# Format is identical to PATTERNS above: one "label|regex" per line, # for comments.
# See scripts/patterns.private.example.
# ---------------------------------------------------------------------------
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
PRIVATE_PATTERNS_FILE="${SCAN_PRIVATE_PATTERNS:-$REPO_ROOT/scripts/patterns.private}"
PRIVATE_COUNT=0

if [ -f "$PRIVATE_PATTERNS_FILE" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|'#'*) continue ;; esac
    PATTERNS+=("$line")
    PRIVATE_COUNT=$((PRIVATE_COUNT + 1))
  done < "$PRIVATE_PATTERNS_FILE"
fi

if [ "$PRIVATE_COUNT" -eq 0 ]; then
  echo "[!] No private patterns loaded ($PRIVATE_PATTERNS_FILE is missing or empty)."
  echo "    The scanner is running with shape patterns only. Names, phone numbers, and"
  echo "    other literal strings are NOT being checked. Copy patterns.private.example"
  echo "    to patterns.private and fill it in before trusting a clean result."
  echo
fi

# File types that never get committed without an explicit, deliberate override.
BLOCKED_EXT_REGEX='\.(png|jpg|jpeg|gif|bmp|tiff|webp|heic|mp4|mov|pcap|pcapng|env|conf|cfg|pem|key|crt|p12|ovpn|sqlite|db)$'

# ---------------------------------------------------------------------------
# PCRE engine.
#
# `grep -P` is not portable. BSD grep, which is what macOS ships as /usr/bin/grep, does
# not support it: it exits 2 with a usage error and prints nothing on stdout. A scan loop
# reading that output sees no matches, which is indistinguishable from a clean file, so
# every commit passed. A scanner that always passes is worse than no scanner, because it
# is trusted.
#
# So: pick a working engine at startup, prove it actually matches something known, and
# refuse to run at all if it cannot. Fail closed, never open.
# ---------------------------------------------------------------------------
PCRE_ENGINE=""
if printf 'x\n' | command grep -qP 'x' 2>/dev/null; then
  PCRE_ENGINE="grep"
elif command -v ggrep >/dev/null 2>&1 && printf 'x\n' | ggrep -qP 'x' 2>/dev/null; then
  PCRE_ENGINE="ggrep"
elif command -v perl >/dev/null 2>&1; then
  PCRE_ENGINE="perl"
else
  echo "SCANNER CANNOT RUN: no PCRE engine found (need GNU grep -P, ggrep, or perl)."
  echo "Without one, nothing is being checked. Do not commit and do not publish."
  exit 1
fi

# stdin -> matching lines. Exit status is the engine's: 0 match, 1 no match, >1 error.
pcre_match() {
  case "$PCRE_ENGINE" in
    grep)  command grep -P -e "$1" ;;
    ggrep) ggrep -P -e "$1" ;;
    perl)  SCAN_RE="$1" perl -ne 'BEGIN { $re = qr/$ENV{SCAN_RE}/ } print if /$re/' ;;
  esac
}

# Prove the chosen engine works before trusting a single "clean". Every pattern must
# compile, and a known-bad string must actually be caught.
self_test() {
  local entry regex rc bad=0
  for entry in "${PATTERNS[@]}"; do
    regex="${entry#*|}"
    printf 'scanner self test\n' | pcre_match "$regex" >/dev/null 2>&1
    rc=$?
    if [ "$rc" -gt 1 ]; then
      echo "  [!] pattern does not compile under $PCRE_ENGINE: ${entry%%|*}"
      echo "      $regex"
      bad=1
    fi
  done

  if ! printf 'ssh admin@10.20.30.40\n' | pcre_match '\b10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\b' >/dev/null 2>&1; then
    echo "  [!] $PCRE_ENGINE did not match a known private address. The engine is broken."
    bad=1
  fi

  if [ "$bad" -ne 0 ]; then
    echo
    echo "SCANNER SELF TEST FAILED. No result from this run means anything."
    exit 1
  fi
}

# git grep has its own PCRE support, compiled in or not. Same rule: prove it or stop.
git_grep_check() {
  local err
  err="$(git grep -P -e 'scanner-self-test-string' -- . 2>&1 >/dev/null)"
  if [ -n "$err" ]; then
    echo "SCANNER CANNOT RUN: git grep -P is unavailable."
    echo "  $err"
    exit 1
  fi
}

# ---------------------------------------------------------------------------
report() {
  local label="$1"; shift
  echo "  [!] $label"
  printf '%s\n' "$@" | head -12 | sed 's/^/      /'
  FAIL=1
}

scan_paths() {
  local scope_desc="$1"; shift
  local before="$FAIL"
  echo "== $scope_desc =="
  local entry label regex hits
  for entry in "${PATTERNS[@]}"; do
    label="${entry%%|*}"
    regex="${entry#*|}"
    hits="$(git grep -n -I -P -e "$regex" "$@" -- . "${EXCLUDES[@]}" 2>/dev/null | grep -v "$SCAN_ALLOW")"
    if [ -n "$hits" ]; then
      report "$label" "$hits"
    fi
  done
  [ "$FAIL" -eq "$before" ] && echo "  clean"
  echo
}

scan_staged() {
  echo "== Staged changes =="
  local before="$FAIL"
  local files entry label regex hits blocked added
  files="$(git diff --cached --name-only --diff-filter=ACMR)"
  if [ -z "$files" ]; then
    echo "  nothing staged"; echo; return
  fi

  blocked="$(printf '%s\n' "$files" | grep -Ei "$BLOCKED_EXT_REGEX" || true)"
  if [ -n "$blocked" ]; then
    if [ "${ALLOW_BLOCKED_FILES:-0}" = "1" ]; then
      echo "  [i] Blocked file type staged, allowed by ALLOW_BLOCKED_FILES=1:"
      printf '%s\n' "$blocked" | sed 's/^/      /'
    else
      report "Blocked file type staged (images and live config are not committed by default)" "$blocked"
      echo "      Screenshots leak hostnames, IPs, and tokens in status bars and window titles."
      echo "      If this file is genuinely safe and you have reviewed every pixel of it:"
      echo "        ALLOW_BLOCKED_FILES=1 git commit ..."
    fi
  fi

  added="$(git diff --cached -U0 --diff-filter=ACMR -- . "${EXCLUDES[@]}" | grep -E '^\+' | grep -v '^+++' | grep -v "$SCAN_ALLOW" || true)"
  for entry in "${PATTERNS[@]}"; do
    label="${entry%%|*}"
    regex="${entry#*|}"
    hits="$(printf '%s\n' "$added" | pcre_match "$regex" || true)"
    if [ -n "$hits" ]; then
      report "$label" "$hits"
    fi
  done
  [ "$FAIL" -eq "$before" ] && echo "  clean"
  echo
}

# Author and committer identity.
#
# Git writes an identity into every commit, and if user.name and user.email are not set
# it invents one from the OS account and the machine hostname. That field is published
# with the repo, is not part of any file, and is not part of any commit message, so
# scanning content alone reports clean while every commit carries it.
scan_identities() {
  echo "== Commit identities =="
  local before="$FAIL" entry label regex hits ids
  # Identities already written into history, plus the one the next commit would use.
  ids="$(git log --all --format='%an <%ae>%n%cn <%ce>' 2>/dev/null | sort -u)
$(git var GIT_AUTHOR_IDENT 2>/dev/null)
$(git var GIT_COMMITTER_IDENT 2>/dev/null)"

  for entry in "${PATTERNS[@]}"; do
    label="${entry%%|*}"
    regex="${entry#*|}"
    hits="$(printf '%s\n' "$ids" | pcre_match "$regex" || true)"
    if [ -n "$hits" ]; then
      report "$label (in a commit author or committer identity)" "$hits"
      echo "      Set user.name and user.email for this repo, then amend or rebuild."
    fi
  done

  [ "$FAIL" -eq "$before" ] && echo "  clean"
  echo
}

scan_messages() {
  echo "== Commit messages =="
  local before="$FAIL" entry label regex hits messages
  messages="$(git log --all --format='%h %s%n%b' 2>/dev/null)"
  if [ -z "$messages" ]; then
    echo "  no commits yet"; echo; return
  fi

  # Every content pattern applies to commit messages too, private ones included.
  for entry in "${PATTERNS[@]}"; do
    label="${entry%%|*}"
    regex="${entry#*|}"
    hits="$(printf '%s\n' "$messages" | pcre_match "$regex" || true)"
    if [ -n "$hits" ]; then
      report "$label (in a commit message)" "$hits"
    fi
  done

  # Terms that are too noisy to block file content on, but are worth a second look in a
  # commit message, where there is no reason for any of them to appear.
  hits="$(printf '%s\n' "$messages" | grep -inE '\b(client|prospect|password|token|credential)\b' || true)"
  if [ -n "$hits" ]; then
    report "Flagged term in a commit message" "$hits"
    echo "      Review with: git log --all --oneline"
  fi

  [ "$FAIL" -eq "$before" ] && echo "  clean"
  echo
}

# Images and live config are refused at commit time, but a pre-publish scan has to answer
# a different question: is one already tracked, now or at any point in the past? A .png
# that entered history before the hooks were installed is still published when the repo
# flips to public.
scan_blocked_files() {
  local scope_desc="$1" files
  echo "== $scope_desc =="
  local before="$FAIL"

  case "$2" in
    tree)    files="$(git ls-files 2>/dev/null)" ;;
    history) files="$(git log --all --pretty=format: --name-only --diff-filter=AM 2>/dev/null | sort -u)" ;;
  esac

  files="$(printf '%s\n' "$files" | grep -Ei "$BLOCKED_EXT_REGEX" || true)"
  if [ -n "$files" ]; then
    report "Blocked file type tracked (images and live config)" "$files"
    echo "      A screenshot in history is published when the repo goes public."
  fi

  [ "$FAIL" -eq "$before" ] && echo "  clean"
  echo
}

# ---------------------------------------------------------------------------
self_test
git_grep_check

case "$MODE" in
  staged)  scan_staged; scan_identities ;;
  tree)
    scan_paths "Working tree"
    scan_blocked_files "Tracked file types" tree
    ;;
  history)
    if [ -n "$(git rev-list --all 2>/dev/null)" ]; then
      # shellcheck disable=SC2046
      scan_paths "Full git history" $(git rev-list --all)
      scan_blocked_files "File types ever committed" history
    else
      echo "== Full git history =="; echo "  no commits yet"; echo
    fi
    ;;
  all)
    scan_paths "Working tree"
    scan_blocked_files "Tracked file types" tree
    if [ -n "$(git rev-list --all 2>/dev/null)" ]; then
      # shellcheck disable=SC2046
      scan_paths "Full git history" $(git rev-list --all)
      scan_blocked_files "File types ever committed" history
    fi
    scan_messages
    scan_identities
    ;;
  *) echo "Unknown mode: $MODE (use staged, tree, history, or all)"; exit 2 ;;
esac

if [ "$FAIL" -eq 0 ]; then
  echo "PASS. No flagged patterns found."
  echo "This is a net, not a guarantee. Read the diff yourself before publishing."
else
  echo "FAIL. Resolve every hit above."
  echo
  echo "If a hit is in committed history, this repo cannot safely be made public as is."
  echo "The fix is a fresh repo with the current files copied in, not a rebase:"
  echo "  cd .. && mkdir homelab-docs-clean && cp -r homelab-docs/* homelab-docs-clean/"
  echo "  cd homelab-docs-clean && git init && git add -A && git commit -m 'docs: initial'"
fi

exit "$FAIL"
