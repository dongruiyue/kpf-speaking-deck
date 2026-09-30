# kpf-speaking-deck

> 把一节 KET / PET / FCE 口语课，变成**一个双击就能上课的单文件 HTML**。
> 教师端讲、学生屏投影；讲义一页一件事，练习全是游戏，计分自动同步。

**输入**：课件 PPTX / 教材 PDF + 一份课时数据（`lessons/<name>.js`）
**输出**：`out/<课名>.html`（单文件，照片录音全内嵌）+ `启动<课名>.command`（双击启动本地服务）

想深入了解（原理 / 机制 / 和人工的对比 / 待改进项 / FAQ）→ **[GUIDE.md](GUIDE.md)**

---

## 安装

```bash
# 方式一（推荐）：git clone 到 agent 的 skill 目录
git clone https://github.com/dongruiyue/kpf-speaking-deck.git ~/.agents/skills/kpf-speaking-deck

# 方式二：GitHub 页面 → Code → Download ZIP，解压到同一个位置
```

- 支持 `~/.agents/skills/` 约定的 agent（如 Kimi Code）会按 `SKILL.md` 自动认出它；Claude Code 放 `~/.claude/skills/`。
- **不当 skill 用也行**：`scripts/` 里全是普通命令行工具，clone 到哪儿都能跑。
- 验证装好没：

```bash
cd ~/.agents/skills/kpf-speaking-deck
python3 scripts/build.py --help     # 出用法 = 装好了
```

---

## 一节课上课时长这样

```
┌─ 教师端（演讲者模式）───────────────┐   ┌─ 学生屏（投影）──────────┐
│ 顶栏：Team A 2 : 1 Team B · 计时器  │   │ 只读 · 静音 · 自动铺满    │
│ 步骤条：总览 → Part 1 → Part 2 …    │   │ 跟着教师端走，自动缩放    │
│ 舞台：翻页讲义 / 练习游戏           │   │ 同一份内容，字号更大      │
│ 底部：句架条（练习时随时能看）      │   │                          │
│ 控制台：教学提示 · 该说什么 · +1/-1 │   │                          │
└────────────────────────────────────┘   └──────────────────────────┘
              同一台机器、两个窗口，状态实时同步
```

- **翻页讲义**：讲解拆成一页一页，一页只讲一件事；投影上字号 20px 起步。
- **练习模块**：12 个现成模块（抽题、双图对比、快闪卡、双人任务、OX 棋、模拟考、协商、讨论、照片接力、句型库、录音播放、讲义页），每节课按 `practice.type` 选用。
- **双队计分**：练习得分实时上顶栏，下课出冠军榜；撤销可回退。
- **观众屏铁律**：不出声、不可交互、不含教师提示（`.teacher-only` 100% 隐藏）、播放录音只在教师端。

## 30 秒跑通示例课

```bash
cp templates/lesson.example.js lessons/demo.js
python3 scripts/build.py demo        # → out/示例课-Speaking-课堂工具.html + 启动示例课.command
open out/启动示例课.command           # 走本地 http 启动（file:// 直开 Safari 会禁用 localStorage）
```

（只依赖 python3 标准库；构建幂等，跑两次产物逐字节一致。）

## 加一节自己的课

```bash
# 1. 有课件/教材就先抽素材（可选）
python3 scripts/extract_pptx.py 课件.pptx --text-out /tmp/课.txt --imgdir lessons/<name>.img
python3 scripts/crop_photos.py 课本.pdf --page 56 --outdir lessons/<name>.img

# 2. 照模板写课时数据（句架、讲义页、练习参数）
cp templates/lesson.example.js lessons/<name>.js   # 然后改

# 3. 构建
python3 scripts/build.py <name>

# 4. 验收（12 条数值判据，全绿才算完）
python3 scripts/verify.py <name>          # 语法/内容/版式/素材/报错/锁定/计分/回归
node scripts/validate-deck.mjs <name>     # px 级体检：溢出/白空、标题间距、分级修正阶梯
node scripts/validate-deck.mjs <name> --m3  # 同步风暴/静音（真 Safari，真实时间）
```

判据不是"看着顺眼"，是写死的数：每视图 ≤1080、讲义页 ≤1100px、投影正文 ≥20px、
空转 10 秒同步 ≤5 次、观众屏静音、内容逐字保真…… 完整清单见 `references/shell-boundary.md` §七。

## 这套东西是怎么搭的

- `assets/shell.html` —— **外壳**：同步、计分、计时、翻页、缩放、演讲者模式，跨课不变的部分全在这里。
- `modules/` —— **12 个练习模块**，每个都遵守同一份契约（纯渲染 / 广播动作 / 快照三件套）。
- `lessons/<name>.js` —— 每节课只写变化的部分：环节、句架、讲义页、练习参数。
- `scripts/build.py` —— 外壳 + 课时 + 素材 → 单文件 HTML（模块全量注入，不用声明依赖）。

写一节课 = 填数据；改一处 bug = 三节课一起好（`check-drift.mjs` 保证公共段落不漂移）。

## 依赖

| 必需 | 用途 |
|---|---|
| python3（标准库） | build / verify / check |
| node | check / validate-deck |
| Chrome（macOS 路径常量在脚本顶部） | 无头浏览器验收 |

可选：PyMuPDF + Pillow（`crop_photos.py`）、python-pptx（`extract_pptx.py` 增强）、Safari（第 8/9 条真实时间测试，仅 macOS）。

## 文档

| 文件 | 内容 |
|---|---|
| `GUIDE.md` | **完整说明**：原理 / 机制 / 对比人工 / 待改进 / FAQ |
| `SKILL.md` | 入口：用法 / 自检清单 / 铁律 |
| `references/shell-boundary.md` | 外壳契约 + 12 条验收标准 |
| `references/layout-budget.md` | 版式预算：每条判据的出处与实测基线 |
| `references/content-extraction.md` | 从 PPT / PDF 抽素材的实做法 |
| `references/pitfalls.md` | 踩坑台账（每条铁律背后的真 bug） |
| `references/publishing.md` | 发布清单与**版权红线** |

## ⚠ 版权红线

本仓库只含「外壳 + 模块 + 工具链 + 文档」这套**机制**。
你自己的课时数据（`lessons/`）、旧工具（`golden/`）、产物（`out/`）都在 `.gitignore` 里 ——
如果它们来自出版的课本/课件（如剑桥系列），**只供本机教学使用，不要公开分发**。

## License

MIT（见 `LICENSE`）
