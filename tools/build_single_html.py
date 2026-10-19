from __future__ import annotations

import base64
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
OPTIMIZED = ROOT / "build" / "optimized-assets"
DIST = ROOT / "dist"
OUTPUT = DIST / "一秒八刀_三场景_单文件.html"


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one occurrence, found {count}")
    return source.replace(old, new, 1)


def transform_script(scene: str, source: str) -> str:
    # Optimized videos already contain the exact crop used by the original canvas code.
    source = re.sub(r"crop:\s*\[[^\]]+\],\s*", "", source)
    if scene == "scene1":
        source = replace_once(source, "const ASSET = '../assets/images/';",
                              "const ASSET = '';", "scene1 external root removal")
        source = replace_once(source, "img.src = ASSET + name;",
                              "img.src = __asset('image', name);", "scene1 image resolver")
        source = replace_once(source, "new Audio(`../assets/audio/${file}`)",
                              "new Audio(__asset('audio', file))", "scene1 audio resolver")
        source = replace_once(source, "video.src = `../assets/video/${VIDEO_FX[name].file}`;",
                              "video.src = __asset('video', VIDEO_FX[name].file);",
                              "scene1 video resolver")
        source = replace_once(source, "window.location.assign('scene2-play.html');",
                              "parent.__singleSwitchScene('scene2');", "scene1 transition")
        source = replace_once(
            source,
            "ctx.drawImage(game.saiyanVideo, ...fx.crop,\n        p.x - fx.w / 2, p.y - fx.h / 2, fx.w, fx.h);",
            "ctx.drawImage(game.saiyanVideo, 0, 0, game.saiyanVideo.videoWidth, "
            "game.saiyanVideo.videoHeight,\n        p.x - fx.w / 2, p.y - fx.h / 2, fx.w, fx.h);",
            "scene1 saiyan source rectangle",
        )
    elif scene == "scene2":
        source = replace_once(source, "new Audio(`../assets/audio/${file}`)",
                              "new Audio(__asset('audio', file))", "scene2 audio resolver")
        source = replace_once(source, "video.src = `../assets/video/${VIDEO_FX[name].file}`;",
                              "video.src = __asset('video', VIDEO_FX[name].file);",
                              "scene2 video resolver")
        source = replace_once(source, "image.src = `../assets/images/${name}`;",
                              "image.src = __asset('image', name);", "scene2 image resolver")
        source = replace_once(source, "window.location.assign('scene3-play.html');",
                              "parent.__singleSwitchScene('scene3');", "scene2 transition")
    elif scene == "scene3":
        source = replace_once(source, "const IMAGE_ROOT = '../assets/images/';",
                              "const IMAGE_ROOT = '';", "scene3 image root removal")
        source = replace_once(source, "const AUDIO_ROOT = '../assets/audio/';",
                              "const AUDIO_ROOT = '';", "scene3 audio root removal")
        source = replace_once(source, "const VIDEO_ROOT = '../assets/video/';",
                              "const VIDEO_ROOT = '';", "scene3 video root removal")
        source = replace_once(source, "new Audio(AUDIO_ROOT + file)",
                              "new Audio(__asset('audio', file))", "scene3 audio resolver")
        source = replace_once(source, "video.src = VIDEO_ROOT + VIDEO_FX[name].file;",
                              "video.src = __asset('video', VIDEO_FX[name].file);",
                              "scene3 video resolver")
        source = replace_once(source, "saiyanVideo.src = VIDEO_ROOT + 'saiyan.mp4';",
                              "saiyanVideo.src = __asset('video', 'saiyan.mp4');",
                              "scene3 saiyan resolver")
        source = replace_once(source, "image.src = IMAGE_ROOT + name;",
                              "image.src = __asset('image', name);", "scene3 image resolver")
        source = replace_once(
            source,
            "ctx.drawImage(state.saiyanVideo, 0, 0, 720, 970,",
            "ctx.drawImage(state.saiyanVideo, 0, 0, state.saiyanVideo.videoWidth, "
            "state.saiyanVideo.videoHeight,",
            "scene3 saiyan source rectangle",
        )
    else:
        raise ValueError(scene)
    return source


