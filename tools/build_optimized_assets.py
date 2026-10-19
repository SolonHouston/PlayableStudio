from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageSequence


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets"
OUTPUT = ROOT / "build" / "optimized-assets"
FFMPEG = Path(
    os.environ.get("FFMPEG_PATH", "")
    or shutil.which("ffmpeg")
    or r"C:\Program Files (x86)\Lenovo\LegionZone\2.0.29.9292"
       r"\SEGamingAI\services\editor\ffmpeg.exe"
)


def numbered(prefix: str, count: int, suffix: str) -> list[str]:
    return [f"{prefix}{index}{suffix}" for index in range(count)]


IMAGES = {
    "grass.webp", "white.webp", "gold.webp", "cage.webp", "cage-open.webp",
    "car.webp", "white-orb.webp", "red-orb.webp", "green-orb.webp",
    "gold-orb.webp", "green.webp", "purple.webp", "超大金轮.png",
    "左边黄衣悟空.png", "右边黄衣悟空.png", "fx-upgrade.png",
    "fx-spark1_00.png", "fx-spark1_01.png", "fx-spark1_02.png",
    "BG20.png", "BG21.png", "榴莲.png", "宝箱.png", "彩刃.png",
    "treasure-glow.gif", "scene3/red-blade.png",
    *numbered("player-", 6, ".webp"),
    *numbered("jiangbao-", 6, ".webp"),
    *numbered("strong-", 6, ".webp"),
    *numbered("poseidon-", 6, ".webp"),
    *numbered("momo-", 6, ".webp"),
    *numbered("muscle-idle-", 8, ".webp"),
    *numbered("godzilla-idle-", 8, ".webp"),
    *numbered("muscle-walk-", 8, ".webp"),
    *numbered("portal-", 10, ".webp"),
    *numbered("bone-", 7, ".webp"),
    *numbered("fire01-", 6, ".webp"),
    *[f"胖虎走路_{index:02d}.png" for index in range(28)],
    *numbered("scene3/super-", 8, ".png"),
    *numbered("scene3/goblin-", 8, ".png"),
    *numbered("scene3/giant-", 8, ".png"),
    *numbered("scene3/demon-", 8, ".png"),
    *numbered("scene3/venom-", 8, ".png"),
    *numbered("scene3/axe-", 8, ".png"),
}

AUDIO = {
    "beat-blitz-2.mp3", "collision.mp3", "hit.mp3", "upgrade.mp3",
    "death.mp3", "blow.mp3", "blade-clash.mp3", "enemy-hit.mp3",
    "pickup.mp3", "cage-hit.mp3", "wall-hit.mp3", "nice.mp3", "easy.mp3",
    "upgrade-wav.wav", "ouch.mp3", "run-away.mp3", "take-it.mp3",
    "momo-hit.mp3", "shock.mp3", "hu.mp3", "surprised.mp3", "laugh.mp3",
    "yo.mp3",
}

VIDEOS = {
    "saiyan.mp4": ("fps=12,scale=120:162", "80k", False),
    "clash.mp4": ("crop=720:650:180:170,fps=12,scale=108:98", "96k", True),
    "metal.mp4": ("crop=390:390:470:520,fps=15,scale=136:136", "112k", True),
    "wall-spark.mp4": ("fps=12,scale=144:144", "96k", False),
    "upgrade-2.mp4": ("fps=12,scale=176:224", "112k", False),
    "walk-acquire-2.mp4": ("fps=12,scale=144:144", "96k", False),
    "chest-glow.mp4": ("fps=12,scale=184:136", "96k", False),
}


def image_spec(name: str, size: tuple[int, int]) -> tuple[tuple[int, int], int]:
    if name.startswith("胖虎走路_"):
        return (210, 250), 66
    scene3_sizes = {
        "super-": (172, 172), "goblin-": (72, 96), "giant-": (164, 220),
        "demon-": (164, 220), "venom-": (172, 184), "axe-": (148, 120),
    }
    if name.startswith("scene3/"):
        stem = Path(name).name
        for prefix, target in scene3_sizes.items():
            if stem.startswith(prefix):
                return target, 68
    exact = {
        "BG20.png": ((512, 512), 52), "BG21.png": ((512, 512), 52),
        "榴莲.png": ((114, 114), 72), "超大金轮.png": ((420, 420), 68),
        "左边黄衣悟空.png": ((280, 376), 70),
        "右边黄衣悟空.png": ((280, 376), 70),
        "car.webp": ((192, 120), 72), "cage.webp": ((320, 400), 72),
        "cage-open.webp": ((320, 400), 72), "宝箱.png": (size, 66),
        "treasure-glow.gif": ((142, 80), 58),
    }
    if name in exact:
        return exact[name]
    patterns = {
        "player-": ((200, 272), 70), "strong-": ((220, 220), 68),
        "muscle-idle-": ((300, 420), 68), "godzilla-idle-": ((320, 420), 70),
        "muscle-walk-": ((182, 252), 68), "portal-": ((230, 245), 68),
        "bone-": ((100, 100), 72), "fire01-": ((56, 56), 72),
    }
    for prefix, spec in patterns.items():
        if name.startswith(prefix):
            return spec
    return size, 72


