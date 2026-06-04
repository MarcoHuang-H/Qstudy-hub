"""Inventory media + slide->image mapping inside a pptx (no deps)."""
import sys, zipfile, re
from collections import defaultdict

path = sys.argv[1]
zf = zipfile.ZipFile(path)

# 1. media files
media = [n for n in zf.namelist() if n.startswith("ppt/media/")]
total = 0
by_ext = defaultdict(lambda: [0, 0])
for m in media:
    sz = zf.getinfo(m).file_size
    total += sz
    ext = m.rsplit(".", 1)[-1].lower()
    by_ext[ext][0] += 1
    by_ext[ext][1] += sz

print(f"媒體檔總數: {len(media)}  總大小: {total/1024/1024:.1f} MB")
for ext, (cnt, sz) in sorted(by_ext.items(), key=lambda x: -x[1][1]):
    print(f"  .{ext}: {cnt} 個, {sz/1024/1024:.2f} MB")

# 2. slide -> images (via rels)
print("\n每張投影片用到的圖片數（前 40 張）：")
slide_imgs = {}
for sf in zf.namelist():
    m = re.match(r"ppt/slides/slide(\d+)\.xml$", sf)
    if not m:
        continue
    idx = int(m.group(1))
    rels = f"ppt/slides/_rels/slide{idx}.xml.rels"
    imgs = []
    if rels in zf.namelist():
        rx = zf.read(rels).decode("utf-8", "replace")
        imgs = re.findall(r'Target="\.\./media/([^"]+)"', rx)
    slide_imgs[idx] = imgs

for idx in sorted(slide_imgs)[:40]:
    if slide_imgs[idx]:
        print(f"  slide {idx}: {slide_imgs[idx]}")
