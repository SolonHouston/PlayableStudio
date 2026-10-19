"""Extract RGBA frames from the supplied QuickTime Animation MOV.

The file is 32-bit QuickTime RLE. Decode its MOV sample table and scanline
packets into transparent frames without changing the original video.
"""
from pathlib import Path
from PIL import Image
import struct

root = Path(__file__).resolve().parent.parent
source = Path(r'C:\Users\Admin\Desktop\26_0114找半身融合新剧情打金铁笼半身文件夹\(素材)\视频\传送门02.mov')
output = root / 'assets' / 'images'
data = source.read_bytes()
u16 = lambda n: struct.unpack_from('>H', data, n)[0]
u32 = lambda n: struct.unpack_from('>I', data, n)[0]
stsd = data.index(b'stsd')
width, height = u16(stsd + 44), u16(stsd + 46)
assert (width, height) == (375, 400), (width, height)
sizes_atom = data.index(b'stsz') + 4
offsets_atom = data.index(b'stco') + 4
count = u32(sizes_atom + 8)
assert count == u32(offsets_atom + 4)
sizes = [u32(sizes_atom + 12 + 4 * n) for n in range(count)]
offsets = [u32(offsets_atom + 8 + 4 * n) for n in range(count)]
rgba = bytearray(width * height * 4)

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
                assert len(argb) == 4 and x >= 0 and x - code <= width
                color = bytes((argb[1], argb[2], argb[3], argb[0]))
                for _ in range(-code):
                    rgba[(y * width + x) * 4:(y * width + x + 1) * 4] = color
                    x += 1
            else:
                assert x >= 0 and x + code <= width
                for _ in range(code):
                    argb = packet[index:index + 4]
                    index += 4
                    rgba[(y * width + x) * 4:(y * width + x + 1) * 4] = bytes((argb[1], argb[2], argb[3], argb[0]))
                    x += 1
    image = Image.frombytes('RGBA', (width, height), bytes(rgba))
    path = output / f'portal-{frame_number}.webp'
    image.save(path, 'WEBP', quality=88, method=6)
    print(frame_number, length, path.stat().st_size)
