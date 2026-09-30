#!/usr/bin/env node
/* scripts/validate-deck.mjs —— 运行时校验器（px 级）：M1 溢出 / 底部白空、M2 标题间距、M3 同步风暴
 *
 * 出处：references/shell-boundary.md §八「防回归护栏」
 *   M1 每个视图 main.bottom 与视口高度的差（溢出为正、白空为负），逐视图列出
 *   M2 讲义页标题与首个内容块之间的间距（px），列出异常值
 *   M3 空转 10 秒 applyState 次数                     ← 委托给 scripts/safari-counts.py
 * 分级修正阶梯与「修完复测，白空变大说明修过头」的提醒照 §八 原话输出。
 *
 * 怎么测的：
 *   1) 把只读探针 scripts/probe.js 追加到**临时副本**上（out/ 与 golden/ 一个字节都不动）；
 *   2) node:http 起一个本地服务（同源，BroadcastChannel 才有意义；同时当「结果回收口」）；
 *   3) headless Chrome 打开 `#present&probe&fast` / `#audience&probe&fast`，视口 1920×1080；
 *   4) 页内脚本等探针扫完视图，把「探针 JSON + M2 测量」**POST 回本地服务**（不依赖 --dump-dom）；
 *   5) 拿到结果就关掉 Chrome，报 px 级结论。
 *
 * 为什么不跟 verify.py 一样用 `--virtual-time-budget` + `--dump-dom`：
 *   本机（Chrome 154 / macOS 26）实测 `--dump-dom` 会挂住 —— 连一个 5 行的测试页都拿不回输出
 *   （`--virtual-time-budget=90000` 跑满 90 秒仍是 0 字节 stdout，`=3000` 则立刻返回空）。
 *   改成「页面 POST 回结果」以后，同一个测试页 2 秒就拿到数据（视口自报 1920×993）。
 *   副作用是好的：这里量的是**真实时间**下的几何，不再有虚拟时间压扁时间轴的问题。
 *
 * 为什么 M3 仍然不能在这里测：headless 只开了一个窗口，**没有 peer**，
 *   根本收不到对端快照 —— 而同步风暴本来就是双窗口回环，这里永远量不到它。
 *   所以 M3 只打印委托命令（`--m3` 时才真的去调 scripts/safari-counts.py，真实 Safari + 真实双窗口）。
 *   **绝不在这里编一个 M3 数字出来。**
 *
 * 用法：
 *   node scripts/validate-deck.mjs fce            # 三份产物里的一份（用 out/ 里的产物）
 *   node scripts/validate-deck.mjs pet ket
 *   node scripts/validate-deck.mjs /path/to/某产物.html
 *   node scripts/validate-deck.mjs fce --m3       # 额外调 scripts/safari-counts.py 实测 M3（需要真 Safari）
 *   node scripts/validate-deck.mjs fce --raw      # 附上写 layout-budget.md 要用的原始值（缩放 / 字号 / 素材）
 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const CASES = {
  fce: 'FCE-Speaking-Part1-2-课堂工具.html',
  pet: 'PET-L4-Speaking-Part1-4-课堂工具.html',
  ket: 'KET-U7L3-Speaking-Part2-课堂工具.html',
};

/* 课时名 → out/ 产物：内置三课走表；其它读 lessons/<name>.js 的 LESSON_META.outFile
  （与 verify.py 同一口径）；也可以直接给产物 .html 路径 */
