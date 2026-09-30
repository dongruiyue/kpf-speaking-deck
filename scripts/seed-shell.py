#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""一次性种子脚本：把 golden/ 里最完善的 FCE 工具「挖空」成 assets/shell.html。

做法：按行号把黄金文件的原文段落原封不动留下来，只把「课时部分」换成注入标记。
这样外壳里那些历次踩坑的修复（handlePingAck 不补发、3 秒兜底、measureWorstScreenH
在正常流里量、computeFitZoom 的 +76 chrome、champAnnounced、dup 上限 2000…）
逐字节活下来，不靠手抄。

跑一次即可。之后 assets/shell.html 就是外壳的唯一可编辑源（直接 Edit），
不要再重跑本脚本（会覆盖）。校验：scripts/check-drift.mjs 比对公共段落逐字节一致。
"""
import io, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GOLD = os.path.join(ROOT, 'golden', 'FCE-Speaking-Part1-2-课堂工具.html')
DST = os.path.join(ROOT, 'assets', 'shell.html')

src = io.open(GOLD, encoding='utf-8').read()
# 行号运算用：L[k] 是第 k+1 行
L = src.split('\n')


import sys
FORCE = '--force' in sys.argv[1:]
if os.path.exists(DST) and not FORCE:
    raise SystemExit(
        'assets/shell.html 已存在。\n'
        '  它是外壳的**唯一可编辑源**，之后所有改动（跨课补类、课时参数注释、TK API 扩展）\n'
        '  都直接改它，不要再跑这个种子脚本 —— 跑了会把这些改动覆盖掉。\n'
        '  确实要从头重生：python3 scripts/seed-shell.py --force（然后必须重跑\n'
        '  scripts/append-extra-classes.py，并复核 check-classes / check-drift / 逐视图底边）')


def check(n, expect):
    got = L[n - 1]
    if expect not in got:
        raise SystemExit('行号漂移：第 %d 行应为 %r，实际 %r' % (n, expect, got[:100]))


# ---------------------------------------------------------------- 新代码块
TK_API = r'''/* ================= 外壳对外 API（模块只能用这些，不许摸内部变量） ================= */
/* 注册表三件套：MODS 模块名 → 模块定义；ACT 同步动作；PARTS 进出快照的模块状态字段 */
const MODS = {};
const ACT = {};
const PARTS = [];
const TK = {
  version: '1.0.0',
  get isAudience() { return isAudience; },
  go: (id) => doGo(id, true),
  mod: (id, view) => doMod(id, view, true),
  deck: (id, page) => doDeck(id, page, true),
  score: (step, team, n) => addScore(step, team, n, true),
  totals: () => totals(),
  get ledger() { return ledger; },
  broadcast: (msg) => send(msg),
  renderFrameBar: (id) => renderFrameBar(id),
  get deckState() { return deckState; },
  get sfx() { return sfx; },
  get ICONS() { return ICONS; },
  img: (key) => IMG[key] || '',
  on: (name, fn) => { ACT[name] = fn; },
  snapshotPart: (key, get) => TK._part(key).get = get,
  applyPart: (key, fn) => TK._part(key).apply = fn,
  _part: (key) => PARTS.find(p => p.key === key) ||
    (PARTS.push({ key, get: null, apply: null }), PARTS[PARTS.length - 1]),
  registerModule: (name, def) => { MODS[name] = def; return def; },
  get modules() { return MODS; },
  recipeCard: (k) => recipeCard(k),
  deckQuiet: (id, page) => doDeck(id, page, false),
  /* —— 下面是 §四 清单里没写、但三份现有工具确实在用的能力（见 references/pitfalls.md 的 API 缺口清单） —— */
  timer: (sec, auto) => doTimer(sec, auto, true),
  celebrate: () => celebrate(),
  rnd: (a) => rnd(a),
  beep: (freq, dur, type, vol) => beep(freq, dur, type, vol),
  storage: { get: k => store.get(KEY(k)), set: (k, v) => store.set(KEY(k), v) },
  step: (id) => LESSON.steps.find(s => s.id === id),
  el: (id) => document.getElementById(id),
  $: (sel, root) => (root || document).querySelector(sel),
  $$: (sel, root) => Array.from((root || document).querySelectorAll(sel)),
  /* .stepcard 一行 = 标题 + 句架 + 打勾，draw-question / photo-pair-steps 共用 */
  stepRow: (badge, no, title, cn, frames, attr, i) => `
    <div class="st-row">
      <div class="st-head">
        ${badge ? `<span class="st-badge">${badge}</span>` : ''}
        <span class="st-t">${no} ${title}</span>
        ${cn ? `<span class="st-cn">${cn}</span>` : ''}
        <button class="check-item" ${attr}="${i}" title="这一步做到了就点一下">打勾</button>
      </div>
      ${(frames || []).map(row => `<div class="st-frames">${row.map(x => `<span class="scf-i">${x}</span>`).join('')}</div>`).join('')}
    </div>`,
};
window.TK = TK;'''

DERIVED = r'''/* ================= 课时派生量（只从这里读 LESSON，外壳不认识具体哪节课） ================= */
const STEPS = LESSON.steps;
const FRAME_BAR = LESSON.frames || {};
const RECIPE = LESSON.recipe || {};
/* 有 practice 的环节才显示「讲解 / 练习」双视图（原来用 PART_LESSON 判断） */
const PART_LESSON = {};
STEPS.forEach(s => { if (s.practice) PART_LESSON[s.id] = s.practice; });
const DECK_PAGES = {};
STEPS.forEach(s => { if (s.lesson) DECK_PAGES[s.id] = s.lesson; });
const TD = MODS['teach-deck'];   // 讲义分页模块：负责「框」里的页体
const recipeCard = k => {
  const r = RECIPE[k];
  if (!r) return '';
  return `<div class="recipe" data-recipe="${k}">
      <span class="recipe-badge">${r.badge}</span>
      <ol class="recipe-list">${r.items.map(x => `<li>${x}</li>`).join('')}</ol>
    </div>`;
};'''

REFCTL = r'''/* ================= 参考抽屉 ================= */
let refOpen = false, refTab = LESSON.ref.tabs[0].id;
const refBody = document.getElementById('refBody');
function renderRefBody() { refBody.innerHTML = LESSON.ref.body[refTab] || ''; }
function doRef(open, tab, broadcast) {
  refOpen = open;
  if (tab) refTab = tab;
  document.getElementById('refDrawer').classList.toggle('on', refOpen);
  document.body.classList.toggle('ref-open', refOpen);
  if (document.body.classList.contains('presenting')) setTimeout(() => fitLeft(!refOpen), 60);
  document.querySelectorAll('#refDrawer .tab').forEach(b => b.classList.toggle('cur', b.dataset.rtab === refTab));
  renderRefBody();
  if (!isAudience) sfx.click();
  if (broadcast) send({t:'ref', open: refOpen, tab: refTab});
}
document.getElementById('refBtn').innerHTML = ICONS.book;
document.getElementById('refBtn').onclick = () => doRef(!refOpen, refTab, true);
document.getElementById('refClose').onclick = () => doRef(false, refTab, true);'''

DECK_RENDER = r'''const DK_NUM = ['①','②','③','④','⑤'];
/* 讲义页的「块 → DOM」渲染由 modules/teach-deck.js 提供（§三 的 block 词汇表）；
   外壳只保留分页机制 deckState / doDeck / lessonDeckHTML（§二）。 */
const lessonDeckHTML = id => {
  const pages = DECK_PAGES[id];
  if (!pages) return '';
  return `<div class="lesson-deck" id="deck-${id}">
    <div class="deck-top">
      <div class="deck-title"></div>
      <span class="deck-ind"></span>
    </div>
    <div class="deck-body">
      ${pages.map((p, i) => `<div class="deck-page${i === 0 ? ' on' : ''}" data-title="${p.title}"></div>`).join('')}
    </div>
    <div class="deck-foot">
      <button class="ghost-btn deck-nav deck-prev" data-deck="${id}:-1">← 上一页</button>
      <span class="deck-ind-b"></span>
      <button class="ghost-btn deck-nav deck-next" data-deck="${id}:1">下一页 →</button>
    </div>
  </div>`;
};'''

DECK_DODEK = None  # 取自黄金 1154..1179

SCREENS_RUN = r'''STEPS.forEach(s => main.insertAdjacentHTML('beforeend', stepScreenHTML(s)));
Object.keys(DECK_PAGES).forEach(id => doDeck(id, 0, false));   // 讲义默认停在第 1 页，同时把标题 / 页码 / 按钮禁用态画好
Object.keys(DECK_PAGES).forEach(id => TD && TD.mount(document.getElementById('deck-' + id), TK.step(id)));'''

SCREENS = r'''/* ================= 生成环节页（每个 Part = 讲解 + 练习 两个视图） ================= */
/* 课时的顶部文案与参考抽屉 tab 都由数据生成，外壳里不留任何一节课的文字 */
document.getElementById('hdTitle').textContent = K.title;
document.getElementById('hdSub').innerHTML = K.subtitle;
document.getElementById('dashTitle').innerHTML = K.dashTitle;
document.getElementById('dashSub').innerHTML = K.dashSub;
document.title = K.docTitle;
document.querySelector('#refDrawer .rd-head').insertAdjacentHTML('afterbegin',
  LESSON.ref.tabs.map(t => `<button class="tab" data-rtab="${t.id}">${t.label}</button>`).join(''));
document.querySelectorAll('#refDrawer .tab').forEach(b => b.onclick = () => doRef(true, b.dataset.rtab, true));

const main = document.querySelector('main');
const stepScreenHTML = s => `
<section class="screen" id="s-${s.id}">
  <div class="topline">
    <button class="back-btn teacher-only" data-go="home">← 返回</button>
    <h2>${s.n}. ${s.label}</h2>
    <span class="badge like">${s.kind}</span>
  </div>
  <details class="teacher-tip teacher-only"><summary></summary><div class="tip-body">${s.tip}</div></details>
  ${PART_LESSON[s.id] ? `
  <div class="mod-tabs">
    <button class="mod-tab cur" data-mod="${s.id}" data-v="teach">① 讲解 Strategy</button>
    <button class="mod-tab" data-mod="${s.id}" data-v="prac">② 练习 Practice</button>
  </div>
  <div class="mod-view on" id="teach-${s.id}">
    ${lessonDeckHTML(s.id)}
    <div class="teach-foot teacher-only">
      <span class="hint">${K.deckHint}</span>
      <button class="ghost-btn" data-modto="${s.id}:prac">进入练习 Practice →</button>
    </div>
  </div>
  <div class="mod-view" id="prac-${s.id}">
    <div class="stage" id="stage-${s.id}"></div>
    <div class="teach-foot teacher-only">
      <span class="hint">${K.pracHint}</span>
      <button class="ghost-btn" data-modto="${s.id}:teach">↺ 回到讲解 Strategy</button>
    </div>
  </div>` : `
  <div class="stage" id="stage-${s.id}">${lessonDeckHTML(s.id)}</div>`}
</section>`;'''

MODSWITCH = r'''/* ================= 讲解 / 练习 视图切换 + 底部句架栏 ================= */
const modState = {};
STEPS.forEach(s => { if (PART_LESSON[s.id]) modState[s.id] = 'teach'; });
function doMod(id, v, broadcast) {
  if (modState[id] === undefined) return;
  modState[id] = v;
  const t = document.getElementById('teach-' + id), p = document.getElementById('prac-' + id);
  if (t) t.classList.toggle('on', v === 'teach');
  if (p) p.classList.toggle('on', v === 'prac');
  document.querySelectorAll(`.mod-tab[data-mod="${id}"]`).forEach(b => b.classList.toggle('cur', b.dataset.v === v));
  if (!isAudience) sfx.click();
  if (document.body.classList.contains('presenting')) setTimeout(fitLeft, 60);
  updateConsole();
  if (broadcast) send({t:'mod', id, v});
}
document.addEventListener('click', e => {
  if (!e.target.closest) return;
  const t = e.target.closest('.mod-tab');
  if (t) { doMod(t.dataset.mod, t.dataset.v, true); return; }
  const f = e.target.closest('[data-modto]');
  if (f) { const [id, v] = f.dataset.modto.split(':'); doMod(id, v, true); }
});
document.getElementById('cMod').onclick = () => {
  if (modState[cur] === undefined) return;
  doMod(cur, modState[cur] === 'teach' ? 'prac' : 'teach', true);
};
function renderFrameBar(id) {
  const el = document.getElementById('frameBar');
  if (!el) return;
  const fb = LESSON.frameNote || {};
  const def = LESSON.frameDefault || Object.keys(FRAME_BAR)[0];
  const items = FRAME_BAR[id] || FRAME_BAR[def] || [];
  el.innerHTML = items.map(x => `<span class="fb-item">${x}</span>`).join('')
    + `<span class="fb-cn">${PART_LESSON[id] ? fb.mod : fb.general}</span>`;
}
renderFrameBar('home');'''

MOUNT = r'''/* ================= 挂载环节的练习模块（模块自己按契约三件套注册过） ================= */
STEPS.forEach(s => {
  if (!s.practice) return;
  const def = MODS[s.practice.type];
  if (!def) { console.warn('[TK] 没找到模块：' + s.practice.type); return; }
  const stage = document.getElementById('stage-' + s.id);
  const st = def.init ? def.init(s, s.practice) : {};
  def.mount && def.mount(stage, s, s.practice);
  def.render && def.render(st, stage);
});'''

SNAPSHOT = r'''/* ================= 状态快照与重放（模块状态走注册表） ================= */
function snapshot() {
  const m = {
    t:'state', id: cur, ledger, mod: { ...modState }, deck: { ...deckState }, champ: champAnnounced,
    ref: {open: refOpen, tab: refTab},
    timer: timerState(),
  };
  PARTS.forEach(p => { if (p.get) m[p.key] = p.get(); });
  return m;
}
function applyState(m) {
  ledger = m.ledger || ledger; renderScore();
  doGo(m.id || 'home', false);
  if (m.mod) Object.keys(m.mod).forEach(k => doMod(k, m.mod[k], false));
  if (m.deck) Object.keys(m.deck).forEach(k => doDeck(k, m.deck[k], false));
  PARTS.forEach(p => { if (p.apply && m[p.key] !== undefined) p.apply(m[p.key]); });
  applyTimer(m.timer);
  if (m.ref && (m.ref.open !== refOpen || m.ref.tab !== refTab)) doRef(m.ref.open, m.ref.tab, false);
  if (m.champ !== undefined) champAnnounced = !!m.champ;
  if (cur === 'champion') renderChampion();
}
function setLedger(l) { ledger = l || ledger; renderScore(); if (cur === 'champion') renderChampion(); }'''

ACT_REGISTRY = r'''/* 同步动作注册表：外壳的通用动作 + 模块用 TK.on() 注册的动作（ACT 已声明在外壳顶部） */
Object.assign(ACT, {
  go: m => doGo(m.id, false),
  score: m => setLedger(m.ledger),
  mod: m => doMod(m.id, m.v, false),
  deck: m => TD ? TD.actions.deck(m) : doDeck(m.id, m.i, false),
  timer: m => doTimer(m.sec, m.auto, false),
  timerCtl: m => {
    if (m.act === 'start') startTick();
    else if (m.act === 'pause') stopTick();
    else if (m.act === 'reset') { stopTick(); tLeft = m.total || tTotal; tRender(); }
    else if (m.act === 'preset') { tTotal = m.total; tLeft = m.left; stopTick(); tRender(); }
    else if (m.act === 'min') overlay.style.display = 'none';
  },
  timerClose: () => closeTimer(false),
  champGo: () => doChampGo(false),
  ref: m => doRef(m.open, m.tab, false),
  bye: () => document.body.classList.add('bye'),
  state: m => applyState(m),
});'''

# ---------------------------------------------------------------- 逐处外科手术
# (起, 止, 替换)。行号是 golden 原始的 1-based 闭区间；从后往前应用。
CUTS = []

# 1) <title>
check(6, '<title>')
CUTS.append((6, 6, '<title>__LESSON_TITLE__</title>'))

# 2) </style> 之前插入课时 CSS 注入点
check(471, 'photo-pair .ph-tag')
CUTS.append((471, 471, L[470] + '\n\n/*==LESSON_CSS==*/'))

# 3) header（标题 / 副标题改 id，其余逐字保留）
check(476, '<header>'); check(477, 'teacher-only'); check(491, '</div>')
CUTS.append((476, 492, '''<header>
  <div class="teacher-only">
    <h1 id="hdTitle"></h1>
    <div class="sub" id="hdSub"></div>
  </div>
''' + '\n'.join(L[480:491]) + '\n</header>'))

# 4) 主页（文案由 meta 生成）+ 课时 HTML 注入点
check(496, '<main>'); check(497, 's-home'); check(501, '</section>')
CUTS.append((496, 502, '''<main>
<section class="screen on" id="s-home">
  <div class="dash-title" id="dashTitle"></div>
  <div class="dash-sub teacher-only" id="dashSub"></div>
  <div class="menu" id="menu"></div>
</section>
<!--==LESSON_HTML==-->
</main>'''))

# 5) 参考抽屉（tab 由 LESSON.ref.tabs 生成）
check(531, 'refDrawer'); check(538, '</div>')
CUTS.append((531, 538, '''<div id="refDrawer">
  <div class="rd-head">
    <button class="rd-close teacher-only" id="refClose">✕</button>
  </div>
  <div class="rd-body" id="refBody"></div>
</div>'''))

# 6) 句架栏首屏内容由 renderFrameBar 生成
check(540, 'frameBar')
CUTS.append((540, 544, '<div id="frameBar"></div>'))

# 7) <script> 顶部：TK API + 注入点 + 派生量
check(575, '<script>')
CUTS.append((575, 575, '<script>\n' + TK_API + '\n\n/*==MODULES==*/\n\n/*==LESSON_DATA==*/\n'))

# 8) IMG
check(633, '课件原图')
CUTS.append((633, 643, 'const IMG = LESSON.img || {};'))

# 9) 课时数据段整段挖空（内容搬进 lessons/*.js）
check(645, '数据（FCE'); check(940, '];')
CUTS.append((645, 940, DERIVED))

# 10) 参考抽屉：1001–1003 的变量声明与正文一起换掉（正文搬进 lesson 的 ref.body）
check(1001, '参考抽屉'); check(1003, 'refBody')
CUTS.append((1001, 1003, ''))
check(1004, 'REF_FRAMES_HTML'); check(1013, 'credit')
CUTS.append((1004, 1013, '/* 抽屉正文由 LESSON.ref.body 提供 */'))
check(1014, 'function refVocabHTML'); check(1048, '}')
CUTS.append((1014, 1048, ''))
check(1049, 'function renderRefBody'); check(1060, '}')
CUTS.append((1049, 1060, REFCTL))
check(1061, 'refBtn'); check(1064, 'refDrawer .tab')
CUTS.append((1061, 1064, ''))

# 11) 生成环节页：讲义渲染 + 环节页骨架
check(1066, '生成环节页'); check(1067, 'const main')
CUTS.append((1066, 1067, SCREENS + '\n'))

# 12) 讲义：DK_NUM…lessonDeckHTML 全部换成外壳渲染器（黄金 1154..1179 的 deckState/doDeck 原样接回）
check(1070, 'const DK_NUM'); check(1153, '};')
CUTS.append((1070, 1153, DECK_RENDER))
check(1154, 'const deckState')
CUTS.append((1154, 1179, '\n'.join(L[1153:1179])))

# 13) 环节页骨架的调用点（stepScreenHTML 已在上面定义好；这里生成 + 初始化讲义）
check(1180, 'const stepScreenHTML'); check(1208, '</section>`;')
CUTS.append((1180, 1211, SCREENS_RUN))

# 14) 默认台账从 lesson 派生
check(1243, 'let ledger'); check(1245, '};')
CUTS.append((1243, 1245, '''const LEDGER0 = () => Object.fromEntries(
  LESSON.steps.filter(s => s.practice).map(s => [s.id, {A:0, B:0}]));
let ledger = JSON.parse(store.get(KEY('_ledger')) || 'null') || LEDGER0();'''))

# 15) p1 / p2 练习模块（搬进 modules/），并在原位置挂载模块
check(1316, '1 Part 1 问答'); check(1415, 'renderP1();')
CUTS.append((1316, 1415, MOUNT))

# 16) 讲解 / 练习切换 + 句架栏
check(1417, '讲解 / 练习 视图切换'); check(1450, "renderFrameBar('home');")
CUTS.append((1417, 1450, MODSWITCH))

# 17) p2 练习模块
check(1452, 'Part 2 长发言'); check(1548, 'renderP2();')
CUTS.append((1452, 1548, ''))

# 18) 冠军页清零：台账形状从 lesson 派生
check(1584, 'ledger = {p1:')
CUTS.append((1584, 1584, '    ledger = LEDGER0();'))

# 19) 自检弹窗 / 控制台主页文案：从 meta 取
check(1715, 'cCheck'); check(1725, '};')
CUTS.append((1715, 1725, '''document.getElementById('cCheck').onclick = () => {
  const imgs = [...document.images];
  const bad = imgs.filter(i => !i.complete || !i.naturalWidth).length;
  alert([
    '观众窗口：' + (audWin && !audWin.closed ? '已打开' : '未打开（Safari 会拦截延迟弹窗，请点「重新打开观众屏」）'),
    '广播通道 BroadcastChannel：' + (bc ? '可用' : '不可用'),
    '存储通道 localStorage：' + (store.ok ? '可用' : '不可用 —— Safari 在 file:// 下会禁用，请双击同目录的「' + K.launcher + '」走 http 打开'),
    '图片：' + (bad ? bad + ' 张未加载' : '全部已加载（' + K.imgNote + '）'),
    '当前环节：' + cur,
  ].join('\\n'));
};'''))

check(1743, 'cTip')
CUTS.append((1743, 1743, "  document.getElementById('cTip').innerHTML = s ? s.tip : K.homeTip;"))
check(1744, 'cTalk'); check(1746, 'talk-cn')
CUTS.append((1744, 1746, '''  document.getElementById('cTalk').innerHTML = s
    ? '<b>说什么 Say this:</b>' + s.talk.map(t => `<div class="talk-line"><span class="talk-en">${t.en}</span><span class="talk-cn">${t.cn}</span></div>`).join('')
    : '<b>说什么 Say this:</b><div class="talk-line"><span class="talk-en">' + K.homeTalkEn + '</span><span class="talk-cn">' + K.homeTalkCn + '</span></div>';'''))

# 20) 快照 / 重放 / ACT 注册表
check(1884, '状态快照与重放'); check(1906, 'function setLedger')
CUTS.append((1884, 1906, SNAPSHOT))
check(1930, 'const ACT'); check(1950, '};')
CUTS.append((1930, 1950, ACT_REGISTRY))

# 21) 观众屏适配签名：模块状态走注册表
check(1851, 'const sig =')
CUTS.append((1851, 1851, "  const sig = JSON.stringify([cur, Object.values(modState).join(''), deckState, PARTS.map(p => p.get && p.get()), refOpen, refTab]);"))

CUTS.sort(key=lambda c: -c[0])
for a, b, rep in CUTS:
    L[a - 1:b] = rep.split('\n')

html = '\n'.join(L)

# ---------------------------------------------------------------- 键名参数化
pairs = [
    ("new BroadcastChannel('fce2-class-v1')", 'new BroadcastChannel(CHAN)'),
    ("store.set('fce2-msg'", "store.set(KEY('-msg')"),
    ("store.set('fce2-aud'", "store.set(KEY('-aud')"),
    ("store.get('fce2-aud')", "store.get(KEY('-aud'))"),
    ("store.get('fce2-msg')", "store.get(KEY('-msg'))"),
    ("store.get('fce2_zoom')", "store.get(KEY('_zoom'))"),
    ("store.set('fce2_zoom'", "store.set(KEY('_zoom')"),
    ("store.set('fce2_ledger'", "store.set(KEY('_ledger')"),
    ("store.get('fce2_sound')", "store.get(KEY('_sound'))"),
    ("store.set('fce2_sound'", "store.set(KEY('_sound')"),
    ("'fce2_audience'", "KEY('_audience')"),
    ("e.key === 'fce2-msg'", "e.key === KEY('-msg')"),
    ("e.key === 'fce2-aud'", "e.key === KEY('-aud')"),
    # 课时参数（频道 / 键前缀）由 meta 提供，必须在使用之前声明
    ("const isAudience = location.hash.includes('audience');",
     "// 课时参数：外壳不认识具体哪节课，只认 LESSON.meta 这几个字段\n"
     "const K = LESSON.meta;\nconst KEY = n => K.keyPrefix + n;\nconst CHAN = K.channel;\n"
     "const isAudience = location.hash.includes('audience');"),
]
for a, b in pairs:
    if a not in html:
        raise SystemExit('参数化失败，找不到：%r' % a)
    html = html.replace(a, b)

left = [l for l in html.split('\n') if 'fce2' in l or 'FCE 模考班 D1+D2' in l]
if left:
    raise SystemExit('还有未参数化的课时专有串：\n' + '\n'.join(x[:120] for x in left[:12]))

io.open(DST, 'w', encoding='utf-8').write(html)
print('写出 %s：%d 行 / %d 字节' % (DST, html.count('\n'), len(html.encode('utf-8'))))
