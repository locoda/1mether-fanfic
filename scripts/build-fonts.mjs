// 构建前运行：把文津宋体裁剪成「站里实际用到的字」，输出到 public/fonts/wenjin/。
//
// 文津宋体的网页版按 Unicode 顺序每 256 个码位切一块，常用汉字散落在几十个块里，
// 直接用的话打开一页要下载好几 MB。这里扫描 src/ 下所有文字，只保留用到的字，
// 每块仍保留 unicode-range，浏览器按需加载。新增作品后重新构建就会自动包含新字。
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';
import subsetFont from 'subset-font';

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
const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => {
  const body = m[1];
  return {
    family: body.match(/font-family:\s*'([^']+)'/)[1],
    file: body.match(/url\('([^']+)'\)/)[1],
    range: body.match(/unicode-range:\s*([^;]+);/)[1].trim(),
  };
});

const inRange = (cp, range) =>
  range.split(',').some((part) => {
    const [a, b] = part.trim().replace(/^U\+/i, '').split('-').map((h) => parseInt(h, 16));
    return cp >= a && cp <= (b ?? a);
  });

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

let out = `/* 由 scripts/build-fonts.mjs 生成，请勿手改。WenJin Mincho (OFL-1.1) https://github.com/takushun-wu/WenJinMincho */\n`;
let total = 0;
let blocks = 0;
for (const face of faces) {
  const used = [...chars].filter((cp) => inRange(cp, face.range));
  if (used.length === 0) continue;
  const text = String.fromCodePoint(...used);
  const buf = await subsetFont(readFileSync(join(SRC_DIR, face.file)), text, { targetFormat: 'woff2' });
  const name = face.file.split('/').pop();
  writeFileSync(join(OUT_DIR, name), buf);
  total += buf.length;
  blocks++;
  out += `@font-face{font-family:'${FAMILY}';font-style:normal;font-weight:400;font-display:swap;src:url('./${name}') format('woff2');unicode-range:${used
    .sort((a, b) => a - b)
    .map((cp) => 'U+' + cp.toString(16))
    .join(',')};}\n`;
}
writeFileSync(join(OUT_DIR, 'wenjin.css'), out);
console.log(`[fonts] 文津宋体：${chars.size} 个字符，${blocks} 个分块，共 ${(total / 1024).toFixed(0)} KB`);
