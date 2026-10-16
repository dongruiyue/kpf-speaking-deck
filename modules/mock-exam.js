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
function mockExamFactory() {
  const NAME = 'mock-exam';
  let P = null, S = null;
  const el = n => document.getElementById(P.ids[n]);
  const PIC = k => `<img class="picimg" src="${TK.img(k)}" alt="">`;

  /* 版式按 references/typography.md §八：① 阶段 Tab + 内容 → ② 素材 / 互评表 → ③ 控件一行
      → ④ 计分 + 说明。原来「突袭」与「互评表」分在两行、计分居中、说明在左，一屏四套对齐。 */
  function skeleton() {
    return `
  <div class="phase-tabs teacher-only">
    <button id="${P.ids.ph1Tab}" class="cur">${P.ph1Label}</button>
    <button id="${P.ids.ph2Tab}">${P.ph2Label}</button>
  </div>
  <div id="${P.ids.phase1}" class="phase-col">
    <div class="prac-set">
      <div class="question">${P.ph1Title}</div>
    </div>
    <div class="prac-set">
      ${P.places && P.places.length ? `<div class="flash-grid exam-grid" id="${P.ids.ph1Grid}"></div>` : ''}
      <div class="reminder-chips">${P.ph1Chips.map(c => `<span>${c}</span>`).join('')}</div>
    </div>
    ${P.ph1RaidQuestions && P.ph1RaidQuestions.length ? `<div class="prac-set">
      <div class="name-scroll" id="${P.ids.r1Name}">${P.r1Ready || ''}</div>
      <div class="question" id="${P.ids.r1Q}">${P.r1Hint || ''}</div>
    </div>` : ''}
    <div class="prac-set">
      <div class="btn-row teacher-only">
        ${P.ph1RaidQuestions && P.ph1RaidQuestions.length ? `<button class="mega-btn terra" id="${P.ids.r1Btn}">${P.raidLabel}</button>` : ''}
        <button class="mega-btn" id="${P.ids.ph1Btn}">${TK.ICONS.timer} ${P.ph1Btn}</button>
      </div>
    </div>
    <div class="prac-set">
      <div class="big-sub">${P.ph1Note}</div>
    </div>
  </div>
  <div id="${P.ids.phase2}" class="phase-col" style="display:none">
    <div class="prac-set">
      <div class="name-scroll" id="${P.ids.raidName}">${P.raidReady}</div>
      <div class="question" id="${P.ids.raidQ}">${P.raidHint}</div>
    </div>
    ${P.p2Places && P.p2Places.length ? `<div class="prac-set">
      <div class="flash-grid exam-grid p2-grid" id="${P.ids.p2Grid}"></div>
    </div>` : ''}
    <div class="prac-set">
      <div class="check-panel teacher-only" id="${P.ids.checkPanel}" style="display:none">
        ${P.checklist.map(c => `<label><input type="checkbox">${c}</label>`).join('')}
        <div class="rating" id="${P.ids.stars}"><span class="off">○○○○○</span></div>
      </div>
    </div>
    <div class="prac-set">
      <div class="btn-row">
        <button class="mega-btn terra" id="${P.ids.raidBtn}">${P.raidLabel}</button>
        <button class="ghost-btn teacher-only" id="${P.ids.checkBtn}">${P.checkLabel}</button>
      </div>
      <details class="settings teacher-only">
        <summary>${P.namesLabel}</summary>
        <div style="height:var(--sp-2)"></div>
        <textarea class="names-box" id="${P.ids.names}" rows="2" placeholder="${P.namesPlaceholder}"></textarea>
      </details>
    </div>
    <div class="prac-set">
      <div class="score-team teacher-only">
        ${P.scoreButtons.map(b => `<button class="${b.team === 'A' ? 'a' : 'b'}" data-${P.attr}="${b.team}">${b.label}</button>`).join('')}
      </div>
      <div class="rule-line">${P.rule}</div>
    </div>
  </div>`;
  }

  /* 图片卡：Phase 1 的格子与 Phase 2 的照片共用这一段。
     Phase 1 没有照片（例如 PET L6 的 Part 1 只有问句）时不渲染 —— buildGrids 里按 list 判空。 */
  function fillGrid(id, list) {
    const grid = el(id);
    if (!grid || !list || !list.length) return;
    grid.innerHTML = '';
    list.forEach(p => {
      const d = document.createElement('div');
      d.className = 'flash-card static';
      d.innerHTML = `<span class="pic">${PIC(p.svg)}</span><div class="name">${p.name}</div>`;
      grid.appendChild(d);
    });
  }
  function buildGrids() { fillGrid('ph1Grid', P.places); fillGrid('p2Grid', P.p2Places); }

  function render() {
    if (!S) return;
    el('phase1').style.display = S.phase === 1 ? 'flex' : 'none';
    el('phase2').style.display = S.phase === 2 ? 'flex' : 'none';
    el('ph1Tab').classList.toggle('cur', S.phase === 1);
    el('ph2Tab').classList.toggle('cur', S.phase === 2);
    if (S.name !== null || S.q !== null) doRaid(2, S.name, S.q, true);
    if (S.q1 !== undefined && S.q1 !== null) doRaid(1, S.n1, S.q1, true);
  }

  function phase(n, quiet) {
    S.phase = n;
    render();
    TK.sfx.click();
    if (!quiet) TK.broadcast({ t: P.msg.phase, n });
  }

  /* 抽人抽题的落点：which=1 是 Part 1 那边（r1Name/r1Q），which=2 是 Part 2 那边（raidName/raidQ）。
     两边各有各的题库与显示位 —— 抽的是本 Part 的题，别混。 */
  function doRaid(which, name, q, quiet) {
    const one = which === 1;
    const nEl = el(one ? 'r1Name' : 'raidName'), qEl = el(one ? 'r1Q' : 'raidQ');
    if (one) { S.n1 = name; S.q1 = q; } else { S.name = name; S.q = q; }
    if (nEl) nEl.textContent = name;
    if (qEl) qEl.textContent = q;
    TK.sfx.draw();
    if (!quiet) TK.broadcast({ t: one ? P.msg.ph1Raid : P.msg.raid, name, q });
  }

  /* RAID：滚动抽名 + 滴答声（纯本机动画，抽完才广播结果）。
     两个页签各抽各的：Part 1 抽「Phase 2 长问题」，Part 2 抽照片与描述题。 */
  function raid(which) {
    const names = el('names').value.split(/[,，、\s]+/).filter(Boolean);
    const poolN = names.length ? names : [P.everyone];
    const poolQ = which === 1 ? P.ph1RaidQuestions : P.raidQuestions;
    const nEl = el(which === 1 ? 'r1Name' : 'raidName'), qEl = el(which === 1 ? 'r1Q' : 'raidQ');
    if (!nEl || !qEl || !poolQ || !poolQ.length) return;
    qEl.textContent = '...';
    let n = 0;
    const scroll = setInterval(() => {
      nEl.textContent = TK.rnd(poolN);
      TK.beep(500 + n * 30, .05);
      if (++n > 12) {
        clearInterval(scroll);
        doRaid(which, TK.rnd(poolN), TK.rnd(poolQ), false);
      }
    }, 90);
  }

  function applySnap(s) {
    if (!s) return;
    if (s.phase) phase(s.phase, true);
    if (s.name !== undefined && (s.name !== null || s.q !== null)) doRaid(2, s.name, s.q, true);
    if (s.q1 !== undefined && s.q1 !== null) doRaid(1, s.n1, s.q1, true);
  }

  const mod = {
    init(step, practice) {
      P = practice; P.step = step.id;
      S = { phase: 1, name: null, q: null, n1: null, q1: null };
      return S;
    },
    mount(h, step, practice) {
      P = practice; P.step = step.id;
      S = S || { phase: 1, name: null, q: null, n1: null, q1: null };
      h.insertAdjacentHTML('afterbegin', skeleton());
      buildGrids();
      el('ph1Tab').onclick = () => phase(1, false);
      el('ph2Tab').onclick = () => phase(2, false);
      el('ph1Btn').onclick = () => TK.timer(P.ph1Sec, true);
      if (el('r1Btn')) el('r1Btn').onclick = () => raid(1);
      el('raidBtn').onclick = () => raid(2);
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
        el('stars').innerHTML = '<span>' + '✓'.repeat(n) + '</span><span class="off">' + '○'.repeat(5 - n) + '</span>';
        if (n === 5) TK.celebrate(); else TK.sfx.click();
      });
      TK.snapshotPart(P.snapKey, mod.snapshot);
      TK.applyPart(P.snapKey, applySnap);
      TK.on(P.msg.phase, m => phase(m.n, true));
      TK.on(P.msg.raid, m => doRaid(2, m.name, m.q, true));
      if (P.msg.ph1Raid) TK.on(P.msg.ph1Raid, m => doRaid(1, m.name, m.q, true));
    },
    render,
    actions: {},
    snapshot: () => ({ phase: S.phase, name: S.name, q: S.q, n1: S.n1, q1: S.q1 }),
    reset(state) { S = state; return S; },
  };
  return mod;
}
TK.registerModule('mock-exam', mockExamFactory);
