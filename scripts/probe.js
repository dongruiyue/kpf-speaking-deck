/* scripts/probe.js —— 只读验收探针（三份产物通用；由 scripts/serve-verify.sh 追加到被服务的副本上）
 *
 * 为什么需要它：浏览器的元素快照不给几何数值，页内变量也从外部读不到。
 * 做法：结果同时写 document.title 和 fixed 的 <pre id="tkprobe">，用 tab.get_state /
 *       DOM 文本快照读。它只读几何与计数器，只写这两个地方 —— 不改变任何布局。
 *
 * 两种角色（同一份文件，靠 hash 分流）：
 *   #present&probe  教师端（演讲者模式）   #audience&probe  观众屏
 * 两个角色都自己走遍视图：教师走 fitLeft，观众走 scheduleAudFit
 *（这正是它收到同步消息时走的那条路径），所以量到的就是「翻到这一屏时投影上的真实底边」。
 *
 * 收集项 → shell-boundary.md 第七节：
 *   nat   每视图的自然高度（清掉 main 与 root 的 zoom 再量 bottom）—— 第 12 条的判据
 *   v     每视图带 zoom 的 bottom（第 3 条：必须 ≤1080）
 *   vlr   观众屏每视图的 left / right（第 4 条）
 *   decks 讲义每页自然高 + 正文 computed 字号（第 5 条）
 *   img   照片张数 / naturalWidth 为 0 的张数（第 6 条）
 *   err + early   错误计数（第 7 条）
 *   apply / beep  空转 10 秒内的调用次数（第 8 / 9 条）
 *   to    .teacher-only 总数 / 实际不可见的数量（第 10 条，观众屏要 100%）
 *   score 计分链路：+1 → 顶栏 → 撤销回 0 → 冠军表与顶栏一致（第 11 条）
 *   audio 播放器相关：<audio> 个数、播放器盒子是否存在（KET 用）
 *   inter 练习页交互点击次数（第 7 条的「走完全部交互」）
 */
