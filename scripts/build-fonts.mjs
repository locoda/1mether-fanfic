// 构建前运行：把文津宋体裁剪成「站里实际用到的字」，输出到 public/fonts/wenjin/。
//
// 文津宋体的网页版按 Unicode 顺序每 256 个码位切一块，常用汉字散落在几十个块里，
// 直接用的话打开一页要下载好几 MB。这里扫描 src/ 下所有文字，只保留用到的字，
// 每块仍保留 unicode-range，浏览器按需加载。新增作品后重新构建就会自动包含新字。
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';
import subsetFont from 'subset-font';
import fontverter from 'fontverter';

/** 读出字体 cmap 里实际有字形的码位（支持 format 4 / 12）。 */
function cmapCodepoints(sfnt) {
  const dv = new DataView(sfnt.buffer, sfnt.byteOffset, sfnt.byteLength);
  const numTables = dv.getUint16(4);
  let cmap = -1;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (String.fromCharCode(...sfnt.subarray(rec, rec + 4)) === 'cmap') cmap = dv.getUint32(rec + 8);
  }
  const cps = new Set();
  if (cmap < 0) return cps;
  const n = dv.getUint16(cmap + 2);
  for (let i = 0; i < n; i++) {
    const off = cmap + dv.getUint32(cmap + 4 + i * 8 + 4);
    const format = dv.getUint16(off);
    if (format === 4) {
      const segX2 = dv.getUint16(off + 6);
      const ends = off + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
      for (let s = 0; s < segX2; s += 2) {
        const end = dv.getUint16(ends + s), start = dv.getUint16(starts + s);
        const delta = dv.getInt16(deltas + s), ro = dv.getUint16(ranges + s);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let g;
          if (ro === 0) g = (c + delta) & 0xffff;
          else {
            g = dv.getUint16(ranges + s + ro + (c - start) * 2);
            if (g) g = (g + delta) & 0xffff;
          }
          if (g) cps.add(c);
        }
      }
    } else if (format === 12) {
      const groups = dv.getUint32(off + 12);
      for (let gi = 0; gi < groups; gi++) {
        const g = off + 16 + gi * 12;
        const start = dv.getUint32(g), end = dv.getUint32(g + 4);
        for (let c = start; c <= end; c++) cps.add(c);
      }
    }
  }
  return cps;
}

const SRC_DIR = 'node_modules/@free-fonts/wenjin-mincho';
const OUT_DIR = 'public/fonts/wenjin';
const FAMILY = 'WenJin Mincho';

// 1. 收集用到的字符
const chars = new Set();
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (['.md', '.mdx', '.astro', '.ts', '.mjs', '.js'].includes(extname(p))) {
      for (const ch of readFileSync(p, 'utf8')) chars.add(ch.codePointAt(0));
    }
  }
};
walk('src');
// 基本拉丁字母、数字和常用标点总是保留
for (let c = 0x20; c <= 0x7e; c++) chars.add(c);
for (const ch of '，。、；：？！…—“”‘’（）《》〈〉「」『』【】·～') chars.add(ch.codePointAt(0));

// 2. 读取原始 CSS，逐块裁剪
const css = readFileSync(join(SRC_DIR, 'wenjin-mincho.css'), 'utf8');
const allFaces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => {
  const body = m[1];
  return {
    family: body.match(/font-family:\s*'([^']+)'/)[1],
    file: body.match(/url\('([^']+)'\)/)[1],
    range: body.match(/unicode-range:\s*([^;]+);/)[1].trim(),
  };
});

// 只用 Plane 0（常用字都在这里），不混用其他分卷
const faces = allFaces.filter((f) => f.family === 'WenJin Mincho Plane 0');

const inRange = (cp, range) =>
  range.split(',').some((part) => {
    const [a, b] = part.trim().replace(/^U\+/i, '').split('-').map((h) => parseInt(h, 16));
    return cp >= a && cp <= (b ?? a);
  });

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

// unicode-range 只写字体里真正有字形的字，没有的交给系统字体，避免 Safari 显示空白。
const assigned = new Set();
let out = `/* 由 scripts/build-fonts.mjs 生成，请勿手改。WenJin Mincho (OFL-1.1) https://github.com/takushun-wu/WenJinMincho */\n`;
let total = 0;
let blocks = 0;
for (const face of faces) {
  const candidates = [...chars].filter((cp) => !assigned.has(cp) && inRange(cp, face.range));
  if (candidates.length === 0) continue;
  const src = readFileSync(join(SRC_DIR, face.file));
  const has = cmapCodepoints(await fontverter.convert(src, 'sfnt'));
  const used = candidates.filter((cp) => has.has(cp));
  if (used.length === 0) continue;
  used.forEach((cp) => assigned.add(cp));
  const buf = await subsetFont(src, String.fromCodePoint(...used), { targetFormat: 'woff2' });
  const name = face.file.split('/').pop();
  writeFileSync(join(OUT_DIR, name), buf);
  total += buf.length;
  blocks++;
  out += `@font-face{font-family:'${FAMILY}';font-style:normal;font-weight:400;font-display:swap;src:url('./${name}') format('woff2');unicode-range:${used
    .sort((a, b) => a - b)
    .map((cp) => 'U+' + cp.toString(16))
    .join(',')};}\n`;
}
const missing = [...chars].filter((cp) => cp > 0x2e7f && !assigned.has(cp));
writeFileSync(join(OUT_DIR, 'wenjin.css'), out);
console.log(`[fonts] 文津宋体：${assigned.size}/${chars.size} 个字符，${blocks} 个分块，共 ${(total / 1024).toFixed(0)} KB；字体里没有的字（用系统字体补）：${missing.length}`);
