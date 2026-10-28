#!/usr/bin/env sh
# Formats a file Claude just edited with its package's prettier (lint-staged does the same at commit time).
file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  "$CLAUDE_PROJECT_DIR"/api/*) package=api ;;
  "$CLAUDE_PROJECT_DIR"/web/*) package=web ;;
  *) exit 0 ;;
esac
case "$file" in
  *.ts | *.tsx | *.js | *.mjs | *.json | *.css | *.md | *.yaml | *.yml) ;;
  *) exit 0 ;;
esac
cd "$CLAUDE_PROJECT_DIR/$package" && yarn -s prettier --write "$file" >/dev/null 2>&1
exit 0