(function () {
  if (!location.hash.includes('probe')) return;
  const isAud = location.hash.includes('audience');
  /* LESSON 是外壳里的 const，外部拿不到 —— 环节 id 从步骤条 DOM 读 */
  const STEP_IDS = () => Array.from(document.querySelectorAll('.step')).map(b => b.dataset.id);
  const FAST = location.hash.includes('fast');
  const NOSWEEP = location.hash.includes('nosweep');
  const mainEl = document.querySelector('main');
  const gv = id => document.getElementById(id);
  const num = x => Math.round(x * 100) / 100;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- 计数器：包一层，不改逻辑 ---------- */
  const C = { err: 0, beep: 0, apply: 0 };
  window.addEventListener('error', () => { C.err++; });
  window.addEventListener('unhandledrejection', () => { C.err++; });
  /* FREEZE：空转 10 秒（第 8 条）测完之后，另一个标签页还在发快照的话会把本页拽回它的环节，
     每视图量到的就不是这一屏了。冻结的只是「远端状态套用」，已记录的计数不受影响。 */
  let FREEZE = false;
  if (typeof window.applyState === 'function') {
    const f = window.applyState;
    window.applyState = function () { C.apply++; if (FREEZE) return; return f.apply(this, arguments); };
  }
  if (typeof window.beep === 'function') {
    const f = window.beep;
    window.beep = function () { C.beep++; return f.apply(this, arguments); };
  }

  /* ---------- 发布（双通道） ---------- */
  let RES = { role: isAud ? 'A' : 'T' };
  function publish() {
    const txt = 'TKPROBE ' + JSON.stringify(RES);
    document.title = txt;
    let pre = gv('tkprobe');
    if (!pre) {
      pre = document.createElement('pre');
      pre.id = 'tkprobe';
      pre.style.cssText = 'position:fixed;left:0;bottom:0;z-index:99999;background:#fff;color:#000;'
        + 'font:9px/1.05 monospace;max-height:34px;overflow:hidden;margin:0;padding:2px;';
      document.body.appendChild(pre);
    }
    pre.textContent = txt;
  }
  publish();

  /* ---------- 量几何 ---------- */
  /* golden KET 的观众屏缩放在 documentElement 上，新外壳在 main 上 —— 两处都要清才算自然高度 */
  function measure() {
    const r = mainEl.getBoundingClientRect();
    return { b: num(r.bottom), l: num(r.left), r: num(r.right), w: num(r.width) };
  }
  /* 自然几何：演讲者模式下 header / .steps / main 三块都带 zoom（见外壳 leftEls()），
     只清 main 的话 main 的 top 仍随缩放变化 → 量出来的「自然高度」不自然。
     三块 + 根元素一起清，量完逐个还原。 */
  function measureNatural() {
    const els = [mainEl, document.querySelector('header'), document.querySelector('.steps')].filter(Boolean);
    const saved = els.map(e => e.style.zoom);
    const rz = document.documentElement.style.zoom;
    els.forEach(e => { e.style.zoom = ''; });
    document.documentElement.style.zoom = '';
    const b = measure().b;
    els.forEach((e, i) => { e.style.zoom = saved[i]; });
    document.documentElement.style.zoom = rz;
    return b;
  }
  const curZoom = () => num(parseFloat(mainEl.style.zoom) || parseFloat(document.documentElement.style.zoom) || 1);

  function viewKey() {
    const sc = document.querySelector('.screen.on');
    if (!sc) return 'none';
    const id = sc.id.replace(/^s-/, '');
    const mv = sc.querySelector('.mod-view.on');
    const pg = (mv || sc).querySelector('.deck-page.on');
    const idx = pg ? Array.from(pg.parentNode.children).indexOf(pg) + 1 : 0;
    return id + '|' + (mv ? (mv.id.startsWith('teach') ? 'teach' : 'prac') : '') + '|' + idx;
  }
  function imgStat() {
    const im = Array.from(document.images);
    return { n: im.length, bad: im.filter(i => !i.naturalWidth).length };
  }
  /* .teacher-only 要的是「实际看不见」（子元素藏在 display:none 祖先里时，
     getComputedStyle(child).display 仍是它自己的值）——所以用 checkVisibility。 */
  function toStat() {
    const all = Array.from(document.querySelectorAll('.teacher-only'));
    return {
      n: all.length,
      hid: all.filter(e => e.checkVisibility ? !e.checkVisibility() : getComputedStyle(e).display === 'none').length,
      aud: document.body.classList.contains('audience'),
    };
  }

  /* 讲义每页：清 zoom、强制可见（祖先 screen / mod-view 也要展开）再量自然高与正文字号 */
  function deckStat() {
    const z1 = mainEl.style.zoom, z2 = document.documentElement.style.zoom;
    mainEl.style.zoom = ''; document.documentElement.style.zoom = '';
    const out = {};
    document.querySelectorAll('.lesson-deck').forEach(root => {
      const chain = [root.closest('.screen'), root.closest('.mod-view')].filter(Boolean);
      const saved = chain.map(e => e.classList.contains('on'));
      chain.forEach(e => e.classList.add('on'));
      root.querySelectorAll('.deck-page').forEach((p, i) => {
        const key = root.id.replace(/^deck-/, '') + ':' + (i + 1);
        const wasOn = p.classList.contains('on');
        p.classList.add('on');
        out[key + 'h'] = Math.round(p.getBoundingClientRect().height);
        const cand = p.querySelectorAll('.dk-i,.dk-mA,.dk-do,.deck-tips-list li,.deck-keytips .dk-te,'
          + '.ov-q,.ov-list li,.deck-steps .dk-do,.deck-time span,.dk-cn,.teach-list li,.lg-i,.sample-a');
        let mx = 0;
        cand.forEach(b => { mx = Math.max(mx, parseFloat(getComputedStyle(b).fontSize) || 0); });
        out[key + 'px'] = num(mx);
        if (!wasOn) p.classList.remove('on');
      });
      chain.forEach((e, i) => { if (!saved[i]) e.classList.remove('on'); });
    });
    mainEl.style.zoom = z1; document.documentElement.style.zoom = z2;
    return out;
  }

  /* ---------- 计分链路（第 11 条，三节课通用）----------
     挑一个「有 .score-team 加分按钮」的环节：清零 → 点该组 +1 → 顶栏 +1 → 冠军表一致 → 撤销回 0 */
  function scoreChain() {
    const top = () => gv('sbA').textContent + ':' + gv('sbB').textContent;
    doGo('champion', false);
    const rz = gv('champReset'); if (rz) rz.click();
    const res = { zero: top() };
    const steps = STEP_IDS();
    let used = null;
    for (const id of steps) {
      doGo(id, false);
      let btn = document.querySelector('.screen.on .score-team button.a');
      /* 没有独立加分按钮的环节（如 draw-question 的打勾卡）：先抽一题，再点一张打勾卡，
         同样能走通「+1 → 顶栏变 → 撤销回 0」这条链路 */
      if (!btn) {
        const draw = document.querySelector('.screen.on .mega-btn');
        if (draw) draw.click();
        btn = document.querySelector('.screen.on .stepcard button:not([disabled])');
      }
      if (btn) { btn.click(); used = id; break; }
    }
    res.step = used;
    res.skip = !used;               // 整节课没有可点的计分按钮 → 第 11 条不适用，不算失败
    res.plus = top();
    doGo('champion', false);
    res.table = Array.from(document.querySelectorAll('.score-table tr'))
      .map(tr => Array.from(tr.children).map(td => td.textContent.trim()).join('/')).join(' + ');
    if (used) {
      Array.from(document.querySelectorAll('[data-minus]'))
        .filter(b => b.dataset.minus.startsWith(used + ':'))
        .forEach(b => { for (let i = 0; i < 9; i++) b.click(); });
    }
    res.undo = top();
    return res;
  }

  /* ---------- 练习页交互（第 7 条：走完全部交互，看有没有报错）---------- */
  async function interact() {
    let clicks = 0;
    for (const id of STEP_IDS()) {
      doGo(id, false);
      const views = Array.from(document.querySelectorAll('.screen.on .mod-view'));
      const targets = views.length ? views : [document.querySelector('.screen.on')];
      for (const v of targets) {
        if (!v) continue;
        const stage = v.querySelector('.stage') || v;
        const btns = Array.from(stage.querySelectorAll('button'))
          .filter(b => !/timer|Timer/.test(b.id))            // 避开会盖住整屏的计时器
          .slice(0, 10);
        for (const b of btns) { try { b.click(); clicks++; } catch (e) {} }
        await wait(120);                                  // 每个视图只等一次（后台标签页会被限流到 ~1s）
      }
      const tc = gv('tClose'); if (tc && getComputedStyle(gv('timerOverlay')).display !== 'none') tc.click();
    }
    doGo('home', false);
    return clicks;
  }

  /* ---------- 走遍所有视图 ---------- */
  function viewList() {
    const views = [];
    document.querySelectorAll('.screen').forEach(sc => {
      const id = sc.id.replace(/^s-/, '');
      const mods = Array.from(sc.querySelectorAll('.mod-view'));
      if (mods.length) {
        mods.forEach(mv => {
          const v = mv.id.startsWith('teach') ? 'teach' : 'prac';
          const pages = mv.querySelectorAll('.deck-page').length || 1;
          for (let p = 1; p <= pages; p++) views.push({ id, v, p, pages });
        });
      } else {
        const pages = sc.querySelectorAll('.deck-page').length || 1;
        for (let p = 1; p <= pages; p++) views.push({ id, v: null, p, pages });
      }
    });
    return views;
  }

  (async function run() {
    await wait(1200);
    const a0 = C.apply;
    await wait(FAST ? 100 : 10000);                          // 第 8 / 9 条：空转 10 秒
    RES.apply = C.apply - a0; RES.beep = C.beep; RES.err = C.err;
    RES.to = toStat(); RES.win = innerWidth + 'x' + innerHeight;
    RES.early = (window.__earlyErr || []).slice(0, 6);
    RES.audio = { els: document.querySelectorAll('audio').length, box: !!gv('toolAudio') };
    RES.shell = {
      present: document.body.classList.contains('presenting'),
      aud: document.body.classList.contains('audience'),
      screens: document.querySelectorAll('.screen').length,
      deckPages: document.querySelectorAll('.deck-page').length,
    };
    FREEZE = true;
    publish();

    const v = {}, lr = {}, nat = {}, zz = {};
    for (const it of (NOSWEEP ? [] : viewList())) {
      doGo(it.id, false);
      if (it.v) doMod(it.id, it.v, false);
      if (it.pages > 1) doDeck(it.id, it.p - 1, false);
      if (isAud && typeof scheduleAudFit === 'function') scheduleAudFit(0, true);
      await wait(isAud ? 750 : 320);
      const k = it.id + '|' + (it.v || '') + '|' + it.p;
      const m = measure();
      v[k] = m.b; lr[k] = [m.l, m.r]; nat[k] = measureNatural(); zz[k] = curZoom();
      RES.v = v; RES.vlr = lr; RES.nat = nat; RES.vz = zz; publish();
    }

    RES.mwsh = (typeof window.measureWorstScreenH === 'function') ? window.measureWorstScreenH() : null;
    RES.decks = deckStat();
    if (!NOSWEEP) RES.inter = await interact();
    RES.img = imgStat();                                   // 交互之后再量：练习页的素材这时才在 DOM 里
    RES.imgAll = Array.from(document.images).map(i => i.naturalWidth).filter(w => w > 0).length;
    if (!isAud) RES.score = scoreChain();
    doGo('home', false);
    RES.done = true;
    publish();
  })().catch(e => { RES.fail = String(e && e.message || e); publish(); });
})();
