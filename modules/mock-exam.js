/* modules/mock-exam.js —— KET「Mock Test 模拟考试」
 *
 * 逐字照搬 KET-U7L3 里「4 模拟考试」那一段的实现：
 *   Phase 1 同桌讨论（五个地方都聊到 → 2 分钟计时）
 *   Phase 2 考官问答（学生名单 → RAID 突袭滚动抽人抽题 → 答好该组 +1）
 *   互评表：五条自评 + 五星（全中放彩带）。
 *   名单存在本课命名空间里（原来直接写 localStorage 的 ket_names）。
 *
 * 契约三件套：render / actions / snapshot / init（+ mount 挂载钩子）
 */
(function () {
  const NAME = 'mock-exam';
  let P = null, S = null;
  const el = n => document.getElementById(P.ids[n]);
  const PIC = k => `<img class="picimg" src="${TK.img(k)}" alt="">`;

  function skeleton() {
    return `
  <div class="phase-tabs teacher-only">
    <button id="${P.ids.ph1Tab}" class="cur">${P.ph1Label}</button>
    <button id="${P.ids.ph2Tab}">${P.ph2Label}</button>
  </div>
  <div id="${P.ids.phase1}" style="width:100%;display:flex;flex-direction:column;align-items:center;gap:16px">
    <div class="big-word" style="font-size:clamp(24px,3.6vw,38px)">${P.ph1Title}</div>
    <div class="flash-grid" id="${P.ids.ph1Grid}" style="max-width:820px"></div>
    <div class="reminder-chips">${P.ph1Chips.map(c => `<span>${c}</span>`).join('')}</div>
    <div class="big-sub">${P.ph1Note}</div>
    <button class="mega-btn" id="${P.ids.ph1Btn}">${TK.ICONS.timer} ${P.ph1Btn}</button>
  </div>
  <div id="${P.ids.phase2}" style="width:100%;display:none;flex-direction:column;align-items:center;gap:16px">
    <details class="settings teacher-only">
      <summary>${P.namesLabel}</summary>
      <div style="height:8px"></div>
      <textarea class="names-box" id="${P.ids.names}" rows="2" placeholder="${P.namesPlaceholder}"></textarea>
    </details>
    <div class="name-scroll" id="${P.ids.raidName}">${P.raidReady}</div>
    <div class="question" id="${P.ids.raidQ}">${P.raidHint}</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
      <button class="mega-btn terra" id="${P.ids.raidBtn}">${P.raidLabel}</button>
      <button class="ghost-btn teacher-only" id="${P.ids.checkBtn}">${P.checkLabel}</button>
    </div>
    <div class="score-team teacher-only">
      ${P.scoreButtons.map(b => `<button class="${b.team === 'A' ? 'a' : 'b'}" data-${P.attr}="${b.team}">${b.label}</button>`).join('')}
    </div>
    <div class="check-panel teacher-only" id="${P.ids.checkPanel}" style="display:none">
      ${P.checklist.map(c => `<label><input type="checkbox">${c}</label>`).join('')}
      <div class="stars" id="${P.ids.stars}">☆☆☆☆☆</div>
    </div>
    <div class="rule-line">${P.rule}</div>
  </div>`;
  }

  function buildPh1Grid() {
    const grid = el('ph1Grid');
    grid.innerHTML = '';
    P.places.forEach(p => {
      const d = document.createElement('div');
      d.className = 'flash-card static';
      d.innerHTML = `<span class="pic">${PIC(p.svg)}</span><div class="name">${p.name}</div>`;
      grid.appendChild(d);
    });
  }

  function render() {
    if (!S) return;
    el('phase1').style.display = S.phase === 1 ? 'flex' : 'none';
    el('phase2').style.display = S.phase === 2 ? 'flex' : 'none';
    el('ph1Tab').classList.toggle('cur', S.phase === 1);
    el('ph2Tab').classList.toggle('cur', S.phase === 2);
    if (S.name !== null || S.q !== null) doRaid(S.name, S.q, true);
  }

  function phase(n, quiet) {
    S.phase = n;
    render();
    TK.sfx.click();
    if (!quiet) TK.broadcast({ t: P.msg.phase, n });
  }

  function doRaid(name, q, quiet) {
    S.name = name; S.q = q;
    el('raidName').textContent = name;
    el('raidQ').textContent = q;
    TK.sfx.draw();
    if (!quiet) TK.broadcast({ t: P.msg.raid, name, q });
  }

  /* RAID：滚动抽名 + 滴答声（纯本机动画，抽完才广播结果） */
  function raid() {
    const names = el('names').value.split(/[,，、\s]+/).filter(Boolean);
    const poolN = names.length ? names : [P.everyone];
    el('raidQ').textContent = '...';
    let n = 0;
    const scroll = setInterval(() => {
      el('raidName').textContent = TK.rnd(poolN);
      TK.beep(500 + n * 30, .05);
      if (++n > 12) {
        clearInterval(scroll);
        doRaid(TK.rnd(poolN), TK.rnd(P.raidQuestions), false);
      }
    }, 90);
  }

  function applySnap(s) {
    if (!s) return;
    if (s.phase) phase(s.phase, true);
    if (s.name !== undefined && (s.name !== null || s.q !== null)) doRaid(s.name, s.q, true);
  }

  const mod = {
    init(step, practice) {
      P = practice; P.step = step.id;
      S = { phase: 1, name: null, q: null };
      return S;
    },
    mount(h, step, practice) {
      P = practice; P.step = step.id;
      S = S || { phase: 1, name: null, q: null };
      h.insertAdjacentHTML('afterbegin', skeleton());
      buildPh1Grid();
      el('ph1Tab').onclick = () => phase(1, false);
      el('ph2Tab').onclick = () => phase(2, false);
      el('ph1Btn').onclick = () => TK.timer(P.ph1Sec, true);
      el('raidBtn').onclick = raid;
      el('checkBtn').onclick = () => {
        const p = el('checkPanel');
        p.style.display = p.style.display === 'none' ? 'block' : 'none';
        TK.sfx.click();
      };
      document.querySelectorAll(`[data-${P.attr}]`).forEach(b => b.onclick = () => {
        TK.score(step.id, b.dataset[P.attr], 1);
        TK.sfx.draw();
      });
      /* 学生名单：只存本机（不广播），键名走本课命名空间 */
      const namesEl = el('names');
      namesEl.value = TK.storage.get(P.namesKey) || '';
      namesEl.oninput = () => TK.storage.set(P.namesKey, namesEl.value);
      /* 互评表：五条自评 → 五颗星 */
      const boxes = document.querySelectorAll(`#${P.ids.checkPanel} input`);
      boxes.forEach(b => b.onchange = () => {
        const n = [...boxes].filter(x => x.checked).length;
        el('stars').textContent = '★'.repeat(n) + '☆'.repeat(5 - n);
        if (n === 5) TK.celebrate(); else TK.sfx.click();
      });
      TK.snapshotPart(P.snapKey, mod.snapshot);
      TK.applyPart(P.snapKey, applySnap);
      TK.on(P.msg.phase, m => phase(m.n, true));
      TK.on(P.msg.raid, m => doRaid(m.name, m.q, true));
    },
    render,
    actions: {},
    snapshot: () => ({ phase: S.phase, name: S.name, q: S.q }),
    reset(state) { S = state; return S; },
  };
  TK.registerModule(NAME, mod);
})();
