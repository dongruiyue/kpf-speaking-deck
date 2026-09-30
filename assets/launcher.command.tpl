#!/bin/bash
# 双击启动：__TITLE__（走 http，Safari 全功能可用）
cd "$(dirname "$0")" || exit 1
PORT=__PORT__
FILE="__FILE__"
ENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$FILE")
URL="http://127.0.0.1:$PORT/$ENC"

if curl -s -o /dev/null "$URL"; then
  open "$URL"; echo "已打开：$URL"; exit 0
fi
echo "启动本地服务，端口 $PORT …"
nohup python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
sleep 1.5
open "$URL"
echo "已打开：$URL"
echo "（终端窗口可以直接关掉，服务在后台运行）"
