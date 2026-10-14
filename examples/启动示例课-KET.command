#!/bin/bash
# 双击启动：示例课 KET · 放学后的活动 · Speaking 课堂工具（走 http，Safari 全功能可用）
cd "$(dirname "$0")" || exit 1
PORT=8821
FILE="示例课-KET-放学后的活动.html"
ENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$FILE")
URL="http://127.0.0.1:$PORT/$ENC"

# 只信 HTTP 状态码：curl 对 404 也返回退出码 0，不能拿它当「已启动」
http_code() { curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$1"; }

if ! [ -f "$FILE" ]; then
  echo "✗ 找不到课件文件：$FILE"
  echo "  这个启动脚本必须和课件 HTML 放在同一个文件夹里，且文件名不能改。"
  exit 1
fi

code=$(http_code "$URL")
if [ "$code" = "200" ]; then
  open "$URL"; echo "已打开：$URL"; exit 0
fi
if [ "$code" != "000" ]; then
  echo "✗ 端口 $PORT 已被占用，而且上面跑的不是本课件（HTTP $code）。"
  echo "  请先关掉占用它的程序；或把本脚本里的 PORT= 改成别的端口再双击。"
  exit 1
fi

echo "启动本地服务，端口 $PORT …"
nohup python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SRV=$!

# 等它就绪：以「课件本身返回 200」为准，不是端口通了就算（最多等约 10 秒）
for i in $(seq 1 40); do
  [ "$(http_code "$URL")" = "200" ] && break
  sleep 0.25
done
if [ "$(http_code "$URL")" != "200" ]; then
  echo "✗ 服务已启动但课件打不开（HTTP $(http_code "$URL")）。"
  echo "  请检查 $FILE 是否在本目录、文件名有没有被改动过。"
  kill $SRV 2>/dev/null
  exit 1
fi

open "$URL"
echo "已打开：$URL"
echo "（终端窗口可以直接关掉，服务在后台运行）"
