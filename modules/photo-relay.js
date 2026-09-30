/* modules/photo-relay.js —— PET Part 2「照片描述接龙」
 *
 * 逐字照搬 PET-L4 里「3 Part 2 · Photo 描述接龙」那一段的实现：
 *   加一句 → 该组 +1 并自动换手；Skip → 不得分换手；Switch Photo → 换图；1-min 计时。
 *
 * 契约三件套：render / actions / snapshot / init（+ mount 挂载钩子）
 * 铁律：本地动作执行一次 + 广播一次；收到广播只套用状态，不再本地计分。
 */
(function () {
  const NAME = 'photo-relay';
  let P = null, S = null;
  const el = n => document.getElementById(P.ids[n]);

  function skeleton() {
    return `
  <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center" class="teacher-only">
    <button class="mega-btn" id="${P.ids.add}">${P.addLabel}</button>
    <button class="ghost-btn" id="${P.ids.skip}">${P.skipLabel}</button>
    <button class="ghost-btn" id="${P.ids.sw}">${P.switchLabel}</button>
    <button class="ghost-btn" id="${P.ids.timer}">${TK.ICONS.timer} ${P.timerLabel}</button>
  </div>
  <div class="media-split">
    <img id="${P.ids.photo}" alt="">
    <div class="media-side">
      <div class="big-sub" id="${P.ids.label}"></div>
      ${(P.chips || []).map(row => `<div class="reminder-chips">${row.map(c => `<span>${c}</span>`).join('')}</div>`).join('')}
      <div class="turn-label" id="${P.ids.turn}"></div>
    </div>
  </div>
  <div class="rule-line">${P.rule}</div>`;
  }

  function render() {
    if (!S) return;
    const ph = P.photos[S.idx];
    if (ph) {
      el('photo').src = TK.img(ph.key);
      el('label').textContent = ph.label;
    }
    const t = el('turn');
    t.textContent = `${P.turnPrefix}${S.turn}${P.turnSuffix}`;
    t.style.color = S.turn === 'A' ? 'var(--teal)' : 'var(--terra-ink)';
  }

  const emit = t => TK.broadcast({ t, ...(t === P.msg.switch ? { idx: S.idx } : { turn: S.turn }) });

  function sw() {
    S.idx = (S.idx + 1) % P.photos.length;
    render(); TK.sfx.click(); emit(P.msg.switch);
  }
  function add() {
    TK.score(P.step, S.turn, P.stepScore);
    S.turn = S.turn === 'A' ? 'B' : 'A';
    render(); TK.sfx.draw(); emit(P.msg.add);
  }
  function skip() {
    S.turn = S.turn === 'A' ? 'B' : 'A';
    render(); TK.sfx.click(); emit(P.msg.skip);
  }

  function applySnap(s) {
    if (!s) return;
    if (s.idx !== undefined) S.idx = s.idx || 0;
    if (s.turn !== undefined) S.turn = s.turn || 'A';
    render();
  }

  const mod = {
    init(step, practice) {
      P = practice; P.step = step.id;
      S = { idx: 0, turn: 'A' };
      return S;
    },
    mount(h, step, practice) {
      P = practice; P.step = step.id;
      h.insertAdjacentHTML('afterbegin', skeleton());
      el('add').onclick = add;
      el('skip').onclick = skip;
      el('sw').onclick = sw;
      el('timer').onclick = () => TK.timer(P.timerSec, true);
      TK.snapshotPart(P.snapKey, mod.snapshot);
      TK.applyPart(P.snapKey, applySnap);
      TK.on(P.msg.switch, m => applySnap({ idx: m.idx }));
      TK.on(P.msg.add, m => applySnap({ turn: m.turn }));
      TK.on(P.msg.skip, m => applySnap({ turn: m.turn }));
    },
    render,
    actions: {},
    snapshot: () => ({ idx: S.idx, turn: S.turn }),
    reset(state) { S = state || { idx: 0, turn: 'A' }; return S; },
  };
  TK.registerModule(NAME, mod);
})();
