/* modules/tool-pager.js —— KET「Sentence Bank 句型库」（自带页号的翻页教学）
 *
 * 为什么不复用 teach-deck：这一环跟讲义分页同源但差异大到不值得硬合（已记进 pitfalls §一）——
 *   ① 页号 / 总页数 / 上一页下一页是它自己的（`#toolInd` / `toolPrev` / `toolNext`，同步动作是 `toolPage`）
 *   ② 每页内容不是通用 block，而是「五个场所卡 + 句型 ul + scaffold 提示 + 听力页」四种零件
 *   ③ 听力页要联动播放器（翻走这一页自动停），而讲义分页没有这个概念
 *   ④ 支持 ← → 方向键翻页
 * 逐字照搬 KET-U7L3「2 句型库」那一段。
 *
 * 契约三件套：render / actions / snapshot / init（+ mount 挂载钩子）
 */
(function () {
  const NAME = 'tool-pager';
  let P = null, S = null, pics = null, audioCtl = null;
  const el = n => document.getElementById(P.ids[n]);
  const PIC = k => `<img class="picimg" src="${TK.img(k)}" alt="">`;

  function skeleton() {
    return `
  <div class="tool-page-tag teacher-only" id="${P.ids.tag}"></div>
  <div class="flash-grid" id="${P.ids.pics}" style="display:none;max-width:760px"></div>
  <ul class="tool-frames" id="${P.ids.frames}"></ul>
  <div id="${P.ids.audioSlot}"></div>
  <div class="scaffold" id="${P.ids.hint}"></div>
  <div class="deck-nav">
    <button class="ghost-btn" id="${P.ids.prev}">${P.prevLabel}</button>
    <span class="page-ind" id="${P.ids.ind}"></span>
    <button class="ghost-btn" id="${P.ids.next}">${P.nextLabel}</button>
  </div>
  <div class="rule-line">${P.rule}</div>`;
  }

  function buildPics() {
    pics = el('pics');
    pics.innerHTML = '';
    P.places.forEach(p => {
      const d = document.createElement('div');
      d.className = 'flash-card static';
      d.innerHTML = `<span class="pic">${PIC(p.svg)}</span><div class="name">${p.name}</div>`;
      pics.appendChild(d);
    });
  }

  /* 与迁移前同一套副作用：切页时若离开听力页就停播；方向键也翻页 */
  function page(n, quiet) {
    S.page = Math.max(0, Math.min(P.pages.length - 1, n));
    const p = P.pages[S.page];
    el('tag').textContent = P.tagPrefix.replace('{n}', S.page + 1).replace('{t}', p.title);
    pics.style.display = p.pics ? 'grid' : 'none';
    el('frames').innerHTML = p.frames.map(f => `<li>${f}</li>`).join('');
    el('hint').innerHTML = p.hint;
    if (audioCtl) {
      audioCtl.show(!!p.audio);
      if (!p.audio) audioCtl.pause();            // 翻离听力页就停，别继续放
    }
    el('ind').textContent = `${S.page + 1} / ${P.pages.length}`;
    if (!TK.isAudience) TK.sfx.draw();
    if (!quiet) TK.broadcast({ t: P.msg, n: S.page });
  }

  const mod = {
    init(step, practice) {
      P = practice; P.step = step.id;
      S = { page: 0 };
      return S;
    },
    mount(h, step, practice) {
      P = practice; P.step = step.id;
      S = S || { page: 0 };
      h.insertAdjacentHTML('afterbegin', skeleton());
      buildPics();
      /* 听力播放器：挂进本页的 slot（观众屏不建，播放器模块自己会跳过） */
      const ap = TK.modules[P.audioModule];
      if (ap && !TK.isAudience) {
        ap.mount(el('audioSlot'), step, { ...P.audio });
        audioCtl = ap.ctl;
      }
      el('prev').onclick = () => page(S.page - 1, false);
      el('next').onclick = () => page(S.page + 1, false);
      document.addEventListener('keydown', e => {
        if (TK.cur() !== step.id || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
        if (e.key === 'ArrowRight') page(S.page + 1, false);
        if (e.key === 'ArrowLeft') page(S.page - 1, false);
      });
      TK.snapshotPart(P.snapKey, mod.snapshot);
      TK.applyPart(P.snapKey, applySnap);
      TK.on(P.msg, m => page(m.n, true));
      page(0, true);
    },
    render() { page(S ? S.page : 0, true); },
    actions: {},
    snapshot: () => S.page,                        // 与迁移前一致：toolPage 是个数字
    reset(state) { S = { page: 0 }; page(0, true); return S; },
  };

  function applySnap(n) { page(n || 0, true); }

  TK.registerModule(NAME, mod);
})();
