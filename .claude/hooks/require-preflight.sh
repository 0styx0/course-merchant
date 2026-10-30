#!/usr/bin/env bash
# While /next-commit is running, refuses Edit/Write until an assistant message has started a line with "Preflight:"
# (the outline's first line, see .claude/skills/next-commit/outline.md). Exit 2 sends the message back to Claude.
transcript=$(jq -r '.transcript_path // empty')
[ -r "$transcript" ] || exit 0
# Each transcript line becomes at most one event; the last events decide: a next-commit start (slash command or Skill
# call) opens the check, a Preflight line closes it, /clear ends it.
state=$(jq -rs '
  def blocks: if (.message.content | type) == "string" then [{type: "text", text: .message.content}] else (.message.content // []) end;
  def events:
    . as $line | blocks[] |
    if $line.type == "user" and .type == "text" and (.text | contains("<command-name>/next-commit</command-name>")) then "start"
    elif $line.type == "user" and .type == "text" and (.text | contains("<command-name>/clear</command-name>")) then "end"
    elif $line.type == "assistant" and .type == "tool_use" and .name == "Skill" and .input.skill == "next-commit" then "start"
    elif $line.type == "assistant" and .type == "text" and (.text | test("(^|\n)Preflight:")) then "preflight"
    else empty end;
  reduce (.[] | events) as $event ("idle";
    if $event == "start" then "waiting" elif $event == "end" then "idle"
    elif $event == "preflight" and . == "waiting" then "done" else . end)
' "$transcript" 2>/dev/null)
if [ "$state" = "waiting" ]; then
  echo "/next-commit is running and no outline has been given yet. Before editing, send the outline for this commit as a message that starts with a 'Preflight:' line (.claude/skills/next-commit/outline.md), then edit." >&2
  exit 2
fi
exit 0
