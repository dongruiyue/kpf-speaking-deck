#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 PET / KET 样式表里「选择器在外壳里没有」的规则补进 assets/shell.html。

上一轮只补了**类**（class）选择器；这轮要迁 PET / KET，发现它们的样式表大量用 **id** 与
复合选择器（#refFab / #flashGrid / #toolFrames / #pairGrid / body.audience .teach-col h3 …），
只补类会掉样式（「字墙 / CSS 漂移」的源头）。

安全规则（很重要）：
  **只追加「选择器在外壳里完全不存在」的规则**。
  只要某个选择器在外壳里已有定义（例如 `.stage` / `.menu-card` / `.kv` 这些 FCE 也有、
  但取值不同的），就**一律跳过** —— 否则追加在文件末尾会覆盖 FCE 的取值，
  把已经验收过的 FCE 版式改掉。PET/KET 因此接受外壳这套几何，这正是「升到新外壳」的含义。

幂等：重复跑不会重复追加（已存在的选择器会被跳过）。
用法：python3 scripts/append-missing-css.py
"""
import io, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SHELL = os.path.join(ROOT, 'assets', 'shell.html')
OUT_CSS = os.path.join(ROOT, 'assets', 'extra-selectors.css')
SOURCES = ['golden/PET-L4-Speaking-Part1-4-课堂工具.html',
           'golden/KET-U7L3-Speaking-Part2-课堂工具.html']
ANCHOR = '/*==LESSON_CSS==*/'


def style_in(text):
    return re.search(r'<style>(.*?)</style>', text, re.S).group(1)


def style_of(p):
    return style_in(io.open(p, encoding='utf-8').read())


def rules(css):
    """扁平化取出 (selector, decls)。@media 里的规则也被取出（外壳里没有媒体查询冲突）。"""
    css = re.sub(r'@media[^{]*\{', '', css)             # 去掉媒体查询外壳，规则照样逐个匹配
    out = []
    for sel, decl in re.findall(r'([^{}]+)\{([^{}]*)\}', css):
        sel = ' '.join(sel.split())
        decl = ' '.join(decl.split())
        if sel and decl:
            out.append((sel, decl))
    return out


shell = io.open(SHELL, encoding='utf-8').read()
shell_css = style_in(shell)
have_sel = set(m.group(1).strip() for m in re.finditer(r'([^{}]+)\{', shell_css))
have_sel |= set(re.findall(r'([^{}]+)\{', shell_css))
have_sel = {' '.join(s.split()) for s in have_sel}
have_full = set(re.findall(r'([^{}]+\{[^{}]*\})', shell_css))

added, skipped_existing = [], 0
seen = set()
for src in SOURCES:
    for sel, decl in rules(style_of(os.path.join(ROOT, src))):
        if sel in have_sel or f'{sel}{{{decl}}}' in have_full:
            skipped_existing += 1
            continue
        if (sel, decl) in seen:
            continue
        seen.add((sel, decl))
        have_sel.add(sel)                               # 同一轮里也只补一次
        added.append(f'{sel}{{{decl}}}')

if not added:
    print('没有需要补的选择器（外壳已经覆盖）')
    raise SystemExit(0)

block = ['', '/* ============ 跨课补充选择器：PET / KET 用到、FCE 没有的选择器 ============',
         '   由 scripts/append-missing-css.py 追加。只补「外壳里完全不存在」的选择器，',
         '   已有同名选择器的一律跳过 —— 否则会覆盖 FCE 已验收过的几何。 */']
block += added
block += ['/* ============ 跨课补充选择器 结束 ============ */', '']

io.open(OUT_CSS, 'w', encoding='utf-8').write('\n'.join(block))
if ANCHOR not in shell:
    raise SystemExit('shell.html 里找不到 %s' % ANCHOR)
shell = shell.replace(ANCHOR, '\n'.join(block) + '\n' + ANCHOR, 1)
io.open(SHELL, 'w', encoding='utf-8').write(shell)
print('补进 %d 条选择器（跳过 %d 条已有的），写出 %s 并插入 assets/shell.html'
      % (len(added), skipped_existing, os.path.basename(OUT_CSS)))
