---
name: Workspace pnpm version compatibility
description: The artifact workflow can fail before startup when packageManager requests a pnpm version newer than the installed Nix pnpm.
---

Keep the workspace packageManager version aligned with the pnpm version already provided by the Replit/Nix environment when the workflow is unable to bootstrap its requested version.

**Why:** Under process/resource pressure, the automatic pnpm self-install can abort before dependencies are restored, leaving the workflow with no node_modules and a misleading app startup failure.

**How to apply:** Check `command -v pnpm` and `pnpm --version` before changing app code when a workflow repeatedly fails inside `pnpm add pnpm@...`; restore dependencies with the matching local version.