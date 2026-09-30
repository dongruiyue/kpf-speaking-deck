#!/usr/bin/env python3
"""crop_photos.py —— 从 PDF 扫描页里自动裁出照片区域（kpf-speaking-deck 用）。

思路（历史做法的实现 + 一处加固）：整页扫描的课本页上，**照片是饱和的、纸面/文字是不饱和的**。
把渲染页转 HSV，取 S 通道做「行剖面 → 列剖面」两级投影：

  1. 行剖面：每行饱和像素占比超过阈值 → 照片所在的横带；
  2. 在每个横带内做列剖面 → 照片所在的纵段；横带 × 纵段 = 候选照片框；
  3. 框内再递归一次剖面（拆网格排列的多张照片），最后合并重叠框、过滤碎片。

加固（实测必要）：课本页上除了照片还有**纯色横幅 / 彩色提示框**（Exam advice 色块等），
它们同样高饱和，光靠饱和度会把提示框当照片、或把照片与相邻色块并成一大坨。
所以每个候选框还要过一道「平色排除」：框内彩色像素（S≥阈值且 V≥40）的色相做
16 桶直方图，若最大桶占比 ≥ --flat-frac（默认 0.72）→ 这是纯色块不是照片，丢弃。
照片的色彩分布散，过不了这个阈值。黑白照片（低饱和）不适用本法，用 --rect。

依赖：
  - PyMuPDF（fitz，必须）：渲染 PDF 页。pip install PyMuPDF
  - Pillow（PIL，必须）：HSV 转换与裁剪保存。pip install Pillow

用法：
  python3 scripts/crop_photos.py 课本.pdf --page 55 --outdir /tmp/crops
  python3 scripts/crop_photos.py 课本.pdf --pages 54-56 --dpi 150
  python3 scripts/crop_photos.py 课本.pdf --page 55 --rect 100,200,800,600   # 手动兜底

注意：
  - --page / --pages 是 1 起的 PDF 页码；--rect 的坐标是**渲染后**（指定 dpi、
    已按页面 rotation 摆正）的像素坐标，不是 PDF 点坐标。
  - 灰度扫描页没有饱和度可用，脚本会明确拒绝自动检测并提示用 --rect。
  - 逐页渲染、用完即释放；不会把整个 PDF 读进内存。
"""
import argparse
import os
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    raise SystemExit('[crop_photos] 缺少依赖 PyMuPDF：pip install PyMuPDF')
try:
    from PIL import Image
except ImportError:
    raise SystemExit('[crop_photos] 缺少依赖 Pillow：pip install Pillow')


def render_page(doc, pno, dpi):
    """渲染一页为 PIL RGB 图。fitz 的 get_pixmap 会按页面 rotation 摆正。"""
    page = doc[pno]
    pix = page.get_pixmap(dpi=dpi)
    if pix.alpha or pix.colorspace is None or pix.colorspace.n != 3:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    img = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    rot = page.rotation
    del pix, page
    return img, rot


def hsv_channels(img):
    """返回 (H, S, V 三个通道的 bytes, w, h, 最大饱和度)。PIL 的 HSV：各通道 ∈[0,255]。"""
    hsv = img.convert('HSV')
    hc, sc, vc = hsv.split()
    sd = sc.tobytes()
    return hc.tobytes(), sd, vc.tobytes(), img.width, img.height, max(sd)


def runs(profile, thresh, gap):
    """一维剖面 → [(起, 止)] 区间；近距区间（间隔 < gap）合并。"""
    idx = [i for i, v in enumerate(profile) if v >= thresh]
    if not idx:
        return []
    out = [[idx[0], idx[0]]]
    for i in idx[1:]:
        if i - out[-1][1] <= gap:
            out[-1][1] = i
        else:
            out.append([i, i])
    return [(a, b) for a, b in out]


def col_profile(mask, w, x0, y0, x1, y1):
    return [sum(mask[y * w + x] for y in range(y0, y1 + 1)) / (y1 - y0 + 1)
            for x in range(x0, x1 + 1)]


def row_profile(mask, w, x0, y0, x1, y1):
    return [sum(mask[y * w + x] for x in range(x0, x1 + 1)) / (x1 - x0 + 1)
            for y in range(y0, y1 + 1)]


def coverage(mask, w, rect):
    x0, y0, x1, y1 = rect
    n = (x1 - x0 + 1) * (y1 - y0 + 1)
    hit = sum(mask[y * w + x] for y in range(y0, y1 + 1) for x in range(x0, x1 + 1))
    return hit / n


