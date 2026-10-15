/* modules/flash-cards.js —— KET「Warm-up 快闪」
 *
 * 逐字照搬 KET-U7L3 里「1 快闪」那一段的实现：
 *   30s Memory 倒计时 → 自动盖住单词 → 指图抢答，抢答对点该组 +1；Cover / Show 手动盖翻。
 *   倒计时本身不广播（只广播盖/翻），与原实现一致。
 *
 * 契约三件套：render / actions / snapshot / init（+ mount 挂载钩子）
 */
function flashCardsFactory() {
  const NAME = 'flash-cards';
  let P = null, S = null, cdTimer = null;
  const el = n => document.getElementById(P.ids[n]);
  const PIC = k => `<img class="picimg" src="${TK.img(k)}" alt="">`;

  function skeleton() {
    /* 版式按 references/typography.md §八：① / ② 卡面素材（含记忆倒计时）→ ③ 控件一行
       （盖住 / 翻开 / 计时）→ ④ 计分 + 说明。原来那条「教师操作」带把计分也塞在同一条里，
       拆开成 .btn-row + .score-team 两行（观众屏整块 teacher-only 隐藏）。 */
    return `
  <div class="prac-set">
    <div id="${P.ids.cd}" style="display:none"></div>
    <div class="flash-grid" id="${P.ids.grid}"></div>
  </div>
  <div class="prac-set">
    <div class="btn-row teacher-only">
      <button class="ghost-btn" id="${P.ids.cover}">${P.coverLabel}</button>
      <button class="ghost-btn" id="${P.ids.reveal}">${P.revealLabel}</button>
      <button class="ghost-btn" id="${P.ids.timer}">${TK.ICONS.timer} ${P.timerLabel}</button>
    </div>
  </div>
  <div class="prac-set">
    <div class="score-team teacher-only">
      ${P.scoreButtons.map(b => `<button class="${b.team === 'A' ? 'a' : 'b'}" data-${P.attr}="${b.team}">${b.label}</button>`).join('')}
    </div>
    <div class="rule-line">${P.rule}</div>
  </div>`;
  }

  /* 列数标记：课时写 practice.cols 覆盖；缺省时 8 张卡按 4 列 × 2 行（小屏 2 列）——
     原来 auto-fit 在 1280 宽排出 7+1，第二行孤零零一张卡。
     只给 flash-cards 自己的网格加 .cols-4；mock-exam / pair-task / tool-pager 复用的
     .flash-grid 不带这个标记，版式不受影响。 */
  function applyCols() {
    const grid = el('grid');
    if (!grid) return;
    grid.classList.toggle('cols-4', P.cols ? +P.cols === 4 : P.places.length === 8);
  }

  function buildGrid() {
    const grid = el('grid');
    grid.innerHTML = '';
    P.places.forEach((p, i) => {
      const d = document.createElement('div');
      d.className = 'flash-card';
      d.innerHTML = `<span class="pic">${PIC(p.svg)}</span><div class="name">${p.name}</div>`;
      d.onclick = () => toggle(i, !S.covered[i]);
      grid.appendChild(d);
    });
  }

  /* setFlashCard：只改这一张，不重建网格（原实现同此） */
  function setCard(i, cov) {
    S.covered[i] = cov;
    const d = el('grid').children[i];
    if (!d) return;
    d.classList.toggle('covered', cov);
    d.querySelector('.name').textContent = cov ? '?' : P.places[i].name;
  }

  function render() {
    if (!S) return;
    if (el('grid').children.length !== P.places.length) buildGrid();
    applyCols();
    P.places.forEach((_, i) => setCard(i, S.covered[i]));
  }

  function toggle(i, cov) {
    setCard(i, cov); TK.sfx.click();
    TK.broadcast({ t: P.msg.toggle, i, cov });
  }
  function coverAll(cov, quiet) {
    P.places.forEach((_, i) => setCard(i, cov));
    TK.sfx.click();
    if (!quiet) TK.broadcast({ t: P.msg.coverAll, cov });
  }

  /* 30 秒记忆倒计时：与原来一样，只在本机走，不广播 */
  function memory() {
    const btn = el('timer'), cd = el('cd');
    coverAll(false, true);
    btn.disabled = true;
    cd.style.display = 'block';
    let t = P.memorySec;
    cd.innerHTML = `<div class="timer-num">${t}</div>`
      + `<div class="big-sub">${P.memoryText}</div>`;
    const numEl = cd.querySelector('.timer-num');
    clearInterval(cdTimer);
    cdTimer = setInterval(() => {
      t--;
      if (t <= 0) {
        clearInterval(cdTimer); cdTimer = null;
        cd.style.display = 'none';
        btn.disabled = false;
        coverAll(true, false);
        TK.sfx.end();
        return;
      }
      numEl.textContent = t;
      numEl.classList.toggle('warn', t <= 5);
    }, 1000);
  }

  function applySnap(cov) {
    if (!Array.isArray(cov)) return;
    cov.forEach((c, i) => setCard(i, c));
  }

  const mod = {
    init(step, practice) {
      P = practice;
      S = { covered: P.places.map(() => false) };
      return S;
    },
    mount(h, step, practice) {
      P = practice;
      S = S || { covered: P.places.map(() => false) };
      h.insertAdjacentHTML('afterbegin', skeleton());
      buildGrid();
      applyCols();
      el('cover').onclick = () => coverAll(true, false);
      el('reveal').onclick = () => coverAll(false, false);
      el('timer').onclick = memory;
      document.querySelectorAll(`[data-${P.attr}]`).forEach(b => b.onclick = () => {
        TK.score(step.id, b.dataset[P.attr], 1); TK.sfx.draw();
      });
      TK.snapshotPart(P.snapKey, mod.snapshot);
      TK.applyPart(P.snapKey, applySnap);
      TK.on(P.msg.toggle, m => setCard(m.i, m.cov));
      TK.on(P.msg.coverAll, m => applySnap(P.places.map(() => m.cov)));
    },
    render,
    actions: {},
    snapshot: () => S.covered.slice(),
    reset(state) { S = state || { covered: P.places.map(() => false) }; return S; },
  };
  return mod;
}
TK.registerModule('flash-cards', flashCardsFactory);
