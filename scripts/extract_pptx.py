#!/usr/bin/env python3
"""extract_pptx.py —— 从 .pptx 课件里抽素材（kpf-speaking-deck 用）。

抽两样东西：
  1. 逐页文本：ppt/slides/slideN.xml 里 <a:t> 的文本行，按「放映顺序」逐页输出，
     方便把课件原文抄/改进 lessons/<name>.js（输出里标注了真实文件名与放映序号）。
  2. 嵌入媒体：列出 ppt/media/*（图片 + 音视频；可选 --imgdir 导出）。
     图片重命名后可直接进 lessons/<name>.img/；课件里嵌的听力音频（mp3/wav）
     可直接进 lessons/<name>.audio/ —— 已实测 KET 课的 ket.mp3 与课件里的
     media1.mp3 逐字节一致。

依赖：只用标准库（zipfile + xml.etree.ElementTree）。
增强：若环境里装了 python-pptx（pip install python-pptx），会额外抽「演讲者备注」；
     没装也能跑，只是没有备注段落。两条路径都验证过。

用法：
  python3 scripts/extract_pptx.py 课件.pptx                      # 全文打到 stdout
  python3 scripts/extract_pptx.py 课件.pptx --slides 56-68       # 只要第 56~68 页（放映序）
  python3 scripts/extract_pptx.py 课件.pptx --text-out /tmp/t.txt
  python3 scripts/extract_pptx.py 课件.pptx --imgdir /tmp/media  # 导出 ppt/media/*
  python3 scripts/extract_pptx.py 课件.pptx --list-media         # 只列媒体清单

注意：「页码」一律指**放映顺序**（1 起），不是 slideN.xml 里的 N —— 有的课件
slideN.xml 编号不连续/乱序，本脚本按 ppt/presentation.xml 的 sldIdLst 还原真实顺序。
"""
import argparse
import os
import re
import shutil
import sys
import zipfile
import xml.etree.ElementTree as ET

NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'

IMG_EXT = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tif', '.tiff', '.emf', '.wmf', '.svg', '.webp'}
AV_EXT = {'.mp3', '.wav', '.m4a', '.aac', '.wma', '.mp4', '.mov'}


def media_kind(name):
    ext = os.path.splitext(name)[1].lower()
    if ext in IMG_EXT:
        return '图片'
    if ext in AV_EXT:
        return '音视频'
    return None


def slide_order(zf):
    """返回 [(放映序, 'ppt/slides/slideN.xml'), ...]。

    主路径：presentation.xml 的 sldIdLst + presentation.xml.rels 还原真实顺序
    （处理 slideN.xml 编号不连续 / 与放映序不一致的情况）。
    兜底：presentation.xml 缺失或解析失败时，按 slideN.xml 的数字 N 自然排序。
    """
    try:
        pres = ET.fromstring(zf.read('ppt/presentation.xml'))
        rels = ET.fromstring(zf.read('ppt/_rels/presentation.xml.rels'))
        rid2target = {}
        for rel in rels.iter('{%s}Relationship' % NS_REL):
            t = rel.get('Target', '')
            if 'slides/' not in t:
                continue
            t = t.lstrip('/')
            if not t.startswith('ppt/'):
                t = 'ppt/' + t
            rid2target[rel.get('Id')] = t
        order = []
        for sld in pres.iter('{%s}sldId' % NS_P):
            rid = sld.get('{%s}id' % NS_R)
            name = rid2target.get(rid)
            if name and name in zf.namelist():
                order.append(name)
        if order:
            return order
    except (KeyError, ET.ParseError):
        pass
    # 兜底：自然序
    names = [n for n in zf.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)]
    return sorted(names, key=lambda n: int(re.search(r'(\d+)', n).group(1)))


def slide_paragraphs(zf, slide_name):
    """从一张 slide 的 XML 里取段落文本：每个 <a:p> 一行，行内 <a:t> run 拼接。"""
    root = ET.fromstring(zf.read(slide_name))
    lines = []
    for para in root.iter('{%s}p' % NS_A):
        text = ''.join(t.text or '' for t in para.iter('{%s}t' % NS_A))
        text = text.strip()
        if text:
            lines.append(text)
    return lines


def notes_via_pptx(path):
    """python-pptx 增强：抽每页演讲者备注。没装 / 失败时返回 None（主流程不受影响）。"""
    try:
        from pptx import Presentation
    except ImportError:
        return None
    try:
        prs = Presentation(path)
        out = []
        for slide in prs.slides:
            try:
                txt = slide.notes_slide.notes_text_frame.text.strip()
            except Exception:
                txt = ''
            out.append(txt)
        return out
    except Exception as exc:  # 大文件/怪文件不让增强路径拖死主路径
        print('[extract_pptx] 提示：python-pptx 读取备注失败（%s），跳过备注。' % exc,
              file=sys.stderr)
        return None


def parse_range(spec, total):
    """'A-B' / 'A' / 'A,B-C' → 1 起放映序集合。越界报错。"""
    picked = set()
    for part in spec.split(','):
        part = part.strip()
        m = re.fullmatch(r'(\d+)(?:-(\d+))?', part)
        if not m:
            raise SystemExit('[extract_pptx] --slides 格式不对：%r（应为 A-B / A / A,B-C）' % spec)
        a = int(m.group(1)); b = int(m.group(2) or a)
        if a < 1 or b > total or a > b:
            raise SystemExit('[extract_pptx] --slides %r 越界：这份课件共 %d 页' % (spec, total))
        picked.update(range(a, b + 1))
    return picked


