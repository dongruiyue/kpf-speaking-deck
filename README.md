# kpf-speaking-deck

把 KET / PET / FCE 口语课做成**单文件 HTML 课堂工具**：演讲者模式（教师端）+ 观众屏投影（只读、静音、自适应缩放）、翻页讲义、练习模块、双队计分。

用法是「外壳 + 课时数据 + 模块库」：跨课不变的部分都在外壳里，每节新课只写变化的部分。

## 上手

1. 整个目录放到 `~/.agents/skills/kpf-speaking-deck/`。
2. 加一节新课：照 `templates/lesson.example.js` 写课时数据；有课件 / 教材的话先用
   `scripts/extract_pptx.py`（PPTX → 逐页文本 + 媒体）和 `scripts/crop_photos.py`（PDF 页 → 自动裁照片）。
3. `python3 scripts/build.py <name>` 生成单文件 HTML + 双击启动脚本。
4. 交付前跑「自检」（见 `SKILL.md`）：`verify.py` 12 条判据 + `validate-deck.mjs` 版式体检 + Safari 实测同步/静音。

## 文档

- `SKILL.md` —— 入口（目录 / 用法 / 铁律）
- `references/shell-boundary.md` —— 外壳边界与 12 条验收标准
- `references/layout-budget.md` —— 版式预算（判据 / 出处 / 实测基线）
- `references/content-extraction.md` —— 从 PPT / PDF 抽素材的实做法
- `references/pitfalls.md` —— 踩坑台账
- `references/publishing.md` —— 发布清单（**含版权红线**）

## ⚠ 版权

本仓库只包含「外壳 + 模块 + 工具链 + 文档」这套机制。课时数据（`golden/`、`out/`、
`lessons/`）不含在内 —— 它们若来自出版的课本 / 课件，**请只在本机教学使用，不要公开分发**。
