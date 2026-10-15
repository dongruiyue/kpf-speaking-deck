/* lessons/sample-ket.js —— 原创示例课（KET 风格）：放学后的活动 After-School Activities
 *
 * 这是一节纯原创的样课（skill 发布用）：30 分钟、低龄班，目标是「回答问题 + 给简单理由」
 * （I like ... because it's fun / relaxing ...）。不含任何出版物原文、真题、照片或录音；
 * 卡片配图是本文件末尾用代码绘制的原创 SVG 小图标（纯文本，非照片），经 Object.assign
 * 合入 LESSON.img —— 所以没有 lessons/sample-ket.img/ 目录。
 *
 * 结构模仿 ket-u7l3：flash 快闪 / tools 句型库 / pair 双人任务 / examiner 模拟考试 / bingo OX 棋。
 * 冠军页由外壳自动生成；ledgerSteps 只登记计分环节（tools 是教学环节，不进台账）。
 */

const LESSON_META = {"theme": "k", "title": "示例课 KET · After-School Activities 放学后的活动", "docTitle": "示例课 KET · 放学后的活动 · Speaking 课堂工具", "subtitle": "Sample lesson · 放学后的活动 · I like ... because it's fun", "channel": "sample-ket-v1", "keyPrefix": "sampleket", "folder": "sample-ket", "port": 8821, "launcher": "启动示例课-KET.command", "outFile": "示例课-KET-放学后的活动.html", "imgNote": "本课为纯文本原创示例，不含照片", "dashTitle": "示例课 KET · 放学后的活动 · 上课流程", "dashSub": "上课顺序：1. 热身快闪 → 2 句型库 → 3 双人任务 → 4 模拟考试，时间够再玩 5 OX 棋。计分规则写在每个环节里，总分在课末汇总。按 P 进入演讲者模式。", "deckHint": "句型库用底部「← 上一页 / 下一页 →」翻，翻页会同步到投影；句架就挂在屏幕底部。", "pracHint": "这个环节的计分规则写在页面底部，练完就进下一环节。", "homeTip": "<b>主页：</b>先点「1. 热身快闪」认活动，再按 2 句型库 → 3 双人任务 → 4 模拟考试走一遍，时间够再玩 5 OX 棋。计分写在每个环节里，总分课末汇总。", "homeTalkEn": "Today we talk about after-school activities — what you like, and why.", "homeTalkCn": "今天聊放学后的活动：说喜好、给原因、一起定计划", "frameNote": {"mod": "本环节句架 · 卡壳时抬头看一眼", "general": "没话说时，抬头看这三句"}, "frameDefault": "flash", "ledgerSteps": ["flash", "pair", "examiner", "bingo"]};

