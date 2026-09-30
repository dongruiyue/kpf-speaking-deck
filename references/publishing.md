# publishing.md —— 公开发布清单与上手流程

> 这份文档回答两个问题：**发布时带什么、不带什么**；**别人拿到以后怎么用起来**。
> 验收标准的细节在 `shell-boundary.md` §七，判据的实测依据在 `layout-budget.md`。

---

## 一、发布时带什么 / 不带什么

### 带（skill 本体，全部是自建资产）

```
kpf-speaking-deck/
├── SKILL.md
├── assets/        外壳 shell.html + 跨课补充 CSS + 启动脚本模板
├── modules/       练习模块库（12 个模块，契约三件套）
├── scripts/       build / check / verify / validate 全套工具链
├── templates/     lesson.example.js（新课模板）
└── references/    shell-boundary / pitfalls / layout-budget / content-extraction / publishing（本文）
```

### 不带（⚠ 版权红线，公开分发前必须删掉）

| 目录 | 为什么不带 |
|---|---|
| `golden/` | 迁移前的三份完整课堂工具，**内含剑桥（Cambridge）出版物的原文、图片与录音**。公开分发有版权问题。它只是本机的「唯一回滚点」，不是 skill 的一部分。 |
| `out/` | 由 `golden/` 同级内容重建的产物，**同样含剑桥课件的原文 / 图片 / 录音**。产物应该由使用者用自己的课时数据现build，不该随 skill 分发。 |
| `lessons/` 中**含剑桥课件内容的课时数据**（`fce-part1-2.*` / `pet-l4.*` / `ket-u7l3.*`：课时 js、`.img/` 照片、`.audio/` 录音、`.css`） | 这些是从剑桥课本 / 练习册里抽出的原文与素材，**只供本机教学使用**。随 skill 公开分发 = 分发他人版权内容。 |

**一句话**：skill 发布的是「外壳 + 模块 + 工具链 + 文档」这套**机制**；任何含剑桥出版物原文 / 图片 / 录音的**内容**（`golden/`、`out/`、上述三份 `lessons/` 数据）都不许进公开仓库。使用者自己的原创内容（自己写的 lesson、自己拍的照片）当然可以放自己的 `lessons/`。

删掉这三个目录后工具链**自动降级、不报错**：

- `check-content.py` → 输出「跳过内容保真（无迁移前对照）」，退出码 0；
- `serve-verify.sh` → golden 侧不存在时只起 out 侧；
- `verify.py` → 第 2 条（内容保真）与第 12 条（与 golden 对比）输出「不适用/跳过」，其余 10 条照常。

---

## 二、拿到以后的上手流程

1. **放置**：整个目录放到 `~/.agents/skills/kpf-speaking-deck/`（SKILL.md 的 frontmatter 已就位，agent 直接认）。
2. **依赖**：
   - `python3`（标准库即可：`build.py` / `verify.py` / `check-content.py` / `serve-verify.sh` 都只用标准库）；
   - `node`（`check-classes.mjs` / `check-drift.mjs` / `validate-deck.mjs` 是 `.mjs`，无 npm 依赖）；
   - **Chrome**（浏览器验收用，`--headless=new`，路径写死为 macOS 的
     `/Applications/Google Chrome.app/...`；非 macOS 或 Chromium 请改 `scripts/verify.py` 与
     `scripts/validate-deck.mjs` 顶部的 `CHROME` 常量）；
   - 可选：**Safari 路径**（第 8/9 条同步风暴 / 静音必须在真实时间下测，
     `scripts/safari-verify.sh` + `scripts/safari-counts.py`，仅 macOS）；
   - 可选：抽取脚本（从 PPT / PDF 抽课件素材）需要 PyMuPDF / Pillow 等第三方库 ——
     **依赖以各脚本头部的「依赖」声明为准**（`pip install` 什么、是否必须，脚本开头都写了）。
3. **端口**：验收用的本地端口（8894–8899）是普通的临时常量，集中在 `scripts/serve-verify.sh`
   顶部的 `ROWS` 与 `scripts/safari-verify.sh` 的 `case` 表里，撞端口就改那两处；
   `verify.py` / `validate-deck.mjs` 自起随机端口，不占固定口。
4. **试一下**：`python3 scripts/build.py --help` 看 build 用法；没有课时数据时先照
   `templates/lesson.example.js` 写一节课。

---

## 三、「加一节新课」的验收命令清单（照 SKILL.md「自检」段）

```bash
python3 scripts/build.py <name>                  # 生成 out/<产物>.html + .command
node scripts/check-classes.mjs out/<产物>.html   # 未定义类名 = 0
node scripts/check-drift.mjs   out/<产物>.html   # 公共段落无漂移
python3 scripts/check-content.py out/<产物>.html # 课件原文逐字还在（无 golden 时自动跳过）
bash scripts/serve-verify.sh                     # 起本地服务并挂只读探针（只有 Safari 链路需要）
python3 scripts/verify.py <name 或 fce|pet|ket>  # 12 条判据 + 逐视图对照表（自起服务，无 golden 时跳过第 2/12 条）
node scripts/validate-deck.mjs <name>            # px 级版式体检：M1 溢出/白空、M2 标题间距
node scripts/validate-deck.mjs <name> --m3       # 第 8/9 条：真实 Safari 实测同步/静音（先起服务，跑完记得 safari-verify.sh close）
```

判据本身见 `references/shell-boundary.md` §七；判据的数值口径（视口 1920×993、缩放随视口变、
引用数字必须带视口）见 `references/layout-budget.md` §一。
