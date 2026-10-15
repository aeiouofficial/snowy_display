#!/usr/bin/env python3
"""Populate Cargo registry on exFAT without writing unsupported tar mtimes.

Only write beneath S:\\snowy_display. Verify every archive against Cargo.lock.
Never modify C:; an existing C: cargo archive is read-only as an optimization.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import os
from pathlib import Path, PurePosixPath
import shutil
import tarfile
import time
import tomllib
import urllib.error
import urllib.request

ROOT = Path(r"S:\snowy_display")
INDEX = "index.crates.io-1949cf8c6b5b557f"
CACHE = ROOT / ".cache" / "cargo" / "registry" / "cache" / INDEX
SOURCE = ROOT / ".cache" / "cargo" / "registry" / "src" / INDEX
PREVIOUS = Path(r"C:\Users\BigBr\.cargo\registry\cache") / INDEX
TEMP = ROOT / ".tmp"
LOCK = ROOT / "src-tauri" / "Cargo.lock"
LOG = ROOT / ".cache" / "cargo" / "hydration.log"


def digest(path: Path) -> str:
    sha = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            sha.update(chunk)
    return sha.hexdigest()


def source_package(pkg: dict[str, str]) -> str:
    name, version, expected = pkg["name"], pkg["version"], pkg["checksum"]
    stem = f"{name}-{version}"
    archive = CACHE / (stem + ".crate")
    target = SOURCE / stem
    marker = target / ".cargo-ok"
    if marker.is_file() and marker.read_bytes() == b'{"v":1}':
        if archive.is_file() and digest(archive) == expected:
            return "cached " + stem
    if not archive.is_file() or digest(archive) != expected:
        existing = PREVIOUS / archive.name
        if existing.is_file() and digest(existing) == expected:
            shutil.copyfile(existing, archive)
        else:
            url = f"https://static.crates.io/crates/{name}/{stem}.crate"
            last_error: Exception | None = None
            for attempt in range(4):
                tmp_file = TEMP / f"{stem}.download"
                try:
                    with urllib.request.urlopen(url, timeout=50) as response, tmp_file.open("wb") as out:
                        shutil.copyfileobj(response, out, length=1024 * 1024)
                    if digest(tmp_file) != expected:
                        raise ValueError(f"Checksum mismatch: {stem}")
                    os.replace(tmp_file, archive)
                    break
                except Exception as exc:
                    last_error = exc
                    tmp_file.unlink(missing_ok=True)
                    if attempt == 3:
                        raise RuntimeError(f"Download failed after retries: {stem}: {exc}") from exc
                    time.sleep(1.5 * (attempt + 1))
            if last_error and not archive.exists():
                raise last_error
    if digest(archive) != expected:
        raise ValueError(f"Invalid SHA256 after caching: {stem}")
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True)
    files = 0
    try:
        with tarfile.open(archive, "r:gz") as tf:
            for item in tf:
                entry = PurePosixPath(item.name)
                if not entry.parts or entry.parts[0] != stem or ".." in entry.parts:
                    raise ValueError(f"Unsafe entry path: {item.name}")
                dest = SOURCE.joinpath(*entry.parts)
                if item.isdir():
                    dest.mkdir(parents=True, exist_ok=True)
                elif item.isfile():
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    source = tf.extractfile(item)
                    if source is None:
                        raise ValueError(f"Missing tar content: {item.name}")
                    with source, dest.open("wb") as out:
                        shutil.copyfileobj(source, out, length=1024 * 1024)
                    files += 1
                else:
                    raise ValueError(f"Unsupported tar entry: {item.name}, type={item.type!r}")
        marker.write_bytes(b'{"v":1}')
        return f"ok {stem}: {files} files"
    except Exception:
        shutil.rmtree(target, ignore_errors=True)
        raise


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--one", metavar="NAME", help="Only hydrate one crate name")
    parser.add_argument("--workers", type=int, default=5)
    args = parser.parse_args()
    for p in (CACHE, SOURCE, TEMP, LOG.parent):
        p.mkdir(parents=True, exist_ok=True)
    data = tomllib.loads(LOCK.read_text("utf-8"))
    packages = [p for p in data["package"] if p.get("source", "").startswith("registry+") and p.get("checksum")]
    if args.one:
        packages = [p for p in packages if p["name"] == args.one]
    if not packages:
        raise RuntimeError("No matching crates in Cargo.lock")
    print(f"Hydrating {len(packages)} verified crates on {ROOT.drive} with {args.workers} workers", flush=True)
    ok, failed = 0, []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(8, args.workers))) as pool:
        futures = {pool.submit(source_package, p): p for p in packages}
        for future in concurrent.futures.as_completed(futures):
            try:
                result = future.result()
                ok += 1
                if ok % 20 == 0 or args.one:
                    print(f"{ok}/{len(packages)} {result}", flush=True)
            except Exception as exc:
                failed.append(f"{futures[future]['name']}-{futures[future]['version']}: {exc}")
                print("FAILED:", failed[-1], flush=True)
    LOG.write_text(f"total={len(packages)} ok={ok} failed={len(failed)}\\n" +
                   "\\n".join(failed), encoding="utf-8")
    print(f"Finished: {ok} passed, {len(failed)} failed. Log: {LOG}", flush=True)
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
