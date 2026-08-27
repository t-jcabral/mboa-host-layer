#!/usr/bin/env sh
# MBOA branch-name gate (husky pre-push hook).
#
# Allowed:
#   main | master | develop
#   release/<anything>
#   demo/<anything>                       (team walkthrough branches)
#   <feat|fix|hotfix|chore>/<TICKET-123>[-slug]
#
# Examples: feat/MBOA-142-booking-cancel   hotfix/MBOA-201   demo/mini-app-onboarding

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

# Detached HEAD (CI checkouts, rebases) is not a naming violation.
[ "$BRANCH" = "HEAD" ] && exit 0

echo "$BRANCH" | grep -Eq '^(main|master|develop|release/.+|demo/.+|(feat|fix|hotfix|chore)/[A-Z][A-Z0-9]*-[0-9]+(-[a-z0-9._-]+)?)$' && exit 0

echo "" >&2
echo "✖ Push rejected: branch name '$BRANCH' violates the naming policy." >&2
echo "" >&2
echo "  Allowed: main | develop | release/* | demo/*" >&2
echo "           <feat|fix|hotfix|chore>/<TICKET-123>[-short-slug]" >&2
echo "  Example: feat/MBOA-142-booking-cancel" >&2
echo "" >&2
exit 1
