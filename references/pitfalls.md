# pitfalls.md —— 踩坑台账（外壳 / 模块 / 验收）

这份台账记三件事：① 抽模块时**同构写法不一致**的地方（合并时消掉了什么）；
② 现有工具里发现、并已修掉的真 bug；③ 规格与真实实现**对不上**的地方（外壳承载不住的部分）。
每一条都尽量给出「怎么发现的、怎么验的」。

---

## 一、抽模块时消掉的差异（同构不同写）

以 `references/shell-boundary.md` §六 的映射为准，取**最完善的那份**当基准，其余差异做成参数。

### 1. `draw-question`：FCE Part 1 与 PET Part 1 是同一个交互的两代实现

| 差异点 | FCE（基准，`layout:'checks'`） | PET（`layout:'plain'`） | 处理 |
|---|---|---|---|
| 抽题输出 | `.q-bar` + `<span class="q-tag">卷名 · Part 1 Interview</span>` | `.sentence#p1Q`（`display:none` 切换）+ `.big-word#p1Topic` 显示 `Phase 1/2 · …` | `layout` 参数分两支 |
| 计分方式 | 三招打勾：用上哪招该组 +1；三块全中两组各 +1（`celebrate()`） | 抽题后由老师点 Team A/B「拓展有效」+1 | `cards[]`（打勾）/ `scoreButtons[]`（直接加分） |
| 换手 | 「Switch 换手」按钮 + 抽题时自动换手 | 无 | `switchLabel` 为空则不建按钮 |
| 重置 | 「Reset 重来」清打勾并重洗牌 | 无 | `resetLabel` 为空则不建按钮 |
| 计时 | 无（长发言才是 60s） | 「3-min Interview 计时」`doTimer(180)` | `timer:{sec,label}` 可选 |
| 同步消息 | `{t:'p1State', s:整份状态}`（含 pool/turn/used/done） | `{t:'p1Draw', i:题号}`（只同步抽到第几题） | `msgShape:'state'|'plain'` |
| 复习句架 | 三招的句型挂在 `.stepcard` 每块下方（`frames`） | 两组 `.reminder-chips` 常驻 | 前者走 `cards[].frames`，后者走 `chips[][]` |

**消掉的实际差异**：FCE 的 `p1Refill/p1State/applyP1/renderP1/doP1Draw/doP1Card/doP1Switch/doP1Reset`
与 PET 的 `refillP1/renderP1/doP1Draw` 两套命名与状态形状，统一成模块内部一份
`draw()/card()/flip()/reset()/applySnap()`，状态字段名沿用 FCE 那套（`pool/test/idx/turn/used/done`）。

### 2. `teach-deck`：只有 FCE 有分页讲义，PET / KET 是「一屏讲解」

- FCE 的讲解是**分页讲义**（`.lesson-deck` + `.deck-page` + 底部翻页，翻页同步到观众屏）；
- PET / KET 早期版本把讲解直接铺在一个 `.mod-view` 里（`.teach-col/.lang-group/.sample-q` 一屏排开），
  没有页号、没有 `doDeck`。
- 处理：分页机制留在外壳（§二 明列），**页体渲染**进 `modules/teach-deck.js`；
  PET / KET 迁过来时直接用 block 数据重排讲义即可（可选：`{type:'html'}` 承接旧版整块 HTML）。
- **注意**：PET / KET 迁过来后课堂观感会变（讲解从一屏变成翻页），这是既定目标，不是回归。

### 3. 模块专属的差异（不合并，各自成模块）

| 模块 | 只在哪份出现 | 备注 |
|---|---|---|
| `photo-pair-steps` | FCE Part 2 | PET 的 Part 2 是 `photo-relay`（加一句 +1、自动换手、换图），不是同一件事 |
| `flash-cards` | KET 快闪 | 见下方「§四 找不到的模块」里关于 KET 死 CSS 的说明 |
| `pair-task` / `ox-bingo` / `mock-exam` | KET 各一处 | `mock-exam` 含 Phase tabs + 互评表（`check-panel` + 五颗星）+ RAID 抽人 |
| `negotiate` / `discussion` | PET 各一处 | 协作任务（选项 chip 三态 0/1/2）、Part 4 讨论（抽题 + 揭晓范文） |

### 4. §四 的模块 API 清单不够用（真实实现里多出来的能力）

规格 §四 列了 `isAudience / go / mod / deck / score / totals / ledger / broadcast / on /
snapshotPart / applyPart / renderFrameBar / sfx / ICONS / img / $ / $$`。
实际上三份工具的模块还要用这些，外壳已补上（`assets/shell.html` 的 `TK` 里）并在报告里列出：

| 补的 API | 谁在用 | 为什么必须 |
|---|---|---|
| `TK.timer(sec, auto)` | FCE p2（60s/30s）、PET p1/p3/p4 | 练习页自己起计时器，且要广播 |
| `TK.celebrate()` | FCE p1/p2、PET p3、KET pair/bingo | 三块全中 / 达成一致要放彩带 |
| `TK.deckQuiet(id, page)` | `teach-deck` 的 `actions.deck` | 观众屏套用页号时**不能**再广播（回环） |
| `TK.recipeCard(k)` | `teach-deck` 的 `recipe` block | 操作卡是讲义页的公共零件 |
| `TK.blocks(page)` | 外壳 `lessonDeckHTML` | 页体渲染归模块，外壳只搭框 |
| `TK.stepRow(...)` | `draw-question` / `photo-pair-steps` | `.stepcard` 一行的模板，两模块共用 |
| `TK.rnd / beep` | KET RAID 抽人 | 滚动抽名 + 滴答声 |
| `TK.storage` | KET 学生名单 | 名单要存在本课命名空间里（`ket_names`） |
| `TK.step(id)` | 挂载时取环节定义 | 模块拿得到 `lesson/s.practice` |

---

## 二、迁移中发现的真 bug（已在产物里修掉）

### B1. `photo-pair-steps` 的 +2 记到了 `undefined` 这一栏（严重）

`modules/photo-pair-steps.js` 的 `check()` 里用 `TK.score(P.step, …)`，但它的 `init/mount`
从没把 `step.id` 存进 `P.step`（`draw-question` 存了，这个模块漏了）。
后果：`addScore(undefined, 'A', 2)` → 台账里多出一栏 `ledger.undefined`，
**顶栏总分 +2，但冠军表里那一栏不见了**（冠军表只列 STEPS 里的环节）——
这正是第 11 条验收要抓的「冠军表与顶栏不一致」。

