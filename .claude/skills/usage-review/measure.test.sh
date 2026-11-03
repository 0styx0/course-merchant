#!/usr/bin/env bash
# Tests for measure.sh: builds small fake transcript folders and compares the
# report line by line. Run: bash .claude/skills/usage-review/measure.test.sh
here=$(cd "$(dirname "$0")" && pwd)
failures=0

# One assistant line of a transcript: id, timestamp, input, cache read, cache write, output tokens.
call_line() {
  printf '{"type":"assistant","timestamp":"%s","message":{"id":"%s","usage":{"input_tokens":%s,"cache_read_input_tokens":%s,"cache_creation_input_tokens":%s,"output_tokens":%s}}}\n' \
    "$2" "$1" "$3" "$4" "$5" "$6"
}
human_line() {
  printf '{"type":"user","timestamp":"%s","isSidechain":false,"origin":{"kind":"human"},"message":{"content":"hello"}}\n' "$1"
}
tool_result_line() {
  printf '{"type":"user","timestamp":"%s","isSidechain":false,"toolUseResult":{},"message":{"content":[{"type":"tool_result"}]}}\n' "$1"
}

# Asserts that the report holds the line `expected`.
expect_line() {
  local name=$1 report=$2 expected=$3
  if printf '%s\n' "$report" | grep -qxF -- "$expected"; then
    echo "ok   $name"
  else
    echo "FAIL $name: expected line '$expected' in:"
    printf '%s\n' "$report" | sed 's/^/     /'
    failures=$((failures + 1))
  fi
}

after="2026-10-30T21:30:00Z"

# A session with a duplicated call, a call before the cutoff, a tool result and a human turn,
# plus a build subagent.
busy=$(mktemp -d)
{
  call_line msg_old 2026-10-29T10:00:00.000Z 0 999999 0 0
  human_line 2026-11-01T10:00:00.000Z
  tool_result_line 2026-11-01T10:00:01.000Z
  call_line msg_1 2026-11-01T10:00:02.000Z 2 1000 200 50
  call_line msg_1 2026-11-01T10:00:02.500Z 2 1000 200 50
  call_line msg_2 2026-11-01T10:00:03.000Z 1 150000 0 10
} > "$busy/aaaa1111-0000.jsonl"
mkdir -p "$busy/aaaa1111-0000/subagents"
call_line msg_s1 2026-11-01T10:00:04.000Z 0 500 0 5 > "$busy/aaaa1111-0000/subagents/agent-1.jsonl"
echo '{"agentType":"general-purpose","description":"Build commit 8c"}' > "$busy/aaaa1111-0000/subagents/agent-1.meta.json"

report=$(TRANSCRIPT_DIR="$busy" bash "$here/measure.sh" "$after")
expect_line "counts main calls once per message id, after the cutoff" "$report" "main_calls: 2"
expect_line "counts subagent calls apart from main calls" "$report" "subagent_calls: 1"
expect_line "counts only typed owner messages as turns" "$report" "owner_turns: 1"
expect_line "adds up cache re-reads of main and subagent calls" "$report" "reread_tokens: 151500"
expect_line "adds up cache writes" "$report" "cache_write_tokens: 200"
expect_line "adds up output tokens" "$report" "output_tokens: 65"
expect_line "averages re-reads over every call" "$report" "reread_per_call: 50500"
expect_line "shows each session's first and last context size" "$report" "session aaaa1111 calls=2 first=1202 last=150001"
expect_line "counts sessions ending above 100k" "$report" "sessions_ending_above_100k: 1"
expect_line "groups subagents by kind" "$report" "subagent build runs=1 calls=1 reread=500"

# An empty folder reports zeros and exits cleanly.
empty=$(mktemp -d)
report=$(TRANSCRIPT_DIR="$empty" bash "$here/measure.sh" "$after")
status=$?
expect_line "reports zero calls for an empty folder" "$report" "main_calls: 0"
expect_line "reports a zero average for an empty folder" "$report" "reread_per_call: 0"
if [ "$status" -eq 0 ]; then echo "ok   exits 0 for an empty folder"; else echo "FAIL exit status $status for an empty folder"; failures=$((failures + 1)); fi

# A missing argument stops with a usage message.
if TRANSCRIPT_DIR="$empty" bash "$here/measure.sh" >/dev/null 2>&1; then
  echo "FAIL measure.sh without a cutoff time should exit non-zero"; failures=$((failures + 1))
else
  echo "ok   stops without a cutoff time"
fi

rm -rf "$busy" "$empty"
[ "$failures" -eq 0 ] || { echo "$failures failing"; exit 1; }
echo "all passing"
