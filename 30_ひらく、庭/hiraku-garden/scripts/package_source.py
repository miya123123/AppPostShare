#!/usr/bin/env python3
"""Package the runnable garden source with its README using only the stdlib."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = ROOT / "dist" / "downloads"
PREFIX = "hiraku-garden/"


def source_files():
    selected = [ROOT / name for name in ("README.md", "DESIGN.md", "package.json", ".gitignore")]
    selected.append(ROOT / "scripts" / "package_source.py")
    for directory in ("dist", "tests"):
        selected.extend(
            path for path in (ROOT / directory).rglob("*")
            if path.is_file() and DOWNLOADS not in path.parents
            and "__pycache__" not in path.parts
        )
    return sorted(set(selected), key=lambda path: path.relative_to(ROOT).as_posix())


def zip_entry(name, data):
    info = zipfile.ZipInfo(PREFIX + name, date_time=(2026, 10, 27, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o100644 << 16
    return info, data


def main():
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    payload = {
        path.relative_to(ROOT).as_posix(): path.read_bytes()
        for path in source_files()
    }
    manifest = {
        "title": "ひらく、庭。",
        "format_version": 1,
        "files": {
            name: hashlib.sha256(data).hexdigest()
            for name, data in payload.items()
        },
    }
    payload["SOURCE_MANIFEST.json"] = (
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    ).encode("utf-8")
    (DOWNLOADS / "README.md").write_bytes(payload["README.md"])
    archive = DOWNLOADS / "hiraku-garden-source.zip"
    temporary = archive.with_suffix(".zip.tmp")
    with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        for name, data in payload.items():
            info, content = zip_entry(name, data)
            bundle.writestr(info, content)
    temporary.replace(archive)
    print(f"Created {archive.name}: {len(payload)} files, {archive.stat().st_size} bytes")


if __name__ == "__main__":
    main()
