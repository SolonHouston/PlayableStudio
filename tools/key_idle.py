from pathlib import Path
from PIL import Image, ImageFilter

root = Path(__file__).resolve().parent.parent
source = root / 'tools' / 'raw-idle'
target = root / 'assets' / 'images'
target.mkdir(parents=True, exist_ok=True)

for actor in ('muscle', 'godzilla'):
    frames = []
    for index in range(8):
        image = Image.open(source / f'{actor}-{index}.png').convert('RGBA')
        pixels = image.load()
        mask = Image.new('L', image.size)
        alpha = mask.load()
        for y in range(image.height):
            for x in range(image.width):
                red, green, blue, _ = pixels[x, y]
                excess = green - max(red * 1.24, blue * 1.18)
                if green > 75 and excess > 32:
                    alpha[x, y] = 0
                elif green > 60 and excess > 13:
                    alpha[x, y] = max(0, min(255, round(255 * (32 - excess) / 19)))
                else:
                    alpha[x, y] = 255
        mask = mask.filter(ImageFilter.GaussianBlur(.45))
        image.putalpha(mask)
        frames.append(image)
    bounds = [frame.getchannel('A').point(lambda a: 255 if a > 20 else 0).getbbox() for frame in frames]
    union = (min(box[0] for box in bounds), min(box[1] for box in bounds),
             max(box[2] for box in bounds), max(box[3] for box in bounds))
    for index, frame in enumerate(frames):
        frame.crop(union).save(target / f'{actor}-idle-{index}.webp', 'WEBP', quality=86, method=6)
    print(actor, union)
