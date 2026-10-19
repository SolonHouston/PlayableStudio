"""Copy approved effects from the supplied company reference playable."""
from pathlib import Path
import base64
import re

root = Path(__file__).resolve().parent.parent
source = Path(r'C:\Users\Admin\Desktop\一秒八刀新关卡素材\可供参考项目\PA_一秒八刀_原创_APL_打蒜头包租婆_XZC_ZWT_260723.html')
text = source.read_text(encoding='utf-8')
for name in ('upgrade', 'spark1_00', 'spark1_01', 'spark1_02'):
    match = re.search(r"'asset/" + re.escape(name) + r"\.png':'data:image/png;base64,([^']+)'", text)
    if match is None:
        raise RuntimeError(f'Missing {name}')
    path = root / 'assets' / 'images' / f'fx-{name}.png'
    path.write_bytes(base64.b64decode(match.group(1)))
    print(path.name, path.stat().st_size)
