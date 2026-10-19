from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "build" / "optimized-assets"
MANIFEST = OUTPUT / "manifest.json"
FFMPEG = Path(
    r"C:\Program Files (x86)\Lenovo\LegionZone\2.0.29.9292"
    r"\SEGamingAI\services\editor\ffmpeg.exe"
)


def main() -> None:
    report = json.loads(MANIFEST.read_text(encoding="utf-8"))
    entries = report["entries"]
    assert report["asset_count"] == 209
    assert len(entries) == 209
    assert report["source_bytes"] == 17_988_834
    assert report["unique_optimized_bytes"] <= 2_400_000

    logical = set()
    for entry in entries:
        assert entry["logical"] not in logical
        logical.add(entry["logical"])
        output = OUTPUT / entry["output"]
        assert output.is_file() and output.stat().st_size == entry["optimized_bytes"]
        if entry["kind"] == "image":
            with Image.open(output) as image:
                assert image.format == "WEBP"
                image.seek(0)
                image.convert("RGBA").load()

    glow = next(item for item in entries if item["logical"] == "treasure-glow.gif")
    with Image.open(OUTPUT / glow["output"]) as image:
        assert image.is_animated and image.n_frames > 1

    for entry in entries:
        if entry["kind"] not in {"audio", "video"}:
            continue
        output = OUTPUT / entry["output"]
        result = subprocess.run(
            [str(FFMPEG), "-v", "error", "-i", str(output), "-f", "null", "-"],
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True,
        )
        assert result.returncode == 0, f"decode failed: {entry['logical']}\n{result.stderr}"

    core_code = sum(
        (ROOT / relative).stat().st_size
        for relative in (
            "src/game.js", "src/scene2-play.js", "src/scene3-play.js",
            "src/bgm.js", "src/game.css",
        )
    )
    projected_single_html = report["estimated_base64_bytes"] + core_code + 300_000
    assert projected_single_html <= 4_800_000
    print(json.dumps({
        "assets": len(entries),
        "unique_optimized_bytes": report["unique_optimized_bytes"],
        "estimated_base64_bytes": report["estimated_base64_bytes"],
        "core_code_bytes": core_code,
        "projected_with_300k_wrapper": projected_single_html,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
