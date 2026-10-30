#!/usr/bin/env bash
# Refuses an edit to a generated file or an existing migration. Exit 2 sends the message back to Claude.
file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  */api/src/generated/* | */web/src/lib/api/generated.ts)
    echo "Generated file: change api/openapi/openapi-v1.yaml and run the generate:api-types scripts (CLAUDE.md *Contract-first API*)." >&2
    exit 2
    ;;
  */api/migrations/*)
    if [ -e "$file" ]; then
      echo "Existing migration: never edit one. Add a new migration with yarn prisma." >&2
      exit 2
    fi
    ;;
esac
exit 0
