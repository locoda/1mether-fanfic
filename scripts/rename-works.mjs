// 把网页后台新建的作品（文件名是创建时间，比如 20261031-203512.yml）改名成「作品名.yml」。
//
//   node scripts/rename-works.mjs
//
// 网址本来就按作品名生成（见 src/lib/works.ts 的 assignSlugs），改名前后网址不变。
// 以下情况不改，留着时间文件名：和已有作品的网址撞了、作品名里只有标点、改名会让网址变化。
// 由 .github/workflows/rename-works.yml 每天凌晨运行一次（避开正在编辑的时候）；本地也可以手动运行。
import { readdir, readFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import GithubSlugger from 'github-slugger';
import YAML from 'yaml';

const WORKS_DIR = 'src/content/works';
const AUTO_NAME = /^\d{8}-\d{6}\.yml$/;
const slug = (s) => new GithubSlugger().slug(s);
// 去掉文件名里不能用的字符
const safeName = (title) => title.replace(/[\/\\:*?"<>|\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().replace(/^\.+/, '');

const files = (await readdir(WORKS_DIR)).filter((f) => f.endsWith('.yml')).sort();
const used = new Set(files.filter((f) => !AUTO_NAME.test(f)).map((f) => slug(f.slice(0, -4))));

const done = [];
const skipped = [];
for (const file of files.filter((f) => AUTO_NAME.test(f))) {
  const title = YAML.parse(await readFile(join(WORKS_DIR, file), 'utf8'))?.title;
  const name = typeof title === 'string' ? safeName(title) : '';
  const s = name && slug(name);
  if (!s) { skipped.push(`${file}：作品名为空或只有标点`); continue; }
  // 网站按作品名生成网址，改名后按文件名生成，两者必须一样，否则网址会变
  if (s !== slug(title)) { skipped.push(`${file}（${title}）：作品名里有不能放进文件名的字符，保留原文件名`); continue; }
  if (used.has(s)) { skipped.push(`${file}（${title}）：和已有作品同名，保留原文件名`); continue; }
  used.add(s);
  await rename(join(WORKS_DIR, file), join(WORKS_DIR, `${name}.yml`));
  done.push(`${file} → ${name}.yml`);
}

for (const d of done) console.log(`✓ ${d}`);
for (const k of skipped) console.log(`- ${k}`);
if (!done.length && !skipped.length) console.log('没有需要改名的作品');
