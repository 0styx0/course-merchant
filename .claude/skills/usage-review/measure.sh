#!/usr/bin/env bash
# Prints the usage review's measured fields for every model call after a time.
# Usage: measure.sh <after, UTC like 2026-10-30T21:30:00Z>
# Reads the session transcripts (and their subagent transcripts) in TRANSCRIPT_DIR,
# which defaults to this repo's folder under ~/.claude/projects. Each call counts once
# (deduplicated by message id). Context size is input + cache read + cache write tokens.
after="${1:?usage: measure.sh <after, UTC like 2026-10-30T21:30:00Z>}"
dir="${TRANSCRIPT_DIR:-$HOME/.claude/projects/-home-styx-Documents-projects-course-merchant}"

# One JSON record per call or owner turn in a transcript file.
# $1 file, $2 session id, $3 "main" or "subagent", $4 subagent kind.
records_of() {
  jq -c --arg after "$after" --arg agent "$(basename "$1")" --arg session "$2" --arg where "$3" --arg kind "$4" '
    select(.timestamp != null and .timestamp > $after) |
    if .type == "assistant" and .message.usage != null then
      .message.usage as $u |
      { role: "call", where: $where, kind: $kind, session: $session, agent: $agent, id: .message.id,
        time: .timestamp,
        context: (($u.input_tokens // 0) + ($u.cache_read_input_tokens // 0) + ($u.cache_creation_input_tokens // 0)),
        reread: ($u.cache_read_input_tokens // 0),
        write: ($u.cache_creation_input_tokens // 0),
        output: ($u.output_tokens // 0) }
    elif $where == "main" and .type == "user" and .origin.kind == "human" then
      { role: "turn" }
    else empty end' "$1"
}

# Names a subagent by its meta file: "simplify", "build" and "review" come from the
# description of a general-purpose agent; any other agent keeps its type name.
subagent_kind_of() {
  local meta="${1%.jsonl}.meta.json"
  [ -f "$meta" ] || { echo unknown; return; }
  jq -r 'if .agentType == "general-purpose" then
           (.description // "" | ascii_downcase |
             if test("simplify") then "simplify" elif test("build") then "build"
             elif test("review") then "review" else "general-purpose" end)
         else (.agentType // "unknown") end' "$meta"
}

all_records() {
  local file session
  for file in "$dir"/*.jsonl; do
    [ -e "$file" ] || continue
    records_of "$file" "$(basename "$file" .jsonl)" main ""
  done
  for file in "$dir"/*/subagents/*.jsonl; do
    [ -e "$file" ] || continue
    session=$(basename "$(dirname "$(dirname "$file")")")
    records_of "$file" "$session" subagent "$(subagent_kind_of "$file")"
  done
}

all_records | jq -rs '
  def total(f): map(f) | add // 0;
  def per(n; d): if d == 0 then 0 else (n / d | floor) end;
  (map(select(.role == "turn")) | length) as $turns |
  (map(select(.role == "call")) | unique_by(.id)) as $calls |
  ($calls | map(select(.where == "main"))) as $main |
  ($calls | map(select(.where == "subagent"))) as $sub |
  ($main | group_by(.session) | map(sort_by(.time))) as $sessions |
  "main_calls: \($main | length)",
  "subagent_calls: \($sub | length)",
  "owner_turns: \($turns)",
  "reread_tokens: \($calls | total(.reread))",
  "cache_write_tokens: \($calls | total(.write))",
  "output_tokens: \($calls | total(.output))",
  "reread_per_call: \(per($calls | total(.reread); $calls | length))",
  "sessions: \($sessions | length)",
  "sessions_ending_above_100k: \($sessions | map(select(.[-1].context > 100000)) | length)",
  ($sessions[] | "session \(.[0].session[0:8]) calls=\(length) first=\(.[0].context) last=\(.[-1].context)"),
  ($sub | group_by(.kind)[] |
    "subagent \(.[0].kind) runs=\(map(.agent) | unique | length) calls=\(length) reread=\(total(.reread))")'
