# 外壳边界与契约（kpf-speaking-deck 的地基）

> 目的：把「口语课堂工具」里**跨课不变**的部分固化成一份外壳，每节课只写变化的部分。
> 判定标准（唯一）：**外壳 + 三份现有 lesson 能重新生成出 KET / PET / FCE 三个工具，且数值对得上。** 对不上就改外壳。

## 一、目录约定

```
~/.agents/skills/kpf-speaking-deck/
├── SKILL.md
├── assets/shell.html          外壳（唯一类名/CSS 来源）
├── assets/extra-classes.css   跨课补充类（外壳里完全没有的类规则）
├── assets/extra-selectors.css 跨课补充选择器（id / 复合选择器）
├── assets/launcher.command.tpl
├── modules/<name>.js          练习模块库（每个一份，含契约三件套）
├── references/*.md            shell-boundary / pitfalls / layout-budget / content-extraction
├── scripts/build.py           外壳 + lesson + 素材 → 单文件 HTML + .command
├── scripts/check-classes.mjs  类名预检：lesson 用到的 class 必须在外壳 <style> 里
├── scripts/check-drift.mjs    防漂移：各产物公共段落是否逐字节一致
├── scripts/validate-deck.mjs  运行时校验器（M1 溢出/白空、M2 标题间距、M3 委托给 Safari）
└── templates/lesson.example.js
```

其余脚本（都在 `scripts/`，一次性或验收用）：

```
scripts/check-content.py         内容保真：课件原文逐字还在（按同名 golden 对照）
scripts/probe.js                 只读验收探针（几何 / 错误 / 同步 / 音效 / 素材 / 计分 / 交互）
scripts/serve-verify.sh          起三对本地服务（golden / out 同源隔离）并把探针追加到 /tmp 的副本上
scripts/verify.py                headless Chrome（视口 1920×1080）跑探针 + 逐条判据 + 对照表
scripts/safari-verify.sh         用 Safari 开真窗口（实时）：第 8/9 条必须在真实时间下测
scripts/safari-counts.py         读 Safari 标签标题，抽出 apply/beep/err/teacher-only
scripts/seed-shell.py            （一次性）从 golden 挖出外壳
scripts/extract-lesson-fce.py    （一次性）抽 FCE 课时数据
scripts/extract-lesson-pk.py     （一次性）抽 PET / KET 课时数据（含照片与录音）
scripts/extract-lesson-css.py    （一次性）生成课时级 CSS 覆盖
scripts/append-extra-classes.py  （一次性）补跨课类名
scripts/append-missing-css.py    （一次性）补跨课选择器
```

**产物永远是「单文件 HTML + 双击启动脚本」**，不引入构建系统、不拆成多文件交付。

## 二、外壳里有什么（不许每课重写）

| 组 | 内容 |
|---|---|
| 同步层 | `store` / `isAudience` / `SID` / `bc` / `send` / `send2` / `dup`(上限 2000) / `seenMsg` / `handlePingAck`(不含自激补发 + 3 秒兜底限流) / `pollInbox` |
| 音效 | `beep` / `sfx`（**观众屏在源头静音**：`isAudience ? noSound : {...}`） |
| 彩带 | `celebrate` / `#confetti` |
| 计分 | `ledger` / `totals` / `renderScore` / `addScore` / `renderChampion` / `champAnnounced` / `champBannerHTML` / `doChampGo` |
| 导航 | `doGo`（**幂等**：已在目标环节不再增删 class）/ `visited` / `stepNav` / 步骤条 / 菜单卡 |
| 讲练双视图 | `modState` / `doMod` / `.mod-tab` |
| 讲义分页 | `deckState` / `doDeck` / `lessonDeckHTML` |
| 参考抽屉 | `refOpen` / `refTab` / `doRef` / `renderRefBody` / `#refBtn` |
| 句架条 | `renderFrameBar`（按当前环节换内容） |
| 计时器 | `tTotal/tLeft/ticking` / `doTimer` / `tRender` / `timerState` / `applyTimer` / `closeTimer` / `startTick` / `stopTick` + 观众屏右上角倒计时条 |
| 演讲者模式 | `openAudience` / `enterPresenting` / `exitPresenting` / `togglePresent` / `setStatus` / `updateConsole` / `#console` |
| 缩放 | `uiZoom` / `sessionMinZoom` / `leftEls` / `setZoom` / `measureWorstScreenH`（**隐藏屏在正常流里量，不用 absolute**）/ `computeFitZoom`（chrome 含 `main` 的 padding-bottom）/ `fitLeft` |
| 观众屏适配 | `scheduleAudFit` / `audUsed` / `fitAudience`（`max-width:none;width:100%` + `body.audience` 字号放大 + 自校正循环） |
| 状态同步 | `snapshot` / `applyState` / `ACT` 注册表 / `TK.on()` |
| 整页骨架 | header / steps / main / console / refDrawer / frameBar / timerOverlay / confetti / audBadge / byeOverlay |
| 全部 CSS | 设计系统、`.screen` / `.stage` / 按钮 / 卡片 / 讲义 / 三步组件 / 观众屏与演讲者覆盖 |

