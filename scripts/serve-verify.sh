#!/bin/bash
# 起本地验收服务（每课一对：golden / out，同源隔离，各自的 BroadcastChannel 与
# localStorage 不会串台），并把只读探针 scripts/probe.js 追加到「被服务的副本」上。
#
# 严格只读：golden/ 与 out/ 里的文件一个字节都不动，探针只加在 /tmp 的副本上。
# 没有 golden/ 的课时（发布版、新课）只起 out 侧。
#
# 用法：bash scripts/serve-verify.sh [课时名...]      # 不带参数 = fce pet ket
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
V=/tmp/tk-verify

NAMES=("$@")
[ ${#NAMES[@]} -eq 0 ] && NAMES=(fce pet ket)

rm -rf "$V"; mkdir -p "$V"

ROWS=()
for n in "${NAMES[@]}"; do
  ROWS+=("$(python3 "$ROOT/scripts/resolve-lesson.py" "$n")")
done

python3 - "$ROOT" "$V" "${ROWS[@]}" <<'PY'
import io, os, sys
root, v = sys.argv[1], sys.argv[2]
probe = io.open(root + '/scripts/probe.js', encoding='utf-8').read()
early = ('<script>window.__earlyErr=[];'
         'addEventListener("error",function(e){__earlyErr.push(String(e.message)+" @"+e.lineno+":"+e.colno)});'
         'addEventListener("unhandledrejection",function(e){__earlyErr.push("rej:"+String(e.reason))});</script>')
for row in sys.argv[3:]:
    fn, pg, po = row.split('\t')
    for side, port in (('golden', pg), ('out', po)):
        src = '%s/%s/%s' % (root, side, fn)
        if not os.path.isfile(src):
            print('  %s：%s 侧不存在 → 跳过' % (fn, side))
            continue
        d = os.path.join(v, side + '-' + port)
        os.makedirs(d)
        s = io.open(src, encoding='utf-8').read()
        assert '</body>' in s, side
        s = s.replace('</head>', early + '</head>', 1)
        s = s.replace('</body>', '<script>\n' + probe + '\n</script>\n</body>', 1)
        io.open(os.path.join(d, fn), 'w', encoding='utf-8').write(s)
PY

for row in "${ROWS[@]}"; do
  IFS=$'\t' read -r fn pg po <<< "$row"
  if [ -d "$V/golden-$pg" ]; then
    ( cd "$V/golden-$pg" && nohup python3 -m http.server "$pg" --bind 127.0.0.1 >/dev/null 2>&1 & )
  fi
  ( cd "$V/out-$po"    && nohup python3 -m http.server "$po" --bind 127.0.0.1 >/dev/null 2>&1 & )
  true
done
sleep 1.6
echo
echo "演讲者：#present&probe&fast   观众屏：#audience&probe&fast&nosweep"
for row in "${ROWS[@]}"; do
  IFS=$'\t' read -r fn pg po <<< "$row"
  if [ -d "$V/golden-$pg" ]; then
    echo "  golden $pg / out $po  →  $fn"
  else
    echo "  out $po（无 golden 侧）→  $fn"
  fi
done
