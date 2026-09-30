/* modules/negotiate.js —— PET Part 3「协作任务 / 协商决策」
 *
 * 逐字照搬 PET-L4 里「4 Part 3 · 协作任务」那一段的实现：
 *   点一次 = 讨论过（黄）· 再点 = 定为决定（绿，同时把别的决定降回「讨论过」）
 *   讨论完所有选项后点「Agree!」→ 双方各 +2。
 *
 * 契约三件套：render / actions / snapshot / init（+ mount 挂载钩子）
 */
(function () {
  const NAME = 'negotiate';
  let P = null, S = null;
  const el = n => document.getElementById(P.ids[n]);

  function skeleton() {
    return `
  <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center" class="teacher-only">
    <button class="mega-btn" id="${P.ids.timer}">${TK.ICONS.timer} ${P.timerLabel}</button>
    <button class="mega-btn mustard" id="${P.ids.decide}">${P.decideLabel}</button>
    <button class="ghost-btn" id="${P.ids.reset}">${P.resetLabel}</button>
  </div>
  <div class="media-split">
    <img src="${TK.img(P.image)}" alt="" style="max-width:300px;flex:0 1 300px">
    <div class="media-side">
      <div class="scaffold" style="font-size:clamp(14px,1.9vw,20px);padding:12px 18px">
        <b>${P.situationEn}</b><br>${P.situationCn}
      </div>
      <div class="reminder-chips" id="${P.ids.chips}"></div>
      <div class="reminder-chips">${(P.chips || []).map(c => `<span>${c}</span>`).join('')}</div>
      <div id="${P.ids.result}" class="big-sub"></div>
    </div>
  </div>
  <div class="rule-line">${P.rule}</div>`;
  }

  function render() {
    if (!S) return;
    el('chips').innerHTML = P.options.map((o, i) => {
      const st = S.state[i];
      const cls = st === 2 ? 'chip decided' : (st === 1 ? 'chip talked' : 'chip');
      const mark = st === 2 ? '★ ' : (st === 1 ? '✓ ' : '');
      return `<button class="${cls}" data-${P.attr}="${i}">${mark}${o}</button>`;
    }).join('');
    document.querySelectorAll(`[data-${P.attr}]`).forEach(b => b.onclick = () => step(+b.dataset[P.attr]));
    const di = S.state.indexOf(2);
    el('result').innerHTML = di < 0 ? '' : `<b>We decided: ${P.options[di]}</b> — because …`;
  }

  function step(i) {
    if (S.done) return;
    S.state[i] = (S.state[i] + 1) % 3;
    if (S.state[i] === 2) S.state = S.state.map((v, k) => (k === i || v !== 2) ? v : 1);
    render(); TK.sfx.click();
    TK.broadcast({ t: P.msg.step, state: S.state.slice() });
  }

  /* quiet=true 是「收到广播」这条路径：只套用状态，绝不再本地计分（铁律 2）。
     分数由同一次操作发出的 {t:'score'} 快照统一对齐。 */
  function decide(quiet) {
    if (S.done && !quiet) return;
    if (S.state.indexOf(2) < 0) {
      if (!quiet) el('result').textContent = P.needDecide;
      return;
    }
    S.done = true;
    if (!quiet) { TK.score(P.step, 'A', P.doneScore); TK.score(P.step, 'B', P.doneScore); }
    render();
    el('result').innerHTML =
      `<b>We decided: ${P.options[S.state.indexOf(2)]}</b> — because …` +
      `<br>讨论过 ${S.state.filter(v => v > 0).length} / ${P.options.length} 项`;
    TK.celebrate();
    if (!quiet) TK.broadcast({ t: P.msg.decide });
  }

  function reset(quiet) {
    S.state = P.options.map(() => 0); S.done = false;
    el('result').innerHTML = '';
    render(); TK.sfx.click();
    if (!quiet) TK.broadcast({ t: P.msg.reset });
  }

  function applySnap(s) {
    if (!s) return;
    if (s.state) { S.state = s.state.slice(); S.done = !!s.done; render(); }
  }

  const mod = {
    init(step, practice) {
      P = practice; P.step = step.id;
      S = { state: P.options.map(() => 0), done: false };
      return S;
    },
    mount(h, step, practice) {
      P = practice; P.step = step.id;
      h.insertAdjacentHTML('afterbegin', skeleton());
      el('timer').onclick = () => TK.timer(P.timerSec, true);
      el('decide').onclick = () => decide(false);
      el('reset').onclick = () => reset(false);
      TK.snapshotPart(P.snapKey, mod.snapshot);
      TK.applyPart(P.snapKey, applySnap);
      TK.on(P.msg.step, m => applySnap({ state: m.state, done: S.done }));
      TK.on(P.msg.decide, () => decide(true));
      TK.on(P.msg.reset, () => reset(true));
    },
    render,
    actions: {},
    snapshot: () => ({ state: S.state.slice(), done: S.done }),
    reset(state) { S = state; return S; },
  };
  TK.registerModule(NAME, mod);
})();
