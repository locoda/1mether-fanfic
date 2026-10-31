// md → yml：把写好的 Markdown 作品导入网站。
//
//   npm run import -- 新作品.md            导入一篇（文件名就是网址：新作品.md → /works/新作品/）
//   npm run import -- 草稿/*.md            导入多篇
//   npm run import -- 新作品.md --force    覆盖已经存在的同名作品
//
// md 的写法见 scripts/lib/work-md.mjs 开头的说明，或 README「用 Markdown 导入」。
import { readFile, writeFile, access } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { parseWorkMarkdown, toWorkYaml, parseWorkYaml } from './lib/work-md.mjs';

const WORKS_DIR = 'src/content/works';
const args = process.argv.slice(2);
const force = args.includes('--force');
const files = args.filter((a) => a !== '--force');

if (files.length === 0) {
  console.error('用法：npm run import -- 作品.md [更多.md] [--force]');
  process.exit(1);
}

const exists = (p) => access(p).then(() => true, () => false);
let failed = 0;
for (const file of files) {
  try {
    if (!/\.md$/i.test(file)) throw new Error(`${file}：只能导入 .md 文件`);
    const name = basename(file).replace(/\.md$/i, '');
    const target = join(WORKS_DIR, `${name}.yml`);
    if (!force && (await exists(target))) throw new Error(`${file}：${target} 已经存在；确定要覆盖就加 --force`);
    const work = parseWorkMarkdown(await readFile(file, 'utf8'), file);
    const yml = toWorkYaml(work);
    parseWorkYaml(yml, target); // 写出去之前再检查一遍
    await writeFile(target, yml);
    console.log(`✓ ${file} → ${target}（${work.chapters.length} 章）`);
  } catch (e) {
    failed++;
    console.error(`✗ ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