function resolveTarget(target) {
  if (CASES[target]) return { key: target, file: path.join(ROOT, 'out', CASES[target]) };
  if (/\.html$/.test(target)) return { key: path.basename(target, '.html'), file: path.resolve(target) };
  const lp = path.join(ROOT, 'lessons', target + '.js');
  if (fs.existsSync(lp)) {
    const m = /"outFile"\s*:\s*"([^"]+)"/.exec(fs.readFileSync(lp, 'utf8'));
    if (m) return { key: target, file: path.join(ROOT, 'out', m[1]) };
    console.error('lessons/%s.js 的 LESSON_META 里没有 "outFile"', target);
    process.exit(2);
  }
  console.error('不认识课时名「%s」：既不是内置的 %s，也找不到 lessons/%s.js（或直接给产物 .html 路径）',
    target, Object.keys(CASES).join('/'), target);
  process.exit(2);
}
const WINDOW = '1920,1080';                   /* 与 verify.py 同一套口径 */
const JUDGE_1080 = 1080;                      /* §七 #3：每个视图 main.bottom ≤ 1080 */
const M2_BAND = [4, 24];                      /* 标题间距正常带（px），依据见 references/layout-budget.md */
const HASH = { T: 'present&probe&fast', A: 'audience&probe&fast' };
const ROLE_TIMEOUT = 120000;                  /* 单个角色等结果的上限（真实时间，秒级就够） */

/* ------------------------------------------------------------------ 小工具 */
const CJK = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/;
const dw = s => [...String(s)].reduce((n, c) => n + (CJK.test(c) ? 2 : 1), 0);
const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - dw(s)));
const num = x => (typeof x === 'number' && isFinite(x) ? (Math.round(x * 100) / 100).toFixed(2) : '—');
const signed = x => (x > 0 ? '+' : '') + num(x);
/* 分级修正阶梯：shell-boundary.md §八 的原话 */
const ladder = d => (d <= 40 ? '1–40px 微调' : d <= 90 ? '40–90px 局部压' : d <= 160 ? '90–160px 拆页' : '160px 以上，才删内容');

/* ------------------------------------------------------------------ 页内脚本（探针扫完后量 M2 并把结果 POST 回来） */
/* 讲义页标题（.deck-title，在外壳的 .deck-top 里）到该页首个内容块顶边的距离。
   量法与探针的 deckStat 一致：清掉 main / documentElement 的 zoom，把祖先 screen / mod-view
   展开，逐页强制 .on 再量 —— 隐藏元素量出来是 0，不能算。 */
function deckProbe() {
  if (!location.hash.includes('probe')) return;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  function publish(payload) {
    const txt = 'TKDECK ' + JSON.stringify(payload);
    document.title = txt;                     /* 人工打开这份副本时，肉眼也能读到结果 */
    let p = document.getElementById('tkdeck');
    if (!p) {
      p = document.createElement('pre');
      p.id = 'tkdeck';
      p.style.cssText = 'position:fixed;left:0;bottom:36px;z-index:99999;background:#fff;color:#000;'
        + 'font:9px/1.05 monospace;max-height:30px;overflow:hidden;margin:0;padding:2px;';
      document.body.appendChild(p);
    }
    p.textContent = txt;
  }

  function deckStat() {
    const mainEl = document.querySelector('main');
    const rows = [];
    if (!mainEl) return rows;
    const z1 = mainEl.style.zoom, z2 = document.documentElement.style.zoom;
    mainEl.style.zoom = ''; document.documentElement.style.zoom = '';
    document.querySelectorAll('.lesson-deck').forEach(root => {
      const chain = [root.closest('.screen'), root.closest('.mod-view')].filter(Boolean);
      const saved = chain.map(e => e.classList.contains('on'));
      chain.forEach(e => e.classList.add('on'));
      const tEl = root.querySelector('.deck-title');
      const pages = root.querySelectorAll('.deck-page');
      pages.forEach((p, i) => {
        const wasOn = p.classList.contains('on');
        pages.forEach(q => q.classList.remove('on'));       /* 一次只让一页显示：两页叠着量会虚高 */
        p.classList.add('on');
        const first = p.firstElementChild;
        const pr = p.getBoundingClientRect();
        const row = { deck: root.id.replace(/^deck-/, ''), page: i + 1, pages: pages.length,
                      title: (p.dataset.title || '').slice(0, 40), h: Math.round(pr.height * 100) / 100 };
        if (tEl && first) {
          const tb = tEl.getBoundingClientRect(), fb = first.getBoundingClientRect();
          row.gap = Math.round((fb.top - tb.bottom) * 100) / 100;
          row.firstCls = String(first.className || '').slice(0, 30);
        }
        rows.push(row);
        if (!wasOn) p.classList.remove('on');
      });
      chain.forEach((e, i) => { if (!saved[i]) e.classList.remove('on'); });
    });
    mainEl.style.zoom = z1; document.documentElement.style.zoom = z2;
    return rows;
  }

  (async function run() {
    /* 等主探针把全部视图扫完（它把整份 JSON 写进 #tkprobe，并以 "done":true 收尾） */
    let base = null;
    for (let i = 0; i < 900; i++) {
      const el = document.getElementById('tkprobe');
      if (el && el.textContent.includes('"done":true')) {
        try { base = JSON.parse(el.textContent.replace(/^TKPROBE\s*/, '')); }
        catch (e) { base = { fail: 'probe json: ' + String(e && e.message || e) }; }
        break;
      }
      await wait(150);
    }
    if (!base) base = { fail: 'probe 没在 135 秒内收尾（#tkprobe 里没有 "done":true）' };
    const payload = { probe: base, m2: deckStat() };
    publish(payload);
    try { await fetch('/__tkresult', { method: 'POST', body: JSON.stringify(payload) }); } catch (e) {}
  })().catch(e => publish({ fail: String(e && e.message || e) }));
}

