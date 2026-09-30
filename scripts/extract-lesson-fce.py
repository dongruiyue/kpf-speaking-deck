#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把迁移前的 FCE 工具里的「课时部分」逐字抽成 lessons/fce-part1-2.js。

原则：所有课件原文（Tips / 功能语言 / 范文 / 题库 / 操作卡中文 / 讲义页内容）
一行都不改写 —— 本脚本按行号切片，不重新打字。
讲义页（原来是一大坨模板串）在这里被拆成 §三 的 block 数据，
拆法是**解析原文**（正则抓 kv / note / span），不是手抄，避免走形。

跑一次即可；之后 lessons/fce-part1-2.js 就是该课时数据的可编辑源。
"""
import io, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GOLD = os.path.join(ROOT, 'golden', 'FCE-Speaking-Part1-2-课堂工具.html')
DST = os.path.join(ROOT, 'lessons', 'fce-part1-2.js')

src = io.open(GOLD, encoding='utf-8').read()
L = src.split('\n')


def seg(a, b, expect=None):
    if expect is not None:
        if expect not in L[a - 1]:
            raise SystemExit('行号漂移：第 %d 行应为 %r，实际 %r' % (a, expect, L[a - 1][:100]))
    return '\n'.join(L[a - 1:b])


# ---------------------------------------------------------------- 逐字切片
SLICES = [
    (646, 697, '两套真题（课件 SLIDE 58 / 69）'),
    (699, 741, '7 条注意事项'),
    (743, 745, '考官指令模板 + 范文'),
    (746, 770, '每个环节的讲解页内容'),
    (772, 784, '编号操作卡'),
    (796, 814, '三合一组件的数据'),
    (831, 862, '总览页'),
    (904, 940, '底部常驻句架栏'),
    (1004, 1013, 'const REF_FRAMES_HTML'),
    (1014, 1048, 'function refVocabHTML'),
    (1072, 1076, 'const DK_KEY_TIPS'),
    (1078, 1078, 'const DK_GROUP_TITLE'),
    (1330, 1346, 'const P1_BANK'),
    (1347, 1347, 'const P1_TESTS'),
]
verbatim = '\n\n'.join(seg(a, b, e) for a, b, e in SLICES)

# ---------------------------------------------------------------- 讲义页：解析原文成 block
ov = seg(864, 890)
kv_rows = re.findall(r'<div class="kv"><span class="kv-k">(.*?)</span><span class="kv-v">(.*?)</span>'
                     r'<span class="kv-t">(.*?)</span></div>', ov)
notes = re.findall(r'<div class="dk-cn ov-note">(.*?)</div>', ov)
times = re.findall(r'<span>(.*?)</span>', ov)
tail = re.search(r'<div class="dk-do" style="margin-top:9px">(.*?)</div>', ov).group(1)
hd = re.search(r'<div class="dk-h">(这场考试怎么考)</div>', ov).group(1)
hd2 = re.search(r'<div class="dk-h">(0–60 秒怎么分)</div>', ov).group(1)

if len(kv_rows) != 6 or len(notes) != 2 or len(times) != 4:
    raise SystemExit('解析 OV_P1 失败：kv=%d notes=%d times=%d' % (len(kv_rows), len(notes), len(times)))

# ov-two 左栏：kv 行与 ov-note 交替，顺序按原文来（连续 kv 合成一块）
tokens = []
for m in re.finditer(r'<div class="kv">.*?</div>|<div class="dk-cn ov-note">.*?</div>', ov):
    t = m.group(0)
    if t.startswith('<div class="kv"'):
        k, v, tt = re.match(r'<div class="kv"><span class="kv-k">(.*?)</span><span class="kv-v">(.*?)</span>'
                            r'<span class="kv-t">(.*?)</span></div>', t).groups()
        if tokens and tokens[-1][0] == 'kv':
            tokens[-1][1].append((k, v, tt))
        else:
            tokens.append(('kv', [(k, v, tt)]))
    else:
        tokens.append(('note', re.match(r'<div class="dk-cn ov-note">(.*?)</div>', t).group(1)))


def js(x):
    """把课件原文变成 JS 字符串字面量：只处理反引号 / 反斜杠，不动内容。"""
    return json.dumps(x, ensure_ascii=False)


left = ['{ type: \'text\', lines: [[\'h\', %s]] }' % js(hd)]
for kind, val in tokens:
    if kind == 'kv':
        rows = ', '.join('{ k: %s, v: %s, t: %s }' % (js(k), js(v), js(t)) for k, v, t in val)
        left.append('{ type: \'kv\', rows: [%s] }' % rows)
    else:
        left.append('{ type: \'text\', lines: [[\'cn\', %s, \'dk-cn ov-note\']] }' % js(val))

PAGE_OV1 = """[
      { type: 'recipe', keys: ['p1', 'p2'] },
      { type: 'two',
        left: [
          %s
        ],
        right: [ { type: 'text', lines: [['cn', '考官指令模板'], ['i', INSTRUCTION]] } ] },
      { type: 'text', lines: [['h', %s]] },
      { type: 'timeline', items: [%s] },
      { type: 'text', lines: [['do', %s, 'dk-do', 'margin-top:9px']] },
    ]""" % (',\n          '.join(left), js(hd2),
            ', '.join(js(t) for t in times), js(tail))

# ---------------------------------------------------------------- meta（一行 JSON，build.py 直接 JSON.parse）
meta = {
    "title": "FCE 口语 · Speaking Part 1–2",
    "docTitle": "FCE 模考班 D1+D2 · Speaking Part 1–2 课堂工具",
    "subtitle": "Part 1 问答 2 分钟 → Part 2 Long turn · 1 分钟长发言 + 30 秒追问",
    "channel": "fce2-class-v1",
    "keyPrefix": "fce2",
    "folder": "FCE-SpeakingPart1-2",
    "port": 8814,
    "launcher": "启动FCE-SpeakingPart1-2.command",
    "outFile": "FCE-Speaking-Part1-2-课堂工具.html",
    "imgNote": "8 张 Speaking Part 2 照片正常",
    "dashTitle": "FCE 模考班 D1+D2 · Speaking Part 1–2 上课流程",
    "dashSub": "上课顺序：先走「0. Overview 总览」—— 先看两张操作卡（Part 1 怎么做 / Part 2 怎么做），再把 FCE 口语怎么考、考官看什么讲清楚；然后 <b>1 Part 1 问答 → 2 Part 2 长发言</b> 逐个走 —— <b>每个环节都是先照着操作卡讲解、再进练习按卡上的三步打勾</b>，练完回看要点闭环。计分写在每个环节里，总分课末汇总。按 P 进入演讲者模式。",
    "deckHint": "讲义一页一件事，用底部「← 上一页 / 下一页 →」翻，翻页会同步到投影；练完进练习，句架就在页面上。",
    "pracHint": "练完回看要点，这个 Part 就在这里闭环。",
    "homeTip": "<b>主页：</b>先点「0. Overview 总览」—— 先看两张操作卡（Part 1 / Part 2 各自要做什么），再把 FCE 口语怎么考讲清楚，然后 1 Part 1 问答 → 2 Part 2 长发言。每个环节都是先照着操作卡讲解、再进练习按卡上的三步打勾。",
    "homeTalkEn": "Today we do two parts: Part 1 questions, then Part 2 — a one-minute long turn, plus a thirty-second question.",
    "homeTalkCn": "今天走 FCE Speaking Part 1 + Part 2 两个 Part",
    "frameNote": {"mod": "本环节句架 · 练习时随时参考", "general": "通用句架 · 每个环节都用得上"},
    "frameDefault": "overview",
    "deckHintFrom": "讲义一页一件事，用底部「← 上一页 / 下一页 →」翻",
}
meta_line = 'const LESSON_META = ' + json.dumps(meta, ensure_ascii=False) + ';'

# ---------------------------------------------------------------- 组装
out = []
w = out.append

w('/* lessons/fce-part1-2.js —— FCE 模考班 D1+D2 · Speaking Part 1–2 的课时数据')
w(' *')
w(' * 由 scripts/extract-lesson-fce.py 从迁移前的工具里逐字抽出：')
w(' *   课件原文（Tips / 功能语言 / 范文 / 题库 / 操作卡中文 / 讲义页内容）一行都没有改写；')
w(' *   讲义页从原来的整块模板串拆成 §三 的 block 数据，拆法是解析原文，不是手抄。')
w(' * 图片不在这里：8 张照片在 lessons/fce-part1-2.img/，由 scripts/build.py 转 base64 内嵌。')
w(' */')
w('')
w(meta_line)
w('')
w('const LESSON = (() => {')
w('/* ===== 以下到「组装」为止，全部逐字来自迁移前的工具（行号见本文件的生成脚本） ===== */')
w('')
w(verbatim)
w('')
w('/* ===== 讲义页：原文里的 kv / 时间轴 / 说明行，解析成 block ===== */')
w('const PAGE_OV1 = ' + PAGE_OV1 + ';')
w('const PAGE_OV2 = [')
w("  { type: 'cards', items: OV_DIMS, foot: OV_FOOT },")
w('];')
w('const PAGE_P1_1 = [')
w("  { type: 'recipe', keys: ['p1'] },")
w("  { type: 'tips', heading: '关键注意事项 · 英文原文 + 中文一行', items: PART_LESSON.p1.notes },")
w('];')
w("const p1Quote = PART_LESSON.p1.samples[0], p1Focus = PART_LESSON.p1.samples[1];")
w('const PAGE_P1_2 = [')
w("  { type: 'text', lines: [['h', '拓展三招 · 答完立刻补一句 Add reasons, examples or extra information']] },")
w("  { type: 'frames', groups: PART_LESSON.p1.lang.map(g => ({ i: g.i, e: g.t })) },")
w("  { type: 'text', lines: [['h', '课件 SLIDE 51 示范']] },")
w("  { type: 'quote', label: 'Q：' + p1Quote.q, text: 'A：' + p1Quote.a, cls: 'dk-mA' },")
w("  { type: 'anno', e: 'Focus：' + p1Focus.a,")
w("    cn: '答完必须补一句 —— 原因、例子或额外信息，把答案撑长。' },")
w('];')
w("const p2Model = PART_LESSON.p2.samples[0], p2Anno = PART_LESSON.p2.samples[1];")
w('const PAGE_P2_1 = [')
w("  { type: 'recipe', keys: ['p2'] },")
w("  { type: 'text', lines: [['h', '每一步怎么做']] },")
w("  { type: 'steps', items: [")
w("      '复述考官说的共同主题 —— 一句话把两张照片一起包进来。',")
w("      '两张照片各说几句，用比较和对比把两段连起来，不要只讲一张。',")
w("      '回答照片上方那个问题，并给出理由。' ] },")
w("  { type: 'timeline', items: [")
w("      '<b>0–10 秒</b> 描述共同主题（复述考官的话）',")
w("      '<b>10–40 秒</b> 分别大致描述两幅图片（可以做一些猜测）',")
w("      '<b>40–50 秒</b> 回答问题（相同点 / 不同点）',")
w("      '<b>50–60 秒</b> 给出观点 + 理由收尾' ] },")
w("  { type: 'text', lines: [['h', '最关键的三条']] },")
w("  { type: 'keytips', items: DK_KEY_TIPS },")
w('];')
w("const dkGroup = k => { const g = LANG_GROUPS.find(x => x.key === k);")
w("  return { t: DK_GROUP_TITLE[k] || g.t, i: g.i, e: g.e }; };")
w('const PAGE_P2_2 = [ { type: \'frames\', groups: [dkGroup(\'g3\'), dkGroup(\'g4\')] } ];')
w('const PAGE_P2_3 = [ { type: \'frames\', groups: [dkGroup(\'g2\'), dkGroup(\'g6\')] } ];')
w('const PAGE_P2_4 = [')
w("  { type: 'text', lines: [['h', p2Model.q]] },")
w("  { type: 'quote', text: p2Model.a, cls: 'dk-mA' },")
w("  { type: 'text', lines: [['h', p2Anno.q]] },")
w("  ...p2Anno.a.split('<br>').map(x => ({ type: 'anno', e: x })),")
w('];')
w('')
w('/* ===== 组装：把 STEPS 的三个环节接上讲义页与练习模块 ===== */')
w('STEPS[0].lesson = [')
w("  { title: '今天要做的两个 Part', blocks: PAGE_OV1 },")
w("  { title: '考官怎么给分', blocks: PAGE_OV2 },")
w('];')
w('')
w('STEPS[1].lesson = [')
w("  { title: '2 分钟怎么答', blocks: PAGE_P1_1 },")
w("  { title: '拓展三招 · 示范', blocks: PAGE_P1_2 },")
w('];')
w('STEPS[1].practice = {')
w("  type: 'draw-question', snapKey: 'p1', msg: 'p1State', msgShape: 'state',")
w("  layout: 'checks',")
w('  bank: P1_BANK,')
w('  cards: P1_CARDS,')
w("  badge: RECIPE.p1.badge, nos: ['①', '②', '③'],")
w("  cardAttr: 'p1card',")
w("  ids: { turn: 'p1Turn', box: 'p1Q', steps: 'p1Steps', draw: 'p1Draw', sw: 'p1Switch', reset: 'p1Reset' },")
w("  tag: 'Part 1 Interview', emptyTag: 'Press · Part 1 Interview',")
w("  emptyText: '点「Draw a question 抽题」抽一道 Part 1 问题',")
w("  drawLabel: 'Draw a question 抽题', nextLabel: '抽下一题 Next question',")
w("  switchLabel: 'Switch 换手', resetLabel: 'Reset 重来',")
w('  reward: 1,')
w("  doneText: 'Three ways used! +1 each group',")
w("  turnPrefix: 'Now: Team ', turnSuffix: ' · 答完补一句',")
w("  rule: '答完补一句：also / because / for example · 用上哪一招就点哪一块的「打勾」，该组 +1 · 三块都打勾，两组各 +1',")
w('};')
w('')
w('STEPS[2].lesson = [')
w("  { title: '60 秒三步', blocks: PAGE_P2_1 },")
w("  { title: '怎么比较 · 怎么对比', blocks: PAGE_P2_2 },")
w("  { title: '怎么猜 · 卡住了怎么说', blocks: PAGE_P2_3 },")
w("  { title: '范文示范', blocks: PAGE_P2_4 },")
w('];')
w('STEPS[2].practice = {')
w("  type: 'photo-pair-steps', snapKey: 'p2', msg: 'p2State', msgShape: 'state',")
w('  tasks: TASKS,')
w('  steps: P2_STEPS,')
w("  badge: RECIPE.p2.badge, nos: ['①', '②', '③'],")
w("  cardAttr: 'p2Check', taskAttr: 'p2Task', scoreAttr: 'p2',")
w("  ids: { tasks: 'p2Tasks', q: 'p2Q', photos: 'p2Photos', steps: 'p2Steps', turn: 'p2Turn',")
w("         long: 'p2Long', follow: 'p2FollowBtn', sw: 'p2Switch', reset: 'p2Reset',")
w("         followQ: 'p2FollowQ', result: 'p2Result', scoreRow: 'p2ScoreRow' },")
w("  emptyTag: 'Pick a task above', emptyText: '先在上面选一套真题',")
w("  photoTags: ['the picture at the top', 'the one at the bottom'],")
w("  longLabel: '60s 长发言', followLabel: '追问 30s',")
w("  longSec: 60, followSec: 30, doneScore: 2, doneText: '三步都做到了！',")
w("  switchLabel: 'Switch 换手', resetLabel: 'Reset 重来',")
w("  scoreButtons: [ { team: 'A', label: 'Team A +1（追问答得好）' },")
w("                  { team: 'B', label: 'Team B +1（追问答得好）' } ],")
w("  turnPrefix: 'Now: Team ',")
w("  rule: '上面三步都打勾 → 该组 +2 · 追问 30 秒答好 → 该组 +1',")
w('};')
w('')
w('/* ===== 句架栏 / 参考抽屉 / 操作卡 / 图片 ===== */')
w('const frames = FRAME_BAR, recipe = RECIPE;')
w("const ref = {")
w("  tabs: [ { id: 'frames', label: 'Sentence Frames 句型' },")
w("          { id: 'vocab',  label: 'Word Bank 语料库' } ],")
w("  body: { frames: REF_FRAMES_HTML, vocab: refVocabHTML() },")
w('};')
w('')
w('return { meta: LESSON_META, frames, recipe, ref, steps: STEPS };')
w('})();')
w('')
w('/* 8 张照片：由 scripts/build.py 读 lessons/fce-part1-2.img/ 转 base64 后替换这里 */')
w('Object.assign(LESSON, { img: __LESSON_IMG__ });')
w('')

text = '\n'.join(out)
io.open(DST, 'w', encoding='utf-8').write(text)
print('写出 %s：%d 行 / %d 字节' % (DST, text.count('\n'), len(text.encode('utf-8'))))
print('  逐字切片 %d 段，共 %d 行' % (len(SLICES), sum(b - a + 1 for a, b, _ in SLICES)))
print('  讲义 block：overview 2 页 / p1 2 页 / p2 4 页')
