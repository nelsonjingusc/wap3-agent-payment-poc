#!/usr/bin/env bash
# Config-file lint: fails if any tracked source/config file contains
# obfuscated base64-decoded code, overly long lines, or long runs of trailing whitespace.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

status=0

# 1) obfuscated eval / base64 execution
if git ls-files -z -- '*.ts' '*.js' '*.cjs' '*.mjs' '*.json' '*.sh' \
  | xargs -0 grep -nE 'eval\((\s*"[^"]*"\s*\+\s*)?atob\(|Function\(\s*atob\(|new Function\(|fromCharCode\(1[0-9]{2}\)' 2>/dev/null; then
  echo "::error::Obfuscated eval/atob code detected"
  status=1
fi

# 2) a single line longer than 2000 chars in a hand-written file (lockfiles excluded)
while IFS= read -r -d '' f; do
  case "$f" in *package-lock.json|*yarn.lock|*pnpm-lock.yaml) continue ;; esac
  if awk 'length($0) > 2000 { found=1 } END { exit !found }' "$f"; then
    echo "::error file=$f::Line longer than 2000 chars"
    status=1
  fi
done < <(git ls-files -z -- '*.ts' '*.js' '*.cjs' '*.mjs' '*.sh' '*.sol')

# 3) runs of 200+ spaces after the end of visible code
if git ls-files -z -- '*.ts' '*.js' '*.cjs' '*.mjs' '*.sh' '*.sol' \
  | xargs -0 grep -lE ' {200,}' 2>/dev/null; then
  echo "::error::Run of 200+ spaces detected"
  status=1
fi

if [ "$status" -eq 0 ]; then
  echo "config lint: clean"
fi
exit "$status"