/* ------------------------------------------------------------------ 注入 / 服务 / Chrome */
function inject(html, probeSrc) {
  const early = '<script>window.__earlyErr=[];'
    + 'addEventListener("error",function(e){__earlyErr.push(String(e.message)+" @"+e.lineno+":"+e.colno)});'
    + 'addEventListener("unhandledrejection",function(e){__earlyErr.push("rej:"+String(e.reason))});</script>';
  const extra = '<script>\n(' + deckProbe.toString() + ')();\n</script>';
  let s = html;
  if (s.includes('</head>')) s = s.replace('</head>', early + '</head>');
  return s.replace('</body>', '<script>\n' + probeSrc + '\n</script>\n' + extra + '\n</body>');
}

function serve(dir, name) {
  return new Promise(resolve => {
    let settle = null;
    const got = new Promise(r => { settle = r; });
    const srv = http.createServer((req, res) => {
      if (req.method === 'POST') {
        let b = '';
        req.on('data', c => b += c);
        req.on('end', () => { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); settle(b); });
        return;
      }
      const p = path.join(dir, decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname));
      fs.readFile(p, (e, buf) => {
        if (e) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(buf);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, got, port: srv.address().port, name }));
  });
}

/* 杀完要等它真的退出：Chrome 还在写 profile 目录时删临时目录会 ENOTEMPTY */
function waitExit(child, ms) {
  return new Promise(r => {
    if (child.exitCode !== null || child.killed) return r();
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch (_) {} r(); }, ms);
    child.once('exit', () => { clearTimeout(t); r(); });
  });
}

async function runRole(entry, hash, profile, timeoutMs) {
  const u = 'http://127.0.0.1:' + entry.port + '/' + encodeURIComponent(entry.name) + '#' + hash;
  const child = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--user-data-dir=' + profile, '--window-size=' + WINDOW, u], { stdio: 'ignore' });
  const t0 = Date.now();
  const body = await Promise.race([
    entry.got,
    new Promise(r => setTimeout(() => r(null), timeoutMs)),
  ]);
  child.kill('SIGTERM');
  await waitExit(child, 5000);
  const ms = Date.now() - t0;
  if (!body) return { fail: '等 ' + Math.round(timeoutMs / 1000) + ' 秒没等到页内结果', ms };
  try { return Object.assign(JSON.parse(body), { ms }); } catch (e) { return { fail: '结果不是 JSON：' + body.slice(0, 200), ms }; }
}

