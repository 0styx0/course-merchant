#!/usr/bin/env bash
# Tests for lint-design-doc.sh: writes small design docs and runs the hook on them.
# Run: bash .claude/hooks/lint-design-doc.test.sh
here=$(cd "$(dirname "$0")" && pwd)
failures=0

# Runs the hook on a doc whose text is `$1`; sets `output` (stderr) and `status`.
lint_doc() {
  local dir doc
  dir=$(mktemp -d)
  mkdir "$dir/docs"
  doc="$dir/docs/area.md"
  printf '%s\n' "$1" > "$doc"
  output=$(printf '{"tool_input":{"file_path":"%s"}}' "$doc" | bash "$here/lint-design-doc.sh" 2>&1 >/dev/null)
  status=$?
  rm -rf "$dir"
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

lint_doc '## Status

- [ ] **3. Course list.** The admin can list courses.
  - [ ] **3a.** The admin sees a list. **Next**
    - *New shared pieces*: none
  - [ ] **3b.** The admin filters the list.
    - *New shared pieces*: a filter hook'
expect "passes when every open commit line has New shared pieces" 0 ""

lint_doc '## Status

- [ ] **3. Course list.** The admin can list courses.
  - [ ] **3a.** The admin sees a list. **Next**
    - *New shared pieces*: none
  - [ ] **3b.** The admin filters the list.
    - *Behaviours*:
      - filter by name

## Decisions

A row that mentions New shared pieces in passing.'
expect "names the open commit line that lacks New shared pieces" 2 "3b"

lint_doc '## Status

- [ ] **3a.** The admin sees a list. **Next**
  - *Behaviours*:
    - shows the list
- [x] **3b.** The admin filters the list.'
expect "flags the first open commit line when only a ticked one follows" 2 "3a"

lint_doc '## Status

- [x] **3a.** The admin sees a list.
- [ ] **3b.** The admin filters the list. **Next**
  - *New shared pieces*: none'
expect "ignores ticked commit lines" 0 ""

lint_doc '## Status

- [ ] **1. One.** First. **Next**
- [ ] **2. Two.** Second. **Next**'
expect "still warns about two Next marks" 2 "2 **Next** marks"

[ "$failures" -eq 0 ] || { echo "$failures failing"; exit 1; }
echo "all passing"
