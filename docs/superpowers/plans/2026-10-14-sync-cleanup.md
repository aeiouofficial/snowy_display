# Snowy Display Synchronization and Safe Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkboxes.

**Goal:** Safely reconcile local feature work with GitHub, reclaim obsolete build space, and independently verify every accessible release gate without discarding changes or falsely certifying hardware.

**Architecture:** Use one hidden Python process whose subprocesses have `CREATE_NO_WINDOW`, with all scratch artifacts on S:. Treat commits, file contents, and CI checks as independent evidence. Keep reproducible build outputs separate from source and valuable release outputs.

**Tech Stack:** Git, Python on Windows, Node 22, TypeScript, Vite 7, Rust/Tauri 2, GitHub Actions.

**Spec:** `docs/AUDIT_2026-10-14.md`; user-requested repository synchronization, disk cleanup, and shipping audit.

## Global Constraints

- Work only within `S:\snowy_display`; never create or modify files on C:.
- Preserve dirty tracked files, package locks, offline Cargo registry, release executable, `.git`, `node_modules`, and user-facing workspace files.
- No terminal window may foreground or interrupt typing.
- Do not merge `main` until user certifies real-hardware review as demanded by `AGENTS.md`.
- Do not present CI green as cross-platform UI hardware acceptance.

## Review Focus

- Locked README/workflow: commits must not silently replace uninspectable content.
- Running Cargo or Snowy app: cleanup must leave any actively used executable untouched.
- Local branch newer than PR #1: integration must not drop newer commits.
- First-frame overlay visibility: no `show` call during native creation.
- Out-of-disk error: cleanup must not delete the offline Rust cache required to rebuild.

### Task 1: Reclaim recoverable build space

**Files:** ignored `.build/target/debug`; no tracked source modifications.
**Interfaces:** disk inventory and process-list safety checks.
- [ ] Preflight running Cargo/Rust/Snowy processes and verify exact normalized debug path.
- [ ] Remove only `.build/target/debug` when safe; retain `.build/target/release`.
- [ ] Recalculate `S:` free space and log deleted file count/bytes.
- [ ] Verify `git status` is unchanged.

### Task 2: Protect and repair workspace access

**Files:** `README.md`, `.github/workflows/android-apk.yml`, current six-file dirty set.
- [ ] Inspect Windows file access and locks without changing permissions blindly.
- [ ] Read all six modified files and compare their diffs with HEAD.
- [ ] If either source file remains unreadable, explicitly record blocker and exclude it from staged changes.

### Task 3: Prevent premature overlay show

**Files:** `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`, `tests/overlay-contract.test.ts`.
- [ ] Add a regression check for hidden native creation and frontend show-after-render; confirm it fails on eager-show code.
- [ ] Remove only the premature `w.show()` while keeping needed capability grants.
- [ ] Rerun check to demonstrate RED→GREEN.

### Task 4: Fresh verifications

**Files:** `docs/AUDIT_2026-10-14.md`, `docs/STATUS.md`, `CHANGELOG.md`.
- [ ] Run `npm run check`, `npm run build:web`, and available native Rust/Tauri check.
- [ ] Record command, exit status, test counts, environment, and remaining hardware blockers.
- [ ] Update docs only to match tested facts.

### Task 5: Safe GitHub integration

**Files:** only audited and approved source/docs.
- [ ] Verify no accidental change or secret is staged.
- [ ] Commit validated modifications to `feat/cross-platform-snow-physics-alpha`.
- [ ] Set correct upstream, safely push feature branch, inspect new CI results.
- [ ] Prepare current-feature draft PR and reconcile/supersede old PR #1 only after reviewing its unique contents.
- [ ] Do not merge to `main` until the `AGENTS.md` hardware sign-off is explicitly fulfilled.