def is_flat(hue, sdata, vdata, w, rect, sat, flat_frac):
    """框内彩色像素（S≥sat 且 V≥40）的色相 16 桶直方图：最大桶占比 ≥ flat_frac
    → 纯色块（横幅 / 提示框），不是照片。彩色像素太少时不判平（交回覆盖率把关）。"""
    x0, y0, x1, y1 = rect
    bins = [0] * 16
    n_color = 0
    for y in range(y0, y1 + 1):
        off = y * w
        for x in range(x0, x1 + 1):
            i = off + x
            if sdata[i] >= sat and vdata[i] >= 40:
                bins[hue[i] >> 4] += 1
                n_color += 1
    if n_color < 400:
        return False
    return max(bins) / n_color >= flat_frac


def detect(mask, hue, sdata, vdata, w, h, rect, depth, opt):
    """在 rect=(x0,y0,x1,y1) 内做行→列剖面，返回候选框列表（全图坐标）。"""
    x0, y0, x1, y1 = rect
    boxes = []
    for ra, rb in runs(row_profile(mask, w, x0, y0, x1, y1), opt.row_frac, opt.gap):
        band = (x0, y0 + ra, x1, y0 + rb)
        for ca, cb in runs(col_profile(mask, w, *band), opt.col_frac, opt.gap):
            box = (band[0] + ca, band[1], band[0] + cb, band[3])
            bw, bh = box[2] - box[0] + 1, box[3] - box[1] + 1
            if bw < opt.min_side or bh < opt.min_side:
                continue
            if coverage(mask, w, box) < opt.min_cover:
                continue
            if depth < opt.max_depth and (bw > opt.min_side * 3 and bh > opt.min_side * 3):
                sub = detect(mask, hue, sdata, vdata, w, h, box, depth + 1, opt)
                if len(sub) > 1:      # 框内确实藏着多张 → 用拆出来的
                    boxes.extend(sub)
                    continue
            if is_flat(hue, sdata, vdata, w, box, opt.sat, opt.flat_frac):
                continue              # 纯色横幅 / 提示框，不是照片
            boxes.append(box)
    return boxes


def merge_overlaps(boxes):
    """合并相互包含 / 大面积重叠的框（两级剖面 + 递归会留下重复框）。"""
    def area(b):
        return (b[2] - b[0] + 1) * (b[3] - b[1] + 1)
    changed = True
    while changed:
        changed = False
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                a, b = boxes[i], boxes[j]
                ix0, iy0 = max(a[0], b[0]), max(a[1], b[1])
                ix1, iy1 = min(a[2], b[2]), min(a[3], b[3])
                if ix0 > ix1 or iy0 > iy1:
                    continue
                inter = (ix1 - ix0 + 1) * (iy1 - iy0 + 1)
                if inter > 0.5 * min(area(a), area(b)):
                    boxes[i] = (min(a[0], b[0]), min(a[1], b[1]),
                                max(a[2], b[2]), max(a[3], b[3]))
                    del boxes[j]
                    changed = True
                    break
            if changed:
                break
    return boxes


def parse_rect(spec):
    parts = spec.split(',')
    if len(parts) != 4:
        raise SystemExit('[crop_photos] --rect 格式不对：%r（应为 x,y,w,h）' % spec)
    try:
        x, y, w, h = (int(v) for v in parts)
    except ValueError:
        raise SystemExit('[crop_photos] --rect 必须全是整数：%r' % spec)
    if w <= 0 or h <= 0 or x < 0 or y < 0:
        raise SystemExit('[crop_photos] --rect 数值不合法：%r' % spec)
    return x, y, x + w - 1, y + h - 1