- 发现方式：探针跑计分链路，读到 `plus:"2:0"` 而 `table` 里 p2 那一行是 `0/0`。
- 修复：`init`/`mount` 都写 `P.step = step.id`。
- 复验：`zero:"0:0" → plus:"2:0" → table:"… 2. Part 2 长发言 Long turn/2/0 … Total 总分/2/0" → undo:"0:0"`。

### B2. `ATTR(undefined)` 抛异常，把整个外壳的启动截断（严重）

`draw-question` 的 `mount()` 无条件执行 `document.querySelectorAll('[' + ATTR(P.scoreAttr) + ']')`，
而 FCE 的配置里只有 `cardAttr`、没有 `scoreAttr` → `undefined.replace(...)` 抛 TypeError。
因为挂载模块的循环在外壳启动流程中段，异常之后的所有代码都没跑：
`modState`/冠军页/计时器/演讲者模式/**缩放**/**观众屏适配**/快照/同步分发/`body.audience` 全部缺失。

- 发现方式：探针读到 `early:["Uncaught TypeError: Cannot read properties of undefined (reading 'replace') @740:33"]`、
  `shell.aud:false`（明明 hash 是 `#audience`）、`screens:5` 却有 `deckPages` 内容为空。
- 修复：`ATTR(k)` 对缺省值返回 `data-none`，选择器统一走 `q(k)`。
- 教训：**挂载模块必须容错**，否则一个模块的笔误会让整节课的外壳功能全丢。

### B3. 探针本身的两个坑（验收工具，不算产品 bug，但会让数值说谎）

1. **跨标签页互相拖拽**：教师端的 3 秒兜底 / ping 应答会发整份快照；
   观众屏一边被探针驱动、一边收到快照就被拽回教师的环节 → 每视图量到的不是那一屏。
   处理：空转 10 秒计数做完后，探针把 `applyState` 冻结（只挡远端套用，不影响已记录的计数）。
2. **量纲混用**：直接量「带 zoom 的底边」会被 zoom 影响（切视图时缩放可能还没落定），
   所以每视图同时记 `v`(带 zoom 的 bottom，验收原文要的就是它)、`nat`(清掉 zoom 的自然底边)、`vz`(当时的 zoom)。
   两个角色各自驱动自己（教师走 `fitLeft`、观众走 `scheduleAudFit`），与收广播时同一条路径。

---

## 三、规格与真实实现对不上（外壳承载不住 / 需要你拍板）

### C1. §六 里 4 个模块在三份工具里**根本不存在**

`pattern-cards`、`connector-relay`、`quick-answer`、`word-tennis`：在这三份文件里
**一次都没出现**（全文检索 0 次），Desktop 上也没有别的课堂工具文件。
→ 没有实现，也没有凭想象造。等有真实用例再抽（抽模块的原则就是「以真实实现为准」）。

### C2. 「三份重新生成的工具必须同时满足 12 条」与「第 12 条逐视图 ≤2%」互相冲突

外壳取的是 FCE（最完善）的几何：`main{padding:6px 22px 34px;max-width:min(1780px,98vw)}`、
header 更矮、`.stage/.mega-btn` 更小、观众屏适配是新的自校正版。
PET / KET 是**更早的版本**（`main{padding:…110px;max-width:1100px}`、`fitAudience()` 还在量
`documentElement.scrollHeight`）。把 PET/KET 套进这个外壳，= 主动接受 FCE 这套几何修复，
底边数值必然改变（不是漂移，是升级）。
→ 我的建议：第 12 条只对「同一份」做回归（本次 FCE 已 12/12 逐视图一致），
PET/KET 迁移后改用「逐条验收 + 与迁移前的观感差异清单」来验收。**要不要这么放宽，请你拍板。**

### C3. 第 5 条「讲义每页自然高 ≤900px」按字面**迁移前就不达标**

观众屏（1920×1080）讲义页自然高实测（清掉 zoom，逐页）：
`overview:1 998 / overview:2 1102 / p1:1 763 / p1:2 838 / p2:1 902 / p2:2 691 / p2:3 951 / p2:4 853`。
其中 4 页 >900（最大 1102）。**golden 与重建品数值完全一致** —— 这是既有状况，不是本次回归。
真正的约束其实是「每屏落进 1080」：观众屏整场缩放 0.69，1102×0.69 = 760 ✔；
正文实际字号 32.64×0.69 ≈ 22.5px ≥22px（勉强达标，最小的一条在 overview 第 2 页）。
→ 建议把第 5 条改成「≤1102px（=1080/缩放 0.98）」或直接改成「每屏在 1920×1080 上不滚动」。
→ **2026-09-30 已拍板解决**：判据调整为 ≤1100px / ≥20px，见 C6。

### C4. 第 4 条「观众屏 left=0、right=0」的读法

实测观众屏每个视图 `getBoundingClientRect()`：`left=0`、`right=1920`（= 视口宽）。
即「左边为 0、右边不留白」——**右边距 = 1920 − right = 0**。
按「左右都铺满」来判就是达标的；若按字面 `right===0` 判则永远不可能。
→ 我按前者记录数值，请你确认口径。

### C5. §二 与 §六 对 `teach-deck` 的归属互相矛盾

§二 把 `deckState / doDeck / lessonDeckHTML` 明列在外壳「讲义分页」；
§六 又把 `teach-deck` 当模块。我的切法：**框（分页机制）留外壳、页体（block → DOM）进模块**，
两边的要求都满足（`modules/teach-deck.js` 里有完整的 init/mount/render/actions/snapshot）。

### C6. 第 5 条判据按实测调整（2026-09-30，用户拍板）

| 判据 | 旧值 | 新值 | 依据 |
|---|---|---|---|
| 讲义每页自然高 | ≤900px | **≤1100px** | FCE `overview:2` **迁移前就是 1096px**（C3 的历史读数 1102 是同一页不同口径），三份工具实测最大 1096.45；1100 是 1080 视口下不滚动的经验上限 |
| FCE 投影正文实际字号 | ≥22px | **≥20px** | 自然字号 32.64px × 最低缩放 0.63 = 20.6px（视口 1920×993）；缩放随视口变，**引用时必须带视口与缩放** |

- **谁拍板**：用户（2026-09-30），明确「改判据，不动版式」——不允许为凑旧判据去缩字号、压行距、拆内容。
- **改动落点**：`shell-boundary.md` §七 #5 已改；`layout-budget.md` §二 1)/2) 与 §四 那张表同步更新（表保留留痕）。
- 注意：这两条**迁移前就不达标**（golden 与重建数值一致，见 C3），属于「规格写了但实际没达到」，不是回归。

---

## 四、KET 死 CSS 的按条核对（删之前先确认没人在用）

