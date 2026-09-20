# Mobile Header Unification Implementation Plan

> **For agentic workers:** use the agent-orchestrator Job Capsule supplied by the root orchestrator. The implementation must follow TDD and must not create a commit unless the user explicitly requests one.

**Goal:** Consolidate the mobile app headers into explicit reusable page, contextual-navigation, and guided-session variants while preserving labels, routes, states, role isolation, and existing visual direction.

**Architecture:** Keep `Screen` responsible for safe area and tab-bar inset behavior. Keep the vertical `ScreenHeader` contract available for existing consumers, add a shared contextual header contract for back/title/action screens, and keep the guided-session header as a centered variant with its own interaction rules. Migrate duplicated screen-local headers to these primitives without creating a boolean-heavy mega-component.

**Tech Stack:** Expo Router, React Native, TypeScript strict, React Native Testing Library, Vitest, Biome, Expo Doctor.

**Spec:** Approved in-chat design from the preceding header audit; no separate product spec is required.

## Global Constraints

- Preserve the existing `.pen` worktree change; do not edit or stage `assets/design/pencil_design.pen`.
- Work only in `apps/mobile` and the implementation-plan artifact created for this task; do not change API, database, routes, payloads, auth, storage, or role guards.
- Preserve all visible pt-BR labels, screen states, retry actions, navigation destinations, and session-exit decisions.
- Reuse `apps/mobile/src/lib/styles.ts`, existing UI primitives, and `Screen` safe-area/tab-bar behavior.
- Do not add dependencies, `any`, non-null assertions, commented-out code, placeholders, pending-work markers, or unrelated refactors.
- Add tests before production changes, capture the focused RED result, then capture focused GREEN and full-suite results.
- Do not commit, push, open a PR, merge, or clean unrelated worktree changes.

## Review Focus

- A header with a trailing action must preserve the action's accessibility label, disabled state, and 48dp touch target.
- A contextual header must preserve the edge/back action and must not make a decorative menu icon appear actionable.
- A guided-session header must keep the title centered while retaining the back affordance and safe-exit flow.
- Loading and empty states must keep their distinct visual structure without introducing duplicate tab-bar or safe-area spacing.
- Custom headings must expose `accessibilityRole="header"` consistently without changing visible copy.

### Task 1: Shared Header Contracts and RED/GREEN Tests

**Files:**
- Create or modify the focused shared header module under `apps/mobile/src/components/ui`.
- Modify `apps/mobile/src/components/ui/screen.tsx` only as needed to preserve `Screen` and the existing `ScreenHeader` import contract.
- Add or extend `apps/mobile/src/components/ui/ui.test.tsx` or a focused header test beside the shared module.

**Interfaces:**
- Preserve `Screen` and `ScreenHeader` behavior for current consumers.
- Provide explicit reusable variants for a vertical page header and a horizontal contextual header.
- Keep guided-session centering expressible without duplicating its layout in `log-workout.tsx`.

- [x] Write focused tests for the three header variants, including structure, tokens, role semantics, action labels, disabled state, and touch-target geometry.
- [x] Run the focused test and record the expected RED failure before changing production header code.
- [x] Implement the smallest shared primitives using existing colors, spacing, radii, control sizes, and typography.
- [x] Run the focused test again and record GREEN output.

### Task 2: Migrate Student and Auth Page Headers

**Files:**
- Modify `apps/mobile/app/(auth)/login.tsx` and `apps/mobile/app/(auth)/signup.tsx`.
- Modify `apps/mobile/src/screens/profile.tsx`, `apps/mobile/src/screens/today-workout.tsx`, `apps/mobile/src/screens/progress.tsx`, `apps/mobile/src/screens/new-assessment.tsx`, `apps/mobile/src/screens/workout-overview.tsx`, and `apps/mobile/src/screens/log-workout.tsx`.
- Update only the corresponding focused screen tests when the shared contract changes their observable structure.

- [x] Replace duplicated vertical page headers with the shared page variant while preserving student/trainer profile content and role-specific copy.
- [x] Represent Today empty notifications and Progress/New Assessment actions as explicit trailing actions where appropriate.
- [x] Replace the student new-assessment back/title row and guided-session row with the contextual/session variants without changing navigation or exit behavior.
- [x] Keep loading skeleton geometry and empty-state composition intentional and tested.
- [x] Run the affected screen tests and record the result.

### Task 3: Migrate Trainer Headers and Detail Headers

**Files:**
- Modify `apps/mobile/src/screens/trainer-home.tsx`, `trainer-students.tsx`, `trainer-assessments.tsx`, `trainer-assessment-detail.tsx`, `trainer-new-assessment.tsx`, `trainer-student-detail.tsx`, `trainer-workouts.tsx`, `trainer-workout-detail.tsx`, and `trainer-workout-editor.tsx`.
- Update the corresponding trainer screen tests only for changed shared-header contracts and accessibility assertions.

- [x] Replace `TrainerHomeHeader`, `TrainerStudentsHeader`, and `StudentDetailStateHeader` duplication with the shared page variant.
- [x] Replace assessment, student-detail, workout-list, and workout-detail back/title/action rows with the shared contextual variant.
- [x] Preserve the distinction between refresh actions and decorative menu affordances.
- [x] Keep the trainer shell, role-specific labels, query states, retry behavior, and navigation targets unchanged.
- [x] Ensure every page-level heading has the expected header accessibility role.
- [x] Run all affected trainer tests and record the result.

### Task 4: Full Verification and Native Evidence

**Files:**
- No additional production files unless verification exposes a defect in the owned header migration.

- [x] Run `corepack.cmd pnpm --dir apps/mobile test --run` and record the complete result.
- [x] Run `corepack.cmd pnpm --dir apps/mobile typecheck` and record the complete result.
- [x] Run the relevant Biome/lint command for changed mobile files.
- [x] Run `corepack.cmd pnpm --dir apps/mobile doctor` and report pre-existing/environment findings separately from code findings.
- [x] Capture trainer home, trainer students, and profile states on the available Android runtime and inspect fresh UIAutomator state; detail/session/student data states remain unavailable because the running Expo Go environment reported the existing API/push-notification limitations.
- [x] Scan changed text files for escaped Unicode sequences used in place of literal UTF-8 characters.
- [x] Confirm `git status --short` shows no change to the pre-existing `.pen` artifact beyond its initial state and no unrelated files.

**Verification evidence (2026-09-20):** focused GREEN covered 7 files and 97 tests; the final suite passed in 58 files with 544 tests, and typecheck, Biome, Expo Doctor, diff validation, and the UTF-8 escape scan passed.
