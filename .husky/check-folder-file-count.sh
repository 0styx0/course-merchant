#!/usr/bin/env sh
# Checks the layout of api/src, api/test, web/src and web/tests:
# - a folder holds at most MAX_FILES files (sub-folders not counted; generated and
#   vendored code is exempt). The limit and the reasoning are in CLAUDE.md *Conventions*;
# - an API spec file sits in a test/unit, test/integration or test/e2e folder, never
#   beside its source file (.claude/rules/api-tests.md);
# - a test/unit folder holds at most MAX_UNIT_ENTRIES entries, files and sub-folders
#   together (.claude/rules/api-tests.md).
# Checks the tracked files; with --working-tree, the files on disk (untracked files
# included, deleted ones left out), which suits a check made before staging.
MAX_FILES=10
MAX_UNIT_ENTRIES=7

checked_files() {
  if [ "$1" = "--working-tree" ]; then
    { git ls-files --cached --others --exclude-standard -- 'api/src' 'api/test' 'web/src' 'web/tests'
      git ls-files --deleted -- 'api/src' 'api/test' 'web/src' 'web/tests'; } | sort | uniq -u
  else
    git ls-files -- 'api/src' 'api/test' 'web/src' 'web/tests'
  fi | grep -Ev '/(migrations|components/ui|generated)/|generated\.ts$'
}

files=$(checked_files "$1")

too_big=$(
  printf '%s\n' "$files" | sed 's|/[^/]*$||' | sort | uniq -c |
    awk -v max="$MAX_FILES" '$1 > max { print $1 " files: " $2 }'
)

misplaced_specs=$(
  printf '%s\n' "$files" | grep -E '^api/.*\.spec\.ts$' |
    grep -Ev '/test/(unit|integration|e2e)/'
)

# Each file or sub-folder directly inside a test/unit folder is one entry.
too_many_unit_entries=$(
  printf '%s\n' "$files" | sed -nE 's|^(api/.*/test/unit)/([^/]+).*|\1 \2|p' | sort -u |
    awk -v max="$MAX_UNIT_ENTRIES" '{ n[$1]++ } END { for (d in n) if (n[d] > max) print n[d] " entries: " d }'
)

status=0
if [ -n "$too_big" ]; then
  echo "More than $MAX_FILES files in a folder. Group the files by job:"
  echo "$too_big"
  status=1
fi
if [ -n "$misplaced_specs" ]; then
  echo "API spec files beside their source. Move each into the module's test/unit, test/integration or test/e2e folder:"
  echo "$misplaced_specs"
  status=1
fi
if [ -n "$too_many_unit_entries" ]; then
  echo "More than $MAX_UNIT_ENTRIES entries in a test/unit folder. Group the sub-folders by topic:"
  echo "$too_many_unit_entries"
  status=1
fi
exit $status
