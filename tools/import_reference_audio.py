"""Extract only approved effects from the supplied company reference playable."""
from pathlib import Path
import base64
import re

source = Path(r'C:\Users\Admin\Desktop\一秒八刀新关卡素材\可供参考项目\PA_一秒八刀_原创_APL_打蒜头包租婆_XZC_ZWT_260723.html')
target = Path(__file__).resolve().parent.parent / 'assets' / 'audio'
target.mkdir(parents=True, exist_ok=True)
text = source.read_text(encoding='utf-8', errors='replace')
for name in ('collision', 'hit', 'upgrade', 'death', 'blow'):
    match = re.search(r"'asset/" + name + r"\.mp3':'data:audio/mpeg;base64,([^']+)'", text)
    if not match:
        raise RuntimeError(f'Missing {name}.mp3 in reference')
    path = target / f'{name}.mp3'
    path.write_bytes(base64.b64decode(match.group(1)))
    print(path.name, path.stat().st_size)
