/* modules/audio-player.js —— 教材录音播放器（KET 句型库里的 P55 录音）
 *
 * 逐字照搬 KET-U7L3「2 句型库」里的播放器实现（原 `#toolAudio` + auPlay/auBack/auSlow）：
 *   ▶ 播放 / ❚❚ 暂停 / ▶ 继续播放 · ↺ 从头重播 · 0.75× 慢速 · 进度条 + 时间
 *
 * 三条已经修过的规则（照做，不许改）：
 *   1) **播放动作绝不广播** —— 观众屏在同一台机器上，广播出去就是「听两遍」。
 *   2) 播放器整块 `teacher-only` —— 观众屏不出现任何可交互控件。
 *   3) 观众屏不出声 —— 它连 <audio> 都不建（isAudience 直接不挂载）。
 *
 * 素材：mp3 由 scripts/build.py 从 lessons/<课时>.audio/ 读出来转 base64，
 *       放进 LESSON.audio（与照片同一套机制），模块用 TK.audio(key) 取。
 *
 * 契约三件套：render / actions / snapshot / init（+ mount 挂载钩子）
 */
(function () {
  const NAME = 'audio-player';
  let P = null, S = null, auEl = null, slow = false;
  const el = n => document.getElementById(P.ids[n]);

  const fmt = s => {
    s = Math.max(0, Math.floor(s || 0));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };

  function skeleton() {
    return `
  <audio id="${P.ids.el}" preload="metadata" src="${TK.audio(P.src)}"></audio>
  <div class="audio-box teacher-only" id="${P.ids.box}">
    <button class="mega-btn" id="${P.ids.play}">${P.playLabel}</button>
    <div class="au-line">
      <div class="audio-bar"><div class="au-fill" id="${P.ids.fill}"></div></div>
      <span class="au-time"><span id="${P.ids.now}">00:00</span> / <span id="${P.ids.tot}">${fmt(P.totalSec)}</span></span>
    </div>
    <button class="ghost-btn" id="${P.ids.back}">${P.backLabel}</button>
    <button class="ghost-btn" id="${P.ids.slow}">${P.slowLabel}</button>
  </div>`;
  }

  function renderAudio() {
    if (!auEl) return;
    const d = auEl.duration || 0, t = auEl.currentTime || 0;
    el('fill').style.width = (d ? Math.min(100, t / d * 100) : 0) + '%';
    el('now').textContent = fmt(t);
    el('tot').textContent = d ? fmt(d) : fmt(P.totalSec);
    const playing = !auEl.paused && !auEl.ended;
    const btn = el('play');
    btn.textContent = playing ? P.pauseLabel : (t > 0.2 && t < d - 0.2 ? P.contLabel : P.playLabel);
    btn.classList.toggle('playing', playing);
  }

  const auStart = () => {
    auEl.playbackRate = slow ? 0.75 : 1;
    const r = auEl.play();
    if (r && r.catch) r.catch(() => {});
  };

  function pause() { if (auEl && !auEl.paused) auEl.pause(); renderAudio(); }
  function show(v) { const b = el('box'); if (b) b.style.display = v ? 'flex' : 'none'; }

  const mod = {
    init(step, practice) {
      P = practice; P.step = step.id;
      S = { playing: false };
      return S;
    },
    mount(h, step, practice) {
      P = practice; P.step = step.id;
      /* 观众屏不建 <audio>、不绑任何事件：源头不出声、不出现控件 */
      if (TK.isAudience) return;
      h.insertAdjacentHTML('afterbegin', skeleton());
      auEl = el('el');
      el('play').onclick = () => { if (auEl.paused) auStart(); else auEl.pause(); TK.sfx.click(); renderAudio(); };
      el('back').onclick = () => { auEl.currentTime = 0; auStart(); TK.sfx.click(); renderAudio(); };
      el('slow').onclick = () => {
        slow = !slow;
        auEl.playbackRate = slow ? 0.75 : 1;
        const b = el('slow');
        b.textContent = slow ? P.slowOffLabel : P.slowLabel;
        b.classList.toggle('on', slow);
        TK.sfx.click();
      };
      ['timeupdate', 'loadedmetadata', 'play', 'pause', 'ended', 'ratechange']
        .forEach(ev => auEl.addEventListener(ev, renderAudio));
      auEl.addEventListener('error', () => { el('now').textContent = P.loadFail; });
      show(P.visible !== false);
      renderAudio();
    },
    render() { renderAudio(); },
    actions: {},                                  // 播放动作绝不广播（规则 1）
    snapshot: () => ({}),                          // 播放器不进快照：观众屏本来就不播
    reset(state) { S = state; return S; },
    /* 给别的模块（句型库那种自带分页的）用的控制器 */
    ctl: { pause, show, playing: () => !!auEl && !auEl.paused, el: () => auEl },
  };
  TK.registerModule(NAME, mod);
})();
