"""Extract sampled transparent PNG frames from the supplied Fire01 MOV container."""
from io import BytesIO
from pathlib import Path
from PIL import Image
import struct

root = Path(__file__).resolve().parent.parent
source = root.parent / '(素材)' / '动效' / '火花01.mov'
output = root / 'assets' / 'images'
data = source.read_bytes()
u32 = lambda n: struct.unpack_from('>I', data, n)[0]
stsd = data.index(b'stsd')
assert data[stsd + 16:stsd + 20] == b'png ', 'Fire01 MOV no longer contains PNG samples'
sizes_atom = data.index(b'stsz') + 4
offsets_atom = data.index(b'stco') + 4
count = u32(sizes_atom + 8)
assert count == u32(offsets_atom + 4)
sizes = [u32(sizes_atom + 12 + 4 * n) for n in range(count)]
offsets = [u32(offsets_atom + 8 + 4 * n) for n in range(count)]
selected = sorted({round(index * (count - 1) / 5) for index in range(6)})

for output_index, frame_number in enumerate(selected):
    offset, length = offsets[frame_number], sizes[frame_number]
    packet = data[offset:offset + length]
    assert packet.startswith(b'\x89PNG\r\n\x1a\n')
    image = Image.open(BytesIO(packet)).convert('RGBA')
    image.thumbnail((180, 180), Image.Resampling.LANCZOS)
    target = output / f'fire01-{output_index}.webp'
    image.save(target, 'WEBP', quality=84, method=6)
    print(target.name, image.size, image.getbbox())
