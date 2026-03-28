---
phase: 07-lease-negotiation-and-notifications
plan: "02"
subsystem: ui
tags: [react, next.js, notifications, header, useEffect, pathname]

# Dependency graph
requires:
  - phase: 07-01
    provides: Notifications API route (GET /api/user/notifications) and NotificationPanel component
provides:
  - Proactive unread notification badge in header that fetches on mount and pathname change
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Separate badge state (unreadBadgeCount) from panel data state (notifications) — badge updates independently of panel open/close"
    - "Cancellation token pattern (cancelled flag) in async useEffect to prevent stale state on fast navigation"
    - "pathname dependency in useEffect triggers re-fetch on every client-side navigation without page reload"

key-files:
  created: []
  modified:
    - src/components/layout/header.tsx

key-decisions:
  - "Separate unreadBadgeCount state from notifications panel state — badge is always visible; panel is only fetched when opened"
  - "unreadBadgeCount synced when panel fetches to avoid divergence (panel re-fetch is the source of truth after open)"
  - "handleMarkAllRead clears unreadBadgeCount to 0 immediately (optimistic update, consistent with panel optimistic update)"

patterns-established:
  - "Badge state pattern: maintain independent lightweight state for indicators, separate from full data state"

requirements-completed: [NOTF-03]

# Metrics
duration: 1min
completed: 2026-03-28
---

# Phase 7 Plan 02: Proactive Notification Badge Summary

**Unread notification count badge now fetches on mount and every pathname change via dedicated `unreadBadgeCount` state, independent of notification panel open state**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-28T02:59:26Z
- **Completed:** 2026-03-28T03:00:26Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `unreadBadgeCount` state separate from `notifications` panel state
- New `useEffect` with `[pathname]` dependency fetches unread count on every page navigation (not just panel open)
- Panel fetch effect now also syncs `unreadBadgeCount` to avoid divergence when panel is opened
- `handleMarkAllRead` clears badge to 0 immediately (optimistic update alongside panel optimistic update)
- Removed derived `unreadCount = notifications.filter(...)` — badge uses dedicated state exclusively
- TypeScript compiles cleanly (exit code 0)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add proactive notification badge that fetches on mount and page navigation** - `016f4f8` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/layout/header.tsx` - Added `unreadBadgeCount` state, proactive fetch effect with pathname dependency, badge rendering updated

## Decisions Made
- Separate `unreadBadgeCount` state from `notifications` array — badge needs to be visible at all times independent of whether the panel has ever been opened. This is the minimal change to achieve NOTF-03 without refactoring the panel data flow.
- Panel's `showNotifications` useEffect also sets `unreadBadgeCount` after mapping — keeps badge in sync if panel fetches fresher data than the proactive fetch already got.
- `handleMarkAllRead` clears badge immediately (optimistic) — consistent with the existing pattern of optimistically updating `notifications` state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript implicit `any` on `mapped.filter` lambda**
- **Found during:** Task 1 verification (npx tsc --noEmit)
- **Issue:** `mapped.filter((n) => !n.read)` gave TS7006 implicit `any` because TypeScript couldn't infer the type in that context
- **Fix:** Added explicit `(n: Notification)` annotation to the filter callback
- **Files modified:** src/components/layout/header.tsx
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** `016f4f8` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — TypeScript type inference)
**Impact on plan:** Minimal — one-line annotation fix, no behavior change.

## Issues Encountered
- Pre-existing TypeScript errors in `src/app/api/leases/[id]/negotiate/route.ts` (unrelated to this plan, out of scope). Logged to deferred items.

## Next Phase Readiness
- Notification badge is now always visible on page load and updates on navigation
- Ready for any further notification features (polling, websocket upgrade, etc.)
- NOTF-03 requirement satisfied

## Self-Check: PASSED

- src/components/layout/header.tsx: FOUND
- .planning/phases/07-lease-negotiation-and-notifications/07-02-SUMMARY.md: FOUND
- Commit 016f4f8: FOUND

---
*Phase: 07-lease-negotiation-and-notifications*
*Completed: 2026-03-28*
