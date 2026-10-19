from __future__ import annotations

import hashlib
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "tools" / "build_single_html.py"
OUTPUT = ROOT / "dist" / "一秒八刀_三场景_单文件.html"


def digest() -> str:
    return hashlib.sha256(OUTPUT.read_bytes()).hexdigest()


def main() -> None:
    subprocess.run([sys.executable, str(BUILD)], check=True, stdout=subprocess.DEVNULL)
    first = digest()
    subprocess.run([sys.executable, str(BUILD)], check=True, stdout=subprocess.DEVNULL)
    assert digest() == first, "single HTML build is deterministic"
    html = OUTPUT.read_text(encoding="utf-8")
    assert OUTPUT.stat().st_size <= 4_800_000
    assert "../assets/" not in html
    assert "scene2-play.html" not in html and "scene3-play.html" not in html
    assert "parent.__singleSwitchScene('scene2')" in html
    assert "parent.__singleSwitchScene('scene3')" in html
    assert "new Audio(__asset('audio', file))" in html
    assert "__singleAsset" in html and "__singleUnlockBgm" in html
    assert html.count("data:") == 194
    assert html.count("<iframe") == 1
    print(f"single-html-build: PASS ({OUTPUT.stat().st_size} bytes, sha256={first})")


if __name__ == "__main__":
    main()