规格提示「KET 遗留的 `.flash-*` 之外已无人引用的块」要清理。核对结果：

- `.flash-card* / .flash-grid / .bingo-* / .pair-* / .phase-tabs / .check-panel / .stars /
  .tool-frames / .audio-*` —— **KET 自己在用**（快闪 / OX 棋 / 双人任务 / 模拟考试 / 句型库），**不能删**。
- FCE 自己的样式表里定义、但整节课没人用的（`dotA/dotB` 类名由 `.dotA{}` 生成、
  `.dim` / `.badge.dislike` / `.reason-dot` / `.mapbox` / `.pos` / `.d-dlike` 等）：
  在 FCE 这一课里确实没人用，但 **PET / KET 在用**（`dislike`、`pos`、`d-like` 是动态拼的类名）。
  外壳要承载三节课，所以**一条都没删**；`check-classes.mjs` 会把「本课没用」列成提醒，
  删除动作留到「这一课确认永不使用」时再做。
- 结论：**没有删任何 CSS**。理由是「外壳是唯一类名来源」，删了会让下一节课掉样式。

---

## 五、本次没有做到的

> **状态更新（2026-09-30）**：本节是**第一轮**的欠账快照，四条里有三条**已经还掉**，保留原文只为留痕。
> 逐条现状：1️⃣ 已还 —— 第二轮完成 PET / KET 重建并跑了验收（见 §六 起）；
> 2️⃣ 已还 —— `scripts/validate-deck.mjs` 已实现（M1/M2 实测、M3 委托 Safari 不伪造），
> 配套 `references/layout-budget.md`；3️⃣ 已还 —— PET / KET 的课时数据、图片、录音都已抽；
> 4️⃣ 仍然成立 —— 观众屏第 12 条那 2 个视图的带 zoom 读数依旧受缩放落定时机影响，
> 判据只认 ≤1080 这一档，要逐位可比请用自然高度。

1. **PET / KET 没有重建、没有跑 12 条验收**：`modules/` 里 `photo-relay / negotiate /
   discussion / flash-cards / pair-task / ox-bingo / mock-exam` 是按三份文件里的真实实现写的，
   但只做了 `node --check` 语法检查，**没有在浏览器里跑过**（本次验收范围只有 FCE）。
   它们的 DOM/事件/同步逻辑属于「写好了但未验证」，迁移 PET/KET 时必须逐条复跑。
2. **`validate-deck.mjs` 没实现**：规格 §八 里的 M1/M2/M3 分级修正阶梯还没做；
   本次 M3（同步风暴）是用探针直接测的（空转 10 秒 `applyState` 次数）。
3. **PET/KET 的课时数据、图片目录没抽**（只有 FCE）。
4. 观众屏第 12 条有 2 个视图的读数受「测量时缩放刚好没落定」影响（自然底边一致，
   带 zoom 的底边差了 0.74/0.69 这一档），已在报告里逐条标出，没有粉饰成「全等」。

---

# 第二轮：补齐模块库 + 迁移 PET / KET

## 六、这一轮的模块合并 / 不合并（§一 的续）

规格 §六 的映射里，**KET 的 `tools`（句型库）与 `examiner`（模拟考试）差异大到不值得硬合**，
按「不要硬合，做成两个模块」处理：

| 模块 | 来源 | 为什么不合并 / 合并了什么 |
|---|---|---|
| `flash-cards` | KET 快闪 | 三份里独此一处。30 秒记忆倒计时保留在模块内且**不广播**（与原实现一致：只有「盖住/翻开」同步） |
| `pair-task` | KET 双人任务 | 与 PET 的 `negotiate` 都是「讨论 → 决定 → 双方 +2」，但交互完全不同（这里是 5 张卡挑 2 张放进槽位），**不合并** |
| `mock-exam` | KET examiner | Phase 1/2 切换 + RAID 滚动抽人抽题 + 互评五星，独立成模块 |
| `ox-bingo` | KET OX 棋 | 三份里独此一处 |
| `tool-pager` | KET 句型库 | 与 `teach-deck` 同源（都是翻页教学），但有四处硬差异：① 自己的页号/页码/同步动作 `toolPage`；② 每页是「场所卡 + 句型 ul + scaffold 提示 + 听力页」四种固定零件，不是通用 block；③ 听力页要联动播放器（翻走自动停）；④ ← → 方向键翻页。**独立成模块**，只复用外壳的 `.deck-nav` 样式 |
| `audio-player` | KET 句型库里的教材录音 + 播放器 | 抽成独立模块；mp3 作为 lesson 素材（`lessons/<课>.audio/` → build.py 转 base64 → `LESSON.audio` → `TK.audio(key)`）。三条老规矩照做：**播放动作不广播**、整块 `teacher-only`、**观众屏连 `<audio>` 都不建** |
| `photo-relay` | PET Part 2 | 加一句 +1 自动换手 / Skip 不得分换手 / 换图 / 1-min 计时 |
| `discussion` | PET Part 4 | 抽题 + 揭晓范文。与 FCE 的 `draw-question` 都做「抽题」，但一个抽完揭范文、一个抽完打勾计分，**不合并** |
| `negotiate` | PET Part 3 | 6 个选项三态（未讨论 / 讨论过 / 定为决定）+ 达成一致双方 +2 |

新模块一律在 `init` 与 `mount` 里都写 `P.step = step.id`
（上一轮 `photo-pair-steps` 漏了这一句，代价见 B1：+2 记到了 `undefined` 那一栏）。

## 七、这一轮修掉的真 bug

### B4. KET 的 `FRAME_ITEMS` 未定义 → 整页启动中断（严重）

抽 KET 课时数据时，句架条我写成了 `const FRAMES = { flash: FRAME_ITEMS, ... }`，
但 KET 的句架条**不是 JS 常量**，而是 body 里的静态 HTML（`<span class="fb-item">…`），
所以 `FRAME_ITEMS` 从头到尾不存在 → `ReferenceError: Can't find variable: FRAME_ITEMS`，
外壳启动在设置 `body.audience` / `presenting` 之前就断了（和 B2 一个模式：一处笔误，整节课的功能全丢）。

- 发现方式：Safari 实时跑的探针里 `early` 抓到了报错，且 `shell.aud=false`（hash 明明是 `#audience`）。
- 修复：`scripts/extract-lesson-pk.py` 改成**从 body 的静态 HTML 里正则抓那三条句架**（逐字，不重抄）。
- 复验：KET 三端 `early=[]`、`aud/present` 正常。

### B5. 观众屏重复计分（golden 就有，本轮按铁律 2 修掉）

