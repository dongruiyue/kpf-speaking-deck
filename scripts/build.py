#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""外壳 + 课时数据 + 素材目录 → 单文件 HTML + 双击启动脚本。

    python3 scripts/build.py fce-part1-2 [--outdir out]

只用标准库。幂等：同样的输入跑两次，产物逐字节一致（不写时间戳、目录按名排序）。

输入
    assets/shell.html                 外壳（唯一类名 / CSS 来源），含注入点
    assets/launcher.command.tpl       启动脚本模板
    modules/*.js                      练习模块库
    lessons/<name>.js                 课时数据（含一行 const LESSON_META = {...}）
    lessons/<name>.img/*              照片（转 base64 内嵌）
    lessons/<name>.audio/*            录音（mp3 等，转 base64 内嵌）
    lessons/<name>.css                可选：该课时对类的取值覆盖
    lessons/<name>.html               可选：该课时附带的静态 DOM

输出
    <outdir>/<meta.outFile>                    单文件 HTML
    <outdir>/<meta.launcher>                   双击启动脚本（可执行）

注入点（构完必须一个不剩）
    __LESSON_TITLE__        → meta.docTitle
    __LESSON_IMG__          → {"<照片名>": "data:image/jpeg;base64,…"}
    __LESSON_AUDIO__        → {"<录音名>": "data:audio/mpeg;base64,…"}
    /*==LESSON_CSS==*/      → lessons/<name>.css
    <!--==LESSON_HTML==-->  → lessons/<name>.html
    /*==MODULES==*/         → modules/*.js 全部（teach-deck 打头，其余按名排序）
    /*==LESSON_DATA==*/     → lessons/<name>.js
