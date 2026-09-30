#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""读 Safari 里四个标签的探针结果，抽出「只能用实时环境测」的那几项。

为什么要 Safari 这一路：第 8 条（空转 10 秒 applyState 次数）与第 9 条（观众屏 beep = 0）
必须在**真实时间 + 真实双窗口**下测 —— headless 的 --virtual-time-budget 会把时间轴压扁，
数字会失真，不能当判据。Safari 的标签标题（= document.title）被系统截断在 992 字符，
但 apply / beep / err / teacher-only / win 都在最前面，够用；几何数值一律取 headless 那一份。

用法：python3 scripts/safari-counts.py {fce|pet|ket|<课时名>}
"""
import re, subprocess, sys

WHICH = sys.argv[1] if len(sys.argv) > 1 else 'pet'
out = subprocess.run(['bash', 'scripts/safari-verify.sh', 'read', WHICH],
                     capture_output=True, text=True, cwd=__import__('os').path.dirname(
                         __import__('os').path.dirname(__import__('os').path.abspath(__file__)))).stdout

pat = dict(
    role=r'"role":"([AT])"',
    apply=r'"apply":(\d+)',
    beep=r'"beep":(\d+)',
    err=r'"err":(\d+)',
    ton=r'"to":\{"n":(\d+)',
    tohid=r'"to":\{"n":\d+,"hid":(\d+)',
    aud=r'"to":\{[^}]*"aud":(true|false)',
    win=r'"win":"([\d]+x[\d]+)"',
    present=r'"shell":\{"present":(true|false)',
    early=r'"early":\[([^\]]*)\]',

)
rows = []
for line in out.splitlines():
    line = line.strip()
    if not line.startswith('TKPROBE'):
        continue
    d = {}
    for k, p in pat.items():
        m = re.search(p, line)
        d[k] = m.group(1) if m else None
    d['truncated'] = not line.rstrip().endswith('}')
    rows.append(d)

order = ['golden 教师端', 'out 教师端', 'golden 观众屏', 'out 观众屏']
# Safari 返回「每个窗口的每个标签」，窗口顺序不保证 → 先按角色分组（教师 T 在前 / 观众 A 在前都可能）
teachers = [r for r in rows if r['role'] == 'T']
auds = [r for r in rows if r['role'] == 'A']
print('Safari 实时测量（%s）：读到 %d 个标签（教师 %d / 观众 %d）'
      % (WHICH, len(rows), len(teachers), len(auds)))
print('  标签顺序：%s' % ' '.join(r['role'] for r in rows))
print()
for label, group in (('教师端', teachers), ('观众屏', auds)):
    for i, r in enumerate(group):
        # 有 golden 时开 4 个标签（golden/out 各一）；新课只有 out 侧 1 个标签
        side = ('golden' if i == 0 else 'out') if len(group) == 2 else 'out'
        print('  %-6s %-7s apply=%-3s beep=%-2s err=%-2s .teacher-only 隐藏 %s/%s = %.0f%% '
              'present=%s aud=%s win=%s early=%s'
              % (label, side, r['apply'], r['beep'], r['err'], r['tohid'], r['ton'],
                 100.0 * int(r['tohid']) / max(int(r['ton']), 1),
                 r['present'], r['aud'], r['win'], r['early']))
print()
print('  ⚠ 标题被系统截断（%s），几何数值请看 headless 那一份' %
      ('是' if any(r['truncated'] for r in rows) else '否'))
