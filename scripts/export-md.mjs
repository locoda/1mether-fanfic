// yml → md：把每篇作品导出一份 Markdown 到 export/，方便在 GitHub 上看、备份、搬家。
//
//   npm run export
//
// export/ 是自动生成的，改它不会影响网站；GitHub Actions 会在作品更新后自动重新导出。
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { parseWorkYaml, toWorkMarkdown } from './lib/work-md.mjs';

const WORKS_DIR = 'src/content/works';
const OUT_DIR = 'export';

const files = (await readdir(WORKS_DIR)).filter((f) => /\.ya?ml$/i.test(f)).sort();
await mkdir(OUT_DIR, { recursive: true });

const keep = new Set(['README.md']);
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
await writeFile(
  join(OUT_DIR, 'README.md'),
  `# 作品导出（自动生成）

这个文件夹里每篇作品一个 Markdown 文件，由 \`npm run export\` 从 \`src/content/works/*.yml\` 生成，作品更新后 GitHub Actions 会自动重新导出。

**不要在这里改**：改这里不会影响网站，下次导出还会被覆盖。要改作品请用网页后台，或者改 \`src/content/works/\` 里的 .yml。

想把这里的 md 改完再放回网站：\`npm run import -- export/作品名.md --force\`。
`,
);
console.log(`导出 ${files.length - failed} 篇作品到 ${OUT_DIR}/${failed ? `，${failed} 篇失败` : ''}`);
process.exit(failed ? 1 : 0);
