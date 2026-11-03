#!/usr/bin/env bash
# After an Edit or Write of docs/*.md, warns about design-doc format slips that the
# planning skills forbid (_shared/milestone-line.md, _shared/commit-line.md).
# Tests: lint-design-doc.test.sh.
# Exit 2 sends the message back to Claude; the doc is already saved, so it is a warning.
file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  */docs/*.md) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0

problems=""
add() { problems="$problems- $1"$'\n'; }

# Only design docs with a Status section are checked.
grep -q '^## Status' "$file" || exit 0

status=$(awk '/^## Status/{on=1;next} /^## /{on=0} on' "$file")

next_count=$(printf '%s\n' "$status" | grep -c '\*\*Next\*\*')
[ "$next_count" -le 1 ] || add "Status has $next_count **Next** marks; exactly one is allowed."

if printf '%s\n' "$status" | grep -E '^\s*- \[[ x]\] \*\*[0-9]+[a-z]{2,}\.' >/dev/null; then
  add "A Status label has a deeper level than a number and one letter (use 3b, never 3b-i)."
fi

# Milestone lines (not commit sub-bullets) should not name code.
if printf '%s\n' "$status" | grep -E '^- \[[ x]\] \*\*[0-9]+\.' | grep -q '`'; then
  add "A milestone Status line names code in backticks; say what the user can now do in plain words."
fi

# Each open commit line needs its own New shared pieces field (the lines of one
# commit run until the next Status line).
without_shared_pieces=$(printf '%s\n' "$status" | awk '
  function finish_commit() { if (open && !seen) missing = missing (missing ? ", " : "") label; open = 0 }
  /^[[:space:]]*- \[[ x]\] \*\*[0-9]+/ { finish_commit() }
  /^[[:space:]]*- \[ \] \*\*[0-9]+[a-z]\./ {
    open = 1; seen = 0
    match($0, /\*\*[0-9]+[a-z]\./); label = substr($0, RSTART + 2, RLENGTH - 3)
  }
  /New shared pieces/ { seen = 1 }
  END { finish_commit(); print missing }')
[ -z "$without_shared_pieces" ] ||
  add "Open commit line(s) $without_shared_pieces have no *New shared pieces* field (write \"none\" when empty)."

# Fields joined with semicolons inside one commit-line field.
if printf '%s\n' "$status" | grep -E '^\s+- \*(Files|Behaviours|Needs|Settled)\*:.*;' >/dev/null; then
  add "A commit-line field joins items with ';'. Use one nested bullet per item."
fi

# Typed counts belong in a Numbers row only.
if printf '%s\n' "$status" | grep -E '[0-9]+ (files|tests|commits)\b' | grep -vE '2 to 5|more than|at most' >/dev/null; then
  add "Status holds a typed count (files, tests or commits); use a Re-measure command or a Numbers row."
fi

if [ -n "$problems" ]; then
  printf 'Design-doc check on %s:\n%s' "$file" "$problems" >&2
  exit 2
fi
exit 0
