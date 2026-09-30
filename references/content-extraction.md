# content-extraction.md —— 从 PPT / PDF 抽课堂素材的实做法

> 这份文档回答一件事：**课件的英文原文、整页照片、教材录音，是怎么变成 `lessons/<课时>.js` 与
> `lessons/<课时>.img/`、`lessons/<课时>.audio/` 的。**
>
> 写作原则：**只写脚本里真有的做法**。核实不了的一律标「未核实」，不编。
> 本文的每一条结论都给了复核命令（见 §六），你可以照着在 5 分钟内推翻或确认它。

---

## 一、先说清楚：抽取分两段，边界在 `golden/`

```
课件 PPT / 教材 PDF  ──[ scripts/extract_pptx.py + scripts/crop_photos.py ]──▶  golden/*.html（图片已 base64 内嵌在 const IMG 里）
                            （2026-09-30 补建，验收见 §三）                                   │
                             scripts/extract-lesson-*.py │  ← 本 skill 真正拥有的抽取环节
                                                         ▼
                              lessons/<课时>.js + lessons/<课时>.img/ + lessons/<课时>.audio/
                                                         │
                                        scripts/build.py │  ← 素材转 base64 内嵌回单文件
                                                         ▼
                                     out/<产物>.html（单文件 + 双击启动脚本）
```

`golden/` 是**迁移前就已经存在**的那三份工具（FCE / PET / KET），它们的图片、录音、课件原文
**当时就已经是 base64 内嵌在 HTML 里**了。本 skill 的 extract-lesson 脚本做的是「从 golden 里搬」；
而「从 pptx / pdf 里抠」这一段，历史上（三份 golden 诞生时）没有留档 —— **2026-09-30 已补建**
`scripts/extract_pptx.py`（PPTX 文本 + 媒体）与 `scripts/crop_photos.py`（PDF 扫描页裁照片），
并用三份真实课件 + KET 课本做了端到端验收（见 §三 Q1/Q2，全部数字可复核）。

---

## 二、本 skill 里三个抽取脚本**实际**做了什么

### 1) `scripts/extract-lesson-fce.py`（265 行）

**做法：按行号切片 + 正则解析原文，绝不重打字。**

- `SLICES` 列了 14 段 `(起行, 止行, 说明)`，逐段用 `seg(a, b, expect)` 取出来拼成
  `verbatim`；`seg()` 会**断言这一行还是原来那句**，对不上就
  `SystemExit('行号漂移：第 %d 行应为 %r，实际 %r')` —— 这是「逐字」的第一道闸：
  golden 一旦被改动，抽取会当场炸，而不是悄悄搬错内容。
  ```
  646–697  两套真题（课件 SLIDE 58 / 69）
  699–741  7 条注意事项
  743–745  考官指令模板 + 范文
  746–770  每个环节的讲解页内容
  772–784  编号操作卡
  796–814  三合一组件的数据
  831–862  总览页
  904–940  底部常驻句架栏
  1004–1013 const REF_FRAMES_HTML
  1014–1048 function refVocabHTML
  1072–1076 const DK_KEY_TIPS
  1078–1078 const DK_GROUP_TITLE
  1330–1346 const P1_BANK
  1347–1347 const P1_TESTS
  ```
- **讲义页从「一大坨模板串」拆成 §三 的 block 数据**：不手抄，用正则从原文里解析——
  `<div class="kv"><span class="kv-k">…</span><span class="kv-v">…</span><span class="kv-t">…</span></div>`
  抓成 `kv` 行、`<div class="dk-cn ov-note">` 抓成 `note`、`<span>` 抓成时间轴 4 段、
  `.dk-do` 抓成尾注；条数不对就 `SystemExit('解析 OV_P1 失败：kv=%d notes=%d times=%d')`。
- 拼接时所有字符串都过 `js()`（= `json.dumps(..., ensure_ascii=False)`）生成 JS 字面量，
  所以**引号 / 反斜杠 / 中文都不会被改写**。
- 输出 `lessons/fce-part1-2.js`，开头是一行纯 JSON 的 `const LESSON_META = {...};`
  （`build.py` 直接 `JSON.parse` 它，所以 meta 只能是合法 JSON）。
