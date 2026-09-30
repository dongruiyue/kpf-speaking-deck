/* modules/ox-bingo.js —— KET「Tic-Tac Bingo OX 棋」
 *
 * 逐字照搬 KET-U7L3 里「5 OX 棋」那一段的实现：
 *   两组轮流选格，占格 +1；连成一条线再 +2（放彩带）；格子占满没连线 = 平局。
 *
 * 契约三件套：render / actions / snapshot / init（+ mount 挂载钩子）
 */
(function () {
  const NAME = 'ox-bingo';
  let P = null, S = null;
  const el = n => document.getElementById(P.ids[n]);
  const PIC = k => `<img class="picimg" src="${TK.img(k)}" alt="">`;

  function skeleton() {
    return `
  <div class="turn-label" id="${P.ids.turn}"></div>
  <div class="bingo-grid3" id="${P.ids.grid}"></div>
  <div id="${P.ids.win}"></div>
  <button class="ghost-btn teacher-only" id="${P.ids.reset}">${P.resetLabel}</button>
  <div class="rule-line">${P.rule}</div>`;
  }

  function render() {
    if (!S) return;
    const grid = el('grid');
    grid.innerHTML = '';
    P.cells.forEach((c, ci) => {
      const p = P.places[c.pi];
      const owner = S.claims[ci];
      const d = document.createElement('button');
      d.className = 'bingo-cell' + (owner ? (owner === 'A' ? ' claimedA' : ' claimedB') : '');
      d.innerHTML = `<span class="pic">${PIC(p.svg)}</span><div class="nm">${p.name}</div>`
        + `<div class="pol">${c.like ? 'Like' : "Don't like"}</div>`;
      if (owner) d.innerHTML += `<span class="mark">${owner === 'A' ? 'O' : 'X'}</span>`;
      d.onclick = () => claim(ci, false);
      grid.appendChild(d);
    });
    updateTurn();
  }

  function updateTurn() {
    const label = el('turn');
    label.textContent = S.done ? '' : (S.turn === 'A' ? P.turnA : P.turnB);
    label.style.color = S.turn === 'A' ? 'var(--teal)' : 'var(--terra)';
  }

  function renderWin() {
    const w = S.winner;
    el('win').innerHTML = w
      ? `<div class="win-banner">Team ${w} makes a line! +2 · ${w} 组连线成功！</div>`
      : `<div class="win-banner">It's a draw! · 格子占满，平局！</div>`;
  }

  /* quiet=true 是「收到广播」这条路径：用同一套判定重算局面，但绝不再本地计分（铁律 2）；
     庆祝动画保留 —— 观众屏静音，只在投影上放彩带。 */
  function claim(ci, quiet) {
    if (S.done || S.claims[ci]) return;
    S.claims[ci] = S.turn;
    if (!quiet) TK.score(P.step, S.turn, P.squareScore);
    const line = P.winLines.find(l => l.every(i => S.claims[i] === S.turn));
    if (line) {
      S.done = true;
      S.winner = S.turn;
      if (!quiet) TK.score(P.step, S.turn, P.lineScore);
      render(); renderWin(); TK.celebrate();
    } else if (S.claims.every(Boolean)) {
      S.done = true; S.winner = null;
      render(); renderWin(); TK.sfx.win();
    } else {
      S.turn = S.turn === 'A' ? 'B' : 'A';
      render(); TK.sfx.draw();
    }
    if (!quiet) TK.broadcast({ t: P.msg.claim, ci });
  }

  function reset(quiet) {
    S = { claims: Array(9).fill(null), turn: 'A', done: false, winner: null };
    el('win').innerHTML = '';
    render(); TK.sfx.click();
    if (!quiet) TK.broadcast({ t: P.msg.reset });
  }

  const mod = {
    init(step, practice) {
      P = practice; P.step = step.id;
      S = { claims: Array(9).fill(null), turn: 'A', done: false, winner: null };
      return S;
    },
    mount(h, step, practice) {
      P = practice; P.step = step.id;
      S = S || { claims: Array(9).fill(null), turn: 'A', done: false, winner: null };
      h.insertAdjacentHTML('afterbegin', skeleton());
      el('reset').onclick = () => reset(false);
      TK.snapshotPart(P.snapKey, mod.snapshot);
      TK.applyPart(P.snapKey, applySnap);
      TK.on(P.msg.claim, m => claim(m.ci, true));   // 与迁移前一致：按同一判定重算，不再计分
      TK.on(P.msg.reset, () => { S = { claims: Array(9).fill(null), turn: 'A', done: false, winner: null }; el('win').innerHTML = ''; render(); });
    },
    render,
    actions: {},
    snapshot: () => ({ claims: S.claims.slice(), turn: S.turn, done: S.done, winner: S.winner }),
    reset(state) { S = state; return S; },
  };

  /* 观众屏收到 bingoClaim 时，本地按同样的规则重算一次局面（与原实现一致：
     原 ACT 只用 ci 重建，靠同一套判定得出 turn/done/winner） */
  function applySnap(s) {
    if (!s) return;
    if (s.claims) S.claims = s.claims.slice();
    if (s.turn) S.turn = s.turn;
    if (s.done !== undefined) S.done = !!s.done;
    if (s.winner !== undefined) S.winner = s.winner;
    render();
    if (S.done) renderWin();
  }

  TK.registerModule(NAME, mod);
})();
