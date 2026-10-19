"""Isolate the supplied muscular Goku figure from its animated source backdrop."""
from collections import deque
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops

source = Path(r'C:\Users\Admin\Desktop\一秒八刀新关卡素材\肌肉悟空走路')
target = Path(__file__).resolve().parent.parent / 'assets' / 'images'
files = sorted(source.glob('*.png'))
if len(files) < 57:
    raise RuntimeError('Expected the supplied muscular Goku sequence')
for output_index, file_index in enumerate(range(0, 64, 8)):
    image = Image.open(files[file_index]).convert('RGBA').crop((880, 330, 1220, 900))
    px = image.load()
    mask = Image.new('L', image.size)
    mp = mask.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = px[x, y]
            blue = b > r * 1.18 and b > g * 1.10 and b > 85
            pale = min(r, g, b) > 180 and max(r, g, b) - min(r, g, b) < 95
            mp[x, y] = 0 if a < 20 or blue or pale else 255
    # Keep the main figure and discard isolated remnants of the backing animation.
    seen = set()
    components = []
    for y in range(image.height):
        for x in range(image.width):
            if mp[x, y] == 0 or (x, y) in seen:
                continue
            q = deque([(x, y)])
            seen.add((x, y))
            points = []
            while q:
                cx, cy = q.popleft()
                points.append((cx, cy))
                for nx, ny in ((cx-1, cy), (cx+1, cy), (cx, cy-1), (cx, cy+1)):
                    if 0 <= nx < image.width and 0 <= ny < image.height and mp[nx, ny] and (nx, ny) not in seen:
                        seen.add((nx, ny))
                        q.append((nx, ny))
            components.append(points)
    chosen = max(components, key=len)
    clean = Image.new('L', image.size)
    cp = clean.load()
    for x, y in chosen:
        cp[x, y] = 255
    silhouette = Image.open(target / 'muscle-idle-0.webp').getchannel('A').resize((265, 510))
    aligned = Image.new('L', image.size)
    aligned.paste(silhouette, (70, 53))
    clean = ImageChops.multiply(clean, aligned)
    clean = clean.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(.5))
    image.putalpha(clean)
    image.save(target / f'muscle-walk-{output_index}.webp', 'WEBP', quality=88, method=6)
    print(files[file_index].name, len(chosen))
