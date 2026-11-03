#!/usr/bin/env sh
# Checks one package against what changed since the last commit: the type
# check (whole package, because a change can break an importer), lint on the
# changed files, only the unit tests related to them, and knip (unused
# exports, which a moved or deleted file can leave behind). It also runs the
# folder layout check on the files on disk, so a file added or moved while
# working shows up before it is staged.
# Usage, from the repo root: sh .husky/check-changed.sh api|web
set -e
package=$1
[ "$package" = api ] || [ "$package" = web ] || { echo "Usage: check-changed.sh api|web" >&2; exit 2; }

root=$(git rev-parse --show-toplevel)
cd "$root"
sh .husky/check-folder-file-count.sh --working-tree
changed=$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } |
  sed -n "s|^$package/||p" | grep -E '\.tsx?$' | sort -u | while read -r file; do
    [ -e "$package/$file" ] && echo "$file"
  done || true)

[ "$package" = web ] && yarn --cwd web next typegen
yarn --cwd "$package" tsc --noEmit

if [ -z "$changed" ]; then
  echo "No changed TypeScript files in $package: type check and knip only."
  yarn --cwd "$package" knip
  exit 0
fi
# shellcheck disable=SC2086 # the repo has no spaces in its paths
yarn --cwd "$package" eslint $changed
# shellcheck disable=SC2086
yarn --cwd "$package" test:unit:related $changed
yarn --cwd "$package" knip