## 三、每节课写什么（lesson 数据）

```js
const LESSON = {
  meta: { title, subtitle, channel:'xxx-v1', keyPrefix:'xxx_', folder, port },
  frames: { <stepId>: [句架条内容, ...] },
  ref: { framesHTML, vocabHTML },              // 参考抽屉两个 tab
  img:  { key: 'data:image/jpeg;base64,...' },
  steps: [{
    id, n, label, icon, time, kind, tier, tierText,
    d,                                          // 菜单卡描述
    tip, talk,                                  // 控制台教学提示 / 说什么
    recipe: { badge:'60s', items:[...] },       // 编号操作卡（可选）
    lesson: [ { title, blocks:[...] } ],        // 讲义页（讲解）
    practice: { type:'<模块名>', ...模块参数 }   // 练习页
  }],
};
```

**讲义页的 block 类型**（够覆盖三份现有内容）：
`steps`（编号步骤 + 时间）/ `frames`（成组句架）/ `model`（范文 + 标注）/ `tips`（注意事项）/ `kv`（键值表）/ `cards`（维度卡）/ `timeline` / `text`

## 四、外壳对外 API（模块只能用它，不许摸内部变量）

```js
window.TK = {
  isAudience,
  go(id), mod(id, view), deck(id, page),      // 导航（都会广播）
  score(step, team, n), totals(), ledger,
  broadcast(msg),                              // 等价 send()
  on(actionName, handler),                     // 注册同步动作（写进 ACT）
  snapshotPart(key, getter),                   // 把模块状态放进整份快照
  applyPart(key, fn),                          // 从快照还原
  renderFrameBar(id), sfx, ICONS, img(key),
  $, $$,                                       // 查询助手
};
```

## 五、练习模块契约（三件套，缺一不可）

```js
TK.registerModule('photo-pair-steps', {
  // 1) 纯渲染：从 state 出 DOM，不做副作用、不广播
  render(state, host) {},
  // 2) 观众屏收到广播时怎么套用（本地点击走 render，不重复计分）
  actions: { p2Step(m) {}, ... },
  // 3) 进快照的字段
  snapshot: () => ({...}),
  // 4) 初始 state + 可选 reset
  init: () => ({...}), reset(state) {},
});
```

**铁律**（都是踩过的坑，逐条来自 `pitfalls.md`）：
1. 渲染函数必须幂等——同状态渲染两次结果一致，且**不重置用户的滚动位置**
2. 任何动作本地执行一次 + 广播一次；**绝不在收到广播时再执行本地计分**
3. `handlePingAck` 里**不许补发快照**（会自激）
4. 观众屏不许出声、不许出现可交互控件（靠 `isAudience` 判断 + `.teacher-only`，不能只靠 `pointer-events:none`）
5. 模块自己的临时状态必须进 `snapshot()`

## 六、三个待迁移工具的模块映射

