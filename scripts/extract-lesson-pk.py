#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把迁移前的 PET / KET 两份工具里的「课时部分」逐字抽成 lessons/*.js。

原则与 FCE 那份一致：课件原文一行都不改写（按行号切片，不重新打字）。
两节课的差别：
  * PET 有「讲解」内容（PART_LESSON：规律 / 应对方案 / 开口示范）→ 拆成翻页讲义（§三 的 block）；
  * KET 没有讲解页，五个环节各自一个练习模块；句型库那一步自带页号与听力素材。
  * KET 还带一段教材录音（1.2MB mp3）→ 抽成 lessons/ket-u7l3.audio/，由 build.py 转 base64。

跑一次即可；之后 lessons/pet-l4.js / lessons/ket-u7l3.js 就是这两节课数据的可编辑源。
"""
import io, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
G = os.path.join(ROOT, 'golden')
PET_F = os.path.join(G, 'PET-L4-Speaking-Part1-4-课堂工具.html')
KET_F = os.path.join(G, 'KET-U7L3-Speaking-Part2-课堂工具.html')

PET = io.open(PET_F, encoding='utf-8').read().split('\n')
KET = io.open(KET_F, encoding='utf-8').read().split('\n')


def seg(lines, a, b, expect=None):
    if expect is not None and expect not in lines[a - 1]:
        raise SystemExit('行号漂移：第 %d 行应为 %r，实际 %r' % (a, expect, lines[a - 1][:110]))
    return '\n'.join(lines[a - 1:b])


def js(x):
    return json.dumps(x, ensure_ascii=False)


def strip_const(src):
    """把 `const X = ...;` / `function f() {...}` 原样保留（我们就是整段搬）。"""
    return src


def divs_with_class(text, cls):
    """从模板串里按「配对的花括号」抠出 <div class="cls">…</div>（内部还能有嵌套 div）。"""
    out = []
    for m in re.finditer(r'<div class="%s">' % re.escape(cls), text):
        i = m.start()
        depth = 0
        j = i
        while j < len(text):
            if text.startswith('<div', j):
                depth += 1
                j += 4
            elif text.startswith('</div>', j):
                depth -= 1
                j += 6
                if depth == 0:
                    out.append(text[i:j])
                    break
            else:
                j += 1
    return out


# ============================================================ PET
def build_pet():
    SLICES = [
        (534, 567, '数据（PET 冲刺 L4'),
        (568, 650, '每个 Part 的讲解页内容'),
        (684, 723, '总览页尾部'),
        (725, 732, '底部常驻句架栏'),
        (733, 779, 'const STEPS = ['),
        (840, 851, '参考抽屉'),
        (852, 875, 'function refVocabHTML'),
    ]
    body = '\n\n'.join(seg(PET, a, b, e) for a, b, e in SLICES)

    intro_cols = divs_with_class(seg(PET, 653, 682), 'teach-col')
    if len(intro_cols) != 3:
        raise SystemExit('INTRO_HTML 里应该正好 3 个 teach-col，实际 %d' % len(intro_cols))
    crit = seg(PET, 685, 723)

    m = {
        "title": "PET L4 · Speaking Part 1–4",
        "docTitle": "PET 冲刺 L4 · Speaking Part 1–4 课堂工具",
        "subtitle": "冲刺班 Lesson 4 · Interview / Photo / Collaborative / Discussion",
        "channel": "pet4-class-v1",
        "keyPrefix": "pet4",
        "folder": "PET-L4",
        "port": 8812,
        "launcher": "启动PET-L4课堂工具.command",
        "outFile": "PET-L4-Speaking-Part1-4-课堂工具.html",
        "imgNote": "3 张图片（Part 2 照片 A/B、Part 3 讨论选项）",
        "dashTitle": "PET L4 · 四个 Speaking Part 上课流程",
        "dashSub": "上课顺序：先走「0. Overview 总览」把四个 Part 考什么、怎么给分讲清楚，再 <b>Part 1 → 2 → 3 → 4</b> 逐个走 —— <b>每个 Part 都是先讲解规律、再进练习</b>，练完回看要点闭环。计分写在每个环节里，总分课末汇总。按 P 进入演讲者模式。",
        "deckHint": "先把规律讲透再练；练习时这一页的句架会挂在屏幕底部，随时能看。",
        "pracHint": "练完回看要点，这个 Part 就在这里闭环。",
        "homeTip": "<b>主页：</b>先点「0. Overview 总览」把四个 Part 考什么、怎么给分讲清楚，再 Part 1 → 2 → 3 → 4 逐个走 —— 每个 Part 都是先讲解规律、再进练习，练完回看要点闭环。",
        "homeTalkEn": "Today we cover all four Speaking parts. First, let's see what the test looks like.",
        "homeTalkCn": "今天走 PET Speaking Part 1 + 2 + 3 + 4 四个 Part",
        "frameNote": {"mod": "本 Part 句架 · 练习时随时参考", "general": "通用武器 · 每个 Part 都用得上"},
        "frameDefault": "intro",
    }

    out = []
    w = out.append
    w('/* lessons/pet-l4.js —— PET 冲刺 L4 · Speaking Part 1–4 的课时数据')
    w(' *')
    w(' * 由 scripts/extract-lesson-pk.py 从迁移前的工具里逐字抽出：课件原文（规律 / 应对方案 / 开口示范 /')
    w(' * 总览 / 题库 / 范文 / 参考抽屉）一行都没有改写；讲解从「一屏三栏」拆成翻页讲义，')
    w(' * 拆法是解析原文里的 teach-col 块，不是重抄（见 pitfalls §一 teach-deck）。')
    w(' * 图片在 lessons/pet-l4.img/，由 scripts/build.py 转 base64 内嵌。')
    w(' */')
    w('')
    w('const LESSON_META = ' + json.dumps(m, ensure_ascii=False) + ';')
    w('')
    w('const LESSON = (() => {')
    w('/* ===== 以下到「组装」为止，全部逐字来自迁移前的工具 ===== */')
    w('')
    w(body)
    w('')
    w('/* ===== 总览页的三栏（原来在 .teach-grid 里并排，现在一栏一页） ===== */')
    w('const INTRO_COLS = [')
    for c in intro_cols:
        w('  ' + js(c) + ',')
    w('];')
    w('')
    w('/* ===== 组装：每个 Part = 讲解 3 页（规律 / 应对 / 示范）+ 练习 1 页 ===== */')
    w("const PART_IDS = ['p1', 'p2', 'p3', 'p4'];")
    w('STEPS[0].lesson = [')
    w("  { title: '① 这节课要走的四个 Part', blocks: [{ type: 'html', html: INTRO_COLS[0] }] },")
    w("  { title: '② 考官怎么给分', blocks: [{ type: 'html', html: INTRO_COLS[1] }] },")
    w("  { title: '③ 一句话记住三件事', blocks: [{ type: 'html', html: INTRO_COLS[2] }] },")
    w("  { title: '考官四个评分维度', blocks: [{ type: 'html', html: CRIT_GRID }] },")
    w('];')
    w('PART_IDS.forEach((id, k) => {')
    w('  const p = PART_LESSON[id];')
    w('  STEPS[k + 1].lesson = [')
    w("    { title: '① 做题规律 · 注意事项', blocks: [{ type: 'notes', h: '① 做题规律 · 注意事项', items: p.notes }] },")
    w("    { title: '② 应对方案 · Key language', blocks: [{ type: 'langroups', h: '② 应对方案 · Key language', groups: p.lang }] },")
    w("    { title: '③ 开口示范 · Sample answer', blocks: [{ type: 'samples', h: '③ 开口示范 · Sample answer', items: p.samples }] },")
    w('  ];')
    w('  STEPS[k + 1].pracRecap = p.recap;')
    w('});')
    w('')
    w('/* ---- Part 1 · 抽题问答（拓展三法计分）---- */')
    w('STEPS[1].practice = {')
    w("  type: 'draw-question', snapKey: 'p1', msg: 'p1Draw', msgShape: 'plain',")
    w("  layout: 'plain',")
    w('  bank: P1_QUESTIONS,')
    w("  topicOf: q => `Phase ${q.phase} · ${q.phase === 1 ? 'basic information 基本信息' : 'extend your answers 拓展回答'}`,")
    w('  chips: [')
    w("    ['Actually / Also · 补充信息', 'but · 对比', 'because / so · 原因结果'],")
    w("    ['usually / often / sometimes', 'Yesterday I …', \"I'm going to …\"],")
    w('  ],')
    w("  ids: { box: 'p1Q', topic: 'p1Topic', draw: 'p1Draw', timer: 'p1Timer' },")
    w("  emptyText: 'Press DRAW · 点「抽题」拿一道题',")
    w("  drawLabel: 'Draw a Question 抽题', nextLabel: 'Draw a Question 抽题',")
    w('  timer: { sec: 180, label: \'3-min Interview 计时\' },')
    w("  scoreAttr: 'p1',")
    w("  scoreButtons: [ { team: 'A', label: 'Team A +1（拓展有效）' },")
    w("                  { team: 'B', label: 'Team B +1（拓展有效）' } ],")
    w("  rule: '+1 for each extended answer · 用一次拓展三法 +1',")
    w('};')
    w('')
    w('/* ---- Part 2 · 照片描述接龙 ---- */')
    w('STEPS[2].practice = {')
    w("  type: 'photo-relay', snapKey: 'p2',")
    w("  msg: { switch: 'p2Switch', add: 'p2Add', skip: 'p2Skip' },")
    w('  photos: P2_PHOTOS,')
    w('  chips: [')
    w("    ['In this photo I can see …', 'They are doing …', '… is wearing …', 'In the background …'],")
    w("    ['people', 'place', 'objects', 'activities', 'clothes', 'colours', 'weather', 'time of day'],")
    w('  ],')
    w("  ids: { add: 'p2Add', skip: 'p2Skip', sw: 'p2Switch', timer: 'p2Timer', photo: 'p2Photo', label: 'p2Label', turn: 'p2Turn' },")
    w("  addLabel: 'Add a Sentence +1 加一句', skipLabel: 'Skip 不得分·换手',")
    w("  switchLabel: 'Switch Photo 换图', timerLabel: '1-min 计时', timerSec: 60,")
    w("  turnPrefix: 'Now: Team ', turnSuffix: ' · 轮到该组加一句', stepScore: 1,")
    w("  rule: '+1 for each new sentence · 每加一句有效信息 +1，自动换组',")
    w('};')
    w('')
    w('/* ---- Part 3 · 协作讨论（讨论→决定→双方 +2）---- */')
    w('STEPS[3].practice = {')
    w("  type: 'negotiate', snapKey: 'p3',")
    w("  msg: { step: 'p3Step', decide: 'p3Decide', reset: 'p3Reset' },")
    w('  options: P3_OPTIONS, image: \'items\' , situationEn: P3_SITUATION_EN, situationCn: P3_SITUATION_CN,')
    w("  chips: ['What about …?', \"I'm not sure about that because …\", 'What do you think?'],")
    w("  ids: { timer: 'p3Timer', decide: 'p3Decide', reset: 'p3Reset', chips: 'p3Chips', result: 'p3Result' },")
    w("  attr: 'p3',")
    w("  timerLabel: '2-min Discuss 计时', timerSec: 120,")
    w("  decideLabel: 'Agree! 达成一致 +2 双方', resetLabel: 'Reset 重来',")
    w("  needDecide: '点一次标记「讨论过」，再点同一项就是「我们的决定」· Mark once, click again to decide',")
    w('  doneScore: 2,')
    w("  rule: '点一次 = 讨论过（黄）· 再点一次 = 定为决定（绿）· 讨论完所有选项后点「Agree!」（双方各 +2）',")
    w('};')
    w('')
    w('/* ---- Part 4 · 话题深入问答（抽题 + 揭晓范文）---- */')
    w('STEPS[4].practice = {')
    w("  type: 'discussion', snapKey: 'p4',")
    w("  msg: { draw: 'p4Draw', show: 'p4Show' },")
    w('  questions: P4_QUESTIONS,')
    w("  ids: { q: 'p4Q', model: 'p4Model', result: 'p4Result', draw: 'p4Draw', show: 'p4Show', timer: 'p4Timer' },")
    w("  attr: 'p4',")
    w("  emptyText: 'Press DRAW · 点「抽题」开始 Part 4',")
    w("  drawLabel: 'Draw a Question 抽题', showLabel: 'Show Model 揭晓范文',")
    w("  timerLabel: '3-min 计时', timerSec: 180, shownText: 'Compare your answer · 和范文对照一下',")
    w("  scoreButtons: [ { team: 'A', label: 'Team A +1（答得好）' },")
    w("                  { team: 'B', label: 'Team B +1（答得好）' } ],")
    w("  rule: '+1 for a good answer · 答好一次 +1',")
    w('};')
    w('')
    w('/* ===== 句架栏 / 参考抽屉 ===== */')
    w('const ref = {')
    w("  tabs: [ { id: 'frames', label: 'Sentence Frames 句型' },")
    w("          { id: 'vocab',  label: 'Word Bank 语料库' } ],")
    w("  body: { frames: REF_FRAMES_HTML, vocab: refVocabHTML() },")
    w('};')
    w('')
    w('return { meta: LESSON_META, frames: FRAME_BAR, recipe: {}, ref, steps: STEPS };')
    w('})();')
    w('')
    w('Object.assign(LESSON, { img: __LESSON_IMG__, audio: __LESSON_AUDIO__ });')
    w('')
    text = '\n'.join(out)
    dst = os.path.join(ROOT, 'lessons', 'pet-l4.js')
    io.open(dst, 'w', encoding='utf-8').write(text)
    print('写出 %s：%d 行 / %d 字节' % (os.path.relpath(dst, ROOT), text.count('\n'), len(text.encode('utf-8'))))
    print('  INTRO 三栏 + CRIT_GRID；每个 Part 3 页讲义 + 1 个练习模块')
    return meta_of(text)


def meta_of(text):
    return json.loads(re.search(r'^const LESSON_META = (.*);$', text, re.M).group(1))


# ============================================================ KET
def build_ket():
    SLICES = [
        (458, 476, '数据'),
        (477, 498, 'const CLAUSES'),
        (499, 507, 'const RAID_Q'),
        (508, 536, 'const TOOL_PAGES'),
        (537, 558, 'const STEPS = ['),
        (620, 633, '参考抽屉'),
        (634, 652, 'function refVocabHTML'),
        (1122, 1127, 'const BINGO_CELLS'),
    ]
    body = '\n\n'.join(seg(KET, a, b, e) for a, b, e in SLICES)
    # 句架条在 body 的静态 HTML 里（KET 没有 JS 常量），逐字抓出来
    fb = re.findall(r'<span class="fb-item">(.*?)</span>', '\n'.join(KET[347:353]))
    fbc = re.search(r'<span class="fb-cn">(.*?)</span>', '\n'.join(KET[347:353])).group(1)
    if len(fb) != 3:
        raise SystemExit('KET 句架条应有 3 条，实际 %d' % len(fb))

    m = {
        "title": "U7 L3 · Speaking Part 2 课堂工具",
        "docTitle": "U7 L3 · Speaking Part 2 课堂工具",
        "subtitle": "Unit 7 Let's go to the museum · 五个场所聊喜好 · I like ... because ...",
        "channel": "ket-class-v2",
        "keyPrefix": "ket",
        "folder": "KET-U7L3",
        "port": 8811,
        "launcher": "启动KET-U7L3课堂工具.command",
        "outFile": "KET-U7L3-Speaking-Part2-课堂工具.html",
        "imgNote": "6 张课本图（五个场所 + P54 地图）",
        "dashTitle": "U7 L3 Speaking Part 2 · 上课流程",
        "dashSub": "4 个核心环节 + 1 个加料游戏。计分规则写在每个环节里，总分在课末汇总。按 P 进入演讲者模式。",
        "deckHint": "讲义一页一件事，用底部「← 上一页 / 下一页 →」翻，翻页会同步到投影；练完进练习，句架就在页面上。",
        "pracHint": "练完回看要点，这个环节就在这里闭环。",
        "homeTip": "<b>主页：</b>先点「1 Warm-up 快闪」热身认场所，再 2 句型库翻页教 → 3 双人任务 → 4 模拟考试；时间够再玩 5 OX 棋。计分写在每个环节里，总分课末汇总。",
        "homeTalkEn": "Today: five places, likes and dislikes, and how to decide together.",
        "homeTalkCn": "今天聊五个场所的喜好，学会和同伴商量出决定",
        "frameNote": {"mod": fbc, "general": fbc},
        "frameDefault": "flash",
        "ledgerSteps": ["flash", "pair", "examiner", "bingo"],
    }

    out = []
    w = out.append
    w('/* lessons/ket-u7l3.js —— KET U7 L3 · Speaking Part 2 的课时数据')
    w(' *')
    w(' * 由 scripts/extract-lesson-pk.py 从迁移前的工具里逐字抽出：五个场所的喜好/不喜欢、')
    w(' * 句型库九页、模拟考试题库、参考抽屉、句架条、操作说明，全部原样。')
    w(' * 这一节没有讲解页（五个环节各自一个练习模块）；句型库那一步自带页号与听力素材。')
    w(' * 图片在 lessons/ket-u7l3.img/，教材录音在 lessons/ket-u7l3.audio/，都由 build.py 转 base64 内嵌。')
    w(' */')
    w('')
    w('const LESSON_META = ' + json.dumps(m, ensure_ascii=False) + ';')
    w('')
    w('const LESSON = (() => {')
    w('/* ===== 以下到「组装」为止，全部逐字来自迁移前的工具 ===== */')
    w('')
    w(body)
    w('')
    w('/* 图片取自 LESSON.img（build 时才注入，所以用惰性函数取） */')
    w("const PIC = k => `<img class=\"picimg\" src=\"${(LESSON.img || {})[k] || ''}\" alt=\"\">`;")
    w('')
    w('/* ===== 组装：五个环节各一个练习模块 ===== */')
    w('/* ---- 1 快闪：30 秒记忆 + 抢答 +1 ---- */')
    w('STEPS[0].practice = {')
    w("  type: 'flash-cards', snapKey: 'flash',")
    w("  msg: { toggle: 'flashToggle', coverAll: 'flashCoverAll' },")
    w('  places: PLACES,')
    w("  ids: { grid: 'flashGrid', cd: 'flashCd', cover: 'coverAll', reveal: 'revealAll', timer: 'flashTimer' },")
    w("  attr: 'flash',")
    w("  coverLabel: 'Cover 盖住', revealLabel: 'Show 翻开', timerLabel: '30s Memory',")
    w('  memorySec: 30,')
    w("  memoryText: 'Remember the five places! · 记一记这五个地方',")
    w("  scoreButtons: [ { team: 'A', label: 'Team A 抢答 +1' }, { team: 'B', label: 'Team B 抢答 +1' } ],")
    w("  rule: 'Score +1 per correct answer · 抢答对 +1',")
    w('};')
    w('')
    w('/* ---- 2 句型库：自带页号的翻页教学 + 教材录音（第 4 页）---- */')
    w('STEPS[1].practice = {')
    w("  type: 'tool-pager', snapKey: 'toolPage', msg: 'toolPage',")
    w('  pages: TOOL_PAGES,  places: PLACES,')
    w("  ids: { tag: 'toolTag', pics: 'toolPics', frames: 'toolFrames', audioSlot: 'toolAudioSlot', hint: 'toolHint',")
    w("         prev: 'toolPrev', ind: 'toolInd', next: 'toolNext' },")
    w("  tagPrefix: '第 {n} 页 · {t}', prevLabel: '← 上一页', nextLabel: '下一页 →',")
    w("  rule: 'Teaching step — no score · 教学环节，不计分',")
    w("  audioModule: 'audio-player',")
    w("  audio: { src: 'ket', totalSec: 37, visible: false,")
    w("           ids: { el: 'ketAudio', box: 'toolAudio', play: 'auPlay', fill: 'auFill', now: 'auNow', tot: 'auTot', back: 'auBack', slow: 'auSlow' },")
    w("           playLabel: '▶ 播放录音', pauseLabel: '❚❚ 暂停', contLabel: '▶ 继续播放',")
    w("           backLabel: '↺ 从头重播', slowLabel: '0.75×', slowOffLabel: '1× 正常语速',")
    w("           loadFail: '录音加载失败' },")
    w('};')
    w('')
    w('/* ---- 3 双人任务：商量出两个地方，汇报双方各 +2 ---- */')
    w('STEPS[2].practice = {')
    w("  type: 'pair-task', snapKey: 'pair',")
    w("  msg: { toggle: 'pairToggle', done: 'pairDone', reset: 'pairReset' },")
    w('  places: PLACES,')
    w("  title: 'Weekend Plan 周末计划',")
    w("  taskEn: 'Your cousin is visiting this weekend. You can only visit TWO places. Talk and decide!',")
    w('  taskCn: \'表弟周末来玩，你们只能去两个地方——和同伴商量出两个，并说清理由。\',')
    w("  chips: [\"Why don't we go to ...?\", \"I'd rather go to ... because ...\", 'Good idea! / I don\\'t think so'],")
    w("  ids: { grid: 'pairGrid', slot0: 'pairSlot0', slot1: 'pairSlot1', timer: 'pairTimer', done: 'pairDoneBtn', reset: 'pairReset', win: 'pairWin' },")
    w("  timerLabel: '2-min Talk 开始商量', timerSec: 120,")
    w("  doneLabel: 'Speak Out! 汇报 +2 双方', resetLabel: 'Reset 重来', doneScore: 2,")
    w("  needTwo: '先选出两个地方再汇报 · Choose TWO places first',")
    w("  rule: 'Both teams +2 when they report their decision · 汇报出结论双方各 +2',")
    w('};')
    w('')
    w('/* ---- 4 模拟考试：Phase 1/2 切换 + RAID 抽人 + 互评五星 ---- */')
    w('STEPS[3].practice = {')
    w("  type: 'mock-exam', snapKey: 'examiner',")
    w("  msg: { phase: 'phase', raid: 'raid' },")
    w('  places: PLACES,  raidQuestions: RAID_Q,')
    w("  ids: { ph1Tab: 'ph1Tab', ph2Tab: 'ph2Tab', phase1: 'phase1', phase2: 'phase2', ph1Grid: 'ph1Grid',")
    w("         ph1Btn: 'phase1Btn', names: 'names', raidName: 'raidName', raidQ: 'raidQ', raidBtn: 'raidBtn',")
    w("         checkBtn: 'checkBtn', checkPanel: 'checkPanel', stars: 'stars' },")
    w("  attr: 'exam',")
    w("  ph1Label: 'Phase 1 · Pair Talk 同桌讨论', ph2Label: 'Phase 2 · Examiner Asks 考官问答',")
    w("  ph1Title: 'Talk and decide together',")
    w("  ph1Chips: ['Do you like going to the ...?', 'I like ... because ...', \"Why don't we go to ...?\"],")
    w("  ph1Note: 'Cover ALL five places, then decide · 五个地方都要聊到，最后给出决定',")
    w("  ph1Btn: 'Start 2-min Talk 开始', ph1Sec: 120,")
    w("  namesLabel: '学生名单（只需输一次）', namesKey: 'names',")
    w("  namesPlaceholder: '名字用逗号隔开，如：王一凡, 李南星, 子树',")
    w("  raidReady: 'Are you ready? 准备好了吗', raidHint: 'Click RAID to pick a student and a question · 点「突袭」抽人抽问题',")
    w("  raidLabel: 'RAID 突袭', checkLabel: 'Checklist 互评表',")
    w("  everyone: 'Everyone! 全班一起答',")
    w("  checklist: ['Used <b>&nbsp;because&nbsp;</b> · 用了 because 说理由',")
    w("              'Asked <b>&nbsp;What about you?&nbsp;</b> · 把球打回去',")
    w("              'Covered all 5 places · 五个地方都聊到',")
    w("              'Made a decision together · 一起做出了决定',")
    w("              'Loud voice &amp; eye contact · 声音响亮、看着对方'],")
    w("  scoreButtons: [ { team: 'A', label: 'Team A 答好 +1' }, { team: 'B', label: 'Team B 答好 +1' } ],")
    w("  rule: '+1 for each good answer · 答好一题 +1',")
    w('};')
    w('')
    w('/* ---- 5 OX 棋：占格 +1、连线 +2 ---- */')
    w('STEPS[4].practice = {')
    w("  type: 'ox-bingo', snapKey: 'bingo',")
    w("  msg: { claim: 'bingoClaim', reset: 'bingoReset' },")
    w('  places: PLACES,  cells: BINGO_CELLS,  winLines: WIN_LINES,')
    w("  ids: { turn: 'bingoTurn', grid: 'bingoGrid', win: 'bingoWin', reset: 'bingoReset' },")
    w("  turnA: 'Team A, your turn! (O) · 轮到 A 组', turnB: 'Team B, your turn! (X) · 轮到 B 组',")
    w("  squareScore: 1, lineScore: 2, resetLabel: 'New Game 重新开局',")
    w("  rule: 'Square +1 · Line +2 · 占格 +1，连线 +2',")
    w('};')
    w('')
    w('/* ===== 句架栏（五个环节同一套：没话说时抬头看这三句） / 参考抽屉 ===== */')
    w('/* 句架条原文就在原工具的 body 里（三个环节共用同一套） */')
    w('const FRAME_ITEMS = [' + ', '.join(js(x) for x in fb) + '];')
    w('const FRAMES = { flash: FRAME_ITEMS, tools: FRAME_ITEMS, pair: FRAME_ITEMS, examiner: FRAME_ITEMS, bingo: FRAME_ITEMS };')
    w('const ref = {')
    w("  tabs: [ { id: 'frames', label: 'Sentence Frames 句型' },")
    w("          { id: 'vocab',  label: 'Word Bank 语料库' } ],")
    w("  /* 语料库那页要画课本地图，图片是 build 时才注入的 —— 用取值函数延迟到打开抽屉时再拼 */")
    w("  body: { frames: REF_FRAMES_HTML, get vocab() { return refVocabHTML(); } },")
    w('};')
    w('')
    w('return { meta: LESSON_META, frames: FRAMES, recipe: {}, ref, steps: STEPS };')
    w('})();')
    w('')
    w('Object.assign(LESSON, { img: __LESSON_IMG__, audio: __LESSON_AUDIO__ });')
    w('')
    text = '\n'.join(out)
    dst = os.path.join(ROOT, 'lessons', 'ket-u7l3.js')
    io.open(dst, 'w', encoding='utf-8').write(text)
    print('写出 %s：%d 行 / %d 字节' % (os.path.relpath(dst, ROOT), text.count('\n'), len(text.encode('utf-8'))))
    print('  五个环节：flash-cards / tool-pager(+audio-player) / pair-task / mock-exam / ox-bingo')
    return meta_of(text)


# ============================================================ 素材抽取（照片 / 录音）
def pull_assets(lines, img_span, out_dir, audio=None):
    """把 IMG = {...} 里的 base64 落成真文件；audio=(行号, mime, 扩展名)。"""
    import base64
    os.makedirs(out_dir, exist_ok=True)
    entries = re.findall(r"(\w+)\s*:\s*'data:image/(\w+);base64,([A-Za-z0-9+/=]+)'",
                         '\n'.join(lines[img_span[0] - 1:img_span[1]]))
    for k, fmt, b64 in entries:
        p = os.path.join(out_dir, '%s.%s' % (k, 'jpeg' if fmt == 'jpeg' else fmt))
        io.open(p, 'wb').write(base64.b64decode(b64))
    print('  照片 %d 张 → %s' % (len(entries), os.path.relpath(out_dir, ROOT)))
    if audio:
        ln, ext = audio
        m = re.search(r'src="data:audio/([a-z0-9]+);base64,([A-Za-z0-9+/=]+)"', lines[ln - 1])
        if not m:
            raise SystemExit('第 %d 行没找到内嵌录音' % ln)
        ad = out_dir.replace('.img', '.audio')
        os.makedirs(ad, exist_ok=True)
        raw = base64.b64decode(m.group(2))
        p = os.path.join(ad, 'ket.' + ext)
        io.open(p, 'wb').write(raw)
        print('  录音 %d 字节（%s）→ %s' % (len(raw), m.group(1), os.path.relpath(p, ROOT)))


if __name__ == '__main__':
    build_pet()
    pull_assets(PET, (528, 530), os.path.join(ROOT, 'lessons', 'pet-l4.img'))
    print()
    build_ket()
    pull_assets(KET, (450, 455), os.path.join(ROOT, 'lessons', 'ket-u7l3.img'), audio=(864, 'mp3'))