/* ------------------------------------------------------------------ M1 / M2 / M3 报告 */
function reportM1(probe) {
  const v = (probe && probe.v) || {};
  const nat = (probe && probe.nat) || {};
  const [vw, vh] = String((probe && probe.win) || '?x?').split('x').map(Number);
  const keys = Object.keys(v);
  console.log('  M1 溢出 / 底部白空 —— 视口（探针自报）%s×%s；（窗口 %s，外框含 chrome 所以比视口高）',
    vw, vh, WINDOW.replace(',', '×'));
  console.log('  Δ 列：带 zoom 的 main.bottom − 视口高（溢出为正、白空为负）；判据是 §七 #3 的「≤ %d」', JUDGE_1080);
  console.log('  %s %s %s %s %s', pad('视图', 24), pad('bottom', 10), pad('自然bottom', 11), pad('Δ vs 视口', 11), pad('Δ vs 1080', 10));
  const over = [];
  let tight = Infinity, loose = -Infinity;
  for (const k of keys) {
    const b = v[k], d = b - vh, d1080 = b - JUDGE_1080;
    if (d1080 > 0) over.push({ k, d1080 });
    if (d < tight) tight = d;
    if (d > loose) loose = d;
    console.log('  %s %s %s %s %s  %s', pad(k, 24), pad(num(b), 10), pad(nat[k] === undefined ? '—' : num(nat[k]), 11),
      pad(signed(d), 11), pad(signed(d1080), 10), d1080 > 0 ? '✗ 超出 1080' : (d > 0 ? '⚠ 超出视口' : ''));
  }
  if (!keys.length) { console.log('  （没有量到视图）'); return { over: [], n: 0, tight: 0, loose: 0 }; }
  console.log('  视图 %d 个；最小 Δ %s（最紧的那一屏）/ 最大 Δ %s（最空的那一屏）；带 zoom 的 bottom 最大 %s',
    keys.length, signed(tight), signed(loose), num(Math.max(...keys.map(k => v[k]))));
  console.log('  %s', over.length ? '✗ 有视图超出 1080' : '✅ 全部落进 1080');
  return { over, n: keys.length, tight, loose };
}

function reportM2(rows) {
  console.log('  M2 标题间距 —— 讲义页标题 ↔ 该页首个内容块（清掉 zoom 后量；预览时值，不是页面顶边）');
  if (!rows || !rows.length) { console.log('  （这份产物没有讲义页 → 无 M2 可量）'); return { bad: [], n: 0 }; }
  console.log('  %s %s %s %s %s', pad('讲义页', 16), pad('间距 px', 10), pad('页高 px', 10), pad('首块', 14), '页面标题');
  const bad = [];
  for (const r of rows) {
    const g = r.gap;
    const isBad = typeof g !== 'number' || g < M2_BAND[0] || g > M2_BAND[1];
    if (isBad) bad.push(r);
    console.log('  %s %s %s %s %s%s', pad(r.deck + ':' + r.page + '/' + r.pages, 16),
      pad(g === undefined ? '—' : num(g), 10), pad(num(r.h), 10), pad(r.firstCls || '（无内容块）', 14),
      r.title, isBad ? '   ← ⚠ 异常' : '');
  }
  console.log('  讲义页 %d 页；正常带 %d–%dpx（= 外壳 .deck-top 的 padding-bottom 8px + 首块自己的 margin-top）；异常 %d 页',
    rows.length, M2_BAND[0], M2_BAND[1], bad.length);
  console.log('  注：间距偏大来自首块 margin 叠加（.dk-h 9px / kv / cards 的 margin-top），要修的是那个块的 CSS，不是标题。');
  return { bad, n: rows.length };
}

function reportM3(caseKey, headlessApply, wantReal) {
  console.log('  M3 同步风暴 —— 判据 §七 #8：空转 10 秒 applyState ≤5（健康≈3）');
  if (wantReal) {
    console.log('  委托 scripts/safari-counts.py %s（真实 Safari、真实时间、真实双窗口）：', caseKey);
    const r = spawnSync('python3', [path.join(HERE, 'safari-counts.py'), caseKey], { encoding: 'utf8' });
    console.log(String(r.stdout || '(没有输出)').replace(/\s+$/, '').split('\n').map(l => '    ' + l).join('\n'));
    console.log('    退出码 %s%s', r.status, r.status === 0 ? '' : '（stderr：' + String(r.stderr || '').trim().slice(0, 200) + '）');
    return;
  }
  console.log('  ⚠ 这一项本脚本测不了，也不许猜：headless 只开了一个窗口、没有 peer，');
  console.log('    收不到对端快照 —— 而同步风暴本来就是双窗口回环，这里永远量不到它。');
  console.log('    请另跑这条命令（真实 Safari + 真实时间，先 bash scripts/serve-verify.sh 起三对服务）：');
  console.log('        bash scripts/safari-verify.sh open %s && python3 scripts/safari-counts.py %s', caseKey, caseKey);
  console.log('    或让本脚本代跑： node scripts/validate-deck.mjs %s --m3', caseKey);
  console.log('  [仅供参考，不可判据] 本次 headless 单窗口里 applyState 计数 = %s（没有 peer，必然接近 0）',
    headlessApply === undefined ? '—' : headlessApply);
}