| 工具 | 环节 → 模块 |
|---|---|
| **KET U7L3**（5 环节） | flash → `flash-cards`｜tools → `teach-deck`｜pair → `pair-task`｜examiner → `mock-exam`(含 phase tabs + 互评)｜bingo → `ox-bingo` |
| **PET L4**（5 环节） | intro → `teach-deck`｜p1 → `draw-question`(拓展三法计分)｜bank → `teach-deck`｜p2 → `photo-relay`｜p3 → `negotiate`｜p4 → `discussion` |
| **FCE P1–2**（3 环节） | overview → `teach-deck`｜p1 → `draw-question`(三招打勾) + `teach-deck`｜p2 → `photo-pair-steps`(三合一组件) + `teach-deck`(4 页) + `mock-exam` |

抽模块时以**三份文件里的真实实现为准**：出现过一次的也要抽（那正是要固化的）。若某模块在三份里写法不一致，取最完善的那份作为基准，在 `pitfalls.md` 里记一笔差异。

## 七、验收标准（数值化，不是我看着顺眼）

三份重新生成的工具必须同时满足：

| # | 项目 | 判据 |
|---|---|---|
| 1 | 语法 | `node --check`（抽最后一个 `<script>`）退出码 0 |
| 2 | 内容保真 | 课件原文**逐字**仍在（去标签后比对）：Tips、功能语言、范文、题库、操作卡中文 |
| 3 | 版式 | 1920×1080 演讲者模式 + 观众屏，**每个视图 `main.bottom ≤ 1080`** |
| 4 | 版式 | 观众屏 `left=0`、`right=0` |
| 5 | 版式 | 讲义每页自然高 ≤1100px；FCE 投影正文实际字号 ≥20px（= 自然字号 × 当场缩放，**引用时必须带视口与缩放**：视口 1920×993、缩放 0.63 下 32.64×0.63≈20.6px） |
| 6 | 素材 | 所有照片 `naturalWidth > 0` |
| 7 | 错误 | 走完全部环节 × 讲/练 × 讲义每页 × 练习页交互，双窗口 `window.onerror` 计数 **= 0** |
| 8 | 同步 | **空转 10 秒内 `applyState` 次数 ≤5**（健康≈3；超了就是回环风暴） |
| 9 | 静音 | 观众屏 `beep` 调用 = 0 |
| 10 | 锁定 | 观众屏 `.teacher-only` 全部 `display:none`（比例 100%） |
| 11 | 计分 | 练习 +1 → 顶栏变化 → 撤销回 0 → 冠军表与顶栏一致 |
| 12 | 回归 | 与**迁移前**的同名视图对比**自然高度**（清掉 `main` 的 zoom 再量 `getBoundingClientRect().bottom`），偏差 ≤2%，逐视图列表报出 |

> **第 12 条的判据为什么必须用自然高度**：带 zoom 的 `bottom` 受「整场缩放只降不升」影响——同一个文件、同一探针，两次运行的数值会差 10–95px（实测过：`p2/2` 一次 999.32、一次 1094.32）。**自然高度与缩放无关，是版式真值**，只有它能判「外壳是否承载住了」。

第 12 条是关键——**它是「外壳真的承载住了」的唯一证据**。

## 八、防回归护栏

- `check-classes.mjs`：扫描生成的 HTML，取出所有用到的 class，验证每个都在外壳 `<style>` 里有定义；报出未定义清单（**这是「字墙/CSS 漂移」的源头**）
- `validate-deck.mjs`：输出 px 级 `M1 溢出 / 底部白空`、`M2 标题间距`、`M3 同步风暴`，配分级修正阶梯（1–40px 微调 / 40–90 局部压 / 90–160 拆页 / 160+ 才删内容）；**修完复测，白空变大说明修过头**
- `check-drift.mjs`：比对多份产物的公共段落（同步层 / sfx / 缩放 / 观众屏适配）是否逐字节一致；不一致就报警（今天改同步风暴要改三处，就是因为没有这道闸）
