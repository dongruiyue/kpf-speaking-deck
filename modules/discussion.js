/* modules/discussion.js —— PET Part 4「话题深入问答」
 *
 * 逐字照搬 PET-L4 里「5 Part 4 · Discussion」那一段的实现：
 *   抽题 → 学生答 → 「Show Model 揭晓范文」对照；答好一次该组 +1。
 *
 * 契约三件套：render / actions / snapshot / init（+ mount 挂载钩子）
 */
(function () {
  const NAME = 'discussion';
  let P = null, S = null;
  const el = n => document.getElementById(P.ids[n]);

  function skeleton() {
    return `
  <div class="question" id="${P.ids.q}">${P.emptyText}</div>
  <div class="sentence" id="${P.ids.model}" style="display:none"></div>
  <div id="${P.ids.result}" class="big-sub"></div>
  <div class="teacher-only" style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
    <button class="mega-btn" id="${P.ids.draw}">${P.drawLabel}</button>
    <button class="mega-btn mustard" id="${P.ids.show}">${P.showLabel}</button>
    <button class="ghost-btn" id="${P.ids.timer}">${TK.ICONS.timer} ${P.timerLabel}</button>
  </div>
  <div class="score-team teacher-only">
    ${P.scoreButtons.map(b => `<button class="${b.team === 'A' ? 'a' : 'b'}" data-${P.attr}="${b.team}">${b.label}</button>`).join('')}
  </div>
  <div class="rule-line">${P.rule}</div>`;
  }

  function render() {
    if (!S || S.idx === null) return;
    el('q').textContent = P.questions[S.idx].q;
    const m = el('model');
    m.style.display = S.shown ? 'block' : 'none';
    m.textContent = P.questions[S.idx].model;
    el('result').textContent = S.shown ? P.shownText : '';
  }

  function refill() {
    S.pool = P.questions.map((_, i) => i);
    for (let i = S.pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [S.pool[i], S.pool[j]] = [S.pool[j], S.pool[i]];
    }
  }

  function draw() {
    if (!S.pool.length) refill();
    S.idx = S.pool.pop(); S.shown = false;
    render(); TK.sfx.draw();
    TK.broadcast({ t: P.msg.draw, i: S.idx });
  }
  function show() {
    if (S.idx === null) return;
    S.shown = !S.shown;
    render(); TK.sfx.draw();
    TK.broadcast({ t: P.msg.show, shown: S.shown });
  }

  function applySnap(s) {
    if (!s) return;
    if (s.idx !== undefined) S.idx = s.idx;
    if (s.shown !== undefined) S.shown = !!s.shown;
    render();
  }

  const mod = {
    init(step, practice) {
      P = practice; P.step = step.id;
      S = { pool: [], idx: null, shown: false };
      refill();
      return S;
    },
    mount(h, step, practice) {
      P = practice; P.step = step.id;
      h.insertAdjacentHTML('afterbegin', skeleton());
      el('draw').onclick = draw;
      el('show').onclick = show;
      el('timer').onclick = () => TK.timer(P.timerSec, true);
      document.querySelectorAll(`[data-${P.attr}]`).forEach(b => b.onclick = () => {
        TK.score(step.id, b.dataset[P.attr], 1); TK.sfx.draw();
      });
      TK.snapshotPart(P.snapKey, mod.snapshot);
      TK.applyPart(P.snapKey, applySnap);
      TK.on(P.msg.draw, m => applySnap({ idx: m.i, shown: false }));
      TK.on(P.msg.show, m => applySnap({ shown: m.shown }));
    },
    render,
    actions: {},
    snapshot: () => ({ idx: S.idx, shown: S.shown }),
    reset(state) { S = state; refill(); return S; },
  };
  TK.registerModule(NAME, mod);
})();