- 结尾只留 `Object.assign(LESSON, { img: __LESSON_IMG__ });` 这个注入点。

> **注意（已查明，2026-09-30）**：这个脚本里没有抽取图片的代码（没有 `pull_assets` 调用）。
> 已用 sha256 对拍 + 感知哈希查清来历（详见 §三 Q2 末尾）：8 张里 t1 组 4 张与
> FCE D2 课件的 `ppt/media/image16–19` 是**同图重编码**（感知哈希距离 0，但逐字节不同），
> t2 组 4 张在两份 FCE 课件的 media 里都找不到（最近感知距离 87–105/256），来源仍未查明。

### 2) `scripts/extract-lesson-pk.py`（434 行）

PET / KET 共用一份脚本，比 FCE 那份多了三件事：

- **PET：把「一屏三栏」拆成三页讲义**。用 `divs_with_class(text, 'teach-col')` 按
  **配对 `<div>` 的深度**抠出每个 `teach-col` 块（内部还能有嵌套 div），断言必须正好 3 个，
  再一栏一页写进 `STEPS[0].lesson`。
- **KET：句架条从 body 的静态 HTML 里抓**。KET 的句架条不是 JS 常量，而是 body 里的
  `<span class="fb-item">…</span>`；脚本用正则从第 347–353 行抓出 3 条（断言必须 3 条）。
  这正是 `pitfalls.md` B4 的修复：一开始手写成 `FRAME_ITEMS` 引用了一个不存在的常量，
  整页启动中断 —— 之后改成**从原文抓，不重抄**。
- **`pull_assets()`：把 golden 里的 base64 落成真文件**（这是本 skill 里唯一真正「抽素材」的代码）：
  ```python
  entries = re.findall(r"(\w+)\s*:\s*'data:image/(\w+);base64,([A-Za-z0-9+/=]+)'", <golden 的那几行>)
  # 每一条 base64 → lessons/<课时>.img/<key>.jpeg
  m = re.search(r'src="data:audio/([a-z0-9]+);base64,([A-Za-z0-9+/=]+)"', <golden 第 864 行>)
  # → lessons/<课时>.audio/ket.mp3
  ```
  调用点是 `pull_assets(PET, (528, 530), …)`、`pull_assets(KET, (450, 455), …, audio=(864, 'mp3'))`
  —— 行号就是 golden 里 `const IMG = { … };` 那几行与 `<audio src="data:audio/mpeg;base64,…">` 那一行。

### 3) `scripts/extract-lesson-css.py`（76 行）

不抽内容，抽**这节课自己的几何**：把 PET / KET 原样式表里「外壳里也有、取值不同」的选择器
原样写进 `lessons/<课时>.css`（注入在外壳样式之后，所以覆盖生效），
规则是外壳补「自己完全没有的选择器」、两边都有的取值由这一节课说了算。
唯一的例外是 `main` 的 `padding-bottom` **不给**（Fit 公式里的 chrome 常量按外壳取值算，
覆盖它会让自适应变乐观 —— 实测会把 KET 的两屏顶出视口 1269/1287 > 1080），
但 `max-width` 可以还给它（与 Fit 无关，否则教师端菜单会从两行变一行）。

---

## 三、逐问回答（含核实结论）

### Q1：PPTX 的正文 / 句架 / 范文文本，是怎么从 `slideN.xml` 里抠出来的？

**已核实（2026-09-30 补建 `scripts/extract_pptx.py` 并验收）。** 历史上的抽取脚本确实没留档，
现在的做法（只依赖标准库 `zipfile` + `xml.etree.ElementTree`）：

- **幻灯片顺序**：读 `ppt/presentation.xml` 的 `p:sldIdLst` + `ppt/_rels/presentation.xml.rels`，
  按放映序还原 `ppt/slides/slideN.xml` 列表 —— 有的课件 slideN.xml 编号与放映序不一致，
  直接按文件名数字排序会错；presentation.xml 解析失败才退回按 N 自然排序。
- **文本**：每张 slide 的 XML 里按 `<a:p>` 段落聚合 `<a:t>` run，逐页输出纯文本清单；
  指定范围内一行文本都抽不到就**报错退出**（退出码 1），不写空文件。