迁移前 KET 的 `ACT.pairDone / p3Decide / bingoClaim` 都是「在观众屏上再跑一遍本地动作」，
而这些动作里带 `addScore` → 观众屏在收到 `{t:'score'}`（老师端已经算过的账）之后，
又自己 +1/+2 一次 → **投影上的比分短暂翻倍**，要等下一份整快照（几秒后）才被拉回正确值。

- 修法：远端路径统一加 `quiet` 参数 —— **只套用状态，绝不再本地计分**（分数由同一次操作的
  `{t:'score'}` 消息统一对齐）；庆祝动画保留（观众屏静音，只放彩带，与原实现观感一致）。
- 影响：`negotiate` / `pair-task` / `ox-bingo` 三个模块。

## 八、外壳在这一轮的改动（都在 `assets/shell.html` 里，逐处 Edit）

| 改动 | 为什么 |
|---|---|
| `TK.audio(key)` / `TK.cur()` / `TK.onDeck(fn)` + `DECK_HOOKS` | 播放器要取素材、要判断「键盘事件是不是我这一环节的」、要在翻页后自动停播 |
| 环节页三种布局 | 讲义+练习 → 双视图（FCE p1/p2、PET p1–p4）；只有讲义 → 讲义铺在 `stage`（FCE overview）；只有练习 → 单视图（KET 五个环节都没有讲/练切换） |
| `meta.ledgerSteps` | KET 的 `tools` 是教学环节、不计分，不能因为它有 `practice` 就进台账（否则冠军表会多出一行全 0） |
| `meta.badgeTeacherOnly` / `meta.badgeTier` | KET 的环节徽标原来在观众屏隐藏且按 tier 上色，FCE/PET 的是常规显示 —— 做成课时开关 |
| `step.teachHint` / `step.pracHint` / `step.pracRecap` | PET 每个 Part 的讲解页提示语不同；练习视图上方有 `recap-strip` |
| `assets/extra-classes.css`（121 条）+ `assets/extra-selectors.css`（5 条） | 跨课补类**与补选择器**：PET/KET 大量用 id 选择器（`#refFab` 等）与自己的类。规则是**只补「外壳里完全不存在」的选择器**，已有同名的一律跳过 —— 否则追加在末尾会覆盖 FCE 已验收过的取值（例如 PET 的 `.stage` 更矮、`.menu-card` 更大） |
| 模块**全量注入** | 不再按课时的 `type: 'x', snapKey` 挑模块：模块加载时只 `TK.registerModule`（挂载才绑事件、才注册快照字段），没用到的不影响行为；换来的是「不会因为模块名藏在嵌套参数里而漏注入」 |

## 九、PET / KET 与迁移前的**行为差异清单**（不是 bug，是升级，逐条列出）

1. **讲解从「一屏三栏」变成翻页讲义**（PET p1–p4：规律 / 应对方案 / 开口示范 各一页；
   PET 总览 3 栏 + 四维度卡 拆成 4 页）。这是既定升级，也是第 12 条对 PET/KET 只报事实的原因。
2. **参考抽屉入口**：KET 原来是左下角浮动按钮 `#refFab`（"Help 句型语料"），现在统一到 header 的
   `#refBtn`（图标 + title）。功能一致，位置变了。
3. **计时器多了「收起（继续走）」**：FCE 有、KET 原来没有；外壳统一保留（KET 因此多一个按钮）。
4. **控制台多了「切换 讲解 / 练习」**：KET 五个环节都没有讲练切换 → 该按钮置灰不可点。
5. **KET 的计时器按钮改成 `teacher-only`**：原来它在观众屏也显示（只靠 `pointer-events:none` 挡住），
   现在按铁律 4 直接不出现。
6. **撤销分数夹 0**：KET 的 `addScore` 原来不夹（`ledger[step][team] += n`，撤销可以变负数），
   外壳统一 `Math.max(0, …)`。
7. **KET 的 `.teacher-only` 数量从 41 变成 44、FCE 从 30 升到 41**：因为外壳多了几个
   `teacher-only` 元素（refBtn/timerBtn/presentBtn 等），不影响第 10 条（各产物内部仍 100% 隐藏）。

---

# 第三轮：外部审查（commit 0117dc1）发现的四个验收链路问题

审查结论原话：示例课能构建也能开，但「全绿」不能当交付依据。四条全部属实、全部修掉。

| # | 问题 | 修法 |
|---|---|---|
| 1 | `draw-question` 打勾计分用 `P.step`（课时数据里没传）→ 分数落进 `ledger.undefined`，冠军表环节明细与总分对不上；且 `used` 写死 3 张卡，模板只给 1 张就永远完不成。**注意：FCE 正式课的 p1 也没传 step，这个 bug 一直在生产工具里**（当时验收只点了 p2 的计分按钮，没点到 p1 的打勾卡 —— 探针盲区） | 模块改用挂载时的 `step.id`；`used` 按 `P.cards.length` 初始化；模板补成 3 张卡；探针 `scoreChain` 加 fallback（没有 `.score-team` 按钮就抽题+点打勾卡），把这条路径纳入验收 |
| 2 | `verify.py` 只登记 fce/pet/ket，`verify.py demo` 直接 KeyError | `resolve_case()`：任意课时名从 `lessons/<name>.js` 的 `LESSON_META.outFile` 解析 |
| 3 | `validate-deck.mjs` 找不到产物 / M1 超 / M2 异常 / 页内错误，全都 exit 0；`verify.py` 报失败也 exit 0 | 两个脚本都改为聚合失败项：0=全过、1=有未过、2=用法错误 |
| 4 | `--m3` 链路把课时名传给只认三课的 `safari-verify.sh`，新课的 Safari 实测走不通 | 新增 `scripts/resolve-lesson.py`（三课保持 8894–8899 历史端口，新课按名字哈希进 8900–8939）；`serve-verify.sh` / `safari-verify.sh` 共用；无 golden 时只起/只开 out 侧；close 的窗口特征从 889x 扩到 89xx |

第 1 条的教训记死：**探针只点了「最容易点的那种计分按钮」，另一种计分路径（打勾卡）就从没进过验收**。
验收设计要枚举「每一类计分入口」，不能只测一种。

另：`safari-verify.sh close` 关不掉 macOS 26 上那种 `visible:false`、0 标签的 Safari 僵尸窗口
（不枚举 tab、URL 都取不到）。它无内容、无负载，留着无害；别再为它加奇怪的关闭逻辑。

---

# 第四轮：分发版改造（2026-10-14，按交接文档 AGENT-HANDOFF.md）