def save_static_webp(source: Path, destination: Path, name: str) -> None:
    with Image.open(source) as image:
        image.load()
        target, quality = image_spec(name, image.size)
        frame = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        if frame.size != target:
            frame = frame.resize(target, Image.Resampling.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        frame.save(destination, "WEBP", quality=quality, method=6, exact=False)


def save_animated_webp(source: Path, destination: Path, name: str) -> None:
    with Image.open(source) as image:
        target, quality = image_spec(name, image.size)
        frames: list[Image.Image] = []
        durations: list[int] = []
        for frame in ImageSequence.Iterator(image):
            rgba = frame.convert("RGBA")
            if rgba.size != target:
                rgba = rgba.resize(target, Image.Resampling.LANCZOS)
            frames.append(rgba)
            durations.append(max(20, int(frame.info.get("duration", image.info.get("duration", 40)))))
        destination.parent.mkdir(parents=True, exist_ok=True)
        frames[0].save(
            destination, "WEBP", save_all=True, append_images=frames[1:],
            duration=durations, loop=int(image.info.get("loop", 0)), quality=quality,
            method=6, minimize_size=True,
        )


def run_ffmpeg(arguments: list[str]) -> None:
    command = [str(FFMPEG), "-y", "-hide_banner", "-loglevel", "error", *arguments]
    subprocess.run(command, check=True)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def entry(kind: str, logical: str, source: Path, output: Path, **extra: object) -> dict[str, object]:
    return {
        "kind": kind,
        "logical": logical,
        "source": str(source.relative_to(ROOT)).replace("\\", "/"),
        "output": str(output.relative_to(OUTPUT)).replace("\\", "/"),
        "source_bytes": source.stat().st_size,
        "optimized_bytes": output.stat().st_size,
        "sha256": sha256(output),
        **extra,
    }


def main() -> None:
    if not FFMPEG.exists():
        raise FileNotFoundError(f"FFmpeg not found: {FFMPEG}")
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir(parents=True)
    manifest: list[dict[str, object]] = []

    for name in sorted(IMAGES):
        source = SOURCE / "images" / name
        output = OUTPUT / "images" / Path(name).with_suffix(".webp")
        if getattr(Image.open(source), "is_animated", False):
            save_animated_webp(source, output, name)
        else:
            save_static_webp(source, output, name)
        manifest.append(entry("image", name, source, output, mime="image/webp"))

    for name in sorted(AUDIO):
        source = SOURCE / "audio" / name
        output = OUTPUT / "audio" / f"{Path(name).stem}.m4a"
        output.parent.mkdir(parents=True, exist_ok=True)
        bitrate = "32k" if name == "beat-blitz-2.mp3" else "40k"
        run_ffmpeg([
            "-i", str(source), "-vn", "-ac", "1", "-ar", "24000",
            "-c:a", "aac", "-b:a", bitrate, "-movflags", "+faststart", str(output),
        ])
        manifest.append(entry("audio", name, source, output, mime="audio/mp4"))

    for name, (video_filter, bitrate, crop_baked) in sorted(VIDEOS.items()):
        source = SOURCE / "video" / name
        output = OUTPUT / "video" / name
        output.parent.mkdir(parents=True, exist_ok=True)
        run_ffmpeg([
            "-i", str(source), "-vf", video_filter, "-an", "-c:v", "h264_mf",
            "-b:v", bitrate, "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(output),
        ])
        manifest.append(entry(
            "video", name, source, output, mime="video/mp4",
            crop_baked=crop_baked, filter=video_filter,
        ))

    raw_source = sum(int(item["source_bytes"]) for item in manifest)
    raw_output = sum(int(item["optimized_bytes"]) for item in manifest)
    unique_output = sum(
        int(next(item["optimized_bytes"] for item in manifest if item["sha256"] == digest))
        for digest in {str(item["sha256"]) for item in manifest}
    )
    report = {
        "schema": 1,
        "asset_count": len(manifest),
        "source_bytes": raw_source,
        "optimized_bytes": raw_output,
        "unique_optimized_bytes": unique_output,
        "estimated_base64_bytes": 4 * ((unique_output + 2) // 3),
        "entries": manifest,
    }
    (OUTPUT / "manifest.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps({key: value for key, value in report.items() if key != "entries"}, indent=2))


if __name__ == "__main__":
    main()
