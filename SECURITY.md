# Security Policy

## Supported versions

Security fixes go into the latest release only.

## Reporting a vulnerability

Please don't report security problems in public issues. Use GitHub's private vulnerability reporting instead: on the repository's **Security** tab, click **Report a vulnerability**, or go straight to [the report form](https://github.com/chipfighter/context-attachment-manager/security/advisories/new). Only you and the maintainer can see the report.

Please include what you found, how to reproduce it, and the plugin version and platform you used.

## What to look at

The plugin runs a local proxy (the engine) between Codex or Claude Code and the official or custom endpoint configured by the user. On install it edits `~/.codex/config.toml` (and `~/.codex/.env` when needed). Problems like these are especially worth reporting:

- The engine accepts connections from other machines, sends credentials to the other client's service, or forwards requests to a destination the user did not configure.
- Authentication headers or conversation content end up in logs or saved route records.
- The install or uninstall scripts change more than INSTALL.md says.
