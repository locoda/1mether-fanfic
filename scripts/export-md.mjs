// yml → md：把每篇作品导出一份 Markdown 到 export/，方便备份、搬家、用别的编辑器看。
//
//   npm run export
//
// export/ 不进 git（见 .gitignore），改它不会影响网站。
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { parseWorkYaml, toWorkMarkdown } from './lib/work-md.mjs';

const WORKS_DIR = 'src/content/works';
const OUT_DIR = 'export';

const files = (await readdir(WORKS_DIR)).filter((f) => /\.ya?ml$/i.test(f)).sort();
await mkdir(OUT_DIR, { recursive: true });

const keep = new Set();
let failed = 0;
for (const file of files) {
  const name = file.replace(/\.ya?ml$/i, '');
  const where = join(WORKS_DIR, file);
  try {
    const md = toWorkMarkdown(parseWorkYaml(await readFile(where, 'utf8'), where), where);
    await writeFile(join(OUT_DIR, `${name}.md`), md);
    keep.add(`${name}.md`);
  } catch (e) {
    failed++;
    console.error(`✗ ${e.message}`);
  }
}
// 删掉已经不存在的作品的旧导出
for (const f of await readdir(OUT_DIR)) {
  if (!keep.has(f)) await rm(join(OUT_DIR, f));
}
console.log(`导出 ${files.length - failed} 篇作品到 ${OUT_DIR}/${failed ? `，${failed} 篇失败` : ''}`);
process.exit(failed ? 1 : 0);