const LESSON = (() => {

/* ================= 原创 SVG 小图标（代码绘制，非照片） ================= */
/* 注意：SVG 里不写 class，免得混进 check-classes 的类名核对。 */
const SVG = (w, h, inner) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`);
const ICON_IMGS = {
  football: SVG(240, 240, `<rect width="240" height="240" rx="36" fill="#E3F4E8"/><circle cx="120" cy="120" r="72" fill="#FFFFFF" stroke="#2E2E2C" stroke-width="6"/><polygon points="120,92 146,111 136,140 104,140 94,111" fill="#2E2E2C"/><circle cx="64" cy="78" r="8" fill="#2E2E2C"/><circle cx="176" cy="78" r="8" fill="#2E2E2C"/><circle cx="64" cy="162" r="8" fill="#2E2E2C"/><circle cx="176" cy="162" r="8" fill="#2E2E2C"/>`),
  bike: SVG(240, 240, `<rect width="240" height="240" rx="36" fill="#E4EFEC"/><circle cx="76" cy="150" r="34" fill="none" stroke="#2E2E2C" stroke-width="7"/><circle cx="166" cy="150" r="34" fill="none" stroke="#2E2E2C" stroke-width="7"/><path d="M76 150 L112 96 H150 L166 150 M112 96 L118 150 H166" fill="none" stroke="#2C786C" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M104 88 H124 M150 96 L162 82" stroke="#2E2E2C" stroke-width="7" stroke-linecap="round"/>`),
  draw: SVG(240, 240, `<rect width="240" height="240" rx="36" fill="#FBF2DC"/><rect x="62" y="56" width="116" height="128" rx="10" fill="#FFFFFF" stroke="#E0A82E" stroke-width="5"/><path d="M80 120 Q100 95 120 120 T160 120" fill="none" stroke="#2C786C" stroke-width="6" stroke-linecap="round"/><g transform="rotate(35 176 160)"><rect x="168" y="108" width="16" height="72" rx="7" fill="#D96C4F"/><polygon points="168,180 184,180 176,202" fill="#2E2E2C"/></g>`),
  book: SVG(240, 240, `<rect width="240" height="240" rx="36" fill="#E4EFEC"/><path d="M120 78 C98 62 68 62 54 68 V172 C68 166 98 166 120 182 C142 166 172 166 186 172 V68 C172 62 142 62 120 78 Z" fill="#FFFFFF" stroke="#2C786C" stroke-width="6" stroke-linejoin="round"/><path d="M120 78 V182" stroke="#2C786C" stroke-width="6"/><path d="M70 96 H104 M70 116 H104 M70 136 H104 M136 96 H170 M136 116 H170 M136 136 H170" stroke="#9DBFB6" stroke-width="5" stroke-linecap="round"/>`),
  chess: SVG(240, 240, `<rect width="240" height="240" rx="36" fill="#F9E8E2"/><circle cx="120" cy="76" r="24" fill="#2E2E2C"/><path d="M120 100 C104 110 98 128 96 148 L88 176 H152 L144 148 C142 128 136 110 120 100 Z" fill="#2E2E2C"/><rect x="78" y="176" width="84" height="14" rx="7" fill="#2E2E2C"/>`),
  tv: SVG(240, 240, `<rect width="240" height="240" rx="36" fill="#FBF2DC"/><path d="M96 78 L74 46 M144 78 L166 46" stroke="#2E2E2C" stroke-width="6" stroke-linecap="round"/><circle cx="72" cy="42" r="6" fill="#2E2E2C"/><circle cx="168" cy="42" r="6" fill="#2E2E2C"/><rect x="46" y="78" width="148" height="104" rx="14" fill="#FFFFFF" stroke="#2E2E2C" stroke-width="6"/><rect x="62" y="94" width="116" height="72" rx="8" fill="#CDE7F0"/><path d="M92 196 H148" stroke="#2E2E2C" stroke-width="7" stroke-linecap="round"/>`),
  homework: SVG(240, 240, `<rect width="240" height="240" rx="36" fill="#E4EFEC"/><rect x="64" y="52" width="112" height="140" rx="10" fill="#FFFFFF" stroke="#2C786C" stroke-width="5"/><path d="M82 86 H158 M82 108 H158 M82 130 H140" stroke="#9DBFB6" stroke-width="6" stroke-linecap="round"/><path d="M84 158 L94 168 L116 144" fill="none" stroke="#6BCB77" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`),
  music: SVG(240, 240, `<rect width="240" height="240" rx="36" fill="#F9E8E2"/><ellipse cx="92" cy="168" rx="20" ry="15" fill="#2E2E2C"/><rect x="106" y="66" width="8" height="104" fill="#2E2E2C"/><path d="M106 66 C132 70 152 86 152 108 L144 110 C144 92 128 80 106 76 Z" fill="#2E2E2C"/><ellipse cx="160" cy="182" rx="14" ry="10" fill="#D96C4F"/><rect x="170" y="112" width="7" height="72" fill="#D96C4F"/>`),
};

/* ================= 数据：八个放学后的活动 ================= */
/* like / dislike 里的理由都写成完整从句，参考抽屉直接拼成 because 句。 */
const ACTS = [
  { name: 'play football', svg: 'football',
    like: ['I can run around with my friends', 'scoring a goal feels amazing', 'it keeps me strong'],
    dislike: ['I get too tired', 'my shoes get dirty', 'it is no fun in the rain'] },
  { name: 'ride a bike', svg: 'bike',
    like: ['I can go as fast as the wind', 'I can ride to the park with my cousins', 'it is fun downhill'],
    dislike: ['the hill near my home is too steep', 'my legs hurt after a long ride'] },
  { name: 'draw pictures', svg: 'draw',
    like: ['I can draw my favourite animals', 'it is quiet and relaxing', 'my mum puts my pictures on the wall'],
    dislike: ['I am not very good at it', 'my hands get messy'] },
  { name: 'read books', svg: 'book',
    like: ['the stories take me to new worlds', 'I learn new words', 'it is calm before bedtime'],
    dislike: ['some books are too long', 'I fall asleep after three pages'] },
  { name: 'play chess', svg: 'chess',
    like: ['it makes me think hard', 'beating my grandpa feels great', 'I can play it anywhere'],
    dislike: ['one game takes too long', 'I always lose to my big brother'] },
  { name: 'watch TV', svg: 'tv',
    like: ['the cartoons are really funny', 'I can watch with my whole family', 'it helps me rest after homework'],
    dislike: ['my mum only allows thirty minutes', 'too much TV hurts my eyes'] },
  { name: 'do homework', svg: 'homework',
    like: ['finishing it makes me feel free', 'I get good marks at school'],
    dislike: ['it is boring', 'there is too much of it', 'I want to play instead'] },
  { name: 'listen to music', svg: 'music',
    like: ['my favourite songs make me happy', 'I can sing along', 'it is great on the school bus'],
    dislike: ['my sister plays the same song all day', 'loud music gives me a headache'] },
];

/* 模拟考试 Phase 2 的考官题库（原创，KET Part 2 风格：同一话题再问喜好与原因） */
const RAID_Q = [
  'Which of these activities do you like best? Why?',
  'Which activity do you never want to do? Why not?',
  'Do you prefer reading books or watching TV? Why?',
  'Who do you usually play with after school?',
  'What do you usually do first when you get home?',
  'Do you like doing homework? Why or why not?',
  'Would you like to try a new activity this year? Which one?',
];

/* 句型库翻页（原创；本课无听力素材，所以不放 audio 页） */
const TOOL_PAGES = [
  { title: '八个活动 · 说出名字', pics: true,
    frames: ['play football · ride a bike · draw pictures · read books',
             'play chess · watch TV · do homework · listen to music'],
    hint: '<b>Point at a picture and say the English name.</b><br>指一张图，说出英文词组——刚才热身练过的。' },
  { title: '考试怎么考（Phase 1 一起讨论）',
    frames: ['和同伴聊 <b>8 张活动卡</b>', '大约 <b>2 分钟</b>', '最后一起选出 <b>两个活动</b>'],
    hint: '<b>Talk TOGETHER and decide two activities.</b><br>不是各说各的：要互相问、要回应，最后一起定。' },
  { title: '考试怎么考（Phase 2 考官再问）',
    frames: ['同一个话题：放学后的活动', '考官再问你 <b>2 个问题</b>', '回答带上 <b>because</b> 说原因'],
    hint: '<b>Same topic: likes, dislikes and reasons.</b><br>还是聊喜好和原因——前面练的句架全部用得上。' },
  { title: '工具 1 · 问',
    frames: ['Do you like <b>playing football</b>?', 'Do you prefer <b>reading</b> or <b>watching TV</b>?', '<b>Why?</b> / Why not?'],
    hint: '<b>Ask your partner — don\'t wait!</b><br>主动把问题抛给同伴，别干等别人问你。' },
  { title: '工具 2 · 答',
    frames: ['I like ... <b>because it\'s fun / relaxing</b>.', 'I don\'t like ... <b>because it\'s boring / tiring</b>.', 'I think ... is <b>great / hard</b> because ...'],
    hint: '<b>Opinion first, then "because"!</b><br>先说喜好，紧跟 because——考官最想听的就是原因。' },
  { title: '工具 3 · 商量',
    frames: ['<b>Why don\'t we</b> play chess?', '<b>I\'d rather</b> draw pictures because ...', '<b>Good idea!</b> / <b>I don\'t think so</b>, because ...'],
    hint: '<b>Suggest, answer, then decide together.</b><br>会商量才是高分——只报自己的喜好不够。' },
  { title: '升级 · 原因的另一种说法',
    frames: ['<b>The reason</b> I like reading <b>is that</b> it\'s relaxing.', '= I like reading <b>because</b> it\'s relaxing.'],
    hint: '<b>Same meaning, two ways.</b><br>同一个意思两种说法，考试里换着用。' },
  { title: '记住这三条',
    frames: ['给原因 → <b>because it\'s ...</b>', '问同伴 → <b>What about you?</b>', '会商量 → <b>Why don\'t we ...? / Good idea!</b>'],
    hint: '<b>Opinion + reason + decide together.</b><br>不能只答 Yes / No，最后要和同伴一起定下来。' },
];

/* OX 棋：9 个格子轮流说「I (don't) like ... because ...」占格 */
const BINGO_CELLS = [
  { pi: 0, like: true }, { pi: 5, like: false }, { pi: 3, like: true },
  { pi: 6, like: false }, { pi: 1, like: true }, { pi: 7, like: false },
  { pi: 2, like: true }, { pi: 4, like: false }, { pi: 0, like: false },
];
const WIN_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

/* 图片由 build.py 注入 + 本文件末尾合入的原创 SVG 图标；用惰性函数取，别在组装期碰 LESSON.img */
const PIC = k => `<img class="picimg" src="${(LESSON.img || {})[k] || ''}" alt="">`;

/* ================= 环节 ================= */
const STEPS = [
  { id: 'flash', n: 1, label: '热身快闪', icon: 'cards', time: '3 分钟', kind: '热身·识词', tier: 'warm', tierText: '热身',
    d: '看卡记 30 秒，单词盖住后指图抢答八个活动。',
    tip: '<b>游戏本质：</b>识别——看到图能调出英文词组。<br><b>计分：</b>抢答对一次点该组按钮 <b>+1</b>。<br><b>流程：</b>点「30 秒记忆」→ 学生默记 30 秒 → 单词自动盖住 → 指图抢答，点了按钮才算分。<br><b>提醒：</b>词组当整体记（play football 不拆成 play + football）；3 分钟封顶，别逐词带读。',
    talk: [{ en: `Look at the eight activities. You have 30 seconds — remember them all!`, cn: `先安静看图 30 秒，别出声跟读` },
           { en: `The words are hidden now. What's this? Say it in English!`, cn: `盖住单词后指图抢答` },
           { en: `Team B — correct! One point for you.`, cn: `哪组先答对就点哪组，+1 立刻给` },
           { en: `That's enough warming up. Off we go!`, cn: `热身够了就走，别恋战` }] },
  { id: 'tools', n: 2, label: '句型库', icon: 'chat', time: '8 分钟', kind: '教学·脚手架', tier: 'core', tierText: '核心',
    d: '翻页教学：考试怎么考 → 问 / 答 / 商量三套句架 → 一句升级说法。',
    tip: '<b>定位：</b>这是「教」的环节，不是游戏，不计分（所以不进台账）。<br><b>流程：</b>一页一页翻，每揭晓一组句架就点一两个学生当场造句；← → 方向键也能翻页，翻页会同步到投影。<br><b>提醒：</b>第 6 页「商量」是重点——考试要的是一起定下来，不是各说喜好；最后一页三条收个口。',
    talk: [{ en: `How many activities can you see? Say their names.`, cn: `第一页让学生自己说出活动名` },
           { en: `Ask me! Do you like playing football?`, cn: `第 4 页先让学生拿你练手问一句` },
           { en: `Finish this: I like reading because it's ...`, cn: `每揭晓一句就点人补完` },
           { en: `How do we decide together? Why don't we ...? — Good idea!`, cn: `商量句式现场演一遍` }] },
  { id: 'pair', n: 3, label: '双人任务', icon: 'pair', time: '6 分钟', kind: '对话·做决定', tier: 'core', tierText: '核心',
    d: '好朋友今天放学来你家，只能一起做两件事：商量出两个活动并说清理由。',
    tip: '<b>游戏本质：</b>真实对话——有共同任务、有取舍压力，必须来回商量才能完成（这正是 Phase 1 的考试形式）。<br><b>计分：</b>两人完成任务、汇报出结论，<b>双方各 +2</b>。<br><b>流程：</b>点「计时 2 分钟」→ 巡视听两组 → 学生点活动卡放进两个位置（记录决定）→ 点「汇报」加分。<br><b>提醒：</b>没商量、各说各的不算完成；引导用 Why don\'t we ...? / I\'d rather ... / Good idea!。',
    talk: [{ en: `Your best friend is coming to your home after school. You can do TWO activities together. Talk and decide!`, cn: `读任务卡，确认学生懂规则` },
           { en: `Two minutes — go! Use "Why don't we ...?" and "I'd rather ... because ..."`, cn: `计时 2 分钟，下去听两组` },
           { en: `Which two did you choose? Tell us, and give your reasons.`, cn: `汇报时让两人各说一句理由` },
           { en: `Great decision — two points for both teams!`, cn: `点「汇报」，双方各 +2` }] },
  { id: 'examiner', n: 4, label: '模拟考试', icon: 'mic', time: '9 分钟', kind: '整合·考试流程', tier: 'core', tierText: '核心',
    d: 'Phase 1 同桌聊活动卡并做决定 → Phase 2 考官突袭提问 → 互评打星。',
    tip: '<b>定位：</b>输出整合——完整走一遍考试流程；互评表代替打分反馈。<br><b>计分：</b>Phase 2 每答好一题，点该组按钮 <b>+1</b>。<br><b>流程：</b>Phase 1 同桌讨论（计时 2 分钟）→ 切 Phase 2 → 输过名单后点「突袭」随机抽人抽题 → 互评打星。<br><b>提醒：</b>先让学生互评，你再讲评；名单存在本机，下节课还在。',
    talk: [{ en: `Phase 1: talk about ALL eight activities, then decide two together.`, cn: `Phase 1 前提醒八个活动都要聊到` },
           { en: `Keep it going — ask "What about you?"`, cn: `提醒学生把球打回去` },
           { en: `Phase 2: the examiner is coming! Listen and answer.`, cn: `Phase 2 前预告，制造紧张感` },
           { en: `Check your partner with the checklist. How many stars?`, cn: `先让学生互评，你再补充` },
           { en: `Well done — one point for that answer.`, cn: `答得好的点 +1` }] },
  { id: 'bingo', n: 5, label: 'OX 棋', icon: 'grid', time: '4 分钟', kind: '加料·对抗复习', tier: 'bonus', tierText: '加料',
    d: '3×3 格子，用 because 造句占格画 O/X，先连成一条线就赢（时间够再玩）。',
    tip: '<b>游戏本质：</b>对抗复习——把整节课的句架在压力下再用一次。<br><b>计分：</b>占格自动 <b>+1</b>，连线额外 <b>+2</b>。<br><b>流程：</b>两组轮流选格，按格子上的 Like / Don\'t like 说完整句，说对了点格子。<br><b>提醒：</b>说错格子占不上、轮到对方；引导抢中间格。时间不够直接跳过。',
    talk: [{ en: `Say a full sentence to claim a square — with "because"! Only full sentences count.`, cn: `先示范占一格，强调带 because 的完整句才算` },
           { en: `Team A, your turn — pick a square.`, cn: `让学生自己选格，你只判分` },
           { en: `Three in a line — Team B wins! Two extra points.`, cn: `连线时提醒 +2` },
           { en: `Everyone, read the three winning sentences together.`, cn: `连线后全班读一遍那三句话` }] },
];

/* ================= 参考抽屉 ================= */
const REF_FRAMES_HTML = `
  <h4>Ask 问 · 把问题抛出去</h4>
  <ul><li>Do you like ...?</li><li>Do you prefer ... or ...?</li><li>Why? / Why not?</li></ul>
  <h4>Answer 答 · 观点 + 原因</h4>
  <ul><li>I like ... <b>because it's</b> fun / relaxing.</li><li>I don't like ... <b>because it's</b> boring / tiring.</li><li><b>The reason</b> I like ... <b>is that</b> ...</li></ul>
  <h4>Decide 商量 · 一起定下来</h4>
  <ul><li>Why don't we ...?</li><li>I'd rather ... because ...</li><li>Good idea! / I don't think so, because ...</li><li>OK, let's do that!</li></ul>
  <h4>Bounce back 接 · 把球打回去</h4>
  <ul><li>What about you? / And you?</li><li>Really? Me too! / I don't think so.</li></ul>
  <h4>Level up 升级 · 多说一点</h4>
  <ul><li>加细节：... <b>for example</b> ...</li><li>做对比：... <b>but</b> ...</li><li>表态度：<b>I think</b> ... / <b>I agree</b>.</li></ul>`;

function refVocabHTML() {
  return ACTS.map(a => `
    <div class="place-head"><span class="pic">${PIC(a.svg)}</span>${a.name}</div>
    <ul>
      ${a.like.map(r => `<li class="pos"><span class="reason-dot d-like"></span>I like it because ${r}.</li>`).join('')}
      ${a.dislike.map(r => `<li class="neg"><span class="reason-dot d-dislike"></span>I don't like it because ${r}.</li>`).join('')}
    </ul>`).join('') + `
    <div class="credit">本课全部文字与配图为课堂原创示例：卡片图标是代码绘制的 SVG，不含任何出版物内容与照片。</div>`;
}

/* ===== 组装：五个环节各一个练习模块 ===== */

/* ---- 1 快闪：30 秒记忆 + 抢答 +1 ---- */
STEPS[0].practice = {
  type: 'flash-cards', snapKey: 'flash',
  msg: { toggle: 'flashToggle', coverAll: 'flashCoverAll' },
  places: ACTS,
  ids: { grid: 'flashGrid', cd: 'flashCd', cover: 'coverAll', reveal: 'revealAll', timer: 'flashTimer' },
  attr: 'flash',
  coverLabel: '盖住', revealLabel: '翻开', timerLabel: '30 秒记忆',
  memorySec: 30,
  memoryText: 'Remember the eight activities!<br>记住这八个活动',
  scoreButtons: [{ team: 'A', label: 'Team A 抢答 +1' }, { team: 'B', label: 'Team B 抢答 +1' }],
  rule: '抢答对一次 +1',
};

/* ---- 2 句型库：自带页号的翻页教学（本课无录音，不挂 audioModule） ---- */
STEPS[1].practice = {
  type: 'tool-pager', snapKey: 'toolPage', msg: 'toolPage',
  pages: TOOL_PAGES, places: ACTS,
  ids: { tag: 'toolTag', pics: 'toolPics', frames: 'toolFrames', audioSlot: 'toolAudioSlot', hint: 'toolHint',
         prev: 'toolPrev', ind: 'toolInd', next: 'toolNext' },
  tagPrefix: '第 {n} 页 · {t}', prevLabel: '← 上一页', nextLabel: '下一页 →',
  rule: '教学环节，不计分',
};

/* ---- 3 双人任务：商量出两个活动，汇报双方各 +2 ---- */
STEPS[2].practice = {
  type: 'pair-task', snapKey: 'pair',
  msg: { toggle: 'pairToggle', done: 'pairDone', reset: 'pairReset' },
  places: ACTS,
  title: 'After-School Plan<br>放学后的计划',
  taskEn: 'Your best friend is coming to your home after school. You can do TWO activities together. Talk and decide!',
  taskCn: '好朋友今天放学来你家玩，你们只能一起做两件事——商量出两个活动，并说清理由。',
  chips: ["Why don't we play football?", "I'd rather read books because it's relaxing.", "Good idea! / I don't think so, because ..."],
  ids: { grid: 'pairGrid', slot0: 'pairSlot0', slot1: 'pairSlot1', timer: 'pairTimer', done: 'pairDoneBtn', reset: 'pairReset', win: 'pairWin' },
  timerLabel: '计时 2 分钟', timerSec: 120,
  doneLabel: '汇报（双方各 +2）', resetLabel: '重来', doneScore: 2,
  needTwo: '先选出两个活动，再点「汇报」',
  doneLine: "We'd like to {a} and {b} because ...",
  rule: '汇报出决定，双方各 +2',
};

/* ---- 4 模拟考试：Phase 1/2 切换 + RAID 抽人 + 互评五星 ---- */
STEPS[3].practice = {
  type: 'mock-exam', snapKey: 'examiner',
  msg: { phase: 'phase', raid: 'raid' },
  places: ACTS, raidQuestions: RAID_Q,
  ids: { ph1Tab: 'ph1Tab', ph2Tab: 'ph2Tab', phase1: 'phase1', phase2: 'phase2', ph1Grid: 'ph1Grid',
         ph1Btn: 'phase1Btn', names: 'names', raidName: 'raidName', raidQ: 'raidQ', raidBtn: 'raidBtn',
         checkBtn: 'checkBtn', checkPanel: 'checkPanel', stars: 'stars' },
  attr: 'exam',
  ph1Label: '同桌讨论', ph2Label: '考官问答',
  ph1Title: 'Talk and decide together',
  ph1Chips: ['Do you like playing football?', "I like reading because it's relaxing.", "Why don't we draw pictures?"],
  ph1Note: 'Cover ALL eight, then decide two<br>聊完全部 8 个活动，再一起选出两个',
  ph1Btn: '开始 2 分钟讨论', ph1Sec: 120,
  namesLabel: '学生名单（只需输一次）', namesKey: 'names',
  namesPlaceholder: '名字用逗号隔开，如：天天、乐乐、朵朵',
  raidReady: 'Are you ready?<br>准备好了吗', raidHint: '点「突袭」随机抽一名学生和一道题',
  raidLabel: '突袭', checkLabel: '互评表',
  everyone: '全班一起答',
  checklist: ['用 <b>because</b> 说了原因',
              '把问题抛回给同伴',
              '八个活动都聊到了',
              '一起定下了两个活动',
              '声音响亮、看着对方'],
  scoreButtons: [{ team: 'A', label: 'Team A 答好 +1' }, { team: 'B', label: 'Team B 答好 +1' }],
  rule: '答好一题 +1',
};

/* ---- 5 OX 棋：占格 +1、连线 +2 ---- */
STEPS[4].practice = {
  type: 'ox-bingo', snapKey: 'bingo',
  msg: { claim: 'bingoClaim', reset: 'bingoReset' },
  places: ACTS, cells: BINGO_CELLS, winLines: WIN_LINES,
  ids: { turn: 'bingoTurn', grid: 'bingoGrid', win: 'bingoWin', reset: 'bingoReset' },
  turnA: '轮到 Team A（画 O）', turnB: '轮到 Team B（画 X）',
  squareScore: 1, lineScore: 2, resetLabel: '重新开局',
  rule: '用 because 造句占格 +1，连线 +2',
};

/* ===== 句架条（五个环节同一套：没话说时抬头看这三句） / 参考抽屉 ===== */
const FRAME_ITEMS = ['Do you like ... after school?', "I like ... because it's fun / relaxing.", 'What about you?'];
const FRAMES = { flash: FRAME_ITEMS, tools: FRAME_ITEMS, pair: FRAME_ITEMS, examiner: FRAME_ITEMS, bingo: FRAME_ITEMS };
const ref = {
  tabs: [{ id: 'frames', label: '句型' },
         { id: 'vocab', label: '语料库' }],
  /* 语料库页要画活动图标，图片是组装后才进 LESSON.img 的 —— 用 getter 延迟到打开抽屉时再拼 */
  body: { frames: REF_FRAMES_HTML, get vocab() { return refVocabHTML(); } },
};

return { meta: LESSON_META, frames: FRAMES, recipe: {}, ref, steps: STEPS, sampleIcons: ICON_IMGS };
})();

Object.assign(LESSON, { img: __LESSON_IMG__, audio: __LESSON_AUDIO__ });
/* 本课没有照片目录：把上面代码绘制的原创 SVG 图标合进 LESSON.img（纯文本，非照片） */
Object.assign(LESSON.img, LESSON.sampleIcons);
delete LESSON.sampleIcons;
