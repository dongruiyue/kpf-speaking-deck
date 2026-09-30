---
name: kpf-speaking-deck
description: 用「外壳 + 课时数据 + 模块库」生成单文件口语课堂工具（KET/PET/FCE 演讲者模式 + 观众屏投影）。当需要新建一节口语课的课堂工具、把现有课堂工具迁成数据驱动、或校验生成品与迁移前逐视图数值一致时使用。
---

# kpf-speaking-deck

把「口语课堂工具」里跨课不变的部分固化成**外壳**，每节课只写变化的部分。
判定标准只有一条：**外壳 + 课时数据能重新生成出原来的工具，且数值对得上。**

## 目录

```
kpf-speaking-deck/
├── SKILL.md
├── assets/shell.html            外壳（唯一类名 / CSS 来源；含注入点）
├── assets/extra-classes.css     跨课补充类（PET/KET 用到、FCE 没有的类规则）
├── assets/extra-selectors.css   跨课补充选择器（id / 复合选择器，如 #refFab）
├── assets/launcher.command.tpl  双击启动脚本模板
├── modules/                     练习模块库（12 个，契约三件套）
│     teach-deck / draw-question / photo-pair-steps / photo-relay / negotiate /
│     discussion / flash-cards / pair-task / ox-bingo / mock-exam / tool-pager / audio-player
├── lessons/<name>.js            课时数据（含一行/一段 const LESSON_META = {...}）
├── lessons/<name>.img/*         课时照片（build 时转 base64 内嵌）
├── lessons/<name>.audio/*       课时录音（mp3 等，同样转 base64 内嵌）
├── lessons/<name>.css           课时级 CSS 覆盖：外壳里也有、但取值不同的选择器交还给这节课
├── lessons/<name>.html          可选：课时附带的静态 DOM（走 <!--==LESSON_HTML==-->）
├── references/shell-boundary.md 外壳边界与验收标准（规格）
├── references/pitfalls.md       踩坑台账（模块合并差异 / 已修 bug / 规格对不上的地方）
├── references/layout-budget.md  版式预算（每条判据 + 出处 + 实测基线）
├── references/content-extraction.md 从 PPT / PDF 抽课堂素材的实做法
├── references/publishing.md   公开发布清单与上手流程（含版权红线）
├── golden/*.html                迁移前的三份工具（**只读**，唯一回滚点）
├── out/                         重建产物（确认后才谈替换原目录）
├── scripts/build.py             外壳 + 课时 + 素材 → 单文件 HTML + .command
├── scripts/extract_pptx.py      从课件 PPTX 抽逐页文本 + 列出/导出媒体（标准库；有 python-pptx 时增强）
├── scripts/crop_photos.py       从课本 PDF 页自动裁照片（饱和度剖面 + --rect 兜底；需 PyMuPDF/PIL）
├── scripts/check-classes.mjs    类名预检：用到的 class 必须在外壳 <style> 里有定义
├── scripts/check-drift.mjs      防漂移：公共段落与迁移前逐字节一致
├── scripts/validate-deck.mjs    px 级运行时校验：M1 溢出/白空、M2 标题间距、M3 委托 Safari
├── scripts/check-content.py     内容保真：课件原文逐字还在（按同名 golden 对照）
├── scripts/probe.js             只读验收探针（几何 / 错误 / 同步 / 音效 / 素材 / 计分 / 交互）
├── scripts/serve-verify.sh      起三对本地服务（golden / out 同源隔离）并挂上探针
├── scripts/verify.py            headless Chrome（视口 1920×1080）跑探针 + 逐项判据 + 对照表
├── scripts/safari-verify.sh     用 Safari 开真窗口（实时）：第 8/9 条必须在真实时间下测
├── scripts/safari-counts.py     读 Safari 标签标题，抽出 apply/beep/err/teacher-only
├── scripts/seed-shell.py        （一次性）从 golden 挖出外壳
├── scripts/extract-lesson-fce.py（一次性）抽 FCE 课时数据
├── scripts/extract-lesson-pk.py （一次性）抽 PET / KET 课时数据（含录音）
├── scripts/append-extra-classes.py （一次性）补跨课类名
├── scripts/append-missing-css.py   （一次性）补跨课选择器
└── scripts/extract-lesson-css.py   （一次性）生成课时级 CSS 覆盖
```

## 生成一节课

```bash
python3 scripts/build.py fce-part1-2     # → out/FCE-Speaking-Part1-2-课堂工具.html + .command
python3 scripts/build.py pet-l4
python3 scripts/build.py ket-u7l3
```

