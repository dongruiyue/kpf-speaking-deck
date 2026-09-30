#!/bin/bash
# 用 Safari + AppleScript 做验收测量（不依赖内置浏览器的控制通道）：
#   open <课时名>   有 golden：开 2 个窗口各 2 个标签（窗口A=教师端 golden/out，窗口B=观众屏 golden/out）
#                   无 golden（发布版/新课）：开 1 个窗口 2 个标签（out 教师端 + out 观众屏）
#   read            打印所有窗口所有标签的标题（探针结果就在 document.title 里）
#   close           关掉本脚本开出来的窗口
#
# 为什么这样读：探针把结果写进 document.title，Safari 的 tab `name` 就是 document.title，
# 用 AppleScript 取 `name of every tab` 即可一次读全部标签 —— 不需要切换标签、不抢前台。
#
# 课时名：fce/pet/ket 走内置表，其它名字由 scripts/resolve-lesson.py 从 lessons/<name>.js 解析。
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CASE="$1"; WHICH="${2:-fce}"

RES=$(python3 "$ROOT/scripts/resolve-lesson.py" "$WHICH") || { echo "用法：safari-verify.sh {open|read|close} {fce|pet|ket|<课时名>}"; exit 2; }
FILE=$(echo "$RES" | cut -f1); PG=$(echo "$RES" | cut -f2); PO=$(echo "$RES" | cut -f3)
HAS_GOLDEN=0; [ -f "$ROOT/golden/$FILE" ] && HAS_GOLDEN=1
ENC=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$FILE")

teacher_g="http://127.0.0.1:$PG/$ENC#present&probe&fast"
teacher_o="http://127.0.0.1:$PO/$ENC#present&probe"
aud_g="http://127.0.0.1:$PG/$ENC#audience&probe&fast"
aud_o="http://127.0.0.1:$PO/$ENC#audience&probe"

case "$CASE" in
  open)
    if [ "$HAS_GOLDEN" = "1" ]; then
    osascript <<EOF
tell application "Safari"
  activate
  make new document with properties {URL:"$teacher_g"}
  set bounds of front window to {0, 0, 1920, 1175}
  tell front window to set current tab to (make new tab with properties {URL:"$teacher_o"})
  make new document with properties {URL:"$aud_g"}
  set bounds of front window to {0, 0, 1920, 1175}
  tell front window to set current tab to (make new tab with properties {URL:"$aud_o"})
end tell
EOF
    echo "已开：$WHICH 的 教师端(golden/out) + 观众屏(golden/out)"
    else
    osascript <<EOF
tell application "Safari"
  activate
  make new document with properties {URL:"$teacher_o"}
  set bounds of front window to {0, 0, 1920, 1175}
  tell front window to set current tab to (make new tab with properties {URL:"$aud_o"})
end tell
EOF
    echo "已开：$WHICH 的 教师端(out) + 观众屏(out)（无 golden 侧）"
    fi;;
  read)
    # 一行一个标签的标题：不要用 tr 拆逗号（JSON 里全是逗号）
    osascript <<'EOF'
tell application "Safari"
  set out to ""
  repeat with w in windows
    repeat with t in tabs of w
      set out to out & (name of t) & linefeed
    end repeat
  end repeat
  return out
end tell
EOF
    ;;
  close)
    # 只关本脚本开出的测试窗口（特征：窗口里所有标签都是 127.0.0.1:89xx 的验收服务，
    # 含 889x 历史端口与 890x 新课端口），用户自己的 Safari 窗口/标签一律不动
    # —— 绝不能 close every window。
    # 注意：必须先收集 id 再关 —— 边遍历 every window 边关会让索引失效（-1719 无效的索引）。
    osascript <<'EOF'
tell application "Safari"
  set ids to {}
  repeat with w in (every window)
    set ts to tabs of w
    if (count of ts) > 0 then
      set allTest to true
      repeat with t in ts
        if not ((URL of t) starts with "http://127.0.0.1:89") then set allTest to false
      end repeat
      if allTest then set end of ids to id of w
    end if
  end repeat
  repeat with i in ids
    try
      close (every window whose id is i)
    end try
  end repeat
  return "closed " & (count of ids)
end tell
EOF
    echo "已关闭本次打开的测试窗口（只关标签全部是 127.0.0.1:89xx 的窗口）";;
  *) echo "用法：safari-verify.sh {open|read|close} {fce|pet|ket|<课时名>}"; exit 2;;
esac
