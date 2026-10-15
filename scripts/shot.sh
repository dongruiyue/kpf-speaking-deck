#!/bin/bash
# 观感验收截图（规范 references/typography.md §六.3 要求「三档视口 × 教师端/学生屏」截图对照）
#
#   bash scripts/shot.sh <课时> <环节id或home>[[:teach|:prac]] [teacher|present|audience] [宽x高] [输出名] [额外的 JS]
# 例：
#   bash scripts/shot.sh ket-u8l3 draw teacher 1366x768
#   bash scripts/shot.sh ket-u8l3 draw audience 1920x1080
#   bash scripts/shot.sh pet-l4 p4:prac teacher 1366x768     ← 讲练双视图的「练习」那一侧
#   bash scripts/shot.sh ket-u7l3 examiner present 1366x768  ← 演讲者模式（按 P）：整屏按缩放自动装下
#   bash scripts/shot.sh ket-u7l3 examiner teacher 1366x768 ket-u7l3-examiner-p2.png \
#     "document.getElementById('ph2Tab').click()"            ← 第 6 个参数：跳页后额外跑一段 JS（点 Tab 等）
#   （不写 :teach / :prac 时拍默认视图 = 讲解侧；练习页的版式一律拍 :prac）
#   teacher = 普通浏览模式（可能有滚动条）；present = 演讲者模式（外壳会把整屏缩放到装下）
#
# 做法：把产物复制到 /tmp/tkshot/，注入一小段脚本（关掉开课引导浮层 + 跳到指定环节），
# 起一个临时 http 服务，用 headless Chrome 截图。产物与 out/ 不被修改。
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LESSON="$1"; STEP="${2:-home}"; ROLE="${3:-teacher}"; SIZE="${4:-1366x768}"; EXTRA="${6:-}"
VIEW=""; case "$STEP" in *:*) VIEW="${STEP#*:}"; STEP="${STEP%%:*}";; esac
OUT="${5:-${LESSON}-${STEP}${VIEW:+-$VIEW}-${ROLE}-${SIZE}.png}"
W="${SIZE%x*}"; H="${SIZE#*x}"
PORT=8897
D=/tmp/tkshot
CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# 找到该课时的产物（按 lessons/<name>.js 的 outFile）
FILE=$(python3 - "$ROOT" "$LESSON" <<'PY'
import io, os, re, sys
root, name = sys.argv[1], sys.argv[2]
s = io.open(os.path.join(root, 'lessons', name + '.js'), encoding='utf-8').read()
print(re.search(r'"outFile"\s*:\s*"([^"]+)"', s).group(1))
PY
)

rm -rf "$D" || true; mkdir -p "$D"
python3 - "$ROOT" "$D" "$FILE" "$STEP" "$ROLE" "$VIEW" "$EXTRA" <<'PY'
import io, os, sys
root, d, fn, step, role, view, extra = sys.argv[1:8]
s = io.open(os.path.join(root, 'out', fn), encoding='utf-8').read()
go = '' if step == 'home' else "try{TK.go('%s')}catch(e){}" % step
if view and step != 'home':
    go += "try{TK.mod('%s','%s')}catch(e){}" % (step, view)
go += extra
# 动作跑完再让页面稳两帧：headless 的 --virtual-time-budget 会在动作与重绘之间抢拍，
# 抢到的是「display 刚从 none 变 block、还没画出来」的那一帧（整屏空白）。
# 双 rAF + 读一次 offsetHeight：既强制一次布局，也让合成器真的产出一帧再拍。
inj = ("<script>setTimeout(function(){try{document.getElementById('guideOv').classList.remove('on')}catch(e){};"
       + go + ";requestAnimationFrame(function(){requestAnimationFrame(function(){void document.body.offsetHeight;});});"
       + "},900);</script>")
io.open(os.path.join(d, 'p.html'), 'w', encoding='utf-8').write(s.replace('</body>', inj + '</body>', 1))
PY

( cd "$D" && nohup python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 & )
sleep 1.2
HASH=""; [ "$ROLE" = "audience" ] && HASH="#audience"; [ "$ROLE" = "present" ] && HASH="#present"
# --force-prefers-reduced-motion：不加会拍到 .screen.on 淡入的中间帧（整屏半透明）
"$CHROME" --headless=new --disable-gpu --no-first-run --force-prefers-reduced-motion \
  --user-data-dir="$D/prof" --window-size="$W,$H" --virtual-time-budget=6000 \
  --screenshot="$D/$OUT" "http://127.0.0.1:$PORT/p.html$HASH" 2>/dev/null

mkdir -p "$ROOT/out/_shots"
cp "$D/$OUT" "$ROOT/out/_shots/$OUT"
pid=$(lsof -nP -iTCP:$PORT -sTCP:LISTEN -t 2>/dev/null || true); [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
sleep 0.3
rm -rf "$D" || true
echo "截图：$ROOT/out/_shots/$OUT"