- **媒体**：列出 / 导出 `ppt/media/*`（图片 + 音视频分组；音频可直接进
  `lessons/<课时>.audio/`）。导出用流式拷贝，74–264MB 的课件不会整读进内存。
- **增强**：环境里装了 python-pptx 就额外抽每页演讲者备注（`--- 演讲者备注 ---` 段）；
  没装自动跳过，主流程不受影响（两条路径都实测过）。

```bash
python3 scripts/extract_pptx.py 课件.pptx                       # 全文打 stdout
python3 scripts/extract_pptx.py 课件.pptx --slides 56-68        # 只抽第 56~68 页（放映序）
python3 scripts/extract_pptx.py 课件.pptx --text-out /tmp/t.txt # 写文件
python3 scripts/extract_pptx.py 课件.pptx --list-media          # 只列媒体清单
python3 scripts/extract_pptx.py 课件.pptx --imgdir /tmp/media   # 导出 ppt/media/*
```

**端到端验收**（用三份真实课件抽文本，与 `lessons/*.js` 里的课件原文对拍）：

| 课件 | 页数 | 对拍结果 |
|---|---|---|
| FCE 模考班 D2（74MB） | 70 | lesson 手挑 10 条原文命中 **8**（如 "Do you use your mobile phone a lot? Why?" / "What are the friends enjoying about their day out?"）；未中 2 条是 lesson 侧改写：lesson "Why are the people using mobile phones in these situations?" ↔ 课件 "Why you think the people are using mobile phones in these situations."；lesson "chosen to read in these places" ↔ 课件 "chosen to read in different places ?" |
| FCE 模考班 D1（92MB） | 61 | 同样 10 条命中 **0** —— 与 golden 注释一致：这节课的 Speaking 内容出自 **D2**，D1 是另一天的课件 |
| PET 冲刺班 L4（264MB） | 89 | 6 条 Part 1 题库题全命中（"How often do you use the internet?" 等）；范文是改写（lesson "It is more comfortable and…" ↔ 课件 "because it offers more flexibility…"） |
| KET U7L3（26MB） | 79 | lesson 的长练习句（"I can bury my dad in the sand" 等优缺点句）**0 命中 —— 是教师自创内容**，不在课件里；课件向短语命中（traffic lights / crossing / Excuse me / "Unit 7 Let's go to the museum"） |

**意外发现（音频来历查明）**：`lessons/ket-u7l3.audio/ket.mp3` 与 U7L3.pptx 的
`ppt/media/media1.mp3` **逐字节一致**（sha256 同为 `401b4591b419…`）—— KET 的录音当年就是
从课件 media 直取的，不是从别处转的。

→ 结论更新：**「逐字从课件搬」这条纪律现在有了可复现的工具**；同时验收也量出了 lesson 侧
确实存在少量改写与自创内容（上面表格如实列出，不算抽取失败）。

### Q2：整页照片是怎么从 PPT 里裁出来、怎么定位的？（记忆里是「用 HSV 饱和度做行 / 列剖面找图片边界」）

**已核实（2026-09-30 补建 `scripts/crop_photos.py` 并验收）。** 记忆里的方法基本属实，
但实测发现**光用饱和度不够**，加了一道「平色排除」才可用（这正是当年可能手工微调过的地方）：

1. PyMuPDF（fitz）按 `--dpi` 渲染指定页为位图；`get_pixmap` 会自动按页面 `rotation=90`
   摆正（实测 KET 课本 188/189 页是旋转的，不摆正坐标轴全是错的）。
2. 转 HSV 取 S 通道：照片饱和、纸面/文字不饱和 → **行剖面**找照片横带、带内**列剖面**找纵段，
   横带×纵段=候选框；框内递归一层拆网格排列的多张照片。
3. **平色排除（实测必需）**：课本页上的纯色横幅 / "Exam advice" 色块同样高饱和，不加这道会把
   色块当照片、或把照片与相邻色块并成一坨。做法：框内彩色像素（S≥阈值且 V≥40）做 16 桶
   色相直方图，最大桶占比 ≥0.72 → 判为纯色块丢弃。
