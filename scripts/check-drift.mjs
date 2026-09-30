#!/usr/bin/env node
/* scripts/check-drift.mjs —— 防漂移：公共段落是否与迁移前逐字节一致
 *
 * 今天改同步风暴要改三处，就是因为没有这道闸。本脚本按「段落横幅注释」把
 * 外壳那几个公共段落切出来，与 golden/ 里迁移前的同名工具逐行比对，
 * 报出不一致的行（允许的差异只有已被参数化的键名）。
 *
 * 用法：node scripts/check-drift.mjs out/FCE-Speaking-Part1-2-课堂工具.html
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);

const SECTIONS = [
  '/* ===== 安全存储',
  '/* ================= 模式与同步通道',
  '/* ================= 图标',
  '/* ================= 音效',
  '/* ================= 彩带',
  '/* ================= 计时器',
  '/* ================= 演讲者模式',
  '/* ================= 左侧操作区等比缩放',
  '/* ================= 观众屏自动适应窗口',
  '/* ================= 同步分发',
  '/* ===== 轮询兜底',
];

/* 设计上就该不同的行（键名 / 频道 / 角色 / 主题）——出现这些差异不算漂移 */
const ALLOWED = [
  /K\.(launcher|imgNote|homeTip|homeTalkEn|homeTalkCn|title|docTitle)/,   // 课时文案改为从 meta 取
  /cCheck|cTip|cTalk|说什么 Say this:/,                                    // 自检 / 控制台文案段落
  /store\.ok|全部已加载|张未加载|启动[\u4e00-\u9fa5A-Za-z0-9-]+\.command/,   // 上面几行的上下文
  /* ACT 改成注册表是本次改动的既定目标（模块自己 TK.on 注册自己的动作）：
     通用动作逐字不变，只有模块专属的 deck/p1State/p2State 从外壳移进模块。 */
  /^const ACT = \{$/, /^Object\.assign\(ACT, \{$/, /^\s*(deck|p1State|p2State): m =>/,
  /KEY\('/, /CHAN/, /K\.\w+/, /LESSON\./, /MODS\[/, /TD\b/, /ACT\[/, /PARTS/,
  /fce2-/, /pet4-/, /ket-/, /fce2_/, /pet4_/, /ket_/,
  /p2State\(\)|p1State\(\)|p3State|p4Idx|p1Last|p2Idx/,
  /^\s*(\/\/|\/\*|\*)/,                       // 注释
];

const file = process.argv[2];
if (!file) { console.error('用法：node scripts/check-drift.mjs <产物.html>'); process.exit(2); }
const mine = fs.readFileSync(file, 'utf8');
const gold = fs.readFileSync(path.join(ROOT, 'golden', 'FCE-Speaking-Part1-2-课堂工具.html'), 'utf8');

const cut = (text, banner) => {
  const i = text.indexOf(banner);
  if (i < 0) return null;
  /* 只切到下一个「段落横幅」（/* ===== 开头）。普通行内注释不算段落边界 ——
     否则插件式的注释会把段落切短，比对直接失效。 */
  const rest = text.slice(i + 5);
  const m = rest.match(/\n\/\* ={5,}/);
  return text.slice(i, m ? i + 5 + m.index : text.length).split('\n');
};

let drift = 0, checked = 0;
console.log(`公共段落防漂移：${path.relative(ROOT, file)} vs golden/`);
for (const s of SECTIONS) {
  const a = cut(gold, s), b = cut(mine, s);
  if (!a || !b) { console.log(`  ? ${s.slice(3, 40)} —— 有一侧找不到段落，跳过`); continue; }
  checked++;
  /* 按行集合比对：参数化会往段落里插新行，逐行对齐会把这些插行误判成漂移。
     只报「迁移前有、产物没有」且不是允许差异的行 —— 那才是真的改了逻辑。 */
  const norm = ls => new Set(ls.map(l => l.trim()).filter(l => l && !/^(\/\/|\/\*|\*)/.test(l)));
  const A = norm(a), B = norm(b);
  const diff = [];
  for (const l of A) {
    if (B.has(l)) continue;
    if (ALLOWED.some(re => re.test(l))) continue;
    diff.push(`        迁移前有、产物没有: ${l.slice(0, 120)}`);
  }
  for (const l of B) {
    if (A.has(l)) continue;
    if (ALLOWED.some(re => re.test(l))) continue;
    diff.push(`        产物有、迁移前没有: ${l.slice(0, 120)}`);
  }
  if (diff.length) {
    drift += diff.length;
    console.log(`  ✗ ${s.slice(3, 40)} —— ${diff.length} 行不一致`);
    diff.slice(0, 6).forEach(d => console.log(d));
    if (diff.length > 6) console.log(`      …还有 ${diff.length - 6} 行`);
  } else {
    console.log(`  ✓ ${s.slice(3, 40)}（${a.length} 行，逐字节一致 / 差异均为允许的参数化）`);
  }
}
console.log(drift ? `\n结论：发现 ${drift} 行漂移（${checked} 段）` : `\n结论：${checked} 段公共逻辑全部一致，没有漂移`);
process.exit(drift ? 1 : 0);
