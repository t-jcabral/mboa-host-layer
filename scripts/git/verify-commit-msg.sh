#!/usr/bin/env sh
# MBOA commit-message gate (husky commit-msg hook).
#
# Required format — strict:
#   <type>:<ticket>:<title>
#   <blank line>
#   <description — at least one non-empty line>
#
#   type   : feat | fix | hotfix | chore
#   ticket : Jira-style, e.g. MBOA-123
#   title  : 1-72 characters
#
# Example:
#   feat:MBOA-142:add booking cancellation flow
#
#   Adds the cancellation endpoint wiring and the confirm dialog.
#   Rollback-safe: the flag ships disabled.

MSG_FILE="$1"

if [ -z "$MSG_FILE" ] || [ ! -f "$MSG_FILE" ]; then
  echo "commit-msg: no commit message file supplied" >&2
  exit 1
fi

# Strip comment lines and everything below a scissors line (verbose commits).
CLEANED=$(sed -n '/^# ------------------------ >8 ------------------------$/q;p' "$MSG_FILE" | grep -v '^#' || true)

SUBJECT=$(printf '%s\n' "$CLEANED" | sed -n '1p')
LINE2=$(printf '%s\n' "$CLEANED" | sed -n '2p')
BODY=$(printf '%s\n' "$CLEANED" | sed -n '3,$p' | grep -cve '^[[:space:]]*$' || true)

fail() {
  echo "" >&2
  echo "✖ Commit rejected: $1" >&2
  echo "" >&2
  echo "  Required format:" >&2
  echo "    <feat|fix|hotfix|chore>:<TICKET-123>:<title (max 72 chars)>" >&2
  echo "    <blank line>" >&2
  echo "    <description — at least one line>" >&2
  echo "" >&2
  echo "  Example:" >&2
  echo "    feat:MBOA-142:add booking cancellation flow" >&2
  echo "" >&2
  echo "    Adds the cancellation endpoint wiring and the confirm dialog." >&2
  echo "" >&2
  exit 1
}

# Machine-generated commits pass through untouched.
case "$SUBJECT" in
  "Merge "*|"Revert "*|"fixup! "*|"squash! "*) exit 0 ;;
esac

[ -n "$SUBJECT" ] || fail "empty commit message"

printf '%s' "$SUBJECT" | grep -Eq '^(feat|fix|hotfix|chore):[A-Z][A-Z0-9]*-[0-9]+:.+$' \
  || fail "subject '$SUBJECT' does not match <type>:<ticket>:<title>"

TITLE=$(printf '%s' "$SUBJECT" | cut -d: -f3-)
[ ${#TITLE} -le 72 ] || fail "title is ${#TITLE} chars (max 72)"

TOTAL_LINES=$(printf '%s\n' "$CLEANED" | grep -cve '^$' || true)
if [ "$TOTAL_LINES" -le 1 ]; then
  fail "description body is required (subject alone is not enough)"
fi

[ -z "$LINE2" ] || fail "line 2 must be blank (separate subject from description)"
[ "$BODY" -ge 1 ] || fail "description body is required below the blank line"

exit 0