4. 碎片过滤（`--min-side` / `--min-area-frac` / `--min-cover`）；检出 0 块或超过
   `--max-regions` 都给明确提示；**灰度页**（最大饱和度 <12）直接拒绝自动检测并提示用
   `--rect`（实测 KET练习册.pdf 灰度页正确触发）。
5. 手动兜底：`--rect x,y,w,h`（渲染后像素坐标，可重复），给了就跳过自动检测。

```bash
python3 scripts/crop_photos.py 课本.pdf --page 56 --outdir /tmp/crops            # 自动检测
python3 scripts/crop_photos.py 课本.pdf --pages 54-56 --dpi 150                  # 多页
python3 scripts/crop_photos.py 课本.pdf --page 55 --rect 40,750,1140,874         # 手动裁
```

**页码定位**（KET 课本 189 页无文字层，只能按图像找）：低分辨率渲染（dpi 18–24）+ 与参考图
做模板匹配。实测：64 桶色彩直方图交集做全书初筛**信号太弱不可用**（照片在整页里被稀释）；
灰度 SAD 滑窗（dpi 24、缩略图 28–44px 宽）把 beach / museum / restaurant / shopping 四张
明确命中 **PDF 第 56 页**（= 课本 U7 P55，与 golden 注释一致）；stadium 要把缩略图档加宽到
40–90px 才稳定命中 56；map（浅色彩铅地图）自动信号弱，结合 golden 注释定位到
**PDF 第 55 页**底部。

**裁切验收**（与 `lessons/ket-u7l3.img/` 6 张参考图对拍，相似度 = 64×64 缩略 512 桶 RGB
直方图交集，1.0 为完全一致）：

| 参考图 | 页 | 方式 | 直方图交集 | 在 6 张参考中的排名 |
|---|---|---|---|---|
| restaurant | 56 | 自动（282×203） | 0.892 | 1 |
| museum | 56 | 自动（244×203） | 0.860 | 1 |
| stadium | 56 | 自动（550×345） | 0.903 | 1 |
| beach | 56 | 自动（267×306） | 0.851 | 1 |
| shopping | 56 | 自动（253×306） | 0.889 | 1 |
| map | 55 | --rect 手动 | 0.976 | 1 |

（自动裁的边界比参考图紧 —— 参考图带白边和圆角阴影，所以不是逐字节一致；已逐张目视确认
是同一幅插图。词表网格页（PDF 54，8 张小图）默认参数裁出 4/8，调 `--sat 36 --row-frac 0.03`
可到 9 块（含过切），这类页面建议直接 `--rect`。）

**FCE 8 张照片来历（sha256 对拍，已查明）**：与 D1（37 个 media）/ D2（31 个 media）
逐字节对拍 **0/8 命中 —— 不是直取媒体**。感知哈希（16×16 aHash）比对：t1 组 4 张
（t1a1/t1a2/t1b1/t1b2）与 **D2 的 `ppt/media/image16.png / image17.jpeg / image18.png /
image19.jpeg` 距离 = 0（同图，重编码过）**；t2 组 4 张在两份课件里都找不到感知匹配
（最近距离 87–105/256，接近随机），来源仍未查明（疑似出自 FCE Trainer 模考书，未验证）。

图片的**来历注释**（golden 自己的注释，与上面的实测对照）：

| 来源 | golden 里的原话 | 说明 |
|---|---|---|
| FCE 8 张照片 | `/* ===== 课件原图：8 张 Speaking Part 2 照片（base64 内嵌，单文件） ===== */` | 实测：t1 组 4 张出自 **D2 课件 media**（重编码）；t2 组 4 张来源未查明 |
| PET 3 张图 | `/* ===== 课件原图：Part 2 照片 A/B、Part 3 讨论选项 ===== */` | 来自课件原图，键名 `photoA/photoB/items`（可用 `extract_pptx.py --imgdir` 复取） |
| KET 6 张图 | `/* ===== 课本 U7 P55 原图（从 KET 课本裁切）===== */` | 实测属实：5 张在 PDF 第 56 页（= 课本 P55），map 在 PDF 第 55 页底部 |

