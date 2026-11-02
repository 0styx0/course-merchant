#!/usr/bin/env bash
# Prints every "Re-measure:" command found in a design doc, then runs each one.
# Usage: .claude/hooks/run-remeasure.sh docs/<module>.md
# Only runs commands written inside backticks after "Re-measure:".
doc="${1:?usage: run-remeasure.sh docs/<module>.md}"
grep -E '^\s*- Re-measure:' "$doc" | grep -oE '`[^`]+`' | tr -d '`' | while IFS= read -r cmd; do
  echo "\$ $cmd"
  bash -c "$cmd" 2>&1 | head -20
  echo
done
