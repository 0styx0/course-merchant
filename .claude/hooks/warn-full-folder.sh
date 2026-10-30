#!/usr/bin/env bash
# After a Write, warns when the written file's folder holds more than 10 files
# (sub-folders not counted; generated and vendored code exempt). Same limit as
# .husky/check-folder-file-count.sh, but sees the file before it is committed.
# Exit 2 sends the message back to Claude.
MAX_FILES=10
file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  */api/src/* | */api/test/* | */web/src/* | */web/tests/*) ;;
  *) exit 0 ;;
esac
case "$file" in
  */migrations/* | */components/ui/* | */generated/* | *generated.ts) exit 0 ;;
esac
dir=$(dirname "$file")
count=$(find "$dir" -maxdepth 1 -type f | wc -l)
if [ "$count" -gt "$MAX_FILES" ]; then
  echo "$dir now holds $count files (limit $MAX_FILES, CLAUDE.md *Conventions*). Group the files by job in this commit." >&2
  exit 2
fi
exit 0
