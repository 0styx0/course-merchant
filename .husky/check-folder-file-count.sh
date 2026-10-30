#!/usr/bin/env sh
# Fails when a folder under src/ or tests/ holds more than MAX_FILES tracked files
# (sub-folders not counted). Generated and vendored code is exempt. The limit and
# the reasoning are in CLAUDE.md *Conventions*.
MAX_FILES=10

too_big=$(
  git ls-files -- 'api/src' 'api/test' 'web/src' 'web/tests' |
    grep -Ev '/(migrations|components/ui|generated)/|generated\.ts$' |
    sed 's|/[^/]*$||' | sort | uniq -c |
    awk -v max="$MAX_FILES" '$1 > max { print $1 " files: " $2 }'
)

if [ -n "$too_big" ]; then
  echo "More than $MAX_FILES files in a folder. Group the files by job:"
  echo "$too_big"
  exit 1
fi
