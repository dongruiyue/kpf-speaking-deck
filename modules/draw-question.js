/* modules/draw-question.js —— 「抽题快答」
 *
 * 三份文件里同构的两处合并成一份（差异见 references/pitfalls.md）：
 *   layout:'checks'  FCE Part 1 —— 抽题 + 三招打勾（用上哪招该组 +1；三块全中两组各 +1）+ 换手 / 重来
 *   layout:'plain'   PET Part 1 —— 抽题（Phase 1 基本信息 / Phase 2 拓展回答）+ 拓展三法计分按钮 + 计时按钮
 *
 * 契约三件套：render / actions / snapshot / init（+ mount 挂载钩子）
 * 铁律：本地动作执行一次并广播一次；收到广播只套用状态，绝不再本地计分。
 *      快照字段只在 mount 时注册 —— 没挂载的模块不会污染快照。
 */
(function () {
  const NAME = 'draw-question';
  let P = null;        // 课时参数（step.practice）
  let S = null;        // 私有状态
  let bank = null;     // checks: { 卷名: [题…] }；plain: [{ q, phase }]
  let stepId = null;   // 当前环节 id —— 计分必须用它，不许用 P.step（课时数据里可能根本没传）

  /* 打勾卡数组按「课时实际给了几张卡」初始化 —— 写死 3 张会让只给 1 张卡的课永远完成不了 */
  const freshUsed = () => Array((P.cards || []).length).fill(false);

  const id = n => P.ids[n];
  const el = n => document.getElementById(id(n));
  /* 'p2Check' → 'data-p2-check'（datase 读用 camelCase，选择器 / 属性写用连字符） */
  /* 属性名可能缺省：FCE 只有 cardAttr，PET 只有 scoreAttr —— 缺省时落到 data-none，选不到任何元素 */
  const ATTR = k => (k ? 'data-' + k.replace(/([A-Z])/g, '-$1').toLowerCase() : 'data-none');
  const q = k => document.querySelectorAll('[' + ATTR(k) + ']');

  /* ---------------- 静态骨架：只建一次 ---------------- */
  function skeleton() {
    const chips = (P.chips || []).map(row =>
      `<div class="reminder-chips">${row.map(c => `<span>${c}</span>`).join('')}</div>`).join('');
    if (P.layout === 'plain') {
      return `
  <div class="sentence" id="${id('box')}" style="display:none"></div>
  <div class="big-word" id="${id('topic')}" style="font-size:clamp(20px,2.8vw,30px)">${P.emptyText}</div>
  ${chips}
  <div class="teacher-only" style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
    <button class="mega-btn" id="${id('draw')}">${P.drawLabel}</button>
    ${P.timer ? `<button class="ghost-btn" id="${id('timer')}">${TK.ICONS.timer} ${P.timer.label}</button>` : ''}
  </div>
  <div class="score-team teacher-only">${(P.scoreButtons || []).map(b =>
    `<button class="${b.team === 'A' ? 'a' : 'b'}" data-${P.scoreAttr}="${b.team}">${b.label}</button>`).join('')}</div>
  <div class="rule-line">${P.rule}</div>`;
    }
    return `
  <div class="turn-label" id="${id('turn')}"></div>
  <div class="teacher-only" style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
    <button class="mega-btn" id="${id('draw')}">${P.drawLabel}</button>
  </div>
  <div class="q-bar" id="${id('box')}"></div>
  <div class="stepcard" id="${id('steps')}">${(P.cards || []).map((c, i) =>
    TK.stepRow(i === 0 ? P.badge : '', P.nos[i], c.t, c.cn, c.frames, `data-${P.cardAttr}`, i)).join('')}</div>
  <div class="teacher-only" style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
    <button class="ghost-btn" id="${id('sw')}">${P.switchLabel}</button>
    <button class="ghost-btn" id="${id('reset')}">${P.resetLabel}</button>
  </div>
  <div class="rule-line">${P.rule}</div>`;
  }

  /* ---------------- 纯渲染：幂等，不重置滚动 ---------------- */
  function render() {
    if (!S) return;
    if (P.layout === 'plain') {
      const drawn = S.idx !== null;
      const q = drawn ? bank[S.idx] : null;
      const box = el('box');
      box.style.display = drawn ? 'block' : 'none';
      box.textContent = drawn ? q.q : '';
      el('topic').textContent = drawn ? P.topicOf(q) : P.emptyText;
      el('draw').textContent = drawn ? P.nextLabel : P.drawLabel;
      return;
    }
    const drawn = S.test !== null && S.idx !== null;
    el('box').innerHTML = drawn
      ? `<span class="q-tag">${S.test} · ${P.tag}</span>${bank[S.test][S.idx]}`
      : `<span class="q-tag">${P.emptyTag}</span>${P.emptyText}`;
    q(P.cardAttr).forEach(b => {
      const i = +b.dataset[P.cardAttr];
      b.classList.toggle('on', S.used[i]);
      b.disabled = S.done || S.used[i];
      b.textContent = S.used[i] ? '已打勾' : '打勾';
    });
    const tl = el('turn');
    tl.textContent = S.done ? P.doneText : `${P.turnPrefix}${S.turn}${drawn ? P.turnSuffix : ''}`;
    tl.style.color = S.done ? 'var(--green)' : (S.turn === 'A' ? 'var(--teal)' : 'var(--terra-ink)');
    el('draw').textContent = drawn ? P.nextLabel : P.drawLabel;
  }

  /* ---------------- 抽题池 ---------------- */
  function refill() {
    if (P.layout === 'plain') {
      S.pool = bank.map((_, i) => i);
    } else {
      S.pool = [];
      Object.keys(bank).forEach(t => bank[t].forEach((_, i) => S.pool.push({ t, i })));
    }
    for (let i = S.pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [S.pool[i], S.pool[j]] = [S.pool[j], S.pool[i]];
    }
  }

  const emit = () => TK.broadcast(P.msgShape === 'plain'
    ? { t: P.msg, i: S.idx }
    : { t: P.msg, s: mod.snapshot() });

  /* ---------------- 本地动作：执行一次 + 广播一次 ---------------- */
  function draw() {
    if (!S.pool.length) refill();
    const q = S.pool.pop();
    if (P.layout === 'plain') {
      S.idx = q;
      render(); TK.sfx.draw(); emit(); return;
    }
    const had = S.test !== null;
    S.test = q.t; S.idx = q.i;
    S.used = freshUsed(); S.done = false;
    if (had) S.turn = S.turn === 'A' ? 'B' : 'A';
    render(); TK.sfx.draw(); emit();
  }

  function card(i) {
    if (S.test === null || S.done || S.used[i]) return;
    S.used[i] = true;
    TK.score(stepId, S.turn, 1);
    if (S.used.every(Boolean)) {
      S.done = true;
      TK.score(stepId, 'A', P.reward); TK.score(stepId, 'B', P.reward);
      TK.celebrate();
    }
    render(); TK.sfx.draw(); emit();
  }

  function flip() {
    S.turn = S.turn === 'A' ? 'B' : 'A';
    render(); TK.sfx.click(); emit();
  }

  function reset() {
    S.used = freshUsed(); S.done = false;
    refill(); render(); TK.sfx.click(); emit();
  }

  function applySnap(s) {
    if (!s) return;
    S.pool = (s.pool || []).slice();
    if (P.layout === 'plain') {
      S.idx = (s.idx === undefined ? null : s.idx);
      render(); return;
    }
    S.test = s.test || null;
    S.idx = (s.idx === undefined ? null : s.idx);
    S.turn = s.turn || 'A';
    S.used = (s.used && s.used.length === freshUsed().length ? s.used : freshUsed()).slice();
    S.done = !!s.done;
    render();
  }

  const mod = {
    /* 1) 初始 state */
    init(step, practice) {
      P = practice;
      stepId = step.id;
      bank = P.bank;
      S = P.layout === 'plain'
        ? { pool: [], idx: null, last: null }
        : { pool: [], test: null, idx: null, turn: 'A', used: freshUsed(), done: false };
      refill();
      return S;
    },

    /* 挂载：建骨架 + 绑事件 + 注册快照字段（每次挂载只做一次） */
    mount(h, step, practice) {
      P = practice;
      stepId = step.id;
      h.insertAdjacentHTML('afterbegin', skeleton());
      el('draw').onclick = draw;
      if (el('sw')) el('sw').onclick = flip;
      if (el('reset')) el('reset').onclick = reset;
      if (el('timer')) el('timer').onclick = () => TK.timer(P.timer.sec, true);
      q(P.cardAttr).forEach(b => b.onclick = () => card(+b.dataset[P.cardAttr]));
      q(P.scoreAttr).forEach(b => b.onclick = () => {
        TK.score(step.id, b.dataset[P.scoreAttr], 1); TK.sfx.draw();
      });
      TK.snapshotPart(P.snapKey, mod.snapshot);
      TK.applyPart(P.snapKey, applySnap);
      TK.on(P.msg, m => (P.msgShape === 'plain' ? (S.idx = m.i, render()) : applySnap(m.s)));
    },

    /* 2) 纯渲染 */
    render,

    /* 3) 观众屏收到广播时怎么套用（本模块的 msg 已由 TK.on 接管，这里留空） */
    actions: {},

    /* 4) 进快照的字段 */
    snapshot: () => (P.layout === 'plain'
      ? { pool: S.pool.slice(), idx: S.idx }
      : { pool: S.pool, test: S.test, idx: S.idx, turn: S.turn, used: S.used.slice(), done: S.done }),

    reset(state) { S = state; refill(); return S; },
  };

  TK.registerModule(NAME, mod);
})();