| 改动 | 说明 |
|---|---|
| frameNote/frameDefault 字段契约 | 三份正式课都放在 LESSON_META，外壳却读 LESSON 顶层 → 底栏中文提示渲染成 `undefined`（生产环境一直在）。外壳改为 `LESSON.frameNote || K.frameNote || {}`，两者都没就留空，绝不渲染 "undefined" |
| 启动器健康检查 | `curl -s -o /dev/null` 对 404 也返回退出码 0 → 换成看 HTTP 状态码：200 才认、000 才起服务、其它=端口被占；起服务后轮询「课件本身 200」才算就绪（最多 10 秒）；失败一律明确报错，不报成功 |
| 标识自动生成 | channel/keyPrefix 缺省时外壳在运行时按 folder 派生；build.py 对模板示例值（demo-class-v1 / demo）直接警告 —— 照抄模板不会再和别的课共用同步频道 |
| 构建前校验 | build.py 新增：缺 meta 字段 / 环节 id 重复 / 未知模块 type / 素材同名冲突 / 引用了不存在的素材键，都拦在构建前。教训：课时文件可能在定义期摸浏览器 API（pet-l4 有 `document.getElementById`），node 校验要垫一个什么都吸收的 Proxy 桩 |
| 主题系统 | 课时 `meta.theme`：`'k'` 自然课堂（暖白+深绿）/ `'pf'` 教材编辑（克制、衬线标题、小圆角）；不写 = 默认。配色/圆角/标题字体在外壳 `<style>` 尾部，用映射写全类名让 check-classes 能看到 |
| 观众屏去残影 | stepRow 的「打勾」按钮在观众屏一直是死的按钮残影 → 现在观众屏显示状态标记 ✓，按钮只在教师端；观众屏题目字号提到 clamp(24px,3vw,46px)（题目第一焦点） |
| 首次开课引导 | 外壳内置「开课三步」卡：首开自动弹一次（每台机器每节课记一次），可关可不再显示，控制台「开课帮助」随时重开；不进快照、不广播、观众屏不弹 |
| pair-task doneLine | 汇报句原来写死 "go to the X"，活动类话题语法不通 → 新增 `doneLine` 参数（{a}/{b} 占位），不写就用原句 |
| M2 带宽 24→28 | deck-steps 首块实测 25px，旧带（4–24）取样不足；改尺子不改内容，依据写在 layout-budget.md §二.10 |
| FCE 第 12 条授权改版 | 观众屏 p1/p2 练习页自然高度 +8.27%/+5.58% 是这轮改版的预期结果（题目加大+去残影），verify.py 里逐视图标注，不判失败、不伪造一致 |
| 两份原创样课 | lessons/sample-ket.js（放学后的活动 30min）+ sample-pet.js（阅读习惯 40min），构建进 examples/ 随包分发；PET 样课的"照片"是代码绘制的原创 SVG 插画（photo-relay 离了图跑不过验收，空相框更糟） |
| welcome.html | 随包首次引导页：两个主入口（体验样课 / 复制需求回 AI）、诚实的环境说明、复制三级降级、localStorage 静默降级 |

## 第五轮补充（2026-10-15）：teach-deck 的块渲染不再拖死整节课

做 PET L6 时踩到：`teach-deck` 的 `cards` 块直接读 `d.items.map`，课时数据漏了 `items`
→ `Cannot read properties of undefined` → **整个外壳的启动截断，整节课打不开**。
这违反铁律 6（"挂载模块必须容错：一个模块抛异常会让整个外壳的启动截断"），
但铁律只保护到「模块级」，块级的坏数据一样能连锁失败。

修法：`renderBlocks` 改用 `renderBlockSafe` —— 单个块渲染失败时降级成一条看得见的提示
（写明块类型与错误信息），其余块照常渲染。课时作者漏字段只会看到一条红字，不会白屏。

顺带记一笔：这节课的课时数据里 `p1` 用 `draw-question` 的 `plain` 布局，
模块只有**一个抽题池**、没有"分卷"参数 —— 两卷（Phase 1 基本信息 / Phase 2 拓展）
是靠每题上的 `phase` 字段 + `topicOf` 标签体现的。以后要做"分卷抽题"得先给模块加参数。

## 第六轮（2026-10-15）：U8L3 的 UI 改造（按 UI-FIX-HANDOFF 七项）

用户实看后提的七条，全部落在**源文件**（外壳/模块/课时），不是往产物尾巴追加 !important：

1. **热身卡 4×2**：`.flash-grid` 原是 `auto-fit minmax(140px,1fr)` → 8 张排成 7+1。
   给 flash-cards 自己的网格加 `.cols-4` 标记（课时可用 `practice.cols` 覆盖，小屏落 2 列）；
   **没有动全局 `.flash-grid`** —— mock-exam / pair-task / tool-pager 复用同一选择器。
2. **抽题页题目优先**：题目从"黄色虚线条里的中等字"改成**页面第一焦点**（深色大字、左对齐、无虚线框）；
   三招句架**默认折叠**，教师用「显示句架」独立控制。关键契约：**展开句架不计分**，
   展开状态进快照（晚加入的学生窗口与教师一致），收广播仍只套用状态不重复计分。
3. **句型库**：正文 700 字重 → 400–500（标题 600–700）；`clamp(19px,2.8vw,30px)` → `clamp(16px,1.75vw,24px)`；
   虚线 → 实线细分隔线；**长内容在课时数据层拆页**（5 页 → 8 页），翻页入口与页码移到页面**顶部**稳定区。
4. **底栏可配置**：`LESSON.frameBar`（或 `meta.frameBar`）= `{mode:'fixed'|'flow', open, suppress:[stepId…]}`；
   本课抽题环节用 `suppress` 让底栏收起（该页已展示同类提示，不重复），教师可手动「收起句架」。
   默认仍保留底栏供其它课用 —— **不是全局删除**。
5. **自适应按当前页**：新增 `measureActiveScreenH()`，缩放不再由全课最高页决定。
   效果：U8L3 学生屏 zoom 从 0.64 → **1.00**，投影正文 24.6px → **34px**；FCE 回归仍 12/12 视图 0.00%。
6. **theme-k 补布局规则**：不只是颜色变量 —— 去大面积黄底/虚线描边/重阴影，正文不再普遍 800/900 字重，
   题目/材料/提示三级排版，浅绿只用于辅助区。范围限定在 `body.theme-k`（PF 主题与状态色语义不动）。
7. **开课帮助**：弹层第一步**直接给可点的「打开学生屏」**（用户点击同步触发，不用去控制台找）；
   「完成引导」写状态（下次不再自动弹）、「本次跳过」不写 —— 两者语义分开；帮助入口随时可重开。

