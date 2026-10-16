/* modules/gap-fill.js —— 「挖空核对」：句子里的空，一个一个点开
 *
 * 起因（2026-10-16 用户第五条）：填空页把答案直接印在讲义上，空不能逐个揭晓；
 * 而核对用的录音在另一个视图（练习）里，老师得先切过去放音、再切回来讲 —— 来回切。
 * 所以这个模块把三件事放进同一屏：
 *   ① 录音（可选，借 audio-player 的实例与 ctl，翻页/切页都不用离开本屏）
 *   ② 每个空一枚按钮：点一下只揭晓这一个；「揭晓下一空」按顺序来；「全部揭晓」兜底
 *   ③ 归类标签（可选）单独一层揭晓 —— 先填对词，再归类（两个动作分开）
 *
 * 答案**不进 DOM**：只有揭晓时才写进按钮文字。否则观众屏的源码里就躺着答案，
 * 「挖空」等于没挖（这是本模块与「把答案写死在讲义里」的唯一区别，别改回去）。
 *
 * 契约三件套：render / actions / snapshot / init（+ mount 挂载钩子）
 */
function gapFillFactory() {
  const NAME = 'gap-fill';
  let P = null, S = null, audioCtl = null;
  const el = n => document.getElementById(P.ids[n]);

  /* parts = ['前半句', '答案', '后半句', …]：奇数位是空，空的下标 = (j-1)/2。
     拼接时**不加空格** —— 空格写在字符串里（'Shall we ' / ' with …'）。 */
  function rowHTML(it, i) {
    const plain = P.oneShot ? ' plain' : '';
    const body = it.parts.map((x, j) => j % 2
      ? `<button class="gf-blank${plain}" data-blank="${i}:${(j - 1) / 2}" data-on="0"></button>`
      : `<span>${x}</span>`).join('');
    return (it.head ? `<div class="gf-head">${it.head}</div>` : '')
      + `<div class="gf-row"><span class="gf-n">${i + 1}.</span><span class="gf-line">${body}</span>`
      + (it.cat ? `<span class="gf-cat" data-cat="${i}" data-on="0"></span>` : '') + '</div>';
  }

  /* 空的顺序 = 逐句、逐空 —— 「揭晓下一空」按这个顺序走 */
  function nextBlank() {
    for (let i = 0; i < P.items.length; i++) {
      for (let k = 0; k < S.on[i].length; k++) if (!S.on[i][k]) return [i, k];
    }
    return null;
  }
  const totalBlanks = () => S.on.reduce((n, a) => n + a.length, 0);
  const shownBlanks = () => S.on.reduce((n, a) => n + a.filter(Boolean).length, 0);

  function render() {
    if (!S) return;
    const box = el('list');
    box.innerHTML = P.items.map(rowHTML).join('');
    /* 已揭晓的答案写进按钮；其余按钮保持空 —— 答案不在 DOM 里 */
    box.querySelectorAll('[data-blank]').forEach(b => {
      const [i, k] = b.dataset.blank.split(':').map(Number);
      if (S.on[i][k]) { b.textContent = P.items[i].parts[k * 2 + 1]; b.dataset.on = '1'; }
      /* oneShot（不给可填的框、全班答完一次性揭晓）：空不可点，只留「全部揭晓」 */
      if (!TK.isAudience && !P.oneShot) b.onclick = () => reveal(i, k, false);
    });
    box.querySelectorAll('[data-cat]').forEach(c => {
      const i = +c.dataset.cat;
      if (S.cats[i]) { c.textContent = P.items[i].cat; c.dataset.on = '1'; }
    });
    const nx = el('next');
    if (nx) {
      nx.style.display = P.oneShot ? 'none' : '';
      const left = nextBlank();
      nx.disabled = !left;
      nx.textContent = left ? P.nextLabel + `（还剩 ${totalBlanks() - shownBlanks()} 空）` : P.doneLabel;
    }
    const all = el('all');
    if (all) {
      all.disabled = !nextBlank();
      all.textContent = P.oneShot ? (P.oneShotLabel || P.allLabel) : P.allLabel;
    }
    const cats = el('cats');
    if (cats) {
      const hasCat = P.items.some(it => it.cat);
      cats.style.display = hasCat ? '' : 'none';
      cats.disabled = !hasCat || S.cats.every(Boolean);
    }
    const win = el('win');
    if (win) {
      win.textContent = nextBlank() ? ''
        : (S.cats.every(Boolean) ? P.allDone : P.blankDone);
    }
    return S;
  }

  /* quiet=true 是「收到广播」这条路径：只套用状态，绝不再广播（否则自激） */
  function reveal(i, k, quiet) {
    if (!S || S.on[i][k]) return;
    S.on[i][k] = true;
    render(); TK.sfx.click();
    if (!quiet) TK.broadcast({ t: P.msg.blank, i, k });
  }
  function revealNext(quiet) {
    const n = nextBlank();
    if (n) reveal(n[0], n[1], quiet);
  }
  function revealAll(quiet) {
    S.on = S.on.map(a => a.map(() => true));
    render(); TK.sfx.click();
    if (!quiet) TK.broadcast({ t: P.msg.blank, i: -1, k: -1 });
  }
  function revealCats(quiet) {
    if (S.cats.every(Boolean)) return;
    S.cats = S.cats.map(() => true);
    render(); TK.sfx.click();
    if (!quiet) TK.broadcast({ t: P.msg.cats });
  }
  function reset(quiet) {
    S.on = S.on.map(a => a.map(() => false));
    S.cats = S.cats.map(() => false);
    render(); TK.sfx.click();
    if (!quiet) TK.broadcast({ t: P.msg.reset });
  }

  /* 广播来的状态：只套用，不扣不加 */
  function applySnap(s) {
    if (!s || !Array.isArray(s.on)) return;
    S.on = s.on.map(a => a.slice()); S.cats = (s.cats || []).slice();
    render();
  }

  const mod = {
    init(step, practice) {
      P = practice; P.step = step.id;
      S = {
        on: P.items.map(it => it.parts.filter((_, j) => j % 2).map(() => false)),
        cats: P.items.map(() => false),
      };
      return S;
    },
    mount(h, step, practice) {
      P = practice; P.step = step.id;
      S = S || mod.init(step, practice);
      h.insertAdjacentHTML('afterbegin', skeleton());
      /* 录音：借音频播放器一个实例（它自己跳过观众屏：不建 <audio>、不出声） */
      if (P.audio && P.audioModule) {
        const apDef = TK.modules[P.audioModule];
        const ap = (typeof apDef === 'function') ? apDef() : apDef;
        if (ap && !TK.isAudience) {
          ap.mount(el('audioSlot'), step, { ...P.audio });
          audioCtl = ap.ctl;
        }
      }
      if (!TK.isAudience) {
        el('next').onclick = () => revealNext(false);
        el('all').onclick = () => revealAll(false);
        el('cats').onclick = () => revealCats(false);
        el('reset').onclick = () => reset(false);
      }
      TK.snapshotPart(P.snapKey, mod.snapshot);
      TK.applyPart(P.snapKey, applySnap);
      TK.on(P.msg.blank, m => {
        if (m.i < 0) revealAll(true); else reveal(m.i, m.k, true);
      });
      TK.on(P.msg.cats, () => revealCats(true));
      TK.on(P.msg.reset, () => reset(true));
      render();
    },
    render,
    actions: {},
    snapshot: () => ({ on: S.on.map(a => a.slice()), cats: S.cats.slice() }),
    reset(state) { S = state; return S; },
  };

  /* 版式按 references/typography.md §八：① 题目 → ② 录音（可选）→ ③ 句子（素材）
     → ④ 一行控件 → ⑤ 说明。 */
  function skeleton() {
    return `
  <div class="prac-set">
    <div class="question">${P.title}</div>
    <div class="scaffold"><b>${P.taskEn}</b><br>${P.taskCn}</div>
  </div>
  <div class="prac-set">
    <div id="${P.ids.audioSlot}"></div>
  </div>
  <div class="prac-set">
    <div class="gf-list" id="${P.ids.list}"></div>
  </div>
  ${P.bank ? `<div class="prac-set">
    <div class="gf-bank-k">${P.bankLabel || '词库'}</div>
    <div class="reminder-chips">${P.bank.map(x => `<span>${x}</span>`).join('')}</div>
  </div>` : ''}
  <div class="prac-set">
    <div class="btn-row teacher-only">
      <button class="mega-btn" id="${P.ids.next}">${P.nextLabel}</button>
      <button class="ghost-btn" id="${P.ids.all}">${P.allLabel}</button>
      <button class="ghost-btn" id="${P.ids.cats}">${P.catsLabel}</button>
      <button class="ghost-btn" id="${P.ids.reset}">${P.resetLabel}</button>
    </div>
  </div>
  <div class="prac-set">
    <div id="${P.ids.win}" class="big-sub"></div>
    <div class="rule-line">${P.rule}</div>
  </div>`;
  }

  return mod;
}
TK.registerModule('gap-fill', gapFillFactory);
