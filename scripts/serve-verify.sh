#!/bin/bash
# 起三对本地服务（每对 golden / out 端口不同 → 同源隔离，各自的 BroadcastChannel 与
# localStorage 不会串台），并把只读探针 scripts/probe.js 追加到「被服务的副本」上。
# golden/ 不存在时（发布版不带）自动只起 out 侧，不报错。
#
# 严格只读：golden/ 与 out/ 里的文件一个字节都不动，探针只加在 /tmp 的副本上。
#
# 用法：bash scripts/serve-verify.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
V=/tmp/tk-verify

# 文件名 | golden 端口 | out 端口
ROWS=(
  "FCE-Speaking-Part1-2-课堂工具.html|8898|8899"
  "PET-L4-Speaking-Part1-4-课堂工具.html|8896|8897"
  "KET-U7L3-Speaking-Part2-课堂工具.html|8894|8895"
)

rm -rf "$V"; mkdir -p "$V"
python3 - "$ROOT" "$V" "${ROWS[@]}" <<'PY'
import io, os, sys
root, v = sys.argv[1], sys.argv[2]
probe = io.open(root + '/scripts/probe.js', encoding='utf-8').read()
for row in sys.argv[3:]:
    fn, pg, po = row.split('|')
    made = []
    for side, port in (('golden', pg), ('out', po)):
        src = '%s/%s/%s' % (root, side, fn)
        if not os.path.isfile(src):
            continue                      # 发布版没有 golden/：那一侧不起，只起 out 侧
        d = os.path.join(v, side + '-' + port)
        os.makedirs(d)
        s = io.open(src, encoding='utf-8').read()
        assert '</body>' in s, side
        early = ('<script>window.__earlyErr=[];'
                 'addEventListener("error",function(e){__earlyErr.push(String(e.message)+" @"+e.lineno+":"+e.colno)});'
                 'addEventListener("unhandledrejection",function(e){__earlyErr.push("rej:"+String(e.reason))});</script>')
        s = s.replace('</head>', early + '</head>', 1)
        s = s.replace('</body>', '<script>\n' + probe + '\n</script>\n</body>', 1)
        io.open(os.path.join(d, fn), 'w', encoding='utf-8').write(s)
        made.append(side)
    print('%-46s %s' % (fn[:44], '  '.join('%s:%s' % (s, p) for s, p in (('golden', pg), ('out', po)) if s in made)
                        or '（两侧都缺！）'))
    if 'golden' not in made:
        print('  %-44s golden 侧不存在（发布版不带）→ 只起 out 侧' % '')
PY

for row in "${ROWS[@]}"; do
  IFS='|' read -r fn pg po <<< "$row"
  if [ -f "$V/golden-$pg/$fn" ]; then
    ( cd "$V/golden-$pg" && nohup python3 -m http.server "$pg" --bind 127.0.0.1 >/dev/null 2>&1 & )
  fi
  if [ -f "$V/out-$po/$fn" ]; then
    ( cd "$V/out-$po"    && nohup python3 -m http.server "$po" --bind 127.0.0.1 >/dev/null 2>&1 & )
  fi
  true
done
sleep 1.6
echo
echo "演讲者：#present&probe&fast   观众屏：#audience&probe&fast&nosweep"
for row in "${ROWS[@]}"; do
  IFS='|' read -r fn pg po <<< "$row"
  line="  "
  [ -f "$V/golden-$pg/$fn" ] && line="$line golden $pg /" || line="$line golden 缺（跳过） /"
  [ -f "$V/out-$po/$fn" ] && line="$line out $po" || line="$line out 缺（跳过）"
  echo "$line  →  $(basename "$fn")"
done
