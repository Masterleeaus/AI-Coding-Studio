from __future__ import annotations

import hashlib
import shutil
import urllib.request
from pathlib import Path, PurePosixPath

BASE_URL = "https://incalculable-eventide.miniup.app"
HASH_LIST_SHA256 = "c10b5c0cf0fb98c33638b8fcfc788bf5f671e323a834b4c739ac2373dcba0f31"
ROOT = Path(__file__).resolve().parents[2]
STAGING = ROOT / ".pass02-staging"

EXPECTED_DELETIONS = {
    "COMPLETE_MODULE_INTEGRATION.md",
    "MODULE_INTEGRATION_MANIFEST.md",
    "MODULE_INTEGRATION_MANIFEST_v2.1.md",
    "QUICK_REFERENCE.md",
    "README-AI-CODING-STUDIO.md",
    "README-MODULAR.md",
    "src/core/EventEmitter.js",
    "src/core/ModuleInterface.js",
    "src/core/ModuleManager.js",
    "src/core/bootstrap-enhanced.js",
    "src/core/bootstrap.js",
    "src/modules/config/LocalizationModule.js",
    "src/modules/config/RemoteConfigModule.js",
    "src/modules/core/BridgeModule.js",
    "src/modules/core/EventBusModule.js",
    "src/modules/core/StateModule.js",
    "src/modules/core/StorageModule.js",
    "src/modules/features/AutoCodeModule.js",
    "src/modules/features/AutoContinueModule.js",
    "src/modules/features/BrowserAutomationModule.js",
    "src/modules/features/CommandsModule.js",
    "src/modules/features/ContextBudgetModule.js",
    "src/modules/features/DeepResearchModule.js",
    "src/modules/features/FileReaderModule.js",
    "src/modules/features/HandoffModule.js",
    "src/modules/features/MarkdownSkillsModule.js",
    "src/modules/features/McpIntegrationModule.js",
    "src/modules/features/MemoryModule.js",
    "src/modules/features/PromptLibraryModule.js",
    "src/modules/features/RetrievalContextModule.js",
    "src/modules/features/TerminalRuntimeModule.js",
    "src/modules/features/ToolRuntimeModule.js",
    "src/modules/features/ToolsModule.js",
    "src/modules/ui/MessageOverlayModule.js",
    "src/modules/ui/SettingsPanelModule.js",
    "src/modules/ui/UiModule.js",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def safe_relative_path(raw: str) -> PurePosixPath:
    path = PurePosixPath(raw)
    if path.is_absolute() or not path.parts or any(part in {"", ".", ".."} for part in path.parts):
        raise RuntimeError(f"Unsafe Pass 02 path: {raw}")
    if path.parts[0] == ".git":
        raise RuntimeError(f"Git metadata path is forbidden: {raw}")
    return path


def download(relative: str) -> bytes:
    safe_relative_path(relative)
    request = urllib.request.Request(
        f"{BASE_URL}/{relative}",
        headers={"User-Agent": "AI-Coding-Studio-Pass02-Importer/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status != 200:
            raise RuntimeError(f"Download failed for {relative}: HTTP {response.status}")
        return response.read()


def parse_hashes(text: str) -> dict[str, str]:
    hashes: dict[str, str] = {}
    for line in text.splitlines():
        if not line.strip():
            continue
        expected, raw_path = line.split("  ", 1)
        safe_relative_path(raw_path)
        if raw_path in hashes:
            raise RuntimeError(f"Duplicate hash-list path: {raw_path}")
        hashes[raw_path] = expected
    return hashes


def remove_exact_path(relative: str) -> None:
    if relative not in EXPECTED_DELETIONS:
        raise RuntimeError(f"Unexpected deletion requested: {relative}")
    target = ROOT.joinpath(*safe_relative_path(relative).parts)
    if target.is_dir():
        shutil.rmtree(target)
    elif target.exists() or target.is_symlink():
        target.unlink()


def main() -> None:
    if STAGING.exists():
        shutil.rmtree(STAGING)
    STAGING.mkdir(parents=True)

    hash_bytes = download("PASS02_FILE_HASHES.sha256")
    if sha256(hash_bytes) != HASH_LIST_SHA256:
        raise RuntimeError("Pass 02 hash inventory checksum mismatch")

    hashes = parse_hashes(hash_bytes.decode("utf-8"))
    for relative, expected in hashes.items():
        data = download(relative)
        if sha256(data) != expected:
            raise RuntimeError(f"Checksum mismatch for {relative}")
        destination = STAGING.joinpath(*safe_relative_path(relative).parts)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)

    deletion_file = STAGING / "DELETED_FILES.txt"
    requested_deletions = {
        line.strip() for line in deletion_file.read_text(encoding="utf-8").splitlines() if line.strip()
    }
    if requested_deletions != EXPECTED_DELETIONS:
        raise RuntimeError("Pass 02 deletion inventory does not match the embedded allowlist")

    changed_root = STAGING / "changed-files"
    for source in sorted(changed_root.rglob("*")):
        if not source.is_file():
            continue
        relative = source.relative_to(changed_root)
        destination = ROOT / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)

    for relative in sorted(EXPECTED_DELETIONS, reverse=True):
        remove_exact_path(relative)

    shutil.rmtree(STAGING)
    (ROOT / ".github/workflows/apply-pass2.yml").unlink(missing_ok=True)
    Path(__file__).unlink(missing_ok=True)
    try:
        Path(__file__).parent.rmdir()
    except OSError:
        pass


if __name__ == "__main__":
    main()
