#!/usr/bin/env bash
# Refuses a whole-file Read of a generated file (they are huge). Exit 2 sends the message back to Claude.
input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
limit=$(printf '%s' "$input" | jq -r '.tool_input.limit // empty')
case "$file" in
  */api/src/generated/* | */web/src/lib/api/generated.ts)
    if [ -z "$limit" ]; then
      echo "Generated file: grep for the type or operation name, or Read with offset and limit (CLAUDE.md *Contract-first API*)." >&2
      exit 2
    fi
    ;;
esac
exit 0