## 第七轮（2026-10-15）：同一模块挂两次会静默失效 —— 从根上修

**症状**：FCE L5 Part 3 要把 Test 1 / Test 2 都做成同一套三态讨论卡（`negotiate`），
但第二个 `negotiate` 环节**点卡毫无反应、连报错都没有**（`window.onerror = 0`，12 条判据一条都抓不到）。

**根因**：状态型模块把 `P` / `S` 存在**模块级变量**里（单实例）。外壳按环节挂载，
第二次 `mount` 覆盖了第一次的 `P` / `S` → 先挂那个环节的点击处理读到 `b.dataset[P.attr]`
时 `P` 已指向后一环节 → 索引 `undefined` → `step(NaN)` → `S.state[NaN] = NaN`，静默空操作。

**修法（已落地）**：状态型模块统一改成**工厂**，外壳按环节实例化。

```js
// modules/x.js：原来是 (function () { … TK.registerModule(NAME, mod); })();
function xFactory() { … ; return mod; }
TK.registerModule('x', xFactory);

// assets/shell.html 挂载循环：每个环节取一个独立实例
const inst = (typeof def === 'function') ? def() : def;
PRACT_INST[s.id] = inst;
```

- 11 个状态型模块全部改成工厂（teach-deck 无状态，仍是单例对象 —— 页号真相在外壳 `deckState`）。
- **注册名要写成字面量**：`NAME` 在工厂内部，外面的注册语句看不见它（第一次改就是把
  `TK.registerModule(NAME, …)` 留在外面 → `ReferenceError: NAME is not defined`，全盘白屏）。
- **还有一处"借用模块"的写法要跟着改**：`tool-pager` 通过 `TK.modules['audio-player'].mount(…)`
  内嵌听力播放器 —— 模块变工厂后这里拿到的是函数，报 `ap.mount is not a function`（KET-U7L3 当场挂掉）。
  改成先实例化：`const ap = (typeof apDef === 'function') ? apDef() : apDef;`

**教训**：模块之间**不要直接调用对方的 mount**（那是绕过外壳的私有耦合）；要借别的模块的能力，
应该走外壳给的接口。这次先按"实例化一次"补齐，长期应把音频播放器抽成外壳级服务。

**回归**：九份产物 `verify` 全过（FCE 回归仍 12/12 视图 0.00%），浏览器实测 t1 / t2 两个
`negotiate` 实例互不干扰（t1 标记后切到 t2，t2 干净；回 t1 状态还在）。

## 第八轮（2026-10-15）：排版统一 —— 三个真 bug 与一条设计教训

用户对版式的评价从「文字堆砌、可读性糟糕」一路到「地狱级排版」「按钮歪七扭八，中间字体又黑又粗」。
按 `references/typography.md`（C.R.A.P. + Duarte 网格）重做后，记下三类必须避免的问题：

### 1. 【真 bug】外壳丢了注入标记，课时级 CSS 静默失效

排版改造时 `assets/shell.html` 里的 `/*==LESSON_CSS==*/` 被删掉，而 `build.py` 只检查
「注入完有没有**残留**标记」，不检查「该有的标记**在不在**」→ `replace` 落空、**不报任何错**。
后果：`lessons/ket-u7l3.css`、`lessons/pet-l4.css` 长期不生效，排查方向全被带偏。

修法：`build.py` 注入前先校验 5 个外壳标记齐全，缺一个就报错退出。
**教训：接口标记（注入点）必须有「存在性断言」，只有「残留断言」等于没有断言。**

### 2. 【真 bug】`.sentence` 在不同模块里语义相反

`draw-question` 用它当**题目**，`discussion` 用它当**范文答案**，`photo-pair-steps` 用它当**追问**。
我按"它是题目"给它 display 字号 + 半粗 → 把 discussion 的范文做成了整屏最黑最粗的字（用户点名）。

修法：`.question` 是唯一合法的「题目」类（display 级）；`.sentence` 一律按**阅读文本**处理
（`--fs-lg` + `--fw-body`）；`draw-question` 的题目元素改用 `.question`。
**教训：跨模块复用的类名必须只有一个语义；语义冲突时，宁可为新角色加类，不要复用旧类。**

### 3. 【设计教训】"标签比内容大"是反层级，不是"课时自己的差异"

`lessons/*.css` 里 `.big-word{font-size:clamp(...56px)}`（PET 到 72px）、
`.sentence{color:var(--c-warn-ink); border:2px dashed var(--mustard)}` ——
状态标签比题目还大、题目用琥珀色还套虚线框。我上一轮把这类规则按「取值不同 → 保留并 token 化」
处理，结果把它们当合法差异留下了。

**教训：token 化只能修"取值不一致"，修不了"层级方向错了"。取舍规则里必须区分
「这节课自己的几何（可以保留）」与「层级/颜色语义（一律服从外壳）」。**

### 4. 顺带：`build.py` 与 `--force-prefers-reduced-motion`

截图验观感必须加 `--force-prefers-reduced-motion`，否则 `.screen.on` 的淡入被冻结在中间帧、
整屏拍到半透明（第一轮就是这么误判的）。已固化在 `scripts/shot.sh` 里。

## 第九轮（2026-10-15）：练习页版式契约 —— 「一屏五种对齐」的根因与三条硬规矩

同一轮里用户第二次点名版式：「按钮歪七扭八，中间字体又黑又粗，按钮不对齐，左边一个右边一个」
（截图点的是 KET U7L3 模拟考试页 与 PET L4 Part 4 练习页）。

### 1. 【真 bug】舞台的对齐只改了学生屏，教师端还是居中

§七 那一轮把 `body.audience .stage` 改成左对齐，**基础的 `.stage` 仍是 `text-align:center` +
`align-items:center`**。于是同一屏里：有 `width:100%` 的子元素被拉满（看着在左）、没有宽度的
子元素被收缩居中（看着在中间）—— 一屏四五套对齐，谁都没错，合起来就是「左边一个右边一个」。

**教训：改「一套 UI 的排版」先确认改的是不是**所有**端；只改一端等于把不一致固化下来。**

### 2. 落地：练习页版式契约（`typography.md` §八，所有 practice 模块照办）

一条左轴（`.stage` 直接子元素 `width:100%` + 左对齐，水平居中一律禁止）、
四组纵向顺序（内容 → 素材 → **一行**控件 → 计分与说明）、字号角色不许越级。
实现手段是 `.prac-set`（组内 --sp-2）与 `.stage{gap:--sp-6}`（组间）；12 个模块的骨架逐个改过，
`draw-question` / `flash-cards` / `mock-exam` 的三处「两行按钮」并成了一行。