def main(argv=None):
    ap = argparse.ArgumentParser(
        prog='crop_photos.py',
        description='从 PDF 扫描页裁出照片区域（HSV 饱和度行/列剖面），支持 --rect 手动兜底。')
    ap.add_argument('pdf', help='课本 .pdf 路径（只读）')
    ap.add_argument('--page', type=int, metavar='N', help='单页（1 起）')
    ap.add_argument('--pages', metavar='N-M', help='页范围（1 起，含端点）')
    ap.add_argument('--outdir', default='crops-out', help='裁切输出目录（默认 ./crops-out）')
    ap.add_argument('--dpi', type=int, default=150, help='渲染分辨率（默认 150）')
    ap.add_argument('--rect', action='append', metavar='x,y,w,h',
                    help='手动指定裁切框（渲染后像素坐标，可重复）；给了就跳过自动检测')
    ap.add_argument('--sat', type=int, default=48, help='饱和度阈值 0-255（默认 48）')
    ap.add_argument('--min-side', type=int, default=40, help='框的最小边长 px（默认 40，过滤碎片）')
    ap.add_argument('--min-area-frac', type=float, default=0.005,
                    help='框面积占整页的最小比例（默认 0.005）')
    ap.add_argument('--min-cover', type=float, default=0.25,
                    help='框内饱和像素最小覆盖率（默认 0.25，防白框误检）')
    ap.add_argument('--gap', type=int, default=10, help='剖面区间合并的最大间隔 px（默认 10）')
    ap.add_argument('--flat-frac', type=float, default=0.72,
                    help='平色排除：框内彩色像素色相最大桶占比 ≥ 此值判为纯色块（默认 0.72）')
    ap.add_argument('--row-frac', type=float, default=0.02, help='行剖面阈值：饱和像素占比（默认 0.02）')
    ap.add_argument('--col-frac', type=float, default=0.02, help='列剖面阈值：饱和像素占比（默认 0.02）')
    ap.add_argument('--max-depth', type=int, default=1, help='框内递归拆网格的层数（默认 1）')
    ap.add_argument('--max-regions', type=int, default=30,
                    help='单页检出框数超过它就告警「疑似噪声/碎裂」（默认 30）')
    if argv is None:
        argv = sys.argv[1:]
    if not argv:
        ap.print_help()
        return 0
    args = ap.parse_args(argv)

    if not os.path.isfile(args.pdf):
        raise SystemExit('[crop_photos] 文件不存在：%s' % args.pdf)
    if args.page and args.pages:
        raise SystemExit('[crop_photos] --page 与 --pages 二选一。')
    if not args.page and not args.pages:
        raise SystemExit('[crop_photos] 必须指定 --page N 或 --pages N-M。')

    doc = fitz.open(args.pdf)
    total = doc.page_count
    if args.page:
        pages = [args.page]
    else:
        m = args.pages.split('-')
        if len(m) != 2 or not all(x.strip().isdigit() for x in m):
            raise SystemExit('[crop_photos] --pages 格式不对：%r（应为 N-M）' % args.pages)
        pages = list(range(int(m[0]), int(m[1]) + 1))
    for p in pages:
        if p < 1 or p > total:
            raise SystemExit('[crop_photos] 页码越界：%d（这份 PDF 共 %d 页）' % (p, total))

    manual = [parse_rect(r) for r in args.rect] if args.rect else None
    os.makedirs(args.outdir, exist_ok=True)
    n_saved = 0

    for p in pages:
        img, rot = render_page(doc, p - 1, args.dpi)
        w, h = img.size
        print('[crop_photos] 第 %d 页：渲染 %dx%d @%ddpi（页面 rotation=%d）'
              % (p, w, h, args.dpi, rot))

        if manual is not None:
            boxes = []
            for r in manual:
                if r[2] >= w or r[3] >= h:
                    raise SystemExit('[crop_photos] --rect %s 超出渲染范围 %dx%d' % (r, w, h))
                boxes.append(r)
        else:
            hue, sdata, vdata, _w, _h, smax = hsv_channels(img)
            if smax < 12:
                print('[crop_photos] 第 %d 页是灰度页（最大饱和度=%d），没有饱和度可用，'
                      '自动检测跳过。请量好坐标后用 --rect x,y,w,h 手动裁。' % (p, smax),
                      file=sys.stderr)
                del img
                continue
            mask = bytes(1 if v >= args.sat else 0 for v in sdata)
            boxes = detect(mask, hue, sdata, vdata, w, h, (0, 0, w - 1, h - 1), 0, args)
            boxes = merge_overlaps(boxes)
            boxes = [b for b in boxes
                     if (b[2] - b[0] + 1) * (b[3] - b[1] + 1) >= args.min_area_frac * w * h]
            boxes.sort(key=lambda b: (b[1], b[0]))
            del mask, hue, sdata, vdata
            if not boxes:
                print('[crop_photos] 第 %d 页检出 0 块照片区域。可能这页没有彩色照片，'
                      '或参数不合适（试 --sat 调低 / --gap 调大），也可用 --rect 手动裁。'
                      % p, file=sys.stderr)
                del img
                continue
            if len(boxes) > args.max_regions:
                print('[crop_photos] 警告：第 %d 页检出 %d 块，超过 --max-regions=%d，'
                      '疑似噪声碎裂（试 --sat 调高 / --min-side 调大）。仍会全部输出。'
                      % (p, len(boxes), args.max_regions), file=sys.stderr)

        for i, (x0, y0, x1, y1) in enumerate(boxes, 1):
            crop = img.crop((x0, y0, x1 + 1, y1 + 1))
            name = 'page%03d-r%d.jpg' % (p, i)
            crop.save(os.path.join(args.outdir, name), quality=90)
            n_saved += 1
            print('  块 %2d  rect=(%4d,%4d)-(%4d,%4d)  %4dx%-4d → %s'
                  % (i, x0, y0, x1, y1, crop.width, crop.height, name))
            del crop
        del img  # 逐页释放，不把整本 PDF 的渲染结果攒在内存里

    doc.close()
    print('[crop_photos] 完成：%d 页，共裁出 %d 块 → %s' % (len(pages), n_saved, args.outdir))
    return 0


if __name__ == '__main__':
    sys.exit(main())
