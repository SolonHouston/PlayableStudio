"""Extract sampled transparent death frames from the supplied QuickTime RLE MOV."""
from pathlib import Path
from PIL import Image
import struct

root = Path(__file__).resolve().parent.parent
source = Path(r'C:\Users\Admin\Desktop\一秒八刀新关卡素材\动态特效\破碎骨头.mov')
output = root / 'assets' / 'images'
data = source.read_bytes()
u16 = lambda n: struct.unpack_from('>H', data, n)[0]
u32 = lambda n: struct.unpack_from('>I', data, n)[0]
stsd = data.index(b'stsd')
width, height = u16(stsd + 44), u16(stsd + 46)
sizes_atom = data.index(b'stsz') + 4
offsets_atom = data.index(b'stco') + 4
count = u32(sizes_atom + 8)
assert count == u32(offsets_atom + 4)
sizes = [u32(sizes_atom + 12 + 4 * n) for n in range(count)]
offsets = [u32(offsets_atom + 8 + 4 * n) for n in range(count)]
rgba = bytearray(width * height * 4)
selected = range(0, min(count, 28), 4)

for frame_number, (offset, length) in enumerate(zip(offsets, sizes)):
    packet = data[offset:offset + length]
    assert len(packet) == length and (int.from_bytes(packet[:4], 'big') & 0x3fffffff) == length
    index = 4
    header = int.from_bytes(packet[index:index + 2], 'big')
    index += 2
    if header & 8:
        start = int.from_bytes(packet[index:index + 2], 'big')
        lines = int.from_bytes(packet[index + 4:index + 6], 'big')
        index += 8
    else:
        start, lines = 0, height
    for y in range(start, start + lines):
        x = packet[index] - 1
        index += 1
        while True:
            code = struct.unpack_from('b', packet, index)[0]
            index += 1
            if code == -1:
                break
            if code == 0:
                x += packet[index] - 1
                index += 1
                continue
            if code < 0:
                argb = packet[index:index + 4]
                index += 4
                color = bytes((argb[1], argb[2], argb[3], argb[0]))
                for _ in range(-code):
                    rgba[(y * width + x) * 4:(y * width + x + 1) * 4] = color
                    x += 1
            else:
                for _ in range(code):
                    argb = packet[index:index + 4]
                    index += 4
                    rgba[(y * width + x) * 4:(y * width + x + 1) * 4] = bytes((argb[1], argb[2], argb[3], argb[0]))
                    x += 1
    if frame_number in selected:
        image = Image.frombytes('RGBA', (width, height), bytes(rgba))
        image.thumbnail((300, 300), Image.Resampling.LANCZOS)
        image.save(output / f'bone-{frame_number // 4}.webp', 'WEBP', quality=82, method=6)
        print(frame_number, image.getbbox())
