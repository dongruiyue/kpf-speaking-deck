#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 PET / KET 用到、而 FCE 的样式表里没有的类，一次性补进 assets/shell.html。

为什么：外壳是「唯一类名来源」——三份文件里出现过的类都必须在外壳 <style> 里有定义，
否则下一节课用到某个类时会「没有样式的字墙」（check-classes.mjs 会报未定义）。

取值来源：golden/KET（较新）优先，PET 独有的块补在末尾；每节课仍可用
lessons/<name>.css 覆盖这些取值。

这些选择器不匹配 FCE 的任何元素，所以对 FCE 的版式零影响（已由逐视图底边回归复核）。
幂等：重复跑只会在标记已被消耗时报错，不会重复插入。

用法：python3 scripts/append-extra-classes.py
"""
import io, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SHELL = os.path.join(ROOT, 'assets', 'shell.html')
OUT_CSS = os.path.join(ROOT, 'assets', 'extra-classes.css')
MARK = '/*==LESSON_CSS==*/'

GOLD = os.path.join(ROOT, 'golden', 'FCE-Speaking-Part1-2-课堂工具.html')
KET = os.path.join(ROOT, 'golden', 'KET-U7L3-Speaking-Part2-课堂工具.html')
PET = os.path.join(ROOT, 'golden', 'PET-L4-Speaking-Part1-4-课堂工具.html')


def style_of(p):
    return re.search(r'<style>(.*?)</style>', io.open(p, encoding='utf-8').read(), re.S).group(1)


def classes_of(css):
    return set(re.findall(r'\.(-?[A-Za-z_][\w-]*)', ' '.join(re.findall(r'([^{}]+)\{', css))))


def rules_of(p, wanted):
    css = style_of(p)
    out = []
    for sel, decl in re.findall(r'([^{}]+)\{([^{}]*)\}', css):
        cl = set(re.findall(r'\.(-?[A-Za-z_][\w-]*)', sel))
        if cl & wanted:
            out.append('%s{%s}' % (sel.strip(), decl.strip()))
    return out


def classes_used(p):
    s = io.open(p, encoding='utf-8').read()
    u = set()
    for m in re.findall(r'class="([^"$]*)"', s):
        u |= set(m.split())
    for m in re.findall(r"className\s*=\s*'([^'$]*)'", s):
        u |= set(m.split())
    for m in re.findall(r"classList\.\w+\('([^']+)'", s):
        u.add(m)
    return u


fce = classes_of(style_of(GOLD))
want = (classes_used(KET) | classes_used(PET) | classes_of(style_of(KET)) | classes_of(style_of(PET))) - fce
want = {c for c in want if not c.startswith('claimed')}          # claimedA/B 由 .bingo-cell 规则带出

ket_rules = rules_of(KET, want)
ket_sel = set()
for r in ket_rules:
    ket_sel |= set(re.findall(r'\.(-?[A-Za-z_][\w-]*)', r.split('{')[0]))
pet_rules = [r for r in rules_of(PET, want - ket_sel)]

lines = ['', '/* ============ 跨课补充类：PET / KET 用到、FCE 没用到（外壳是唯一类名来源） ============',
         '   由 scripts/append-extra-classes.py 从 golden/KET（较新，优先）+ golden/PET 的样式表里摘出。',
         '   这些选择器不匹配 FCE 的任何元素，所以对 FCE 的版式零影响；',
         '   每节课还可以用 lessons/<name>.css 覆盖它们的取值。 */']
lines += ket_rules
lines += ['/* ---- PET 独有 ---- */']
lines += pet_rules
lines += ['/* ============ 跨课补充类 结束 ============ */', '']
block = '\n'.join(lines)

io.open(OUT_CSS, 'w', encoding='utf-8').write(block)

shell = io.open(SHELL, encoding='utf-8').read()
if MARK not in shell:
    raise SystemExit('assets/shell.html 里找不到 %s（可能已插入过）' % MARK)
if '跨课补充类' in shell:
    raise SystemExit('assets/shell.html 里已经有跨课补充类了，不再重复插入')
shell = shell.replace(MARK, block + '\n' + MARK, 1)
io.open(SHELL, 'w', encoding='utf-8').write(shell)

print('补类规则：KET %d 条 + PET %d 条 = %d 条，覆盖 %d 个类' % (
    len(ket_rules), len(pet_rules), len(ket_rules) + len(pet_rules), len(want)))
print('写出 %s（%d 字节）并插入 assets/shell.html' % (OUT_CSS, len(block.encode('utf-8'))))
