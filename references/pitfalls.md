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
