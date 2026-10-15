/* lessons/sample-pet.js —— 原创示例课（PET 风格）：阅读习惯 Reading Habits
 *
 * 这是一节纯原创的样课（skill 发布用）：40 分钟，目标是「回应同伴 + 给理由」
 * （What about you? / I agree because ...）。不含任何出版物原文、真题、照片或录音；
 * Part 2 的两张场景图与 Part 3 的配图是本文件末尾用代码绘制的原创 SVG 插画
 * （纯文本，非照片），经 Object.assign 合入 LESSON.img —— 所以没有 lessons/sample-pet.img/ 目录。
 *
 * 结构模仿 pet-l4：intro 总览（只讲）→ p1 Interview（抽题）→ p2 Picture（描述接龙，
 * 照片位用原创插画）→ p3 Collaborative（协商决策）→ p4 Discussion（抽题 + 范文）。
 * 冠军页由外壳自动生成；台账默认收录全部带 practice 的环节（p1–p4）。
 */

const LESSON_META = {"theme": "pf", "title": "示例课 PET · Reading Habits 阅读习惯", "docTitle": "示例课 PET · 阅读习惯 · Speaking 课堂工具", "subtitle": "示例课 · 阅读习惯 · Interview / Picture / Collaborative / Discussion", "channel": "sample-pet-v1", "keyPrefix": "samplepet", "folder": "sample-pet", "port": 8822, "launcher": "启动示例课-PET.command", "outFile": "示例课-PET-阅读习惯.html", "imgNote": "0 张照片；Part 2/3 配图是代码绘制的原创示意插画", "dashTitle": "示例课 PET · 阅读习惯 · 上课流程", "dashSub": "上课顺序：先走「0. 总览」弄清四个 Part 考什么、今天怎么练，再按 Part 1 → 2 → 3 → 4 逐个走。每个 Part 先讲解、再练习，练完回看要点闭环。计分写在每个环节里，总分课末汇总。按 P 进入演讲者模式。", "deckHint": "讲义一页一件事，用底部「← 上一页 / 下一页 →」翻，翻页会同步到投影；练习时句架挂在屏幕底部。", "pracHint": "练完回看要点，这个 Part 就在这里闭环。", "homeTip": "<b>主页：</b>先点「0. 总览」把今天的路线说清楚，再按 Part 1 → 2 → 3 → 4 逐个走。每个 Part 都是先讲解规律、再进练习，练完回看要点闭环。", "homeTalkEn": "Today our topic is reading habits, and we practise all four speaking parts.", "homeTalkCn": "今天的话题是阅读习惯，四个 Part 各练一遍", "frameNote": {"mod": "这个 Part 的句架 · 练习时抬头就能看", "general": "通用句架 · 每个 Part 都用得上"}, "frameDefault": "intro", "frameBar": {"suppress": ["p2", "p3"]}};

