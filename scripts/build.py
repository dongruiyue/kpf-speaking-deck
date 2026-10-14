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
import argparse, base64, io, json, os, re, shutil, subprocess, sys

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
    所以靠「括号配平 + 跳过字符串」把对象抠出来，而不是按行正则。
    定位要求「行首」：文档注释里也可能出现 `const LESSON_META = {...}` 字样，
    不按行首锚定会先抓到注释里的那个。"""
    m = re.search(r'^\s*const LESSON_META = ', js, re.M)
    if not m:
        raise SystemExit('课时数据里找不到行首的 `const LESSON_META = {...};`')
    i = m.start()
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
    """按文件名排序读素材（照片 / 录音都走这里）→ { 名字: data URI }。
    键名取自主文件名：同名不同后缀会被静默覆盖，属事故，直接报错。"""
    if not os.path.isdir(asset_dir):
        return {}
    out, seen = {}, {}
    for fn in sorted(os.listdir(asset_dir)):
        if fn.startswith('.'):
            continue
        ext = os.path.splitext(fn)[1].lower()
        if ext not in MIME:
            continue
        key = os.path.splitext(fn)[0]
        if key in seen:
            raise SystemExit('素材同名冲突：%s 里键「%s」同时被 %s 和 %s 占用（改其中一个文件名）'
                             % (asset_dir, key, seen[key], fn))
        seen[key] = fn
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


def inspect_steps(lesson_src):
    """用 node 把课时数据跑一遍（图片/录音占位符先换成 {}），拿回环节清单做校验。
    node 不在就返回 None —— 这两类校验降级跳过，不阻断构建。"""
    if not shutil.which('node'):
        return None
    stub = ('const __any = new Proxy(function(){}, { get: function(){ return __any; },'
            ' apply: function(){ return __any; }, set: function(){ return true; } });\n'
            'const document = __any, window = __any, navigator = __any, location = __any;\n')
    src = stub + lesson_src.replace('__LESSON_IMG__', '{}').replace('__LESSON_AUDIO__', '{}')
    src += ('\n;try { console.log("STEPS_JSON:" + JSON.stringify((LESSON.steps || [])'
            '.map(function (s) { return { id: s.id, type: (s.practice && s.practice.type) || null }; })));'
            ' } catch (e) { console.error(String(e && e.stack || e)); process.exit(3); }')
    r = subprocess.run(['node', '-e', src], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit('课时数据跑不通（node 执行报错）——先自己查 lessons 文件的语法：\n'
                         + (r.stderr or '').strip()[:800])
    m = re.search(r'^STEPS_JSON:(.*)$', r.stdout, re.M)
    if not m:
        raise SystemExit('课时数据里没有 LESSON.steps 数组（或它没有按约定 return）')
    return json.loads(m.group(1))


def validate_lesson(name, meta, lesson_src, mods, imgs, audio):
    """构建前校验：宁可现在报错，也别让老师拿到一个跑不起来的课件。"""
    errs = []
    for f in ('docTitle', 'port', 'launcher', 'outFile'):
        if not meta.get(f):
            errs.append('LESSON_META 缺字段「%s」' % f)
    port = meta.get('port')
    if meta.get('port') is not None and not (isinstance(port, int) and 1024 <= port <= 65535):
        errs.append('LESSON_META.port 必须是 1024–65535 的整数（现在是 %r）' % (port,))
    steps = inspect_steps(lesson_src)
    if steps is None:
        print('  ⚠ 没找到 node：环节 id / 未知模块 这两类校验跳过（装 node 后重跑更稳）')
    else:
        ids = [s.get('id') for s in steps]
        if any(not i for i in ids):
            errs.append('有环节没有 id')
        for i in sorted(set(x for x in ids if x)):
            if ids.count(i) > 1:
                errs.append('环节 id 重复：「%s」' % i)
        mod_names = {n for n, _ in mods}
        for s in steps:
            t = s.get('type')
            if t and t not in mod_names:
                errs.append('环节「%s」用了未知模块 type「%s」（现有：%s）'
                            % (s.get('id'), t, ' / '.join(sorted(mod_names))))
    if imgs or audio:
        unused = [k for k in list(imgs) + list(audio) if k not in lesson_src]
        if unused:
            print('  ⚠ 这些素材在课时数据里没被引用：%s（不引用也会内嵌，白白变大）' % ', '.join(unused))
        for k in sorted(set(re.findall(r"\bimage\s*:\s*'([A-Za-z0-9_-]+)'", lesson_src))):
            if k not in imgs and k not in audio:
                errs.append('引用了不存在的素材键「%s」（lessons/%s.img 与 .audio 里都没有）' % (k, name))
    return errs


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

    # 内部标识：缺省时由外壳在运行时按 folder 派生；这里只负责提醒，不改课时源文件
    if not meta.get('channel') or not meta.get('keyPrefix'):
        print('  · channel/keyPrefix 未写 → 运行时按 folder「%s」派生（建议显式写上）'
              % meta.get('folder', a.lesson))
    if meta.get('channel') == 'demo-class-v1' or meta.get('keyPrefix') == 'demo':
        print('  ⚠ channel/keyPrefix 还是模板示例值（demo-class-v1 / demo），'
              '和任何照抄模板的课共用同一条同步频道 —— 改掉或删掉')

    errs = validate_lesson(a.lesson, meta, lesson, mods, imgs, audio)
    if errs:
        raise SystemExit('课时「%s」构建前校验没过：\n  - %s' % (a.lesson, '\n  - '.join(errs)))
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
