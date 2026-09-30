/* modules/teach-deck.js —— 讲义分页（讲练双视图里的「讲解」侧）
 *
 * 职责边界（对照 references/shell-boundary.md）：
 *   §三 的讲义 block 词汇表 → DOM，在本模块；分页机制 deckState / doDeck /
 *   lessonDeckHTML（§二 明列在外壳）留在外壳：外壳搭「框」（deck-top / deck-body /
 *   每页 .deck-page / deck-foot / 翻页按钮），本模块填「页体」。
 *
 * 契约三件套 + 挂载钩子：
 *   init(step)           初始 state（页号的事实源在外壳 deckState，这里只带 pages）
 *   mount(host, step)    挂载：把每页页体填进 .deck-page（幂等）
 *   render(state, host)  纯渲染：只填空页，绝不重写已有页（不重置滚动位置）
 *   actions              观众屏收到广播时怎么套用（quiet：不播声、不广播）
 *   snapshot()           进快照的字段（页号，事实源在外壳）
 *   reset(state)         回第 1 页
 */
(function () {
  const NAME = 'teach-deck';

  /* ============ §三 block 词汇表 → DOM ============ */
  const renderBlocks = bs => (bs || []).map(renderBlock).join('');

  function renderBlock(b) {
    switch (b.type) {
      case 'html': return b.html;
      case 'recipe': return b.keys.length > 1
        ? `<div class="recipe-row">${b.keys.map(TK.recipeCard).join('')}</div>`
        : TK.recipeCard(b.keys[0]);
      case 'kv': return b.rows.map(r =>
        `<div class="kv"><span class="kv-k">${r.k}</span><span class="kv-v">${r.v}</span><span class="kv-t">${r.t || ''}</span></div>`).join('');
      case 'timeline': return `<div class="deck-time">${b.items.map(x => `<span>${x}</span>`).join('')}</div>`;
      case 'steps': return `<div class="deck-steps">${b.items.map((x, i) =>
        `<div class="dk-step"><span class="dk-n">${i + 1}</span><span class="dk-do">${x}</span></div>`).join('')}</div>`;
      case 'tips': return `${b.heading ? `<div class="dk-h">${b.heading}</div>` : ''}`
        + `<ol class="deck-tips-list">${b.items.map(x => `<li>${x}</li>`).join('')}</ol>`;
      case 'frames': return b.groups.map(g => `<div class="dk-blk">`
        + `${g.t ? `<div class="dk-h">${g.t}</div>` : ''}`
        + `<div class="dk-i">${g.i}</div><div class="dk-cn">${g.e}</div></div>`).join('');
      case 'cards': return `<div class="ov-dims">${b.items.map(d =>
        `<div class="ov-dim"><div class="ov-name">${d.t}<span class="ov-score">${d.score}</span></div>`
        + `<div class="ov-cn">${d.cn}</div><div class="ov-q">${d.q}</div>`
        + `<ul class="ov-list">${d.items.map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}</div>`
        + (b.foot ? `<div class="dk-cn ov-foot">${b.foot}</div>` : '');
      case 'keytips': return `<div class="deck-keytips">${b.items.map((t, i) =>
        `<div class="dk-tip"><span class="dk-tn">Tip ${i + 1}</span>`
        + `<span><span class="dk-te">${t.en}</span><span class="dk-tc">${t.cn}</span></span></div>`).join('')}</div>`;
      case 'quote': return `<div class="deck-quote">`
        + `${b.label ? `<div class="dk-cn">${b.label}</div>` : ''}`
        + `<div class="${b.cls || 'dk-i'}">${b.text}</div></div>`;
      case 'anno': return `<div class="deck-anno"><div class="dk-ae">${b.e}</div>`
        + `${b.cn ? `<div class="dk-ai">${b.cn}</div>` : ''}</div>`;
      /* text：有序的「行」列表，每行 [kind, 内容, 可选 class, 可选 inline style]。
         kind ∈ h / i / cn / do / mA / ae / ai，渲染成 .dk-<kind>。 */
      case 'text': return (b.lines || []).map(([kind, x, cls, style]) =>
        `<div class="${cls || 'dk-' + kind}"${style ? ` style="${style}"` : ''}>${x}</div>`).join('');
      /* PET 那套「一屏三栏」的三种零件：拆成一页一块之后，仍用它自己的类名与标记，
         这样课堂上的样子没变，只是从并排变成翻页。 */
      case 'notes': return `<div class="teach-col"><h3>${b.h}</h3>`
        + `<ul class="teach-list">${b.items.map((t, i) => `<li data-n="${i + 1}">${t}</li>`).join('')}</ul></div>`;
      case 'langroups': return `<div class="teach-col"><h3>${b.h}</h3>`
        + b.groups.map(g => `<div class="lang-group"><div class="lg-t">${g.t}</div>`
          + `<div class="lg-i">${g.i}</div>${g.e ? `<div class="lg-e">${g.e}</div>` : ''}</div>`).join('') + '</div>';
      case 'samples': return `<div class="teach-col"><h3>${b.h}</h3>`
        + b.items.map(x => `<div class="sample-q">Q：${x.q}</div><div class="sample-a">A：${x.a}</div>`).join('') + '</div>';
      case 'two': return `<div class="ov-two"><div>${renderBlocks(b.left)}</div>`
        + `<div class="deck-quote">${renderBlocks(b.right)}</div></div>`;
    }
    return '';
  }

  const pageBody = p => (p && p.html !== undefined) ? p.html : renderBlocks(p && p.blocks);

  /* 外壳的 lessonDeckHTML 搭框时不需要页体；页体统一走这里 */
  TK.blocks = pageBody;

  /* 只填空页：幂等、不重置滚动位置 */
  function fill(host, pages) {
    if (!host || !pages) return;
    host.querySelectorAll('.deck-page').forEach((el, i) => {
      if (pages[i] && !el.innerHTML.trim()) el.innerHTML = pageBody(pages[i]);
    });
  }

  const mod = {
    init(step) { return { id: step.id, pages: step.lesson || [] }; },

    mount(host, step) { fill(host, step.lesson || []); },

    render(state, host) { if (state) fill(host, state.pages); },

    actions: {
      /* quiet：观众屏套用页号，不播声音、不再广播（否则回环） */
      deck: m => TK.deckQuiet(m.id, m.i),
    },

    snapshot: () => ({ ...TK.deckState }),

    reset(state) { return state; },
  };

  TK.registerModule(NAME, mod);
})();