"""
import argparse, base64, io, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

MARKERS = ['__LESSON_TITLE__', '__LESSON_IMG__', '__LESSON_AUDIO__', '/*==LESSON_CSS==*/',
           '<!--==LESSON_HTML==-->', '/*==MODULES==*/', '/*==LESSON_DATA==*/']

MIME = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.webp': 'image/webp', '.gif': 'image/gif',
        '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg'}


def read(p):
    return io.open(p, encoding='utf-8').read()


def read_bytes(p):
    with open(p, 'rb') as f:
        return f.read()


def lesson_meta(js):
    """课时文件里的 `const LESSON_META = {...};` —— 直接用 JSON.parse，不猜语法。

    允许这个对象跨多行（但必须是纯 JSON：双引号、不加注释），
    所以靠「括号配平 + 跳过字符串」把对象抠出来，而不是按行正则。"""
    key = 'const LESSON_META = '
    i = js.find(key)
    if i < 0:
        raise SystemExit('课时数据里找不到 `const LESSON_META = {...};`')
    j = js.index('{', i)
    depth, k = 0, j
    while k < len(js):
        c = js[k]
        if c == '"':
            k += 1
            while k < len(js) and js[k] != '"':
                k += 2 if js[k] == '\\' else 1
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                break
        k += 1
    if depth != 0:
        raise SystemExit('LESSON_META 的花括号不配平')
    try:
        return json.loads(js[j:k + 1])
    except ValueError as e:
        raise SystemExit('LESSON_META 不是合法 JSON：%s' % e)


def assets(asset_dir):
    """按文件名排序读素材（照片 / 录音都走这里）→ { 名字: data URI }。"""
    if not os.path.isdir(asset_dir):
        return {}
    out = {}
    for fn in sorted(os.listdir(asset_dir)):
        if fn.startswith('.'):
            continue
        ext = os.path.splitext(fn)[1].lower()
        if ext not in MIME:
            continue
        key = os.path.splitext(fn)[0]
        out[key] = 'data:%s;base64,%s' % (MIME[ext], base64.b64encode(read_bytes(os.path.join(asset_dir, fn))).decode('ascii'))
    return out


def load_modules():
    """把 modules/ 里的模块全部注入（teach-deck 打头，其余按名排序，保证产物可复现）。

    为什么全注入而不是按课时挑：模块在加载时只做 TK.registerModule（挂载才绑事件、
    才注册快照字段），没被课时用到的模块对产物行为零影响；换来的是「不会因为某个
    模块名藏在嵌套参数里而漏注入」——上一轮就踩过按名挑选的脆弱性。"""
    mod_dir = os.path.join(ROOT, 'modules')
    names = sorted(os.path.splitext(f)[0] for f in os.listdir(mod_dir) if f.endswith('.js'))
    if 'teach-deck' not in names:
        raise SystemExit('缺 modules/teach-deck.js')
    order = ['teach-deck'] + [n for n in names if n != 'teach-deck']
    return [(n, read(os.path.join(mod_dir, n + '.js'))) for n in order]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('lesson', help='课时名，对应 lessons/<name>.js')
    ap.add_argument('--outdir', default='out')
    ap.add_argument('--quiet', action='store_true')
    a = ap.parse_args()

    shell = read(os.path.join(ROOT, 'assets', 'shell.html'))
    lp = os.path.join(ROOT, 'lessons', a.lesson + '.js')
    if not os.path.isfile(lp):
        raise SystemExit('找不到课时数据：%s' % lp)
    lesson = read(lp)
    meta = lesson_meta(lesson)

    imgs = assets(os.path.join(ROOT, 'lessons', a.lesson + '.img'))
    audio = assets(os.path.join(ROOT, 'lessons', a.lesson + '.audio'))
    mods = load_modules()
    css_p = os.path.join(ROOT, 'lessons', a.lesson + '.css')
    html_p = os.path.join(ROOT, 'lessons', a.lesson + '.html')
    css = read(css_p) if os.path.isfile(css_p) else ''
    extra_html = read(html_p) if os.path.isfile(html_p) else ''

    lesson = lesson.replace('__LESSON_IMG__', json.dumps(imgs, ensure_ascii=False))
    lesson = lesson.replace('__LESSON_AUDIO__', json.dumps(audio, ensure_ascii=False))
    mod_src = '\n\n'.join('/* ================= modules/%s.js ================= */\n%s' % (n, s.rstrip('\n'))
                          for n, s in mods)

    out = shell
    out = out.replace('__LESSON_TITLE__', meta['docTitle'])
    out = out.replace('/*==LESSON_CSS==*/', css)
    out = out.replace('<!--==LESSON_HTML==-->', extra_html)
    out = out.replace('/*==MODULES==*/', mod_src)
    out = out.replace('/*==LESSON_DATA==*/', lesson)

    left = [m for m in MARKERS + ['__LESSON_IMG__'] if m in out]
    if left:
        raise SystemExit('注入完还有残留标记：%s' % ', '.join(sorted(set(left))))

    outdir = os.path.join(ROOT, a.outdir)
    if not os.path.isdir(outdir):
        os.makedirs(outdir)
    dst = os.path.join(outdir, meta['outFile'])
    io.open(dst, 'w', encoding='utf-8').write(out)

    tpl = read(os.path.join(ROOT, 'assets', 'launcher.command.tpl'))
    cmd = (tpl.replace('__TITLE__', meta['docTitle'])
              .replace('__PORT__', str(meta['port']))
              .replace('__FILE__', meta['outFile']))
    cmd_p = os.path.join(outdir, meta['launcher'])
    io.open(cmd_p, 'w', encoding='utf-8').write(cmd)
    os.chmod(cmd_p, 0o755)

    if not a.quiet:
        print('课时：%s' % a.lesson)
        print('  标题：%s' % meta['docTitle'])
        print('  模块：%d 个（%s）' % (len(mods), ', '.join(n for n, _ in mods)))
        print('  照片：%d 张；录音：%d 段' % (len(imgs), len(audio)))
        print('  课时 CSS：%s；课时 HTML：%s' % ('有' if css else '无', '有' if extra_html else '无'))
        print('  产物：%s（%d 字节）' % (os.path.relpath(dst, ROOT), len(out.encode('utf-8'))))
        print('  启动：%s（端口 %s）' % (os.path.relpath(cmd_p, ROOT), meta['port']))


if __name__ == '__main__':
    main()
