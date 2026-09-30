#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""课时名 → 产物文件名 / golden 端口 / out 端口（serve-verify.sh 与 safari-verify.sh 共用）。

内置三课保持历史端口 8894–8899（改动它们会让已发出的验收命令失效）；
其它课时名从 lessons/<name>.js 的 LESSON_META.outFile 取产物文件名，
端口按名字哈希进 8900–8939（避开 889x 历史端口与 8811/8812/8814 的用户启动脚本）。

用法：python3 scripts/resolve-lesson.py <name>     → 打印 FILE<TAB>PG<TAB>PO
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

FIXED = {
    'fce': ('FCE-Speaking-Part1-2-课堂工具.html', 8898, 8899),
    'pet': ('PET-L4-Speaking-Part1-4-课堂工具.html', 8896, 8897),
    'ket': ('KET-U7L3-Speaking-Part2-课堂工具.html', 8894, 8895),
}

name = sys.argv[1] if len(sys.argv) > 1 else ''
if not name:
    sys.exit('用法：python3 scripts/resolve-lesson.py <课时名>')
if name in FIXED:
    print('%s\t%d\t%d' % FIXED[name])
    sys.exit(0)

lp = os.path.join(ROOT, 'lessons', name + '.js')
if not os.path.isfile(lp):
    sys.exit('不认识课时名「%s」：既不是内置的 %s，也找不到 lessons/%s.js'
             % (name, '/'.join(FIXED), name))
m = re.search(r'"outFile"\s*:\s*"([^"]+)"', io.open(lp, encoding='utf-8').read())
if not m:
    sys.exit('lessons/%s.js 的 LESSON_META 里没有 "outFile"' % name)
pg = 8900 + 2 * (sum(map(ord, name)) % 20)
print('%s\t%d\t%d' % (m.group(1), pg, pg + 1))
