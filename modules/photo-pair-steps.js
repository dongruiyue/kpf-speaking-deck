/* modules/photo-pair-steps.js —— Part 2「真题 + 两张照片 + 操作卡/句架/打勾三合一」
 *
 * 用在 FCE Part 2 练习页（§六 的 photo-pair-steps）：
 *   选真题 → 题目 + 两张照片 → 三步打勾（三步全中该组 +2）→ 60s 长发言 / 追问 30s（答好该组 +1）
 *
 * 契约三件套：render / actions / snapshot / init（+ mount 挂载钩子）
 * 铁律：本地动作执行一次并广播一次；收到广播只套用状态，绝不再本地计分。
 */
(function () {
  const NAME = 'photo-pair-steps';
  let P = null, S = null;
  const ATTR = k => (k ? 'data-' + k.replace(/([A-Z])/g, '-$1').toLowerCase() : 'data-none');   // p2Check → data-p2-check
  const q = k => document.querySelectorAll('[' + ATTR(k) + ']');
  const el = n => document.getElementById(P.ids[n]);

  /* ---------------- 静态骨架：只建一次 ---------------- */
  function skeleton() {
    return `
  <div class="task-row" id="${P.ids.tasks}"></div>
  <div class="q-bar" id="${P.ids.q}"><span class="q-tag">${P.emptyTag}</span>${P.emptyText}</div>
  <div class="photo-pair sm" id="${P.ids.photos}"></div>
  <div class="stepcard" id="${P.ids.steps}">${P.steps.map((s, i) =>
    TK.stepRow(i === 0 ? P.badge : '', P.nos[i], s.t, '', s.frames, ATTR(P.cardAttr), i)).join('')}</div>
  <div class="turn-label" id="${P.ids.turn}"></div>
  <div class="teacher-only" style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
    <button class="mega-btn" id="${P.ids.long}">${TK.ICONS.timer} ${P.longLabel}</button>
    <button class="mega-btn mustard" id="${P.ids.follow}">${TK.ICONS.timer} ${P.followLabel}</button>
    <button class="ghost-btn" id="${P.ids.sw}">${P.switchLabel}</button>
    <button class="ghost-btn" id="${P.ids.reset}">${P.resetLabel}</button>
  </div>
  <div class="sentence" id="${P.ids.followQ}" style="display:none"></div>
  <div id="${P.ids.result}" class="big-sub"></div>
  <div class="score-team teacher-only" id="${P.ids.scoreRow}" style="display:none">
    ${P.scoreButtons.map(b => `<button class="${b.team === 'A' ? 'a' : 'b'}" ${ATTR(P.scoreAttr)}="${b.team}">${b.label}</button>`).join('')}
  </div>
  <div class="rule-line">${P.rule}</div>`;
  }

  /* ---------------- 纯渲染：幂等，不重置滚动 ---------------- */
  function render() {
    if (!S) return;
    const task = S.task === null ? null : P.tasks[S.task];
    el('tasks').innerHTML = P.tasks.map((t, i) =>
      `<button class="task-btn${S.task === i ? ' cur' : ''}" ${ATTR(P.taskAttr)}="${i}">${t.name}</button>`).join('');
    q(P.taskAttr).forEach(b => b.onclick = () => pick(+b.dataset[P.taskAttr]));
    el('q').innerHTML = task === null
      ? `<span class="q-tag">${P.emptyTag}</span>${P.emptyText}`
      : `<span class="q-tag">${task.name} · ${task.note}</span>${task.q}`;
    el('photos').innerHTML = task === null ? '' : task.photos.map((k, i) =>
      `<div class="ph"><img src="${TK.img(k)}" alt=""><span class="ph-tag">${P.photoTags[i]}</span></div>`).join('');
    const tl = el('turn');
    tl.textContent = `${P.turnPrefix}${S.turn}`;
    tl.style.color = S.turn === 'A' ? 'var(--teal)' : 'var(--terra-ink)';
    q(P.cardAttr).forEach(b => {
      const i = +b.dataset[P.cardAttr];
      b.classList.toggle('on', S.checks[i]);
      b.disabled = S.done || S.checks[i];
      b.textContent = S.checks[i] ? '已打勾' : '打勾';
    });
    const fq = el('followQ');
    const showF = S.follow && task !== null;
    fq.style.display = showF ? 'block' : 'none';
    fq.textContent = showF ? task.follow : '';
    el('scoreRow').style.display = S.follow ? 'flex' : 'none';
    el('result').innerHTML = S.done ? `<b>${P.doneText}</b> Team ${S.turn} +${P.doneScore}` : '';
  }

  const emit = () => TK.broadcast({ t: P.msg, s: mod.snapshot() });

  /* ---------------- 本地动作：执行一次 + 广播一次 ---------------- */
  function pick(i) {
    S.task = i; S.checks = [false, false, false]; S.follow = false; S.done = false;
    render(); TK.sfx.click(); emit();
  }

  function check(i) {
    if (S.task === null || S.done || S.checks[i]) return;
    S.checks[i] = true;
    if (S.checks.every(Boolean)) {
      S.done = true;
      TK.score(P.step, S.turn, P.doneScore);
      TK.celebrate();
    }
    render(); TK.sfx.draw(); emit();
  }

  function follow() {
    if (S.task === null) return;
    S.follow = !S.follow;
    if (S.follow) TK.timer(P.followSec, true);
    render(); TK.sfx.click(); emit();
  }

  function flip() {
    S.turn = S.turn === 'A' ? 'B' : 'A';
    render(); TK.sfx.click(); emit();
  }

  function reset() {
    S.checks = [false, false, false]; S.follow = false; S.done = false;
    render(); TK.sfx.click(); emit();
  }

  function applySnap(s) {
    if (!s) return;
    S.task = (s.task === undefined ? null : s.task);
    S.checks = (s.checks || [false, false, false]).slice();
    S.follow = !!s.follow;
    S.done = !!s.done;
    S.turn = s.turn || 'A';
    render();
  }

  const mod = {
    init(step, practice) {
      P = practice; P.step = step.id;      // 计分要落在这一环节的台账栏上
      S = { task: null, checks: [false, false, false], follow: false, done: false, turn: 'A' };
      return S;
    },

    mount(h, step, practice) {
      P = practice; P.step = step.id;
      h.insertAdjacentHTML('afterbegin', skeleton());
      el('long').onclick = () => TK.timer(P.longSec, true);
      el('follow').onclick = follow;
      el('sw').onclick = flip;
      el('reset').onclick = reset;
      q(P.cardAttr).forEach(b => b.onclick = () => check(+b.dataset[P.cardAttr]));
      q(P.scoreAttr).forEach(b => b.onclick = () => {
        TK.score(step.id, b.dataset[P.scoreAttr], 1); TK.sfx.draw();
      });
      TK.snapshotPart(P.snapKey, mod.snapshot);
      TK.applyPart(P.snapKey, applySnap);
      TK.on(P.msg, m => applySnap(m.s));
    },

    render,
    actions: {},
    snapshot: () => ({ task: S.task, checks: S.checks.slice(), follow: S.follow, done: S.done, turn: S.turn }),
    reset(state) { S = state; return S; },
  };

  TK.registerModule(NAME, mod);
})();