def list_media(zf):
    out = []
    for n in sorted(zf.namelist()):
        if n.startswith('ppt/media/') and media_kind(n):
            out.append((n, zf.getinfo(n).file_size))
    return out


def media_listing(media):
    """媒体清单文本：图片一组、音视频一组（音频可直接进 lessons/<name>.audio/）。"""
    imgs = [(n, s) for n, s in media if media_kind(n) == '图片']
    avs = [(n, s) for n, s in media if media_kind(n) == '音视频']
    out = ['--- 图片（%d 个）---' % len(imgs)]
    out += ['%-40s %10d bytes' % (n, s) for n, s in imgs]
    if avs:
        out.append('--- 音视频（%d 个）---' % len(avs))
        out += ['%-40s %10d bytes' % (n, s) for n, s in avs]
    return '\n'.join(out)


def main(argv=None):
    ap = argparse.ArgumentParser(
        prog='extract_pptx.py',
        description='从 .pptx 抽逐页文本（<a:t>）与嵌入图片（ppt/media/*）。只用标准库；装了 python-pptx 时额外抽演讲者备注。')
    ap.add_argument('pptx', help='课件 .pptx 路径')
    ap.add_argument('--slides', metavar='A-B', help='只抽第 A~B 页（放映序，1 起；可逗号组合，如 56-68,72）')
    ap.add_argument('--text-out', metavar='文件', help='文本写到文件（默认打 stdout）')
    ap.add_argument('--imgdir', metavar='目录', help='把 ppt/media/*（图片与音视频）导出到该目录')
    ap.add_argument('--list-media', action='store_true', help='只列媒体清单（图片 + 音视频），不抽文本')
    ap.add_argument('--no-notes', action='store_true', help='即使装了 python-pptx 也不抽备注')
    if argv is None:
        argv = sys.argv[1:]
    if not argv:
        ap.print_help()
        return 0
    args = ap.parse_args(argv)

    if not os.path.isfile(args.pptx):
        raise SystemExit('[extract_pptx] 文件不存在：%s' % args.pptx)
    if not zipfile.is_zipfile(args.pptx):
        raise SystemExit('[extract_pptx] 不是有效的 .pptx（zip 容器）：%s' % args.pptx)

    zf = zipfile.ZipFile(args.pptx)
    media = list_media(zf)

    if args.imgdir:
        os.makedirs(args.imgdir, exist_ok=True)
        if not media:
            print('[extract_pptx] 警告：ppt/media/ 里没有图片可导出。', file=sys.stderr)
        for name, _size in media:
            dst = os.path.join(args.imgdir, os.path.basename(name))
            with zf.open(name) as src, open(dst, 'wb') as out:  # 流式拷贝，不整读进内存
                shutil.copyfileobj(src, out, 1024 * 1024)
        print('[extract_pptx] 已导出 %d 个媒体文件 → %s' % (len(media), args.imgdir))

    if args.list_media:
        print(media_listing(media))
        print('共 %d 个媒体文件' % len(media))
        return 0

    order = slide_order(zf)
    if not order:
        raise SystemExit('[extract_pptx] 这份 pptx 里找不到任何 ppt/slides/slideN.xml。')
    picked = parse_range(args.slides, len(order)) if args.slides else set(range(1, len(order) + 1))

    notes = None
    if not args.no_notes:
        notes = notes_via_pptx(args.pptx)
        if notes is not None and len(notes) != len(order):
            notes = None  # 对不上就不用，避免张冠李戴

    chunks, total_lines = [], 0
    for idx, name in enumerate(order, start=1):
        if idx not in picked:
            continue
        lines = slide_paragraphs(zf, name)
        total_lines += len(lines)
        head = '===== Slide %d（%s，共 %d 行文本）=====' % (idx, name, len(lines))
        body = list(lines)
        if notes and idx - 1 < len(notes) and notes[idx - 1]:
            body.append('--- 演讲者备注 ---')
            body.extend(notes[idx - 1].splitlines())
        chunks.append('\n'.join([head] + body))

    if total_lines == 0:
        raise SystemExit(
            '[extract_pptx] 错误：指定范围内没有抽到任何文本（slides=%s）。\n'
            '可能原因：课件页全是图片/扫描件，或 --slides 范围不对（共 %d 页）。\n'
            '不输出空文件，请先确认课件里确实有文字。'
            % (args.slides or '全部', len(order)))

    report = '\n\n'.join(chunks)
    tail = '\n\n===== 媒体清单（ppt/media/*，共 %d 个）=====\n' % len(media)
    tail += media_listing(media)
    report += tail

    if args.text_out:
        with open(args.text_out, 'w', encoding='utf-8') as f:
            f.write(report + '\n')
        print('[extract_pptx] 已写出 %d 页文本 → %s' % (len(chunks), args.text_out))
    else:
        print(report)
    return 0


if __name__ == '__main__':
    sys.exit(main())