只用标准库；幂等（同样输入跑两次产物逐字节一致）；注入后自检「不许残留注入标记」。
`modules/` 里的模块**全量注入**（模块加载时只注册，挂载才绑事件），所以课时不需要声明依赖。

## 加一节新课

0. **抽素材**（有课件 / 教材就先跑这步）：
   ```bash
   python3 scripts/extract_pptx.py 课件.pptx --text-out /tmp/课.txt --imgdir lessons/<name>.img
   python3 scripts/crop_photos.py 课本.pdf --page 56 --outdir lessons/<name>.img   # 或 --rect x,y,w,h 手动
   ```
   原理与参数见 `references/content-extraction.md`。
1. `lessons/<name>.js`：照 `templates/lesson.example.js` 写。
   开头必须是 `const LESSON_META = {...};`（build.py 直接 JSON.parse 它，可跨行）。
2. `lessons/<name>.img/`、`lessons/<name>.audio/`：素材按「键名.ext」放好。
3. 如果这一节课原来有自己的几何（更早的版本），再给 `lessons/<name>.css`
   （见 「课时级 CSS 覆盖」）。
4. `python3 scripts/build.py <name>`。

### 课时级 CSS 覆盖（保住这节课自己的样子）

外壳的样式表取的是 FCE 的取值。PET / KET 是更早的版本，很多**同名选择器**取值不同
（`.stage` 的高度、`.menu-card` 的 padding、按钮尺寸…）。规则是：

| 情况 | 谁说了算 |
|---|---|
| 外壳完全没有的选择器（`#refFab` / `.tool-frames` / `.bingo-cell` …） | 外壳补全（`assets/extra-*.css`）|
| 两边都有、取值不同 | **课时自己的那几条规则**写进 `lessons/<name>.css`（注入在外壳之后）|
| `main` 的 padding / max-width | **外壳**说了算 —— Fit 公式里的 chrome 常量按外壳取值算，覆盖它会让自适应变乐观（实测会把 KET 的两屏顶出视口 1269/1287 > 1080）|

## 自检（交付前必须全绿）

```bash
python3 scripts/build.py <name>
node scripts/check-classes.mjs out/<产物>.html     # 未定义类名 = 0
node scripts/check-drift.mjs   out/<产物>.html     # 公共段落无漂移
python3 scripts/check-content.py out/<产物>.html   # 课件原文逐字还在（无 golden 时自动跳过）
python3 scripts/verify.py <name>                   # 12 条判据（自起临时服务；无 golden 时跳过第 2/12 条）
node scripts/validate-deck.mjs <name>              # px 级版式体检：M1 溢出/白空、M2 标题间距
node scripts/validate-deck.mjs <name> --m3         # 第 8/9 条：真 Safari 实测（先 bash scripts/serve-verify.sh，跑完 safari-verify.sh close）
```

浏览器侧为什么要两条路：
- **`verify.py` / `validate-deck.mjs`（headless Chrome）** 出几何真值与判据。单窗口没有
  双窗口 peer，所以它**测不了同步风暴**。
- **`safari-verify.sh` + `safari-counts.py`（真窗口、真实时间）** 只测第 8 条
  （空转 10 秒 `applyState` ≤5）与第 9 条（观众屏 `beep` = 0）—— 这两条必须在真实时间下测。

发布给别人用之前，先看 `references/publishing.md`（含版权红线）。

## 铁律（都是踩过的坑，详见 references/pitfalls.md）

1. 渲染函数幂等，且不重置用户滚动位置。
2. 本地动作执行一次 + 广播一次；**收到广播只套用状态，绝不再本地计分**。
3. `handlePingAck` 里**不许补发快照**（会自激；历史上 38 秒发 8 万条）。
4. 观众屏不许出声、不许出现可交互控件（靠 `isAudience` + `.teacher-only`，不是 `pointer-events`）。
5. 模块的临时状态必须进 `snapshot()`；**快照字段只在 mount 时注册**，没挂载的模块不污染快照。
6. 挂载模块必须容错：一个模块抛异常会让整个外壳的启动截断（见 pitfalls B2）。
7. `golden/` 只读；产物一律先落 `out/`，确认后才谈替换。
8. 播放器（`audio-player`）：**播放动作不广播**（观众屏在同一台机器上，广播出去就是听两遍）、
   整块 `teacher-only`、观众屏**连 `<audio>` 都不建**。
9. 环节页有三种布局，按数据自动选：
   有讲义 + 有练习 → 讲/练双视图（FCE p1/p2、PET p1–p4）；只有讲义 → 讲义铺在 `stage`（FCE overview）；
   只有练习 → 单视图（KET 五个环节都没有讲练切换）。
