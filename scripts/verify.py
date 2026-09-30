#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""三份产物的浏览器验收：headless Chrome（视口精确 1920×1080）跑只读探针并逐项比对。

为什么用 headless Chrome：内置浏览器的控制通道不一定可用，Safari 的窗口又被屏幕宽度限制
（实测只能开到 1710 宽），而 `--headless=new --window-size=1920,1080` 的 innerWidth/innerHeight
正好是 1920×1080 —— 与验收标准要求的视口一致。

数据回传通道（2026-09-30 换过）：本机 Chrome 154 / macOS 26 上 `--dump-dom` 不可靠
（一个 5 行测试页 + `--virtual-time-budget=5000` 都能 60 秒不返回），所以与
validate-deck.mjs 走同一条通道 —— 页面自己 `fetch` POST 回本地服务：本脚本为每个
（角色 × golden/out）组合自起一次性 http 服务（同时当结果回收口），把探针与回传脚本
注入 /tmp 的临时副本（golden/ 与 out/ 一个字节都不动），headless Chrome 打开后页面
把探针 JSON POST 回来。自起服务 → 不再依赖 serve-verify.sh 的 8894–8899；
没有 golden/ 时自动只跑 out 侧（第 2 / 12 条输出「不适用/跳过」）。

判据（对照 references/shell-boundary.md 第七节）：
  1 语法      node --check 产物末段脚本
  2 内容保真  check-content.py 逐字比对（无 golden 时输出「跳过」）
  3 版式      每视图 main.bottom（带 zoom）≤ 1080        → RES.v
  4 版式      观众屏 left=0 且右侧不留白                 → RES.vlr
  5 版式      讲义每页自然高；投影正文实际字号           → RES.decks
  6 素材      照片 naturalWidth > 0                      → RES.img
  7 错误      走遍全部环节 / 讲练 / 讲义页 / 交互后 err=0 → RES.err + RES.inter
  8 同步      空转 10 秒 applyState ≤5                    ← 用 scripts/safari-verify.sh 实时测（真双窗口）
  9 静音      观众屏 beep = 0                             ← 同上
 10 锁定      观众屏 .teacher-only 全部隐藏               → RES.to（hid == n）
 11 计分      +1 → 顶栏 → 撤销回 0 → 冠军表一致           → RES.score
 12 回归      每视图自然高度 golden vs 重建 偏差 ≤2%       → RES.nat（FCE 判通过；PET/KET 按第二节只报事实；无 golden 时输出「不适用/跳过」）