def scene_html(scene: str, html_name: str, script_name: str) -> str:
    page = read(f"src/{html_name}")
    body_match = re.search(r"<body>(.*)</body>", page, re.S | re.I)
    if not body_match:
        raise RuntimeError(f"body not found: {html_name}")
    body = re.sub(r"\s*<script\s+src=[\"'][^\"']+[\"']></script>\s*", "\n",
                  body_match.group(1), flags=re.I)
    css = read("src/game.css")
    script = transform_script(scene, read(f"src/{script_name}"))
    bridge = """
<script>
'use strict';
const __asset = (kind, name) => parent.__singleAsset(kind, name);
const __unlockBgm = () => parent.__singleUnlockBgm();
for (const eventName of ['pointerdown','touchstart','mousedown','keydown'])
  addEventListener(eventName, __unlockBgm, {passive:true});
</script>"""
    return (
        "<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\">"
        "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,"
        "viewport-fit=cover,user-scalable=no\"><style>" + css + "</style></head><body>" +
        body + bridge + "<script>" + script + "</script></body></html>"
    )


def asset_payload() -> tuple[list[str], dict[str, dict[str, int]], dict[str, object]]:
    report = json.loads((OPTIMIZED / "manifest.json").read_text(encoding="utf-8"))
    blobs: list[str] = []
    sha_index: dict[str, int] = {}
    index: dict[str, dict[str, int]] = {"image": {}, "audio": {}, "video": {}}
    for entry in report["entries"]:
        digest = entry["sha256"]
        if digest not in sha_index:
            raw = (OPTIMIZED / entry["output"]).read_bytes()
            uri = f"data:{entry['mime']};base64," + base64.b64encode(raw).decode("ascii")
            sha_index[digest] = len(blobs)
            blobs.append(uri)
        index[entry["kind"]][entry["logical"]] = sha_index[digest]
    return blobs, index, report


def safe_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def main() -> None:
    blobs, index, report = asset_payload()
    scenes = {
        "scene1": scene_html("scene1", "index.html", "game.js"),
        "scene2": scene_html("scene2", "scene2-play.html", "scene2-play.js"),
        "scene3": scene_html("scene3", "scene3-play.html", "scene3-play.js"),
    }
    bgm_index = index["audio"]["beat-blitz-2.mp3"]
    html = f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<title>一秒八刀 · 三场景完整版</title>
<style>
*{{box-sizing:border-box}}html,body,#stage{{width:100%;height:100%;margin:0;overflow:hidden;background:#172616}}
#game-frame{{display:block;width:100%;height:100%;border:0;background:#172616}}
</style>
</head>
<body>
<main id="stage"><iframe id="game-frame" title="一秒八刀三场景游戏"></iframe></main>
<script>
'use strict';
const __BLOBS={safe_json(blobs)};
const __INDEX={safe_json(index)};
const __SCENES={safe_json(scenes)};
const __frame=document.getElementById('game-frame');
let __scene='scene1';
const __bgm=new Audio(__BLOBS[{bgm_index}]);
__bgm.loop=true;
__bgm.volume=.45;
let __bgmStarted=false;
window.__singleAsset=(kind,name)=>{{
  const slot=__INDEX[kind]&&__INDEX[kind][name];
  if(slot===undefined)throw new Error('Missing embedded asset: '+kind+'/'+name);
  return __BLOBS[slot];
}};
window.__singleUnlockBgm=()=>{{
  if(!__bgmStarted)__bgmStarted=true;
  if(__bgm.paused)__bgm.play().catch(()=>{{}});
}};
window.__singleSwitchScene=scene=>{{
  if(!__SCENES[scene])throw new Error('Unknown scene: '+scene);
  __scene=scene;
  document.documentElement.dataset.scene=scene;
  document.title='一秒八刀 · '+({{scene1:'场景一',scene2:'场景二',scene3:'场景三'}}[scene]);
  __frame.srcdoc=__SCENES[scene];
}};
window.__singleGame={{
  get scene(){{return __scene}},
  get frame(){{return __frame}},
  get bgm(){{return __bgm}},
  get assetCount(){{return {report['asset_count']}}},
  switchScene:window.__singleSwitchScene,
  unlockBgm:window.__singleUnlockBgm,
}};
window.__singleSwitchScene('scene1');
</script>
</body>
</html>
"""
    DIST.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(html, encoding="utf-8", newline="\n")
    size = OUTPUT.stat().st_size
    if size > 4_800_000:
        raise RuntimeError(f"single HTML exceeds 4.8 MB target: {size}")
    print(json.dumps({
        "output": str(OUTPUT),
        "bytes": size,
        "embedded_unique_assets": len(blobs),
        "logical_assets": report["asset_count"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
