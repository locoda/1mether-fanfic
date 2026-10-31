// 把写好的作品导入网站（生成 src/content/works/<文件名>.yml）。
//
//   npm run import -- 新作品.md            文件名就是网址：新作品.md → /works/新作品/
//   npm run import -- 草稿/*.txt           一次导入多篇
//   npm run import -- 新作品.docx --force  覆盖已经存在的同名作品
//
// 支持的格式见 scripts/lib/importers.mjs 开头的说明：.md .txt .docx。
import { writeFile, access } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { importFile, SUPPORTED } from './lib/importers.mjs';
import { toWorkYaml, parseWorkYaml } from './lib/work-md.mjs';

const WORKS_DIR = 'src/content/works';
const args = process.argv.slice(2);
const force = args.includes('--force');
const files = args.filter((a) => a !== '--force');

if (files.length === 0) {
  console.error(`用法：npm run import -- 作品文件 [更多文件] [--force]\n支持：${SUPPORTED.join(' ')}`);
  process.exit(1);
}

const exists = (p) => access(p).then(() => true, () => false);
let failed = 0;
for (const file of files) {
  try {
    const name = basename(file, extname(file));
    const target = join(WORKS_DIR, `${name}.yml`);
    if (!force && (await exists(target))) throw new Error(`${file}：${target} 已经存在；确定要覆盖就加 --force`);
    const work = await importFile(file);
    const yml = toWorkYaml(work);
    parseWorkYaml(yml, target); // 写出去之前再检查一遍
    await writeFile(target, yml);
    const meta = [work.info.cp?.length && `CP：${[].concat(work.info.cp).join('、')}`, work.info.series && `系列：${work.info.series}`].filter(Boolean).join('，');
    console.log(`✓ ${file} → ${target}（${work.chapters.length} 章${meta ? `，${meta}` : ''}）`);
  } catch (e) {
    failed++;
    console.error(`✗ ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
