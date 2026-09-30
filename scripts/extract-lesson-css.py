#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""给 PET / KET 生成课时级 CSS 覆盖：把「外壳里也有、但取值不同」的选择器交还给这一节课。

背景：外壳的样式表取的是 FCE 的取值（FCE 是最完善的那份）。PET / KET 是更早的版本，
很多同名选择器的取值不同 —— 例如
    .stage      PET clamp(300px,42vh,480px)  vs 外壳（FCE） clamp(150px,20vh,240px)
    .menu-card  PET min-height:130px         vs 外壳 104px
    .mega-btn   PET padding:22px 50px        vs 外壳 12px 26px
如果不处理，PET/KET 重建后会整体「缩水」，看起来不像原来那节课 —— 那不是迁移，是改版。

处理办法（外壳提供的 `/*==LESSON_CSS==*/` 注入点）：
    外壳只补「自己完全没有的选择器」（见 append-missing-css.py）；
    而「两边都有、取值不同」的选择器，把**这一节课自己的那几条规则原样写进
    lessons/<课时>.css**（注入在外壳样式之后，自然覆盖），
    这样每节课保住自己的几何，只有讲解从「一屏三栏」变成翻页讲义这个既定变化。

用法：python3 scripts/extract-lesson-css.py
"""
import io, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

CASES = [('pet-l4', 'golden/PET-L4-Speaking-Part1-4-课堂工具.html'),
         ('ket-u7l3', 'golden/KET-U7L3-Speaking-Part2-课堂工具.html')]


def style_in(text):
    return re.search(r'<style>(.*?)</style>', text, re.S).group(1)


def rules(css):
    css = re.sub(r'@media[^{]*\{', '', css)
    out = []
    for sel, decl in re.findall(r'([^{}]+)\{([^{}]*)\}', css):
        out.append((' '.join(sel.split()), ' '.join(decl.split())))
    return out


shell_css = style_in(io.open(os.path.join(ROOT, 'assets', 'shell.html'), encoding='utf-8').read())
shell_sel = {' '.join(m.group(1).split()) for m in re.finditer(r'([^{}]+)\{', shell_css)}

for name, gold in CASES:
    own = rules(style_in(io.open(os.path.join(ROOT, gold), encoding='utf-8').read()))
    keep, seen = [], set()
    # main 的 padding / max-width 交给外壳：Fit 公式里的 chrome 常量是按外壳取值算的。
    # 覆盖它会让自适应变乐观 —— 实测 KET 的 pair/bingo 两屏会冲出视口（1269 / 1287 > 1080）。
    layout_of_shell = re.compile(r'(^|[\s,>])main($|[\s,:])')
    for sel, decl in own:
        if sel not in shell_sel or not sel or not decl:
            continue
        if layout_of_shell.search(sel):
            # main 的 padding-bottom 交给外壳：Fit 公式里的 chrome 常量按外壳取值算，
            # 覆盖它会让自适应变乐观（实测会把 KET 的 pair/bingo 顶出视口）。
            # 但 max-width 与 Fit 无关，可以还给它 —— 否则教师端的菜单会从两行变一行
            #（KET 首页实测因此矮了 330px）。有 max-width 就只保留这一条。
            mw = re.search(r'(?:^|;)max-width:([^;]+)', decl)
            if not mw:
                continue
            decl = 'max-width:%s' % mw.group(1).strip()
        keep.append('%s{%s}' % (sel, decl))
        keep.append('%s{%s}' % (sel, decl))
        seen.add(sel)
    body = ['/* lessons/%s.css —— 课时级 CSS 覆盖' % name,
            ' *',
            ' * 由 scripts/extract-lesson-css.py 摘出：这一节课自己的样式表里，',
            ' * 「外壳里也有、但取值不同」的那 %d 条规则 —— 原样交还，保证迁移后课堂上的样子不变。' % len(keep),
            ' * 外壳只管「补自己完全没有的选择器」，两边都有的取值由这里决定（注入在外壳样式之后）。',
            ' */', '']
    # 保持原文件里的先后顺序，让层叠结果与迁移前一致
    body += keep
    dst = os.path.join(ROOT, 'lessons', name + '.css')
    io.open(dst, 'w', encoding='utf-8').write('\n'.join(body) + '\n')
    print('写出 %s：%d 条规则 / %d 字节（覆盖 %d 个选择器）'
          % (os.path.relpath(dst, ROOT), len(keep), len('\n'.join(body)), len(seen)))
