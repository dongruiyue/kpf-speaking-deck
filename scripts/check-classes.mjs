#!/usr/bin/env node
/* scripts/check-classes.mjs —— 类名预检
 *
 * 「外壳的 <style> 是唯一类名来源」。本脚本扫描产物里**用到的** class，
 * 逐个验证它在外壳 <style> 里有定义；未定义的报出来（这是「字墙 / CSS 漂移」的源头）。
 *
 * 用法：node scripts/check-classes.mjs out/FCE-Speaking-Part1-2-课堂工具.html
 *
 * 两类需要人工放行（都是「故意不写样式」的钩子，写进 NO_STYLE 白名单）：
 *   - 只当 JS 选择器 / 状态钩子用、不需要任何样式（如 deck-prev / deck-next）
 *   - 由 JS 拼出来的状态后缀（如 c-status ok|bad|wait、tier core|warm|bonus）
 */
import fs from 'node:fs';

const NO_STYLE = new Set([
  'deck-prev', 'deck-next',                    // 只用 .deck-nav / .ghost-btn 的样式
  'ok', 'bad', 'wait',                          // #console .c-status <state>
  'core', 'warm', 'bonus',                      // .tier <tier>
  'liked', 'disliked',                          // 预留状态钩子
]);

const file = process.argv[2];
if (!file) { console.error('用法：node scripts/check-classes.mjs <产物.html>'); process.exit(2); }
const html = fs.readFileSync(file, 'utf8');

/* 1) 外壳 <style> 里定义的类名 */
const style = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
const defined = new Set();
for (const sel of style.matchAll(/([^{}]+)\{/g)) {
  for (const c of sel[1].matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) defined.add(c[1]);
}

/* 2) 产物里用到的类名：静态 class="..." + JS 里的 className / classList / class 模板 */
const used = new Map();
const add = (name, where) => { if (!used.has(name)) used.set(name, where); };
for (const m of html.matchAll(/class="([^"]*)"/g)) {
  if (/[$}{]/.test(m[1])) continue;                 // class="${…}" 是模板串，静态类名不在这里
  for (const c of m[1].split(/\s+/)) if (c) add(c, 'html');
}
for (const m of html.matchAll(/className\s*=\s*'([^']*)'/g)) {
  if (/[$}{]/.test(m[1])) continue;
  for (const c of m[1].split(/\s+/)) if (c) add(c, 'js:className');
}
for (const m of html.matchAll(/classList\.\w+\('([^']+)'/g)) add(m[1], 'js:classList');
for (const m of html.matchAll(/\bclass=\\?'([^']*)'/g)) {
  if (/[$}{]/.test(m[1])) continue;
  for (const c of m[1].split(/\s+/)) if (c) add(c, 'js:class');
}

const missing = [...used].filter(([c]) => !defined.has(c) && !NO_STYLE.has(c)).map(([c, w]) => `${c} (${w})`);
const unused = [...defined].filter(c => !used.has(c) && !NO_STYLE.has(c)).sort();

console.log(`类名预检：${file}`);
console.log(`  外壳 <style> 定义 ${defined.size} 个；产物用到 ${used.size} 个`);
console.log(`  未定义（必须补进外壳 <style>）：${missing.length}`);
missing.forEach(m => console.log('    ✗ ' + m));
console.log(`  定义但没人用（死 CSS，可清理；先确认整课都没人用）：${unused.length}`);
console.log('    ' + (unused.join(' ') || '（无）'));
process.exit(missing.length ? 1 : 0);