用法：python3 scripts/verify.py [fce|pet|ket]...
"""
import io, json, os, re, shutil, signal, subprocess, sys, tempfile, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import quote as Q, unquote

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

CASES = {
    'fce': dict(file='FCE-Speaking-Part1-2-课堂工具.html'),
    'pet': dict(file='PET-L4-Speaking-Part1-4-课堂工具.html'),
    'ket': dict(file='KET-U7L3-Speaking-Part2-课堂工具.html'),
}
PROBE_TIMEOUT = 180          # 单个（角色 × 侧）等页内 POST 的上限（真实时间；FCE 单侧实测几十秒）

# 早期错误捕获（与 serve-verify.sh / validate-deck.mjs 注入的同一段）
EARLY = ('<script>window.__earlyErr=[];'
         'addEventListener("error",function(e){__earlyErr.push(String(e.message)+" @"+e.lineno+":"+e.colno)});'
         'addEventListener("unhandledrejection",function(e){__earlyErr.push("rej:"+String(e.reason))});</script>')

# 回传脚本：等探针把「"done":true」或「"fail"」写进 #tkprobe，然后把整份 JSON POST 回本地服务
#（与 validate-deck.mjs 的 deckProbe 同一个手法；探针若自报 fail 也立即回传，不空等到超时）
POSTER = r'''
(function () {
  if (!location.hash.includes('probe')) return;
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  (async function () {
    for (var i = 0; i < 1200; i++) {
      var el = document.getElementById('tkprobe');
      if (el && (el.textContent.indexOf('"done":true') >= 0 || el.textContent.indexOf('"fail":"') >= 0)) {
        try { await fetch('/__tkresult', { method: 'POST', body: el.textContent.replace(/^TKPROBE\s*/, '') }); } catch (e) {}
        return;
      }
      await wait(150);
    }
    try { await fetch('/__tkresult', { method: 'POST', body: JSON.stringify({ fail: 'probe 180s 未收尾' }) }); } catch (e) {}
  })().catch(function (e) {
    try { fetch('/__tkresult', { method: 'POST', body: JSON.stringify({ fail: String(e) }) }); } catch (_) {}
  });
})();
'''


def run_once(src, fn, hash_, tmp, probe_src):
    """起一次性服务（随机端口 → 每次运行都是独立源， golden/out、教师/观众互不串台），
    headless Chrome 打开注入副本，等页面把探针 JSON POST 回来。"""
    d = tempfile.mkdtemp(dir=tmp)
    s = io.open(src, encoding='utf-8').read()
    if '</head>' in s:
        s = s.replace('</head>', EARLY + '</head>', 1)
    s = s.replace('</body>',
                  '<script>\n' + probe_src + '\n</script>\n<script>\n' + POSTER + '\n</script>\n</body>', 1)
    io.open(os.path.join(d, fn), 'w', encoding='utf-8').write(s)

    got = {}

    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_POST(self):
            n = int(self.headers.get('Content-Length') or 0)
            got['body'] = self.rfile.read(n)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'ok')

        def do_GET(self):
            p = os.path.join(d, unquote(self.path.split('?')[0].split('#')[0].lstrip('/')))
            if not (os.path.isfile(p) and os.path.dirname(os.path.abspath(p)) == os.path.abspath(d)):
                self.send_response(404)
                self.end_headers()
                return
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            with open(p, 'rb') as f:
                shutil.copyfileobj(f, self.wfile)

    srv = ThreadingHTTPServer(('127.0.0.1', 0), H)
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    prof = tempfile.mkdtemp(dir=tmp)
    url = 'http://127.0.0.1:%d/%s#%s' % (srv.server_address[1], Q(fn), hash_)
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
           '--user-data-dir=' + prof, '--window-size=1920,1080', url]
    pr = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        deadline = time.time() + PROBE_TIMEOUT
        while time.time() < deadline and 'body' not in got:
            time.sleep(0.3)
    finally:
        # headless Chrome 用完即杀（含按 profile 路径兜底清残留），服务也立刻关
        pr.kill()
        try:
            pr.wait(5)
        except Exception:
            pass
        subprocess.run(['pkill', '-f', prof], capture_output=True)
        srv.shutdown()
        srv.server_close()
        shutil.rmtree(prof, ignore_errors=True)
    if 'body' not in got:
        return {'fail': '等 %d 秒没等到页内 POST 结果' % PROBE_TIMEOUT}
    try:
        return json.loads(got['body'].decode('utf-8', 'replace'))
    except ValueError:
        return {'fail': '结果不是 JSON', 'stdout_len': len(got['body'])}


def run_probe(src, fn, hash_, tmp, probe_src):
    """跑一次 headless，拿回探针的 JSON；失败重试一次。"""
    r = run_once(src, fn, hash_, tmp, probe_src)
    if 'fail' in r:
        r = run_once(src, fn, hash_, tmp, probe_src)
    return r


def pct(a, b):
    if a == b:
        return 0.0
    return (b - a) / a * 100.0


def verify(case):
    c = CASES[case]
    fn = c['file']
    print('=' * 96)
    print('%s  ——  %s' % (case.upper(), fn))
    print('=' * 96)
    tmp = tempfile.mkdtemp()
    try:
        probe_src = io.open(os.path.join(HERE, 'probe.js'), encoding='utf-8').read()
        out_art = os.path.join(ROOT, 'out', fn)
        gold_art = os.path.join(ROOT, 'golden', fn)
        has_gold = os.path.isfile(gold_art)
        if not has_gold:
            print('（没有 golden/%s：发布版不带迁移前对照，第 2 / 12 条跳过，其余照常）' % fn)
        got = {}
        for role, h in (('teacher', 'present&probe&fast'), ('audience', 'audience&probe&fast')):
            got[(role, 'out')] = run_probe(out_art, fn, h, tmp, probe_src)
            if has_gold:
                got[(role, 'golden')] = run_probe(gold_art, fn, h, tmp, probe_src)
        # 语法（第 1 条）
        art = out_art
        s = io.open(art, encoding='utf-8').read()
        js = re.findall(r'<script>(.*?)</script>', s, re.S)[-1]
        p = os.path.join(tmp, 'a.js')
        io.open(p, 'w', encoding='utf-8').write(js)
        rc = subprocess.run(['node', '--check', p], capture_output=True).returncode

        T, A = got[('teacher', 'out')], got[('audience', 'out')]
        TG, AG = got.get(('teacher', 'golden'), {}), got.get(('audience', 'golden'), {})
        named = [('教师端', T), ('观众屏', A)]
        if has_gold:
            named += [('教师端(golden)', TG), ('观众屏(golden)', AG)]
        for nm, r in named:
            if 'fail' in r:
                print('  ✗ %s 探针没输出：%s' % (nm, r))
        if 'fail' in T or 'fail' in A:
            return

        print('视口：教师端 %s ／ 观众屏 %s（探针自报）' % (T['win'], A['win']))
        print()
        print('【第 1 条 语法】node --check 末段脚本 → 退出码 %d  %s' % (rc, '✅' if rc == 0 else '✗'))
        if not has_gold:
            print('【第 2 条 内容保真】不适用：没有 golden/（发布版不带迁移前对照）→ 跳过内容保真')
        print('【第 6 条 素材】交互后 DOM 里 <img> %d 张，naturalWidth>0 的 %d 张，为 0 的 %d 张  %s'
              % (T['img']['n'], T.get('imgAll'), T['img']['bad'],
                 '✅' if T['img']['bad'] == 0 and T['img']['n'] > 0 else '✗'))
        print('【第 7 条 错误】err=%d  early=%s  交互点击 %s 次  %s'
              % (T['err'], T.get('early'), T.get('inter'), '✅' if T['err'] == 0 and not T.get('early') else '✗'))
        print('【第 10 条 锁定】观众屏 .teacher-only %d 个，实际不可见 %d 个（%s）  aud=%s  %s'
              % (A['to']['n'], A['to']['hid'], '100%%' if A['to']['hid'] == A['to']['n'] else
                 '%.0f%%' % (100.0 * A['to']['hid'] / max(A['to']['n'], 1)), A['to']['aud'],
                 '✅' if A['to']['n'] == A['to']['hid'] and A['to']['aud'] else '✗'))
        print('【第 11 条 计分】清零 %s → 点 %s 的 +1 → %s → 撤销 → %s'
              % (T['score']['zero'], T['score']['step'], T['score']['plus'], T['score']['undo']))
        print('             冠军表：%s' % T['score']['table'])
        ok11 = (T['score']['zero'] == '0:0' and T['score']['plus'].endswith(':0')
                and T['score']['plus'] != '0:0' and T['score']['undo'] == '0:0')
        print('             %s' % ('✅ 顶栏与冠军表一致、撤销回 0' if ok11 else '✗ 见上面的原始数值'))
        print('【KET 播放器】<audio> %d 个 / 播放器盒子 %s（教师端）；观众屏 <audio> %d 个 / 盒子 %s  %s'
              % (T['audio']['els'], T['audio']['box'], A['audio']['els'], A['audio']['box'],
                 '✅ 观众屏不建播放器' if A['audio']['els'] == 0 and not A['audio']['box'] else '⚠ 见数值'))

        # 第 3 条：每视图 bottom ≤ 1080
        bad3 = [(k, v) for k, v in T['v'].items() if v > 1080]
        bad3a = [(k, v) for k, v in A['v'].items() if v > 1080]
        print()
        print('【第 3 条 版式】教师端最大 bottom %.2f；观众屏最大 bottom %.2f  %s'
              % (max(T['v'].values()), max(A['v'].values()),
                 '✅ 全部 ≤1080' if not bad3 and not bad3a else '✗ %s' % (bad3 + bad3a)))
        # 第 4 条：观众屏 left=0 / 右侧不留白
        bad4 = [(k, lr) for k, lr in A['vlr'].items() if lr[0] != 0 or abs(lr[1] - int(A['win'].split('x')[0])) > 0.5]
        print('【第 4 条 版式】观众屏 left 全为 0、right 全等于视口宽 %s  %s'
              % (A['win'].split('x')[0], '✅' if not bad4 else '✗ %s' % bad4[:3]))
        # 第 5 条：讲义页自然高 / 投影字号
        dz = A['decks']
        pages = sorted(set(k[:-1] for k in dz if k.endswith('h')))
        hs = [dz[k + 'h'] for k in pages]
        pxs = [dz[k + 'px'] for k in pages if dz.get(k + 'px')]
        # 观众屏整场一个缩放值；取讲义视图当时记录的 zoom（没有就退回 1）
        zs = [float(v) for k, v in (A.get('vz') or {}).items() if 'teach' in k or '|' in k]
        zm = zs[0] if zs else 1.0
        if pages:
            print('【第 5 条 版式】观众屏讲义共 %d 页：自然高 %d–%d px（最大 %d）；每页正文最大字号 %s → 最小 %.1f px'
                  % (len(pages), min(hs), max(hs), max(hs), '/'.join('%.1f' % x for x in pxs), min(pxs) if pxs else 0))
            print('             × 该场缩放 %.2f → 投影上最小正文 %.1f px；每屏是否落进 %s：%s'
                  % (zm, (min(pxs) if pxs else 0) * zm, T['win'],
                     '✅ ' + str(max(A['v'].values()) <= 1080) + '（第 3 条）'))
        else:
            print('【第 5 条 版式】这一节课没有讲义分页（环节都是练习页）→ 无讲义页可量；'
                  '练习页每屏是否落进 %s：%s' % (T['win'], '✅ ' + str(max(A['v'].values()) <= 1080)))

        # 第 12 条：逐视图自然高度对照
        print()
        if not has_gold:
            print('【第 12 条 回归】不适用：没有 golden/（发布版不带迁移前对照）→ 跳过与迁移前的逐视图对比')
        else:
            print('【第 12 条 回归】逐视图自然高度（清掉 zoom 量出的 main.bottom）golden vs 重建')
            rows = []
            keys = sorted(set(TG.get('nat', {}) or {}) | set(T.get('nat') or {}))
            for k in keys:
                a = TG.get('nat', {}).get(k)
                b = T['nat'].get(k)
                if a is None or b is None:
                    rows.append((k, a, b, None))
                else:
                    rows.append((k, a, b, pct(a, b)))
            print('  %-22s %10s %10s %9s' % ('视图', '迁移前', '重建', '偏差'))
            for k, a, b, d in rows:
                print('  %-22s %10s %10s %9s' % (k, '—' if a is None else '%.2f' % a,
                                                 '—' if b is None else '%.2f' % b,
                                                 '—' if d is None else '%+.2f%%' % d))
            ds = [d for _, _, _, d in rows if d is not None]
            if ds:
                print('  教师端：%d 个视图，最大偏差 %.2f%%，%s' % (
                    len(ds), max(abs(d) for d in ds),
                    '✅ 全部 ≤2%' if max(abs(d) for d in ds) <= 2 else '⚠ 有视图超过 2%'))
            print()
            print('  观众屏逐视图自然高度（迁移前 / 重建 / 偏差）')
            keys = sorted(set(AG.get('nat', {}) or {}) | set(A.get('nat') or {}))
            for k in keys:
                a = AG.get('nat', {}).get(k)
                b = A['nat'].get(k)
                if a is None or b is None:
                    print('  %-22s %10s %10s %9s' % (k, '—' if a is None else '%.2f' % a,
                                                     '—' if b is None else '%.2f' % b, '—'))
                else:
                    print('  %-22s %10.2f %10.2f %9s' % (k, a, b, '%+.2f%%' % pct(a, b)))
            print()
            print('  观众屏带 zoom 的 bottom（第 3 条用的那一列；缩放 %.2f）' % zm)
            for k in sorted(set(AG['v']) | set(A['v'])):
                print('  %-22s %10s %10s' % (k, AG['v'].get(k, '—'), A['v'].get(k, '—')))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    which = sys.argv[1:] or list(CASES)
    for c in which:
        verify(c)
        print()
