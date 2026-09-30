#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""内容保真（第七节第 2 条）：课件原文是否逐字还在。

做法（机械比对，不靠人眼）：
  1) 从 golden/ 的迁移前工具里抽出所有长度 ≥12 的 JS 字符串字面量（'…' / "…" / 不含 ${} 的 `…`）；
  2) 两侧都做「反转义」（\\' → ' 、\\" → " 、\\\\ → \\ ），把整份文件变成一个可搜索的大字符串；
  3) 逐个字面量在产物里找。找不到的就是被改写 / 掉了的原文。
  4) 分类统计，并把「找不到」的前若干条连同来源打出来。

用法：python3 scripts/check-content.py out/FCE-Speaking-Part1-2-课堂工具.html
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def resolve_gold(artifact):
    """产物文件名与迁移前同名 → 自动找 golden/ 里那一份（也可以 --gold 指定）。
    找不到时返回 None（发布版不带 golden/，调用方据此跳过内容保真，不报错）。"""
    base = os.path.basename(artifact)
    g = os.path.join(ROOT, 'golden', base)
    if not os.path.isfile(g):
        return None
    return g

NOSCRIPT = re.compile(r'<script>.*?</script>', re.S)
NOSTYLE = re.compile(r'<style>.*?</style>', re.S)

# 明显不是「课件原文」的字面量（纯机器串）——排除掉，否则噪音淹没结论
SKIP = re.compile(r'^[\s\W\d]*$|^data:image|^https?:|^[\w-]+$|^</?\w+|\{\s*\}|^\d+px$')

# 「实现代码」的字面量也不是课件原文：模块的骨架 / 事件绑定 / DOM 操作等。
# 三份工具都把课件原文和实现代码混在同一个 <script> 里，只能靠这些代码标记区分。
CODE_MARK = ['document.', 'querySelector', 'classList', 'addEventListener', 'insertAdjacentHTML',
             'setInterval', 'clearInterval', 'onclick', 'localStorage', '=>', 'function ',
             'innerHTML', 'appendChild', 'createElement', 'return ', 'const ', 'let ',
             'new Date', 'window.', 'location.', 'getElementById', '.style.', '$ {']


def unescape(s):
    s = s.replace("\\\\", "\x00")
    s = s.replace("\\'", "'").replace('\\"', '"').replace('\\n', '\n').replace('\\t', '\t')
    return s.replace("\x00", "\\")


def literals(text):
    out = []
    for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"|`((?:[^`\\]|\\.)*)`", text):
        raw = next(g for g in m.groups() if g is not None)
        if '${' in raw:
            continue
        v = unescape(raw)
        if len(v) < 12 or SKIP.match(v):
            continue
        if any(k in v for k in CODE_MARK):
            continue
        out.append((v, text[:m.start()].count('\n') + 1))
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    art = args[0] if args else 'out/FCE-Speaking-Part1-2-课堂工具.html'
    art_path = art if os.path.isabs(art) else os.path.join(ROOT, art)
    gold_path = resolve_gold(art_path)
    if gold_path is None:
        print('内容保真（逐字）：%s' % os.path.relpath(art_path, ROOT))
        print('  跳过内容保真（无迁移前对照）：golden/ 里没有同名文件 %s' % os.path.basename(art_path))
        return 0
    art_text = unescape(io.open(art_path, encoding='utf-8').read())
    gold = io.open(gold_path, encoding='utf-8').read()

    # 只看「课时数据 + 讲义 + 抽屉 + 练习」那几段，跳过 CSS 与外壳
    body = NOSTYLE.sub('', gold)
    loot = literals(body)
    seen, uniq = set(), []
    for v, ln in loot:
        if v in seen:
            continue
        seen.add(v)
        uniq.append((v, ln))

    miss = [(v, ln) for v, ln in uniq if v not in art_text]
    hit = len(uniq) - len(miss)
    print('内容保真（逐字）：%s' % os.path.relpath(art_path, ROOT))
    print('  迁移前对照：%s' % os.path.relpath(gold_path, ROOT))
    print('  从迁移前工具抽出的课件原文片段（已剔除实现代码，去重后）：%d 条' % len(uniq))
    print('  在产物里逐字找到：%d 条（%.1f%%）' % (hit, 100.0 * hit / max(len(uniq), 1)))
    print('  找不到：%d 条' % len(miss))
    for v, ln in miss[:40]:
        print('    ✗ 迁移前第 %d 行：%s' % (ln, v.replace('\n', ' ⏎ ')[:150]))
    return 1 if miss else 0


if __name__ == '__main__':
    sys.exit(main())
