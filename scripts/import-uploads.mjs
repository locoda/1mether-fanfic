// 处理网页后台「批量导入」上传的文件：imports/ 里的 .md / .txt / .docx → src/content/works/<文件名>.yml
//
//   node scripts/import-uploads.mjs
//
// - 作品名、yml 文件名都用上传的文件名，网址就是 /works/<文件名>/（md 开头写的其他作品信息，比如 CP、系列，照样保留）
// - 没写更新日期的，用今天（北京时间），这样新导入的作品排在首页前面
// - 导入成功的源文件会删掉；失败的留在 imports/ 里，原因写进 imports/_导入失败说明.txt
// - 已经有同名作品时不会覆盖，算作失败
// 由 .github/workflows/import.yml 在有文件上传时自动运行；本地也可以手动运行。
import { readdir, writeFile, rm, access } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { importFile } from './lib/importers.mjs';
import { toWorkYaml, parseWorkYaml } from './lib/work-md.mjs';

const IMPORTS_DIR = 'imports';
const WORKS_DIR = 'src/content/works';
const REPORT = join(IMPORTS_DIR, '_导入失败说明.txt');
const SUPPORTED = new Set(['.md', '.markdown', '.txt', '.docx']);

const exists = (p) => access(p).then(() => true, () => false);
const today = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.TZ || 'Asia/Shanghai' }).format(new Date());

const files = (await readdir(IMPORTS_DIR).catch(() => []))
  .filter((f) => !f.startsWith('.') && !f.startsWith('_') && SUPPORTED.has(extname(f).toLowerCase()))
  .sort();

const done = [];
const failed = [];
for (const file of files) {
  const src = join(IMPORTS_DIR, file);
  const name = basename(file, extname(file)).trim();
  const target = join(WORKS_DIR, `${name}.yml`);
  try {
    if (await exists(target)) throw new Error(`已经有同名作品 ${target}，没有覆盖。想替换的话，先在后台删掉旧作品再重新上传`);
    const work = await importFile(src);
    // 单章作品的章节名原本等于自动识别出的标题，跟着换成文件名
    if (work.chapters.length === 1 && work.chapters[0].title === work.info.title) work.chapters[0].title = name;
    work.info.title = name;
    work.info.updated ??= today;
    const yml = toWorkYaml(work);
    parseWorkYaml(yml, target); // 写出去之前再检查一遍
    await writeFile(target, yml);
    await rm(src);
    done.push(`${file} → ${target}（${work.chapters.length} 章）`);
  } catch (e) {
    failed.push(`${file}：${e.message.replace(`${src}：`, '')}`);
  }
}

if (failed.length) {
  await writeFile(
    REPORT,
    `这些文件没有导入成功，原因写在后面。改好以后删掉旧文件、重新上传即可。\n这个说明文件可以删掉，下次导入会重新生成。\n\n${failed.join('\n')}\n`,
  );
} else if (await exists(REPORT)) {
  await rm(REPORT);
}

console.log(done.length || failed.length ? '' : 'imports/ 里没有要导入的文件');
for (const d of done) console.log(`✓ ${d}`);
for (const f of failed) console.log(`✗ ${f}`);

// 给 GitHub Actions 的运行摘要
if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = ['## 批量导入', '', ...done.map((d) => `- ✓ ${d}`), ...failed.map((f) => `- ✗ ${f}`)];
  if (!done.length && !failed.length) lines.push('没有要导入的文件');
  await writeFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`, { flag: 'a' });
}
// 有失败也不让工作流报错：成功的部分照常提交，失败原因写在说明文件里
