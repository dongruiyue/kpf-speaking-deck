/* templates/lesson.example.js —— 一节课的数据长什么样
 *
 * 用法：复制成 lessons/<name>.js，改 LESSON_META 与 steps。
 * 约定：`const LESSON_META = {...};` 必须独占一行（行首；build.py 直接 JSON.parse 它，
 *       用来拿标题 / 频道名 / 存储前缀 / 端口 / 输出文件名）。
 * 图片不写在这里：放 lessons/<name>.img/<键名>.jpg，build 时转 base64 注入。
 * 讲义页（lesson）用 references/shell-boundary.md §三 的 block 词汇；
 * 练习页（practice）用 modules/ 里的模块，type 后面紧跟 snapKey（build.py 靠这个找模块）。
 *
 * 文案写法（references/typography.md §四，逐条照做）：
 *   1. 教师操作类（label / d / tip / talk.cn / 按钮 *Label / rule / emptyText / needDecide /
 *      讲义页 title / 块标题 h）—— 中文在前；确需英文术语时写成全角括号「中文（English）」，
 *      不许「英文 中文」并排，也不许同一处一会儿英文在前一会儿中文在前。
 *   2. 学生任务类（bank / frames 的 i / samples 的 q 与 a / options / 功能语言例句）——
 *      英文逐字保留；中文注解走独立字段或独立行（cn / e / `<br>` 之后），不与英文同行。
 *   3. 标点：中文全角（，。、：；「」《》），英文与数字半角；中英之间一个半角空格，
 *      不连用两个空格，不用全角空格。
 *   4. 序号只用一套 `1. 2. 3.`；勾选用 `✓`，展开用 `▾`。
 *   5. 一条文案要念得完 —— 超过约 40 字就拆成两三条短句。
 */
const LESSON_META = {"title":"示例课 · Speaking 课堂工具","docTitle":"示例课 · Speaking 课堂工具","subtitle":"一句话副标题","channel":"demo-class-v1","keyPrefix":"demo","folder":"demo","port":8890,"launcher":"启动示例课.command","outFile":"示例课-Speaking-课堂工具.html","imgNote":"0 张照片","dashTitle":"示例课 · 上课流程","dashSub":"上课顺序：…","deckHint":"讲义一页一件事，用底部「← 上一页 / 下一页 →」翻；练完进练习。","pracHint":"练完回看要点，这个环节就在这里闭环。","homeTip":"<b>主页：</b>先点「0. 总览」。","homeTalkEn":"Today we do two parts.","homeTalkCn":"今天走两个环节","frameNote":{"mod":"本环节句架 · 练习时随时参考","general":"通用句架 · 每个环节都用得上"},"frameDefault":"overview"};

const LESSON = (() => {
  /* 句架条：按环节 id 给内容 */
  const frames = { overview: ['Both photos show …'], p1: ['+ also / because / for example'] };

  /* 参考抽屉：两个 tab + 各自的正文 HTML */
  const ref = {
    tabs: [{ id: 'frames', label: '句型（Sentence Frames）' }, { id: 'vocab', label: '语料库（Word Bank）' }],
    body: { frames: '<h4>句型</h4><ul><li>…</li></ul>', vocab: '<h4>词汇</h4><ul><li>…</li></ul>' },
  };

  /* 编号操作卡 */
  const recipe = { p1: { badge: '2 min', items: ['第一条', '第二条', '第三条'] } };

  const STEPS = [
    {
      id: 'overview', n: 0, label: '总览（Overview）', icon: 'grid', time: '4 分钟',
      kind: '总览 · 只讲', tier: 'core', tierText: '总览',
      d: '菜单卡上的一句话描述。',
      tip: '<b>演讲者控制台的教学提示：</b>这一段只在教师端出现。',
      talk: [{ en: 'Say this in English.', cn: '中文注解' }],
      /* 只讲不练：讲义直接铺在 stage 里 */
      lesson: [
        { title: '第一页标题', blocks: [
          { type: 'recipe', keys: ['p1'] },                                   // 操作卡
          { type: 'kv', rows: [{ k: 'Part 1', v: '问答（Interview）', t: '<b>约 2 分钟</b>' }] },
          { type: 'timeline', items: ['<b>0–10 秒</b> 描述共同主题'] },
          { type: 'text', lines: [['h', '小标题'], ['cn', '中文一行', 'dk-cn ov-note']] },
          { type: 'html', html: '<div class="dk-do">万不得已才用 html 块</div>' },
        ] },
      ],
    },
    {
      id: 'p1', n: 1, label: 'Part 1 问答（Interview）', icon: 'mic', time: '9 分钟',
      kind: '讲 3 分钟 + 练 6 分钟', tier: 'core', tierText: '核心',
      d: '菜单卡描述。', tip: '教学提示。', talk: [{ en: 'Say this.', cn: '中文' }],
      /* 讲 + 练：有 practice 才会出现「1. 讲解 / 2. 练习」双视图 */
      lesson: [
        { title: '2 分钟怎么答', blocks: [
          { type: 'tips', heading: '关键注意事项', items: ['原文一条', '原文两条'] },
          { type: 'frames', groups: [{ t: '第 1 组 · 说清在讲哪张（Saying which picture）', i: 'The picture at the top shows …', e: '先交代在讲哪一张，再往下补细节' }] },
          { type: 'quote', label: '题目', text: '示范答案', cls: 'dk-mA' },
          { type: 'anno', e: '这句为什么拿分', cn: '中文注解' },
          { type: 'cards', items: [{ t: 'Discourse Management', cn: '话语组织', score: '5 分', q: '问句', items: ['细项'] }], foot: '页脚一句话' },
          { type: 'steps', items: ['第一步', '第二步'] },
          { type: 'keytips', items: [{ en: 'Compare, don\'t describe.', cn: '是比较不是描述' }] },
        ] },
      ],
      practice: {
        type: 'draw-question', snapKey: 'p1', msg: 'p1State', msgShape: 'state',
        layout: 'checks', bank: { 'Test 1': ['问题一', '问题二'] },
        cards: [{ t: 'also / as well', cn: '补充信息', frames: [] },
                { t: 'because / so', cn: '给出理由', frames: [] },
                { t: 'for example / such as', cn: '举个例子', frames: [] }],
        badge: recipe.p1.badge, nos: ['1.', '2.', '3.'], cardAttr: 'p1card',
        ids: { turn: 'p1Turn', box: 'p1Q', steps: 'p1Steps', draw: 'p1Draw', sw: 'p1Switch', reset: 'p1Reset' },
        tag: 'Part 1 Interview', emptyTag: 'Press · Part 1 Interview', emptyText: '点「抽题」抽一道问题',
        drawLabel: '抽题', nextLabel: '下一题',
        switchLabel: '换手', resetLabel: '重来', reward: 1,
        doneText: 'Three ways used! +1 each group', turnPrefix: '轮到 Team ', turnSuffix: ' · 答完补一句',
        rule: '答完补一句（also / because / for example）',
      },
    },
  ];

  return { meta: LESSON_META, frames, recipe, ref, steps: STEPS };
})();

/* 图片由 build.py 注入（lessons/<name>.img/） */
Object.assign(LESSON, { img: __LESSON_IMG__ });