→ 所以「彩色的原图只能从 PPT 里拿」这个说法**不成立于 KET**：KET 那 6 张（五个场所 + 地图）
是**从 KET 课本裁切**来的，而 KET 课本的扫描页是彩色的（见 Q3）。
这一点以 golden 的注释 + 实测的 PDF 色彩空间为准。

### Q3：教材 PDF 为什么不能直接裁图？（记忆：教材 PDF 是灰度扫描件、2464×3264、没有文字层）

**直接量了磁盘上的 PDF（PyMuPDF，只读）。结论：只有一半对，而且尺寸对不上。**

| 文件 | 页数 | 每页图片尺寸 | 色彩空间 | 页面旋转 | 文字层 |
|---|---|---|---|---|---|
| `秋季行课/KET/KET课本.pdf` | 189 | 4676×3464（188 页）/ 4676×6802（2 页） | **DeviceRGB（彩色）** | 188/189 是 `rotation=90` | ❌ 无（12 页只有水印「更多资料关注微信…」） |
| `秋季行课/KET/KET练习册.pdf` | 77 | 4676×3464（76 页）/ 4676×6802（1 页） | **DeviceGray（灰度）** | 76/77 是 `rotation=90` | ❌ 无（11 页只有水印） |

- 「**没有文字层**」✔ 成立：两本都是整页扫描，正文一个字都取不出来，只有卖家水印带文字。
- 「**页面是旋转的**」✔ 成立：几乎每页 `rotation=90/270`，裁图必须处理旋转，否则坐标轴是错的。
- 「**是灰度扫描件**」✘ 对 `KET课本.pdf` **不成立**（DeviceRGB 彩色）；对 `KET练习册.pdf` 成立。
- 「**2464×3264**」✘ **不成立**：磁盘上所有 PDF 的图片尺寸只有
  `4676×3464 / 4676×6802 / 3370×4330 / 2560×1440 / 2079×1386` 这几种，
  搜遍 `秋季行课/**/*.pdf` 没有 2464×3264。这条数字应该是记错了。
- 「**所以彩色的原图只能从 PPT 里拿**」✘ 对 KET **不成立**：KET 的彩色图恰恰是从课本裁的
  （见 Q2 的注释）。对 FCE / PET 成立 —— 它们的图注写的是「课件原图」。

→ 真正的难点不在灰度、而在：整页扫描 + 页面旋转 90° + 无文字层，所以只能按像素坐标裁，
且要先摆正。**这一点是真的**；被记错的是具体数字。

### Q4：抽出来的素材怎么进产物？

两条通道，一进一出（**中间那一跳就是本 skill 的抽取脚本**）：

```
golden/*.html   const IMG = { key: 'data:image/jpeg;base64,…' }        ← 素材的原始落点
        │  extract-lesson-pk.py :: pull_assets()   （FCE 那份没有这步，见 §二 备注）
        ▼
lessons/<课时>.img/<key>.jpeg       lessons/<课时>.audio/ket.mp3        ← 可编辑的素材目录
        │  build.py :: assets()  按扩展名（MIME 表）读回 → data URI
        │  注入 __LESSON_IMG__ / __LESSON_AUDIO__ → LESSON.img / LESSON.audio
        ▼
out/<产物>.html   页面里通过 TK.img(key) / TK.audio(key) 取用；单文件，不依赖外部文件
```

- `build.py` 里 `assets()` 只按**文件名排序**读目录（幂等、可复现），扩展名决定 MIME，
  不认得的扩展名直接跳过。
- 页面侧取素材：`TK.img(key)` 取图片 data URI、`TK.audio(key)` 取录音 data URI；
  `modules/audio-player.js` 三条老规矩照做（播放不广播 / 整块 `teacher-only` /
  **观众屏连 `<audio>` 都不建**，见 `pitfalls.md` §八）。
- 复核往返（我实际跑过，逐字节 sha256）：FCE 8/8、PET 3/3、KET 6/6 张照片与 `ket.mp3`
  与 golden 里的 base64 **逐字节一致**，`lessons/*.img/` 里也没有多余文件。

### Q5：「课件英文原文逐字不许改写」这条约束，在抽取环节怎么保证？

三道闸，缺一不可：

