# Agent Rules & Behavioral Directives

## 1. Absolute Rule: No Merging to `main` Without Explicit Human Sign-off
- **"Tested working" means verified by the human user on real hardware**, never just automated tests or headless execution.
- Automated tests (`npm run check`, typechecks, unit tests) and build success are **necessary prerequisites**, but they **never** constitute permission to merge or deploy.
- **Workflow Requirement**:
  1. Complete build and run all automated test suites.
  2. Launch and showcase the application live on the user's desktop/screen.
  3. Inform the user and explicitly request their manual review/acceptance.
  4. **STOP and WAIT**. Only merge to `main` and push to upstream when the user explicitly responds in chat confirming that they have verified it working and authorize the merge.

## 2. Real Hardware Showcase Protocol
- For desktop, mobile, or GUI applications, do not simply run a headless smoke test, kill the process after 5 seconds, and declare it verified.
- Launch the application so the user can interact with the live UI, test overlay/tray/window behaviors, and visually confirm functionality.
- Never terminate a showcased process unless requested by the user or required for a rebuild.

## 3. Communication Precedes Execution
- When the user asks a question, raises an issue, or provides critique, **answer directly with clear text first**.
- Never reflexively fire terminal commands, edit files, or launch background tasks to evade direct answering.
- Maintain total transparency, accountability, and zero excuses.

## 4. Environment & Disk Space Checks
- Always verify free disk space across target drives (`C:`, `D:`, `S:`, etc.) before initiating large downloads or builds.
- Check filesystem operational status (`Get-Volume` / `chkdsk`) if disk I/O errors occur.