const LESSON = (() => {

/* ================= 原创 SVG 插画（代码绘制，非照片） ================= */
/* 注意：SVG 里不写 class，免得混进 check-classes 的类名核对；width/height 必须写，
   否则浏览器给不出 naturalWidth，verify 第 6 条会误判为「坏图」。 */
const SVG = (w, h, inner) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`);
const ART = {
  /* Part 2 · Picture A：一个女孩在公交车上看书 */
  readBus: SVG(640, 480, `<rect width="640" height="480" fill="#FBF2DC"/><rect x="60" y="56" width="520" height="200" rx="18" fill="#CDE7F0" stroke="#E0A82E" stroke-width="6"/><circle cx="150" cy="112" r="26" fill="#F5C04E"/><ellipse cx="420" cy="120" rx="52" ry="18" fill="#FFFFFF"/><ellipse cx="456" cy="110" rx="34" ry="14" fill="#FFFFFF"/><rect x="516" y="140" width="12" height="52" fill="#8A5A3B"/><circle cx="522" cy="126" r="30" fill="#6BCB77"/><rect x="60" y="290" width="520" height="130" rx="16" fill="#D96C4F"/><rect x="60" y="338" width="520" height="14" fill="#B4472C"/><circle cx="500" cy="238" r="24" fill="#E8B08E"/><path d="M470 266 Q500 252 530 266 L536 336 H464 Z" fill="#E0A82E"/><circle cx="310" cy="214" r="32" fill="#4A3226"/><circle cx="310" cy="226" r="26" fill="#F2C9A4"/><path d="M272 260 Q310 242 348 260 L356 336 H264 Z" fill="#2C786C"/><path d="M310 314 C296 306 280 306 272 310 V342 C280 338 296 338 310 346 C324 338 340 338 348 342 V310 C340 306 324 306 310 314 Z" fill="#FFFFFF" stroke="#2E2E2C" stroke-width="3"/>`),
  /* Part 2 · Picture B：一个男孩在公园的树下看书 */
  readPark: SVG(640, 480, `<rect width="640" height="480" fill="#D8ECF7"/><circle cx="90" cy="80" r="34" fill="#F5C04E"/><path d="M250 92 Q262 80 274 92 M282 92 Q294 80 306 92" stroke="#2E2E2C" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M380 66 Q390 56 400 66 M408 66 Q418 56 428 66" stroke="#2E2E2C" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="0" y="330" width="640" height="150" fill="#BFE3C0"/><rect x="430" y="180" width="34" height="170" rx="10" fill="#8A5A3B"/><circle cx="447" cy="150" r="70" fill="#6BCB77"/><circle cx="390" cy="182" r="44" fill="#6BCB77"/><circle cx="505" cy="186" r="44" fill="#6BCB77"/><rect x="196" y="330" width="92" height="26" rx="12" fill="#33415C"/><path d="M200 262 Q236 248 272 262 L280 334 H192 Z" fill="#3E6FB0"/><circle cx="236" cy="216" r="28" fill="#2E2E2C"/><circle cx="236" cy="228" r="24" fill="#F2C9A4"/><path d="M236 316 C224 309 210 309 203 313 V341 C210 337 224 337 236 344 C248 337 262 337 269 341 V313 C262 309 248 309 236 316 Z" fill="#FFFFFF" stroke="#2E2E2C" stroke-width="3"/><circle cx="120" cy="402" r="8" fill="#FF8A5C"/><circle cx="560" cy="420" r="8" fill="#E0A82E"/>`),
  /* Part 3 配图：一摞读物 */
  p3books: SVG(300, 300, `<rect width="300" height="300" rx="28" fill="#FBF2DC"/><rect x="60" y="180" width="180" height="34" rx="8" fill="#2C786C"/><rect x="72" y="146" width="156" height="32" rx="8" fill="#D96C4F"/><rect x="62" y="112" width="176" height="32" rx="8" fill="#E0A82E"/><rect x="80" y="80" width="140" height="30" rx="8" fill="#6BCB77"/><path d="M150 40 l8 16 18 3 -13 13 3 18 -16 -8 -16 8 3 -18 -13 -13 18 -3 Z" fill="#E0A82E" stroke="#B4472C" stroke-width="2"/>`),
};

/* ================= 数据（全部原创） ================= */

/* Part 1 题库：Phase 1 基本信息 + Phase 2 阅读习惯 */
const P1_QUESTIONS = [
  { phase: 1, q: "What's your name?" },
  { phase: 1, q: 'How old are you?' },
  { phase: 1, q: 'Where do you live?' },
  { phase: 1, q: 'Who do you live with?' },
  { phase: 2, q: 'Do you like reading? Why? / Why not?' },
  { phase: 2, q: 'What kind of books do you like best? Why?' },
  { phase: 2, q: 'Where do you usually read? Why there?' },
  { phase: 2, q: 'Tell us about a book you read recently.' },
  { phase: 2, q: 'Do you prefer paper books or e-books? Why?' },
  { phase: 2, q: 'How often do you read in English?' },
];

/* Part 2 两张「图」：原创插画，描述方法与照片完全一致 */
const P2_PHOTOS = [
  { key: 'readBus', label: 'Picture A · It shows a girl reading a book on the bus.' },
  { key: 'readPark', label: 'Picture B · It shows a boy reading under a tree in the park.' },
];

/* Part 3 情境：乡下一周没有网络，只能带一样读物 */
const P3_SITUATION_EN = `Leo is going to spend one week at his grandmother's house in the countryside. There is no internet there. He can take ONE thing to read in the evenings. Talk together and decide which one would be best.`;
const P3_SITUATION_CN = 'Leo 要去乡下奶奶家住一周，那里没有网络，他只能带一样读物打发晚上的时间——和同伴把所有选项都聊一遍，最后一起决定带哪一样。';
const P3_OPTIONS = ['a long novel', 'a comic book', 'an animal magazine', 'a book of short stories', 'a puzzle and quiz book', 'an e-reader full of books'];

/* Part 4 讨论题 + 原创范文（范文是纯文本，练习页用 textContent 呈现，不写标签） */
const P4_QUESTIONS = [
  { q: 'Do you think reading is a good hobby for teenagers? (Why?)',
    model: `Yes, I do. Reading is a great hobby because it is relaxing, and it also teaches you new words. For example, when I read stories in English, I learn phrases that I can later use in my own speaking.` },
  { q: 'Which do you prefer, reading a book or watching the film of the book? (Why?)',
    model: `I prefer reading the book. The pictures in my head are usually better than the film, and I can stop and think whenever I want. Also, books often have more details than films.` },
  { q: 'How often should students read in English? (Why?)',
    model: `I think students should read in English a little every day, maybe fifteen or twenty minutes. If you read often, the words become familiar, so reading gets easier and easier.` },
  { q: 'Is it better to read on paper or on a screen? (Why? / Why not?)',
    model: `For me, paper is better. My eyes get tired when I read on a screen for a long time, and I like the feeling of real pages. Although e-books are easy to carry, I still choose paper when I can.` },
  { q: 'Some people say that one day nobody will read paper books. Do you agree? (Why? / Why not?)',
    model: `I don't agree. E-books are popular, but many people love real books — you can share them and keep them, and they never run out of battery. So I think paper books will stay with us.` },
];

/* ===== 每个 Part 的讲解页：① 做题规律 ② 应对方案 ③ 开口示范（全部原创） ===== */
const PART_LESSON = {
  p1: {
    notes: [
      `用完整句子回答，声音响亮——<b>绝不只答一个词</b>。`,
      `答完再补一句：<b>原因、例子或小细节</b>，这就是「拓展三法」。`,
      `没听清就大方请考官重复：<b>Sorry, could you repeat that, please?</b>`,
      `回答时看着考官或搭档，<b>保持眼神交流</b>。`,
    ],
    lang: [
      { t: '补细节', i: `I'm 14. <b>Actually</b>, my birthday is next week.`, e: '补一个别人不知道的细节，回答马上变长。' },
      { t: '对比', i: `I like stories, <b>but</b> I don't often have time to read.`, e: '先肯定、再转折，最自然的加长办法。' },
      { t: '原因', i: `I like the school library <b>because</b> it is quiet and full of comics.`, e: '一个观点 + 一个理由，考官最想听的结构。' },
      { t: '举例', i: `I read a lot of magazines. <b>For example</b>, a science magazine about animals.`, e: '想不出理由的时候，就举一个例子。' },
      { t: '频率', i: `I <b>usually</b> read before bed. · I <b>often</b> read on the bus.`, e: '习惯类问题用频率副词开头最稳。' },
    ],
    samples: [
      { q: 'Do you like reading? Why? / Why not?', a: `Yes, I do. I like reading <b>because</b> stories take me to new worlds. <b>For example</b>, last week I read a book about a boy who sailed around the world alone.` },
      { q: 'Do you prefer paper books or e-books? Why?', a: `I prefer paper books <b>because</b> I like the feeling of real pages. <b>Also</b>, my eyes get tired when I read on a screen for too long.` },
    ],
    recap: ['整句回答，再加一句', 'Actually / but / because / For example', '答完抛回去：What about you?'],
  },
  p2: {
    notes: [
      `按顺序说：<b>先整体、再细节</b>——谁在图里、在哪里、在做什么。`,
      `说「有什么」用 <b>there is / there are</b>；说动作和穿着用<b>现在进行时</b>。`,
      `位置词让描述有层次：<b>on the left / in the background / next to</b>。`,
      `叫不出名字的东西就猜：<b>It looks like a …</b> / <b>Maybe it's a …</b>`,
      `说错不要停，<b>自我纠正</b>之后接着说。`,
    ],
    lang: [
      { t: '开头 · 看到什么', i: `<b>In this picture I can see</b> … · <b>There's a</b> … / <b>There are some</b> …`, e: '' },
      { t: '在哪里 · 位置', i: `on the left / right · <b>in the background</b> · in the middle · next to · behind · between`, e: '' },
      { t: '人和动作 · 现在进行时', i: `She <b>is reading</b> a book. · He <b>is wearing</b> a blue T-shirt. · They <b>are sitting</b> …`, e: '' },
      { t: '猜测 · 拿不准就这么说', i: `<b>It looks like</b> … · <b>Maybe</b> it's … · <b>It's probably</b> …`, e: '' },
    ],
    samples: [
      { q: 'Picture B — It shows a boy reading under a tree.', a: `In this picture I can see a boy in a park. He <b>is sitting</b> under a big tree and he <b>is reading</b> a book. He <b>is wearing</b> a blue T-shirt. <b>In the background</b>, I can see the sun and some birds. <b>It's probably</b> a warm afternoon.` },
    ],
    recap: ['先整体后细节，按顺序说', 'there is + 现在进行时', '拿不准就 It looks like …'],
  },
  p3: {
    notes: [
      `先听清<b>情境和任务</b>，再开口。`,
      `每个选项都聊一句：<b>提建议 + 给原因</b>，别只念选项名。`,
      `把球抛给同伴：<b>What do you think?</b> 听完要回应。`,
      `<b>别太早下结论</b>——所有选项都讨论过再决定。`,
      `最后必须<b>一起说出决定</b>，并各给一个理由。`,
    ],
    lang: [
      { t: '提建议', i: `<b>What about</b> a comic book? · <b>How about</b> …? · <b>I think he should take</b> …`, e: '' },
      { t: '问、给意见', i: `<b>What do you think?</b> · Do you agree? · <b>In my opinion</b> …`, e: '' },
      { t: '同意、不同意', i: `<b>That's true.</b> · <b>I agree with you.</b> · <b>I'm not sure about that because</b> …`, e: '' },
      { t: '收尾 · 达成一致', i: `<b>OK, so we agree</b> — let's choose … · <b>Are you OK with that?</b> · Yes, <b>let's go for it</b>.`, e: '' },
    ],
    samples: [
      { q: 'Leo can take ONE thing to read for a week without internet. Decide together.', a: `A: <b>What about</b> a long novel? A week is a long time.<br>B: <b>I'm not sure about that because</b> he might finish it in two days. <b>How about</b> a puzzle and quiz book?<br>A: Puzzles are fun, <b>but</b> once you finish one, you can't do it again. <b>I think</b> the comic book is better — he can read it many times.<br>B: <b>That's true.</b> <b>OK, so we agree</b> — let's choose the comic book.` },
    ],
    recap: ['建议 + 原因，一轮接一轮', '问同伴：What do you think?', '所有选项聊完再定'],
  },
  p4: {
    notes: [
      `听清问题<b>直接回答</b>，不要绕远。`,
      `完整回答三件套：<b>观点 + 原因 + 例子</b>。`,
      `回应搭档再说自己：<b>I agree with you, and I also think …</b>`,
      `两个人说得<b>一样多</b>——别独白，也别沉默。`,
      `换着词说，展示<b>词汇和句型的多样性</b>。`,
    ],
    lang: [
      { t: '给观点', i: `<b>I think</b> … · <b>In my opinion</b> … · <b>For me</b>, …`, e: '' },
      { t: '加理由、举例', i: `… <b>because</b> … · … <b>so</b> … · <b>For example</b>, …`, e: '' },
      { t: '回应同伴', i: `<b>I agree with you, and I also think</b> … · <b>I see your point, but</b> …`, e: '' },
      { t: '比较、让步 · 提分句', i: `Paper books are <b>better than</b> screens for me. · <b>Although</b> e-books are handy, I still …`, e: '' },
    ],
    samples: [
      { q: 'Which do you prefer, reading a book or watching the film of the book? (Why?)', a: `<b>I prefer reading the book because</b> the pictures in my head are usually better than the film. <b>Also</b>, I can stop and think whenever I want, <b>so</b> I understand the story more deeply.` },
      { q: 'How often should students read in English? (Why?)', a: `<b>I think</b> students should read in English <b>a little every day</b>. If you read often, the words become familiar, <b>so</b> reading gets easier and easier.` },
    ],
    recap: ['观点 + 原因 + 例子', '回应同伴，别自说自话', '换词换句型'],
  },
};

/* ===== 底部常驻句架栏：跟着环节换 ===== */
const FRAME_BAR = {
  intro: ['Say more · Talk together · Keep going', 'Opinion + reason + example'],
  p1: ['Actually / Also … · but … · because … · For example …', 'usually / often / sometimes …'],
  p2: ['In this picture I can see … · She is reading …', 'on the left · in the background · It looks like …'],
  p3: ['What about …? · How about …?', `What do you think? · I'm not sure about that because … · OK, so we agree …`],
  p4: ['I think … · In my opinion … · For me, …', 'because … · For example … · I agree with you, and I also think …'],
};

const STEPS = [
  { id: 'intro', n: 0, label: '总览', icon: 'grid', time: '4 分钟', kind: '总览 · 先说清楚', tier: 'core', tierText: '总览',
    d: '先把四个 Part 考什么、今天怎么练讲清楚，再一个一个过。',
    tip: '<b>这一页的作用：</b>不是玩，是把「考试长什么样、今天怎么练」立起来，后面每个 Part 才有落点。<br><b>讲法：</b>四页翻着讲：1. 四个 Part；2. 考官想看什么；3. 上课方式与计分；4. 四个评分维度。让学生自己念出来，别你一个人讲。<br><b>收尾：</b>带读三条总纲——这是全课的钩子，后面每练完一个 Part 回来对一次号。',
    talk: [
      { en: `Today our topic is reading habits, and we practise all four speaking parts.`, cn: `明确主题与路线` },
      { en: `Part 1 is about you. Part 2 is a long turn with a picture. What about Parts 3 and 4?`, cn: `让学生自己说出后两个 Part 的形式` },
      { en: `Three golden rules today: say more, talk together, keep going.`, cn: `三条总纲，后面每个 Part 都回看` },
      { en: `For every part: first the rules, then practice. Ready?`, cn: `预告「先讲后练」的闭环` },
    ],
    lesson: [
      { title: '这节课要走的四个 Part', blocks: [
        { type: 'kv', rows: [
          { k: 'Part 1', v: '问答· 聊你自己和阅读习惯', t: '<b>约 2 分钟</b>' },
          { k: 'Part 2', v: '看图长描述· 一个人说满', t: '<b>每人约 1 分钟</b>' },
          { k: 'Part 3', v: '协作讨论· 一起做个决定', t: '<b>约 2–3 分钟</b>' },
          { k: 'Part 4', v: '话题深入· 说你的观点', t: '<b>约 3 分钟</b>' },
        ] },
        { type: 'text', lines: [['cn', '四个 Part 连着来，中间不换搭档；今天所有题目都围着「阅读习惯」转。']] },
      ] },
      { title: '考官想看到什么', blocks: [
        { type: 'keytips', items: [
          { en: 'Say more — never stop at one word.', cn: '说长一点：答完再补一句原因或例子' },
          { en: 'Talk together — ask and answer.', cn: '多互动：问同伴、接住同伴的话' },
          { en: 'Keep going — small mistakes are OK.', cn: '别卡住：说错了自我纠正，接着说' },
        ] },
      ] },
      { title: '这节课怎么上 · 怎么计分', blocks: [
        { type: 'steps', items: [
          '每个 Part 先看「讲解」的规律，再进「练习」上手',
          '练习里答得好 / 讨论成功就加分，规则写在每个环节页面底部',
          '总分课末在「总冠军」页汇总，看看今天哪组更会说',
        ] },
        { type: 'quote', label: '一句话记住今天的标准', text: 'Opinion + reason + example.', cls: 'dk-mA' },
        { type: 'anno', e: '观点、原因、例子，一个都不能少。', cn: '每个 Part 的高分回答都是这个结构' },
      ] },
      { title: '四个评分维度（一看就懂版）', blocks: [
        { type: 'cards', items: [
          { t: 'Grammar & Vocabulary', cn: '语法与词汇', score: '说得对', q: '句子对不对？词会不会换？', items: ['简单句之外，敢用从句', '同一个词别反复用'] },
          { t: 'Pronunciation', cn: '语音语调', score: '听得清', q: '考官不费劲就能听懂吗？', items: ['单词发音清楚、不含糊', '语调有起伏，不是平调念稿'] },
          { t: 'Discourse Management', cn: '话语组织', score: '说得长', q: '能连着说一段话吗？', items: ['不停在一两个词上', '会用 and / but / because 把句子串起来'] },
          { t: 'Interactive Communication', cn: '互动交流', score: '聊得来', q: '是在对话还是在背稿？', items: ['主动开口，也接住对方的话', '讨论到最后能谈出一个结果'] },
        ], foot: '这节课每练完一个 Part，回来对一次号：我刚才做到了哪一条？' },
      ] },
    ] },
  { id: 'p1', n: 1, label: 'Part 1 问答', icon: 'chat', time: '8 分钟', kind: '讲 3 分钟 + 练 5 分钟', tier: 'core', tierText: '核心',
    d: '先讲 Part 1 规律，再抽题问答——用上「拓展三法」就加分。',
    tip: '<b>1. 先讲解（约 3 分钟）：</b>规律页重点砸在「<b>不能只答一个词</b>」；句架页让学生用 Actually / but / because / For example 当场造句；示范页读一遍，让学生听到「变长」是什么样。<br><b>2. 再练习（约 5 分钟）：</b>抽题 → 学生答 → 答出「观点 + 原因/例子」就点该组 <b>+1</b>。Phase 1 基本信息别拖太久，Phase 2 阅读习惯才是主战场。<br><b>3. 闭环：</b>回到讲解页，让学生自己说出三条要点。',
    talk: [
      { en: `Part 1 is an interview about you. Rule number one: never answer with just one word.`, cn: `讲第一条规律` },
      { en: `Add one more sentence with "actually", "but", "because" or "for example". Try one now.`, cn: `让学生用拓展三法造句` },
      { en: `Time to practise. Draw a question and answer in full sentences.`, cn: `切到练习，抽题` },
      { en: `Good — you gave a reason. One point! Now ask your partner: what about you?`, cn: `加分 + 提醒把问题抛回同伴` },
    ] },
  { id: 'p2', n: 2, label: 'Part 2 图片描述', icon: 'cards', time: '9 分钟', kind: '讲 4 分钟 + 练 5 分钟', tier: 'core', tierText: '核心',
    d: '先讲怎么按顺序描述一张图，再两组轮流加一句，不许重复。',
    tip: '<b>1. 先讲解（约 4 分钟）：</b>「先整体后细节」和两种时态的分工（there is vs 现在进行时）要讲透；句架页带读一遍；示范页以 Picture B 为样例。<br><b>2. 再练习（约 5 分钟）：</b>两组轮流加一句，每句必须是新信息——加一句该组 <b>+1</b> 并自动换手；重复或卡住点「换手（不得分）」。每张图约 1 分钟。<br><b>素材说明：</b>示例课不放照片，两张配图是代码绘制的原创插画，描述方法和照片题完全一致。<br><b>3. 闭环：</b>问「刚才哪一句用了现在进行时？」',
    talk: [
      { en: `Part 2 is your long turn: describe the picture from the general idea to the details.`, cn: `讲描述顺序` },
      { en: `Use "there is" and "there are" for things. Use the present continuous for actions and clothes.`, cn: `讲两种时态的分工` },
      { en: `Teams take turns. One new sentence each time — no repeats!`, cn: `切练习，讲接龙规则` },
      { en: `Look at the background, the clothes, the colours. What else can you see?`, cn: `用维度提示推进` },
    ] },
  { id: 'p3', n: 3, label: 'Part 3 协作讨论', icon: 'pair', time: '9 分钟', kind: '讲 4 分钟 + 练 5 分钟', tier: 'core', tierText: '核心',
    d: '先讲协商话术，再帮 Leo 选一周要带的读物，最后达成一致。',
    tip: '<b>1. 先讲解（约 4 分钟）：</b>五条规律里最容易被忽略的是「每个选项都聊到」和「最后说出决定」；句架页带读一遍；示范对话请两个学生分角色念。<br><b>2. 再练习（约 5 分钟）：</b>读情境 → 点「计时 2 分钟」→ 点选项记录进度（点一次：讨论过；再点一次：定为决定）→ 点「达成一致」，双方各 <b>+2</b>。<br><b>3. 闭环：</b>问「刚才哪一句是在问同伴意见？」',
    talk: [
      { en: `Part 3: you and your partner decide together. Two minutes.`, cn: `讲 Part 3 形式` },
      { en: `Every suggestion needs a reason. Then ask: what do you think?`, cn: `讲「建议 + 原因 + 问同伴」` },
      { en: `Don't decide too early — talk about every option first.`, cn: `提醒所有选项都聊到` },
      { en: `OK, it's time to decide. Which one, and why?`, cn: `引导达成一致并加分` },
    ] },
  { id: 'p4', n: 4, label: 'Part 4 话题问答', icon: 'mic', time: '8 分钟', kind: '讲 3 分钟 + 练 5 分钟', tier: 'core', tierText: '核心',
    d: '先讲观点表达规律，再抽题轮流答，答好加分；可揭晓范文对照。',
    tip: '<b>1. 先讲解（约 3 分钟）：</b>重点是「观点 + 原因 + 例子」和「先回应再说自己」；句架页带读；范文读一篇作示范。<br><b>2. 再练习（约 5 分钟）：</b>抽题 → A 组答 → B 组补充或反驳 → 点「看范文」对照，答好一次该组 <b>+1</b>。<br><b>3. 闭环：</b>问「你的回答里有没有 example？」',
    talk: [
      { en: `Part 4 keeps the same topic — reading — but now you give your own opinions.`, cn: `说明 Part 4 是话题深入` },
      { en: `A full answer has three parts: opinion, reason, example.`, cn: `讲「观点 + 原因 + 例子」` },
      { en: `Respond to your partner first: I agree with you, and I also think …`, cn: `强调先回应再说自己` },
      { en: `Now look at the model answer. What is better than yours?`, cn: `揭晓范文对照` },
    ] },
];

/* ===== 组装：每个 Part = 讲解 3 页（规律 / 应对 / 示范）+ 练习 1 页 ===== */
['p1', 'p2', 'p3', 'p4'].forEach((id, k) => {
  const p = PART_LESSON[id];
  STEPS[k + 1].lesson = [
    { title: '做题规律', blocks: [{ type: 'notes', h: '做题规律 · 注意事项', items: p.notes }] },
    { title: '应对方案', blocks: [{ type: 'langroups', h: '应对方案', groups: p.lang }] },
    { title: '开口示范', blocks: [{ type: 'samples', h: '开口示范', items: p.samples }] },
  ];
  STEPS[k + 1].pracRecap = p.recap;
});

/* ---- Part 1 · 抽题问答（拓展三法计分）---- */
STEPS[1].practice = {
  type: 'draw-question', snapKey: 'p1', msg: 'p1Draw', msgShape: 'plain',
  layout: 'plain',
  bank: P1_QUESTIONS,
  topicOf: q => `第 ${q.phase} 阶段 · ${q.phase === 1 ? '关于你自己' : '阅读习惯'}`,
  chips: [
    ['补一句', '对比', '原因'],
    ['频率', '举例', "偏好"],
  ],
  ids: { box: 'p1Q', topic: 'p1Topic', draw: 'p1Draw', timer: 'p1Timer' },
  emptyText: '点「抽题」开始问答',
  drawLabel: '抽题', nextLabel: '再抽一题',
  timer: { sec: 180, label: '计时 3 分钟' },
  scoreAttr: 'p1',
  scoreButtons: [{ team: 'A', label: 'Team A +1（答得好）' },
                 { team: 'B', label: 'Team B +1（答得好）' }],
  rule: '观点 + 原因、例子 就是一次好回答，答得好 +1',
};

/* ---- Part 2 · 看图描述接龙（配图是原创插画，不是照片）---- */
STEPS[2].practice = {
  type: 'photo-relay', snapKey: 'p2',
  msg: { switch: 'p2Switch', add: 'p2Add', skip: 'p2Skip' },
  photos: P2_PHOTOS,
  chips: [
    ['In this picture I can see …', 'She is reading …', 'He is wearing …', 'In the background …'],
    ['people', 'place', 'objects', 'actions', 'clothes', 'colours', 'weather', 'time of day'],
  ],
  ids: { add: 'p2Add', skip: 'p2Skip', sw: 'p2Switch', timer: 'p2Timer', photo: 'p2Photo', label: 'p2Label', turn: 'p2Turn' },
  addLabel: '加一句 +1', skipLabel: '换手（不得分）',
  switchLabel: '换图', timerLabel: '计时 1 分钟', timerSec: 60,
  turnPrefix: '轮到 Team ', turnSuffix: ' · 该组加一句', stepScore: 1,
  rule: '每加一句新信息 +1，自动换组；重复不得分',
};

/* ---- Part 3 · 协作讨论（讨论→决定→双方 +2）---- */
STEPS[3].practice = {
  type: 'negotiate', snapKey: 'p3',
  msg: { step: 'p3Step', decide: 'p3Decide', reset: 'p3Reset' },
  options: P3_OPTIONS, image: 'p3books', situationEn: P3_SITUATION_EN, situationCn: P3_SITUATION_CN,
  chips: ['What about …?', `I'm not sure about that because …`, 'What do you think?'],
  ids: { timer: 'p3Timer', decide: 'p3Decide', reset: 'p3Reset', chips: 'p3Chips', result: 'p3Result' },
  attr: 'p3',
  timerLabel: '计时 2 分钟', timerSec: 120,
  decideLabel: '达成一致（双方各 +2）', resetLabel: '重来',
  needDecide: '先点选项标记「讨论过」，再点一次定为「我们的决定」',
  doneScore: 2,
  rule: '点一次：讨论过（黄）；再点一次：定为决定（绿）。全部聊完点「达成一致」，双方各 +2。',
};

/* ---- Part 4 · 话题深入问答（抽题 + 揭晓范文）---- */
STEPS[4].practice = {
  type: 'discussion', snapKey: 'p4',
  msg: { draw: 'p4Draw', show: 'p4Show' },
  questions: P4_QUESTIONS,
  ids: { q: 'p4Q', model: 'p4Model', result: 'p4Result', draw: 'p4Draw', show: 'p4Show', timer: 'p4Timer' },
  attr: 'p4',
  emptyText: '点「抽题」开始讨论',
  drawLabel: '抽题', showLabel: '看范文',
  timerLabel: '计时 3 分钟', timerSec: 180, shownText: '和范文对照一下',
  scoreButtons: [{ team: 'A', label: 'Team A +1（答得好）' },
                 { team: 'B', label: 'Team B +1（答得好）' }],
  rule: '观点 + 原因 + 例子，答好一次 +1；范文揭晓后对照找差距',
};

/* ================= 参考抽屉 ================= */
const REF_FRAMES_HTML = `
  <h4>Part 1 · 拓展三法</h4>
  <ul><li>补细节：<b>Actually</b> … / <b>Also</b> …</li><li>对比：… <b>but</b> …</li><li>原因：… <b>because</b> … / … <b>so</b> …</li><li>举例：<b>For example</b>, …</li></ul>
  <h4>Part 2 · 描述一张图</h4>
  <ul><li><b>In this picture I can see</b> …</li><li>She <b>is reading</b> … / He <b>is wearing</b> …</li><li><b>In the background</b>, there is / there are …</li><li>拿不准：<b>It looks like</b> … / <b>It's probably</b> …</li><li>维度：people · place · objects · actions · clothes · colours · weather · time of day</li></ul>
  <h4>Part 3 · 讨论与协商</h4>
  <ul><li>提建议：<b>What about</b> …? / <b>How about</b> …?</li><li>问意见：<b>What do you think?</b> / Do you agree?</li><li>同意：<b>That's true.</b> / I agree with you.</li><li>不同意：<b>I'm not sure about that</b> because …</li><li>达成一致：<b>OK, so we agree</b> — let's choose …</li></ul>
  <h4>Part 4 · 观点</h4>
  <ul><li><b>I think</b> … / <b>In my opinion</b> … / <b>For me</b>, …</li><li>加理由：… <b>because</b> … / <b>For example</b>, …</li><li>回应同伴：<b>I agree with you, and I also think</b> … / <b>I see your point, but</b> …</li></ul>`;

function refVocabHTML() {
  const groups = [
    ['读物种类', 'novels · comic books · magazines · short stories · poems · puzzle and quiz books · e-books'],
    ['在哪儿读', 'in bed · on the bus · in the library · under a tree · at my desk · in a bookshop'],
    ['给理由', 'relaxing · exciting · quiet · it teaches me new words · the pictures are beautiful · I can read it again and again'],
    ['描述用词', 'sitting / standing · holding a book · wearing a T-shirt · sunny · cloudy · in the background'],
  ];
  return `
  <h4>话题语料</h4>
  ${groups.map(([h, v]) => `<div class="place-head">${h}</div><ul><li>${v}</li></ul>`).join('')}
  <h4>Part 4 · 范文</h4>
  <ul>${P4_QUESTIONS.map(x => `<li><b>${x.q}</b><br>${x.model}</li>`).join('')}</ul>
  <div class="credit">本课全部文字与配图为课堂原创示例：Part 2/3 的图是代码绘制的 SVG 插画，不含任何出版物内容与照片。</div>`;
}

const ref = {
  tabs: [{ id: 'frames', label: '句型' },
         { id: 'vocab', label: '语料库' }],
  body: { frames: REF_FRAMES_HTML, vocab: refVocabHTML() },
};

return { meta: LESSON_META, frames: FRAME_BAR, recipe: {}, ref, steps: STEPS, sampleArt: ART };
})();

Object.assign(LESSON, { img: __LESSON_IMG__, audio: __LESSON_AUDIO__ });
/* 本课没有照片目录：把上面代码绘制的原创 SVG 插画合进 LESSON.img（纯文本，非照片） */
Object.assign(LESSON.img, LESSON.sampleArt);
delete LESSON.sampleArt;