1. **抽取期：行号断言**。`seg(a, b, expect)` 在切片前先确认「第 a 行还是原来那句话」，
   对不上就 `SystemExit('行号漂移…')` —— 不搬错、不静默。（`extract-lesson-fce.py` /
   `extract-lesson-pk.py` 都有。）
2. **抽取期：解析而不重打**。原文里能解析的结构（`kv` / `ov-note` / `teach-col` / `fb-item` /
   `dk-do`）一律用正则抓，抓到的条数不对就报错；所有字面量由 `json.dumps` 生成。
   **KET 的 B4 就是「手抄」翻车的教训**：手写常量引用了不存在的 `FRAME_ITEMS`，
   整节课的外壳功能全丢；修法就是改成从 body 原文抓。
3. **验收期：机械比对**（`scripts/check-content.py`）。从 golden 里抽出所有长度 ≥12 的
   字符串字面量（剔掉实现代码标记 `document.` / `querySelector` / `=>` … 与 data URI），
   两侧都反转义，然后**逐个在产物里搜**；搜不到的逐条列出来，退出码非 0。
   再加 `scripts/check-drift.mjs`：按段落横幅把同步层 / 音效 / 缩放 / 观众屏适配切出来，
   与 golden 逐行比对是否逐字节一致。

> 也就是说：**逐字不是靠自觉，是靠「切片前断言 + 解析不重打 + 交付后机械搜」三处兜住。**
> 内容保真这条对应验收标准 §七 #2。

---

## 四、给下一节课的可复制配方

1. 手上有课件（PPT）时，先抽文本：`python3 scripts/extract_pptx.py 课件.pptx --text-out /tmp/t.txt`，
   从清单里把原文抄/改进 `lessons/<课时>.js`（原文带出处注释，例如「课件 SLIDE 60–65，英文逐字」）；
   照片与听力音频用 `--imgdir` 直接导出 `ppt/media/*`，按相似度/逐字节比对后重命名放素材目录。
2. 素材在课本扫描件里时：`python3 scripts/crop_photos.py 课本.pdf --page N`（自动检测），
   浅色图 / 密集网格页用 `--rect x,y,w,h` 手动裁；先低分辨率渲染 + 参考图比对找页码。
3. 素材放成 `lessons/<课时>.img/<键名>.jpeg`、`lessons/<课时>.audio/<键名>.mp3`；
   键名要与课时数据里 `TK.img('键名')` / `TK.audio('键名')` 一致。
4. 课时数据照 `templates/lesson.example.js` 写，开头必须是纯 JSON 的 `const LESSON_META = {...};`。
5. `python3 scripts/build.py <课时>`；再跑
   `python3 scripts/check-content.py out/<产物>.html`（逐字）与
   `node scripts/check-classes.mjs out/<产物>.html`（类名）、
   `node scripts/validate-deck.mjs <课时>`（版式体检）。
6. 若这一节课原来有自己的几何，再给 `lessons/<课时>.css`（见 §二.3 的规则）。

---

## 五、本文里「未核实」的清单（不许当结论用）

~~1. PPTX 文本抽取脚本~~ → **已核实**（2026-09-30 补建 `scripts/extract_pptx.py`，验收见 §三 Q1）。
~~2. 整页照片的裁剪定位方法~~ → **已核实**（2026-09-30 补建 `scripts/crop_photos.py`，
   「HSV 饱和度行列剖面」属实，但实测必须加平色排除；验收见 §三 Q2）。
3. **`lessons/fce-part1-2.img/` 8 张 FCE 照片的来历**：**部分查明** —— t1 组 4 张出自 FCE D2
   课件的 media（同图重编码，非逐字节直取）；**t2 组 4 张来源仍未查明**（疑似 FCE Trainer
   模考书，未验证）。
4. 「教材 PDF 是灰度、2464×3264」：**与磁盘上的文件不符**（见 Q3 的表），已按实测改正。
5. **KET 页码自动定位的局限**：直方图全书初筛信号弱不可用；SAD 滑窗对 4/6 张明确命中、
   stadium 需加宽缩略图档、map（浅色图）自动信号弱靠 golden 注释 + 目视确认（见 Q2）。

---