### 3. 【真 bug】课时级 CSS 仍能盖过外壳的角色表（`.name-scroll`）

`lessons/ket-u7l3.css` / `pet-l4.css` 里 `.name-scroll{font-size:clamp(var(--fs-proj-q),5.5vw,…)}`
在 1366 宽下是 **75px** —— 教师端「抽到的学生名」比题目（30px）还大，正是「中间字体又黑又粗」那一眼。
上一轮删的是 A 清单（`.big-word/.big-sub/.sentence/.question/…`），`.name-scroll` 落在清单外。

**修法**：外壳用高一级特异性（`.stage .name-scroll` / `.stage .scaffold`）把角色收回来 ——
课时 CSS 自己那一节就写着「谁大谁小由外壳的角色表定，课时不许自己定」，所以这是收口而不是对抗。
**教训：「层级类」要按角色表逐条对，别按「感觉像层级」挑。**

### 4. 工具：`scripts/shot.sh` 扩了三件事

- 环节可带视图后缀：`pet-l4 p4:prac`（不写 = 讲解侧；练习页必须显式 `:prac`）
- 第 3 个参数多了 `present`（演讲者模式，`#present`）：整屏按缩放自动装下，
  用来核对「这一页在课堂上到底装不装得进」——普通浏览模式下超过一屏的页面要滚，别误判成排版坏了
- 第 6 个参数可以塞一段 JS（点 Tab / 抽题之后再截图）

注入的动作**要等两帧再拍**（双 rAF + 读一次 `offsetHeight`）：虚拟时间会在
「display 刚从 none 变 block、还没画出来」的那一帧抢拍，拍到整屏空白 —— 这次差点误报「页面白了」。

## 第十轮（2026-10-15）：句架条与课时 CSS 的收口 —— 「重复」也是排版问题

### 1. 【真 bug】底栏句架与页内句架是同一句话，一屏出现两次

`#frameBar`（固定底栏）读 `LESSON.frames[环节]`；`negotiate` / `photo-relay` / `photo-pair-steps`
把自己那几句画在页面上（`.chip` / `stepRow`）。两边**逐字相同**，于是
`PET-L4 Part 2/3`、`PET-L6 Part 2`、`PET-U2L3 Task`、`FCE L5 Test 1/2`、`FCE P1–2 Part 2`
六个环节都是「同一句句架出现两次」，外加底栏把页面最后约 55px 压在下面 ——
教师端普通浏览模式**没有**给底栏留 padding（只有 `body.presenting` 留了 64px）。

修法：这些课时 `LESSON_META.frameBar = {"suppress":[…环节 id…]}`（外壳早就支持，`ket-u8l3` 一直在用）。
**不要**改用 `mode:"flow"` 了事 —— flow 只是把重复的条挪到页面下方，重复还在，而且句架不再常驻。
先判「重不重复」，再决定要不要动位置。

### 2. 【真 bug】两份课时 CSS 把外壳的字号角色表整片盖住

`lessons/ket-u7l3.css` / `pet-l4.css` 是早期从「自带样式的整课」抽出来的，里面还有约 40 条
`font-size:clamp(…,Nvw,…)`。课时 CSS 注入在外壳**之后**、同特异性时后写的赢，所以这两课的字号
实际由课时定：`.mega-btn` 33px、`.tool-frames li` 38px、`.chip` 33px、`.scaffold` 40px ——
其余 7 课（无课时 CSS）是外壳的 16/16/20/16px。「同一套课件字体大小凌乱」的根因就在这里。

修法：把这两份 CSS 里 `font-size` 的 **vw clamp 全部删掉**（只留布局：padding / border / radius /
min-height / gap），字号一律回外壳角色表；庆祝与计时那几条（`.champ-score` / `.timer-num` /
`.win-banner` / `.bingo-cell .mark`）保留 vw —— 它们本来就是全屏展示。
`.name-scroll{…5.5vw…}` 整行删（外壳有同选择器规则兜底）。
按钮的 padding / min-height 也一并删：只删字号会得到「大空盒子里一行小字」，比原来更难看。

**教训：课时 CSS 只配管版式、不许管字号 —— 这条它自己的文件头就写着。**

### 3. 底栏原来是居中的

`#frameBar{justify-content:center}` + `.fb-items{justify-content:center}`：页面对齐改完了，
底栏还是「居中一套」。改成 `flex-start`，收在同一条左轴上（`typography.md` §8.5）。

**方法教训**：`verify.py` 的 12 条判据里**没有**「重复渲染」和「对齐轴」这两类，
所以「全绿」不等于「排版对」。这一轮是靠逐张 `shot.sh` 截图看出来的 —— 先拍、再看、别只信判据。

**边界**：`lessons/` 在 `.gitignore` 里（只有 README 与两份原创样课入库），
所以第 1、2 条的改动只落在**本地产物**上，不会随仓库公开分发。

### 4. 【真 bug】讲义页的「文字墙」—— 8 句长句连排，学生读不出结构

`FCE L5` 第 1 页「Part 3 是什么 · 填空」把 8 句长句按 `.dk-i`（25px、满宽、`--lh-display`）
连排成一段：没有分点、没有分组、空格的 `______` 和正文一样黑。用户原话
「怎么读？可读性在哪里？你能最简单的分 bullet point 也可以啊」。

修法（`typography.md` §九）：
- 新增外壳类 `.lesson-deck .dk-ul`（分点正文）与 `.lesson-deck .dk-dlg`（对话原稿，
  说话人挂起缩进）。FCE L5 第 1、2 页按 ①形式与时间 / ②讨论时做什么 / ③收尾 分 3 组；
  `PET U2L3` 的听力原稿（18 轮）改用 `.dk-dlg` 并拆成 2 页。
- 行高取 `--lh-ui`(1.5) 而不是 `--lh-body`(1.7)：**讲义页有「自然高 ≤1100px」的硬判据**
  （`verify.py` 第 5 条），第一版用 1.7 直接把 FCE 顶到 1094、PET-U2L3 顶到 1167（未过）。
- 顺带修掉原文错字 `give you own opinions` → `give your own opinions`（两版一起改，答案别对不上）。

**教训：改讲义排版必须跑 `verify.py` 第 5 条** —— 它量的是「观众屏讲义自然高」，
你按教师端观感调的字号/行高，投影端可能正好越线。这条判据第一次帮我们拦下了自己。

### 5. 判据之外的检查表（本轮新增两条）

