#!/usr/bin/env bash
# Tests for check-folder-file-count.sh in throwaway git repos.
# Run: bash .husky/check-folder-file-count.test.sh
here=$(cd "$(dirname "$0")" && pwd)
failures=0

# Makes a git repo holding `$1` empty files in api/src/<folder>; prints its path.
repo_with_files() {
  local repo
  repo=$(mktemp -d)
  git -C "$repo" init -q
  mkdir -p "$repo/api/src/$2"
  for i in $(seq 1 "$1"); do : > "$repo/api/src/$2/file$i.ts"; done
  git -C "$repo" add -A
  echo "$repo"
}

# Runs the script in `$1` with the rest of the arguments; sets `output` and `status`.
run_check() {
  local repo=$1
  shift
  output=$(cd "$repo" && sh "$here/check-folder-file-count.sh" "$@" 2>&1)
  status=$?
}

expect() {
  local name=$1 want_status=$2 want_text=$3
  if [ "$status" -eq "$want_status" ] && printf '%s\n' "$output" | grep -qF -- "$want_text"; then
    echo "ok   $name"
  else
    echo "FAIL $name: wanted status $want_status and '$want_text', got status $status:"
    printf '%s\n' "$output" | sed 's/^/     /'
    failures=$((failures + 1))
  fi
}

repo=$(repo_with_files 11 orders)
run_check "$repo"
expect "fails on 11 files in a folder" 1 "11 files: api/src/orders"

repo=$(repo_with_files 10 orders)
run_check "$repo"
expect "passes on 10 files in a folder" 0 ""

repo=$(repo_with_files 10 orders)
: > "$repo/api/src/orders/untracked.ts"
run_check "$repo"
expect "ignores an untracked file by default" 0 ""
run_check "$repo" --working-tree
expect "counts an untracked file with --working-tree" 1 "11 files: api/src/orders"

repo=$(repo_with_files 11 orders)
git -C "$repo" -c user.name=t -c user.email=t@t commit -q --no-gpg-sign -m init
rm "$repo/api/src/orders/file1.ts"
run_check "$repo" --working-tree
expect "skips a file deleted from the working tree" 0 ""

repo=$(repo_with_files 11 generated)
run_check "$repo"
expect "exempts generated folders" 0 ""

repo=$(repo_with_files 1 orders)
: > "$repo/api/src/orders/orders.service.spec.ts"
git -C "$repo" add -A
run_check "$repo"
expect "fails on a spec beside its source file" 1 "api/src/orders/orders.service.spec.ts"

repo=$(repo_with_files 1 orders/test/unit)
: > "$repo/api/src/orders/test/unit/orders.service.spec.ts"
mkdir -p "$repo/api/src/orders/test/integration" "$repo/api/src/test/e2e"
: > "$repo/api/src/orders/test/integration/orders.repository.spec.ts"
: > "$repo/api/src/test/e2e/orders.e2e.spec.ts"
git -C "$repo" add -A
run_check "$repo"
expect "passes specs in test/unit, test/integration and test/e2e" 0 ""

repo=$(repo_with_files 7 orders/test/unit)
run_check "$repo"
expect "passes on 7 entries in test/unit" 0 ""

repo=$(repo_with_files 6 orders/test/unit)
mkdir -p "$repo/api/src/orders/test/unit/services" "$repo/api/src/orders/test/unit/schemas"
: > "$repo/api/src/orders/test/unit/services/a.ts"
: > "$repo/api/src/orders/test/unit/schemas/b.ts"
git -C "$repo" add -A
run_check "$repo"
expect "fails on 8 entries (files and folders) in test/unit" 1 "8 entries: api/src/orders/test/unit"

[ "$failures" -eq 0 ] || { echo "$failures failing"; exit 1; }
echo "all passing"
