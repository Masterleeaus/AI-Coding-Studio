# Security Status

## Pass 02 Foundations

- Local operating-system work is restricted to an allowlisted structured command catalog.
- There is no unrestricted `shell.exec` command.
- Unknown commands fail closed as privileged.
- Read, execute, write, destructive, and privileged approval classes are explicit.
- Local tools remain unavailable until discovery succeeds through a configured bridge.
- Requests and responses are versioned and bound to matching request IDs.
- Local Bridge requests support timeouts and cancellation.
- Repository Runtime exposes focused operations rather than raw command execution.

## Required Before Local Companion Activation

- background sender/message validation;
- authenticated Native Messaging connection management;
- workspace and repository allowlists enforced by the companion;
- per-command input schemas;
- process spawning without shell interpolation;
- secret redaction;
- bounded output and artifacts;
- append-only operation logging;
- protected-branch policy;
- safe HTML/Markdown rendering;
- sandbox message authentication;
- archive/path/secret-file protections.

The new runtime contracts are foundations, not a claim that all Pass 01 security findings are resolved.