| 要查的 | 怎么查 | 为什么判据查不到 |
|---|---|---|
| 同一句话有没有在一屏里出现两次 | 逐张看截图 | 12 条判据不查「重复渲染」 |
| 页面上排队的元素是否共用一条左轴 | 逐张看截图 | 判据只查「不超 1080px」 |
| 讲义页是不是「文字墙」 | 数一下 `text` 块的 `i` 行数（≥3 一律分点） | 判据只看高度，不看结构 |

## 第十一轮（2026-10-16）：挖空练习 —— 答案印在讲义上、录音在另一个视图

用户原话两条：「听力音频在下一个『2. 练习』的按钮下面，我得打开后面再点开前面」
「就不能做到点一下出一个答案吗？空必须都填好吗？实现不了挖空练习啊」。

### 1. 【真 bug】答案写死在讲义里 = 没有挖空

`PET U2L3` noticing 的讲义第 2 页把六句功能语言的答案用 `<b>` 印在句子里（`Shall we **start**…`），
`FCE L5` 第 1 页同理（8 句、7 个 `<b>______</b>`）。讲义是「读」的零件，天然做不了「先填、再一个一个揭晓」。

**修法**：新模块 `modules/gap-fill.js`（挖空核对），填空与归类搬进**练习视图**：
- 每个空一枚按钮，点一下只揭晓这一个；「揭晓下一空」按显示顺序走，带「还剩 N 空」
- **答案不进 DOM**：初始按钮是空的（CSS 给一枚 `?`），揭晓才 `textContent = 答案`
  —— 否则观众屏源码里就是答案，挖空等于没挖
- 归类（`cat`）单独一层揭晓：先填对词，再归类（两个动作对应两条教学目的）
- 教师操作本地执行 + 广播一次，观众屏只套用（`TK.snapshotPart` / `TK.on`），照 §八 的顺序排

顺带：`FCE L5` 的 `FORM_GAP_ITEMS` 不重写正文 —— 空的位置来自 `FORM_GAPPED` 的
`<b>______</b>`，答案按空顺序从 `FORM_KEYS` 取，两边拼成 `parts`（奇数位是空）。

### 2. 【设计缺陷】录音在「练习」、题目在「讲解」，老师要来回切

`audio-player` 是练习模块，而听力题目 / 原文在讲义里 —— 放音要切到练习，讲题要切回讲解。

**修法**：`gap-fill` 直接借一个音频播放器实例同屏：

```js
const apDef = TK.modules[P.audioModule];
const ap = (typeof apDef === 'function') ? apDef() : apDef;
if (ap && !TK.isAudience) { ap.mount(el('audioSlot'), step, { ...P.audio }); audioCtl = ap.ctl; }
```

这是 `tool-pager` 早就有的做法（「借音频播放器」），这一轮把它固化成规则写进
`typography.md` §十：**录音必须和题在同一屏**。

### 3. 改结构必须同步文案

给原本「只讲」的 `FCE L5` intro 加了练习视图之后，`d` / `tip` 里「第 1 页（填空）／第 2 页（答案）」
就全是旧结构了 —— 一处不改，老师按提示翻页会找不到东西。同一轮里改了：
`FCE intro` 的 `d` + `tip`、`PET noticing` 的 `d` + `tip`。

**教训：动讲义分页 / 视图结构时，`grep` 一遍「第 N 页」和「讲义」两个词，逐条核对。**

## 第十二轮（2026-10-16）：投影端补档 —— 教师端紧凑档照抄到投影就是「看不见」

用户第六条（KET U8L3）：「热身快闪图片和下方文字太小，演示屏上看不见」
「模考图片文字排版太挤，显示不完整」「填空干脆不给填空，答完一次性揭晓」。

### 1. 【真 bug】教师端的紧凑档没有投影档

`.flash-grid.cols-4`（4 列 8 张卡的紧凑档）写死了 `.name{font-size:var(--fs-sm)}`、
`.pic{height:clamp(46px,7.4vh,80px)}`、卡高 `clamp(104px,15.5vh,158px)` + `overflow:hidden`。
这套值在教师端是对的（一屏排下 8 张），**投影端照抄**实测就是：311px 宽的卡里 **14px 标签 + 73px 图标**。

**修法**：在样式表末尾加 `body.audience .flash-grid.cols-4 …` 的补档，并且**特异性要高一级** ——
`.flash-grid.cols-4 .flash-card .name` 是 (0,4,0)，外壳观众屏那条 `body.audience .flash-card .name` (0,2,1)
**压不住**它（这就是为什么「观众屏字号表」里明明有 `.flash-card .name` 却没生效）。
投影档还要把 `height:auto;overflow:visible` 写回来，否则放大后开始裁字。
规则写进 `typography.md` §十一。

### 2. 【真 bug】整句问句用 `minmax(140px)` 的卡片网格 = 挤成窄卡、文字溢出卡外

模拟考试 Phase 1 的 8 张「照片 + 考官问句」卡复用了 `.flash-grid`（默认 `minmax(140px,1fr)`）。
词（computer）没问题，整句（「Tell me something about the games you play on your computer.」）
就被挤成 5 列 ~150px 窄卡，加上 `aspect-ratio:1.05` 的固定高度 —— 文字直接溢出卡外。

**修法**：整句卡单独一档 `.flash-grid.exam-grid`（列宽 ≥300px、`aspect-ratio:auto`、卡高由内容定、
`.picimg{object-fit:contain}`）。

### 3. 挖空：`plainBlank`（视觉）与 `oneShot`（行为）必须是两个开关

需求在**同一天里翻了一次面**，值得记一笔：
- 用户第六条原话「填空的问题这次干脆不给填空，让孩子全部答完才一次性揭晓答案」→ 做了 `oneShot`
  （空变朴素下划线、不可点，只留「全部揭晓」）。
- 紧接着第七条的追问是「这个为什么不是一个一个出答案，而是一次性出答案」→ 说明「不给框」是视觉要求，
  「一次性揭晓」不是。两件事必须拆开：
  - `plainBlank`：空画成朴素下划线（不给输入框感、不给 `?`），**但照旧可点**
  - `oneShot`：关掉逐个揭晓（空不可点、`揭晓下一空` 隐藏）

U8L3 Ex.1 现在 = `plainBlank` + 逐个揭晓：点空揭晓那一个，也能「揭晓下一空」或「全部揭晓」。

**教训：用户一句话里可能混着「长相」和「行为」两类要求 —— 拆成两个开关再实现，别做成一个布尔。**
同一条规则也把 Ex.1 的挖空从讲义搬进练习（录音本来就在练习里）。

### 4. 埋着的坑：`object-fit`

`.picimg{object-fit:cover}` 是给照片用的；**图标（SVG）用 cover 会被裁掉边缘**。
整句卡/词卡里的图标一律 `contain`。
