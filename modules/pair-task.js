/* modules/pair-task.js —— KET「Pair Task 双人任务」
 *
 * 逐字照搬 KET-U7L3 里「3 双人任务」那一段的实现：
 *   点地方卡 → 放进下面两个槽（最多两个，可取消）；点「Speak Out!」→ 双方各 +2；
 *   没选够两个只提示、不加分。
 *
 * 契约三件套：render / actions / snapshot / init（+ mount 挂载钩子）
 */
(function () {
  const NAME = 'pair-task';
  let P = null, S = null;
  const el = n => document.getElementById(P.ids[n]);
  const PIC = k => `<img class="picimg" src="${TK.img(k)}" alt="">`;

  function skeleton() {
    return `
  <div class="big-word" style="font-size:clamp(24px,3.6vw,38px)">${P.title}</div>
  <div class="scaffold">
    <b>${P.taskEn}</b><br>
    ${P.taskCn}
  </div>
  <div class="flash-grid" id="${P.ids.grid}" style="max-width:820px"></div>
  <div class="pair-slots">
    <div class="pair-slot" id="${P.ids.slot0}">?</div>
    <div class="pair-slot" id="${P.ids.slot1}">?</div>
  </div>
  <div class="reminder-chips">${P.chips.map(c => `<span>${c}</span>`).join('')}</div>
  <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center" class="teacher-only">
    <button class="mega-btn" id="${P.ids.timer}">${TK.ICONS.timer} ${P.timerLabel}</button>
    <button class="mega-btn mustard" id="${P.ids.done}">${P.doneLabel}</button>
    <button class="ghost-btn" id="${P.ids.reset}">${P.resetLabel}</button>
  </div>
  <div id="${P.ids.win}"></div>
  <div class="rule-line">${P.rule}</div>`;
  }

  function buildGrid() {
    const grid = el('grid');
    grid.innerHTML = '';
    P.places.forEach((p, i) => {
      const d = document.createElement('div');
      d.className = 'flash-card';
      d.innerHTML = `<span class="pic">${PIC(p.svg)}</span><div class="name">${p.name}</div>`;
      d.onclick = () => toggle(i);
      grid.appendChild(d);
    });
  }

  function render() {
    if (!S) return;
    const grid = el('grid');
    if (grid.children.length !== P.places.length) buildGrid();
    [...grid.children].forEach((d, i) => {
      const on = S.chosen.includes(i);
      d.classList.toggle('chosen', on);
      let tick = d.querySelector('.tick');
      if (on && !tick) { tick = document.createElement('span'); tick.className = 'tick'; tick.textContent = '✓'; d.appendChild(tick); }
      if (!on && tick) tick.remove();
    });
    [0, 1].forEach(k => {
      const slot = el('slot' + k);
      const pi = S.chosen[k];
      if (pi === undefined) { slot.className = 'pair-slot'; slot.textContent = '?'; }
      else {
        slot.className = 'pair-slot filled';
        slot.innerHTML = `<span class="pic">${PIC(P.places[pi].svg)}</span><div class="nm">${P.places[pi].name}</div>`;
      }
    });
  }

  function toggle(i) {
    if (S.done) return;
    const k = S.chosen.indexOf(i);
    if (k >= 0) S.chosen.splice(k, 1);
    else if (S.chosen.length < 2) S.chosen.push(i);
    else return;
    render(); TK.sfx.click();
    TK.broadcast({ t: P.msg.toggle, chosen: S.chosen.slice() });
  }

  /* quiet=true 是「收到广播」这条路径：只套用状态，绝不再本地计分（铁律 2） */
  function done(quiet) {
    if (S.chosen.length < 2) {
      el('win').innerHTML = `<div class="big-sub">${P.needTwo}</div>`;
      return;
    }
    S.done = true;
    if (!quiet) {
      TK.score(P.step, 'A', P.doneScore);
      TK.score(P.step, 'B', P.doneScore);
    }
    const names = S.chosen.map(i => P.places[i].name);
    el('win').innerHTML =
      `<div class="win-banner">Great decision! · 决定：${names[0]} + ${names[1]}</div>
     <div class="big-sub">Everyone say: We'd like to go to the ${names[0]} and the ${names[1]} because ...</div>`;
    TK.celebrate();
    if (!quiet) TK.broadcast({ t: P.msg.done });
  }

  function reset(quiet) {
    S.chosen = []; S.done = false;
    el('win').innerHTML = '';
    render(); TK.sfx.click();
    if (!quiet) TK.broadcast({ t: P.msg.reset });
  }

  function applySnap(s) {
    if (!s) return;
    el('win').innerHTML = '';
    if (s.chosen) S.chosen = s.chosen.slice();
    S.done = !!s.done;
    render();
    if (S.done) done(true);
  }

  const mod = {
    init(step, practice) {
      P = practice; P.step = step.id;
      S = { chosen: [], done: false };
      return S;
    },
    mount(h, step, practice) {
      P = practice; P.step = step.id;
      S = S || { chosen: [], done: false };
      h.insertAdjacentHTML('afterbegin', skeleton());
      buildGrid();
      el('timer').onclick = () => TK.timer(P.timerSec, true);
      el('done').onclick = () => done(false);
      el('reset').onclick = () => reset(false);
      TK.snapshotPart(P.snapKey, mod.snapshot);
      TK.applyPart(P.snapKey, applySnap);
      TK.on(P.msg.toggle, m => applySnap({ chosen: m.chosen, done: S.done }));
      TK.on(P.msg.done, () => done(true));
      TK.on(P.msg.reset, () => reset(true));
    },
    render,
    actions: {},
    snapshot: () => ({ chosen: S.chosen.slice(), done: S.done }),
    reset(state) { S = state; return S; },
  };
  TK.registerModule(NAME, mod);
})();