function ladderReport(m1) {
  const over = (m1.T.over || []).concat(m1.A.over || []);
  console.log('  阶梯（§八 原话）：1–40px 微调 / 40–90px 局部压 / 90–160px 拆页 / 160px 以上才删内容');
  if (!over.length) {
    console.log('  本份产物没有超过 1080 的视图 —— 不需要动手；若要收紧白空，仍按同一阶梯来（一次只动一档）。');
  } else {
    for (const o of over) console.log('    %s超出 %s px → %s', pad(o.k, 24), num(o.d1080), ladder(o.d1080));
    console.log('    先从小档动起：先试「微调」，够用就停。');
  }
  console.log('  ⚠ 修完复测：**白空变大说明修过头**（内容被压扁/收窄了，投影上反而更空更小）。');
}

/* ------------------------------------------------------------------ 单份产物 */
async function validate(target, opts) {
  const { key, file } = resolveTarget(target);
  console.log('='.repeat(96));
  console.log('%s\n%s', key, file);
  console.log('='.repeat(96));
  if (!fs.existsSync(file)) { console.log('  ✗ 找不到产物：%s', file); return 1; }
  if (!fs.existsSync(CHROME)) { console.log('  ✗ 找不到 Chrome：%s', CHROME); return 1; }
  let fails = 0;

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-validate-'));
  const probeSrc = fs.readFileSync(path.join(HERE, 'probe.js'), 'utf8');
  const html = fs.readFileSync(file, 'utf8');
  const ents = [];
  try {
    for (const role of ['T', 'A']) {
      const dir = path.join(tmp, role);
      fs.mkdirSync(dir);
      const nm = path.basename(file);
      fs.writeFileSync(path.join(dir, nm), inject(html, probeSrc), 'utf8');
      ents.push(await serve(dir, nm));
    }
    const got = {};
    for (const [role, e] of [['T', ents[0]], ['A', ents[1]]]) {
      got[role] = await runRole(e, HASH[role], path.join(tmp, 'prof-' + role), ROLE_TIMEOUT);
    }

    const m1 = {}, m2 = {};
    for (const [role, label] of [['T', '教师端（演讲者模式 #present&probe&fast）'], ['A', '观众屏（#audience&probe&fast）']]) {
      const r = got[role];
      console.log('\n【%s】', label);
      if (!r || r.fail || !r.probe) {
        console.log('  ✗ 页内结果没回来：%s', JSON.stringify(r && (r.fail || r)).slice(0, 300));
        fails++;
        m1[role] = { over: [] }; m2[role] = { bad: [] };
        continue;
      }
      console.log('  （页内 %d ms 回传；探针自报的页内错误 early=%s）', r.ms,
        (r.probe.early && r.probe.early.length) ? r.probe.early.slice(0, 3).join(' | ') : '[]');
      if (r.probe.fail) { console.log('  ✗ 探针自报失败：%s', r.probe.fail); fails++; }
      if ((r.probe.err || 0) > 0 || (r.probe.early || []).length) {
        console.log('  ✗ 页内错误：err=%s early=%s', r.probe.err, JSON.stringify((r.probe.early || []).slice(0, 3)));
        fails++;
      }
      m1[role] = reportM1(r.probe);
      console.log('');
      m2[role] = reportM2(r.m2);
    }

    console.log('\n【M3】');
    reportM3(key, (got.T || {}).probe && got.T.probe.apply, !!opts.m3);

    if (opts.raw) {
      /* 写版式预算（references/layout-budget.md）要用的原始值：缩放 / 讲义页自然高与最大字号 / 素材 */
      console.log('\n【原始探针数据 --raw】');
      for (const [role, label] of [['T', '教师端'], ['A', '观众屏']]) {
        const p = (got[role] || {}).probe || {};
        const vz = [...new Set(Object.values(p.vz || {}))];
        const decks = p.decks || {};
        const pages = Object.keys(decks).filter(k => k.endsWith('h')).sort();
        console.log('  %s：视口 %s；带 zoom 的 bottom %s；自然高 %s–%s', label, p.win || '—',
          JSON.stringify(Object.keys(p.v || {}).map(k => p.v[k])), num(Math.min(...Object.values(p.nat || { 0: 0 }))),
          num(Math.max(...Object.values(p.nat || { 0: 0 }))));
        console.log('    该场缩放（逐视图去重）%s', JSON.stringify(vz));
        console.log('    讲义每页自然高 %s', pages.map(k => k + '=' + decks[k]).join(' '));
        console.log('    讲义每页正文最大字号 %s', pages.map(k => k.replace(/h$/, 'px') + '=' + decks[k.replace(/h$/, 'px')]).join(' '));
        console.log('    照片 n=%s / naturalWidth>0 的 %s / bad=%s；<audio> %s 个 / 播放器盒子 %s；err=%s',
          p.img && p.img.n, p.imgAll, p.img && p.img.bad, p.audio && p.audio.els, p.audio && p.audio.box, p.err);
      }
    }

    console.log('\n【小结】');
    const over = m1.T.over.length + m1.A.over.length;
    fails += over;
    fails += m2.T.bad.length + m2.A.bad.length;
    console.log('  M1 超出 1080 的视图：%d 个 %s', over, over ? '（见下面的阶梯）' : '✅');
    console.log('  M2 间距异常：教师端 %d 页 / 观众屏 %d 页 %s', m2.T.bad.length, m2.A.bad.length,
      (m2.T.bad.length + m2.A.bad.length) ? '（见上表，先看首块的 margin-top）' : '✅');
    console.log('  M3：见上（headless 量不到，必须按上面那条命令另测）');
    console.log('  结论：%s', fails ? '✗ 未过（%d 处）' : '✅ 通过', fails || '');
    console.log('\n【分级修正阶梯 + 复测提醒】');
    ladderReport(m1);
    return fails;
  } finally {
    /* 关服务要连已建立的连接一起断：keep-alive 的 socket 留着会让 node 不退出（跑完挂着不返回） */
    ents.forEach(e => {
      try { if (e.srv.closeAllConnections) e.srv.closeAllConnections(); } catch (_) {}
      try { e.srv.close(); } catch (_) {}
    });
    /* 谁还在写这个临时目录就先收掉（用户抱怨过机器卡）——只清本次 profile 下的那些 */
    const stray = String(spawnSync('pgrep', ['-f', tmp], { encoding: 'utf8' }).stdout || '').trim();
    if (stray) {
      console.log('\n  （清理残留 headless Chrome：%s）', stray.split('\n').join(' '));
      spawnSync('pkill', ['-f', tmp]);
    }
    try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
    catch (e) { console.log('  （临时目录没删干净，可手动删：%s）', tmp); }
  }
}

const args = process.argv.slice(2);
const m3 = args.includes('--m3');
const raw = args.includes('--raw');
const targets = args.filter(a => !a.startsWith('--'));
if (!targets.length) {
  console.error('用法：node scripts/validate-deck.mjs {fce|pet|ket|<课时名>|<产物.html>}... [--m3] [--raw]');
  process.exit(2);
}
let totalFail = 0;
for (const t of targets) {
  totalFail += await validate(t, { m3, raw });
  console.log('');
}
/* 退出码即结论：0 = 全过，1 = 有失败项（自动化 / CI 只认退出码）；
   显式退出：即使还有半开的 socket 也不要让脚本跑完还挂着（上面每个 case 已各自收干净） */
process.exit(totalFail ? 1 : 0);
