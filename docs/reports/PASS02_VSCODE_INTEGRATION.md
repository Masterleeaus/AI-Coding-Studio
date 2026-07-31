# Pass 02 Visual Studio Code Integration Report

## Decision

AI Coding Studio should launch and focus Visual Studio Code rather than embed another editor, explorer, diff UI, or terminal.

## Pass 02 Command Contract

The Local Bridge catalog includes:

```text
vscode.openRepository
vscode.openFile
vscode.openLine
vscode.revealFile
vscode.openDiff
```

The companion translates these operations into validated VS Code CLI invocations.

## Supported Initial Behavior

- open an approved repository or workspace;
- open a file beneath the approved workspace;
- open a file at a validated line and optional character;
- reveal a file using the editor/workspace context;
- open a two-file diff;
- reuse or create a window according to an explicit option.

VS Code's command-line interface supports opening folders/files, reusing a window, opening a file at a line, and opening a diff editor. The companion should probe `code --version` during tool discovery and enable capabilities only when the CLI is available.

## Safety

- canonicalize every path;
- reject paths outside approved workspaces;
- reject line/character values outside positive integer bounds;
- pass arguments as an argument array, never shell interpolation;
- do not install extensions automatically;
- do not execute VS Code tasks without a separate allowlisted command and approval;
- do not use a workspace's settings to expand Local Bridge permissions.

## Future Read Integration

Diagnostics, active-editor state, and workspace symbols should use a small dedicated VS Code extension or an authenticated local protocol rather than screen scraping.

Future capabilities:

- read diagnostics for approved workspaces;
- read active file and selection;
- request symbol/reference search;
- present proposed patches in a VS Code diff;
- notify AI Coding Studio when a file is saved.

These capabilities remain out of Pass 02 because the initial objective is orchestration, not a second IDE integration platform.