## 六、怎么复核这份文档（照抄即可）

```bash
cd ~/.agents/skills/kpf-speaking-deck

# 0) 三个抽取脚本的规模（应为 265 / 434 / 76 行）
wc -l scripts/extract-lesson-fce.py scripts/extract-lesson-pk.py scripts/extract-lesson-css.py

# 1) 新抽取脚本的用法与自检（无参数打帮助；空文本/越界/灰度页都有明确报错）
python3 scripts/extract_pptx.py
python3 scripts/crop_photos.py
python3 -m py_compile scripts/extract_pptx.py scripts/crop_photos.py

# 1a) PPTX 文本抽取（Q1 验收的复现；课件路径换成本地实际文件）
python3 scripts/extract_pptx.py "FCE 模考班 D2.pptx" --text-out /tmp/fce-d2.txt
grep -c "Do you use your mobile phone a lot? Why?" /tmp/fce-d2.txt   # 应为 1

# 1b) PPTX 媒体直取 + sha256 对拍（Q2 验收：ket.mp3 应与课件 media1.mp3 逐字节一致）
python3 scripts/extract_pptx.py "U7L3.pptx" --imgdir /tmp/u7l3-media --list-media
shasum -a 256 /tmp/u7l3-media/media1.mp3 lessons/ket-u7l3.audio/ket.mp3   # 两个哈希应相同

# 1c) PDF 裁照片（Q2 验收的复现；应裁出 5 块照片）
python3 scripts/crop_photos.py ~/Desktop/秋季行课/KET/KET课本.pdf --page 56 --outdir /tmp/crops
python3 scripts/crop_photos.py ~/Desktop/秋季行课/KET/KET课本.pdf --page 55 --rect 40,750,1140,874 --outdir /tmp/crops

# 2) golden 里的来源注释（注意：不要对整个文件做无界 grep，IMG 那几行是 18 万字符的 base64）
python3 - <<'PY'
import io, re
for n in ('FCE-Speaking-Part1-2-课堂工具.html','PET-L4-Speaking-Part1-4-课堂工具.html','KET-U7L3-Speaking-Part2-课堂工具.html'):
    s = io.open('golden/'+n, encoding='utf-8').read()
    for m in re.finditer(r'/\*[^*]*(?:原图|裁切|SLIDE)[^*]*\*/', s):
        print(n[:12], ' '.join(m.group(0).split())[:110])
PY

# 3) 素材往返一致（逐字节 sha256，应为全 ✅）
python3 - <<'PY'
import io, re, base64, hashlib, os
for fn, lesson in (('FCE-Speaking-Part1-2-课堂工具.html','fce-part1-2'),
                   ('PET-L4-Speaking-Part1-4-课堂工具.html','pet-l4'),
                   ('KET-U7L3-Speaking-Part2-课堂工具.html','ket-u7l3')):
    s = io.open('golden/'+fn, encoding='utf-8').read(); i = s.index('const IMG = {'); blk = s[i:s.index('};', i)]
    for k, f, b in re.findall(r"(\w+)\s*:\s*'data:image/(\w+);base64,([A-Za-z0-9+/=]+)'", blk):
        raw = base64.b64decode(b)
        d = io.open('lessons/%s.img/%s.%s' % (lesson, k, f), 'rb').read()
        print(lesson, k, '✅' if hashlib.sha256(raw).hexdigest() == hashlib.sha256(d).hexdigest() else '✗')
PY

# 4) 教材 PDF 的实测属性（尺寸 / 色彩空间 / 旋转 / 有没有文字层）
python3 - <<'PY'
import fitz
for f in ('~/Desktop/秋季行课/KET/KET课本.pdf', '~/Desktop/秋季行课/KET/KET练习册.pdf'):
    d = fitz.open(f.replace('~', __import__('os').path.expanduser('~')))
    p = d[2]                      # 取第 3 页（第 1 页是封面跨页，尺寸不一样）
    info = d.extract_image(p.get_images(full=True)[0][0])
    print(f, '页', d.page_count, '图片', info['width'], 'x', info['height'], info.get('cs-name'),
          'rotation', p.rotation, '文字长度', len(p.get_text().strip()))
PY
```
