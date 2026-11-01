// 处理网页后台「批量导入」上传的文件：imports/ 里的 .md / .txt / .docx / .zip → src/content/works/<文件名>.yml
//
//   node scripts/import-uploads.mjs
//
// - 作品名、yml 文件名都用文件名，网址就是 /works/<文件名>/
// - .zip 里可以放很多篇（子文件夹也行），一次上传就是一批
// - 后台点「开始导入」时填的配对、系列、状态、更新日期、作者，会用在这一批的每一篇上；
//   md 开头自己写了的项目以 md 为准。填了系列的，按文件名顺序排在这个系列已有作品的后面
// - 更新日期：文件里写了或者点按钮时填了才有，否则不写（没有日期的作品排在首页最后）
// - 导入成功的源文件会删掉；失败的留在 imports/ 里，原因写进 imports/_导入失败说明.txt
// - 已经有同名作品时不会覆盖，算作失败
// 由 .github/workflows/import.yml 运行（后台「批量导入」页面的「开始导入」按钮）；本地也可以手动运行。
// 本地想带上作品信息的话：PAGES_CMS_PAYLOAD='{"inputs":{"cp":"甲/乙","series":"某系列"}}' node scripts/import-uploads.mjs
import { readdir, readFile, writeFile, rm, access, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import YAML from 'yaml';
import JSZip from 'jszip';
import { importFile } from './lib/importers.mjs';
import { toWorkYaml, parseWorkYaml } from './lib/work-md.mjs';

const IMPORTS_DIR = 'imports';
const WORKS_DIR = 'src/content/works';
const REPORT = join(IMPORTS_DIR, '_导入失败说明.txt');
const SUPPORTED = new Set(['.md', '.markdown', '.txt', '.docx']);

const exists = (p) => access(p).then(() => true, () => false);
const skip = (name) => name.startsWith('.') || name.startsWith('_');

// ---------------------------------------------------------------- 后台填的作品信息

function batchInfo() {
  let inputs = {};
  try {
    inputs = JSON.parse(process.env.PAGES_CMS_PAYLOAD || '{}').inputs ?? {};
  } catch {
    console.log('读不懂后台传来的作品信息，这一批先不加');
  }
  const text = (v) => (typeof v === 'string' ? v.trim() : '');
  const info = {};
  // 多个配对用逗号或顿号隔开（配对名里本身有 /，所以不按 / 分）
  const cps = text(inputs.cp).split(/[,，、;；]/).map((s) => s.trim()).filter(Boolean);
  if (cps.length) info.cp = cps;
  if (text(inputs.series)) info.series = text(inputs.series);
  if (['ongoing', 'finished'].includes(inputs.status)) info.status = inputs.status;
  if (text(inputs.author)) info.author = text(inputs.author);
  const date = text(inputs.updated).replace(/[./年月]/g, '-').replace(/日$/, '');
  const m = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) info.updated = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  else if (date) console.log(`更新日期「${inputs.updated}」看不懂，没用上（写成 2026-10-31 这样）`);
  return info;
}

// ---------------------------------------------------------------- 收集要导入的文件

/** zip 里的文件名：新的 zip 是 UTF-8；Windows 自带压缩打出来的常常是 GBK */
function decodeName(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('gb18030').decode(bytes);
  }
}

async function collect() {
  const items = []; // { label, path, name, zip? }
  const zips = []; // { file, entries: [{ label, path, name }] }
  const errors = [];
  const tmp = await mkdtemp(join(tmpdir(), 'imports-'));
  const files = (await readdir(IMPORTS_DIR).catch(() => [])).filter((f) => !skip(f)).sort((a, b) => a.localeCompare(b, 'zh'));
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    const path = join(IMPORTS_DIR, file);
    if (SUPPORTED.has(ext)) {
      items.push({ label: file, path, name: basename(file, extname(file)).trim() });
    } else if (ext === '.zip') {
      try {
        const zip = await JSZip.loadAsync(await readFile(path), { decodeFileName: decodeName });
        const entries = Object.values(zip.files)
          .filter((e) => !e.dir && !e.name.split('/').some((part) => part === '__MACOSX' || skip(part)))
          .filter((e) => SUPPORTED.has(extname(e.name).toLowerCase()))
          .sort((a, b) => a.name.localeCompare(b.name, 'zh'));
        if (!entries.length) throw new Error('里面没有 .md / .txt / .docx 文件');
        const group = { file, entries: [] };
        for (const [i, e] of entries.entries()) {
          const base = basename(e.name);
          const dir = await mkdtemp(join(tmp, `${i}-`));
          const out = join(dir, base);
          await writeFile(out, await e.async('nodebuffer'));
          const item = { label: `${file} 里的 ${e.name}`, path: out, name: basename(base, extname(base)).trim(), zip: group };
          group.entries.push(item);
          items.push(item);
        }
        zips.push(group);
      } catch (e) {
        errors.push(`${file}：打不开这个压缩包（${e.message}）`);
      }
    } else {
      errors.push(`${file}：不支持这种文件，只能传 .md / .txt / .docx，或者把它们打包成 .zip`);
    }
  }
  return { items, zips, errors, tmp };
}

// ---------------------------------------------------------------- 系列序号

/** 每个系列现在排到第几篇了 */
async function seriesCounters() {
  const max = new Map();
  for (const f of await readdir(WORKS_DIR)) {
    if (!f.endsWith('.yml')) continue;
    try {
      const d = YAML.parse(await readFile(join(WORKS_DIR, f), 'utf8')) ?? {};
      if (typeof d.series === 'string' && d.series.trim()) {
        const s = d.series.trim();
        max.set(s, Math.max(max.get(s) ?? 0, Number(d.seriesOrder) || 0));
      }
    } catch {}
  }
  return max;
}

// ---------------------------------------------------------------- 导入

const batch = batchInfo();
const { items, zips, errors, tmp } = await collect();
const counters = await seriesCounters();
const done = [];
const failed = [...errors];
const failedItems = new Set();

for (const item of items) {
  const target = join(WORKS_DIR, `${item.name}.yml`);
  try {
    if (!item.name) throw new Error('文件名是空的');
    if (await exists(target)) throw new Error(`已经有同名作品 ${target}，没有覆盖。想替换的话，先在后台删掉旧作品再重新上传`);
    const work = await importFile(item.path);
    // 单章作品的章节名原本等于自动识别出的标题，跟着换成文件名
    if (work.chapters.length === 1 && work.chapters[0].title === work.info.title) work.chapters[0].title = item.name;
    work.info.title = item.name;
    // 后台填的信息只补没写的项目
    let seriesFromBatch = false;
    for (const [k, v] of Object.entries(batch)) {
      if (work.info[k] === undefined || work.info[k] === '') {
        work.info[k] = v;
        if (k === 'series') seriesFromBatch = true;
      }
    }
    if (seriesFromBatch && work.info.seriesOrder === undefined) {
      const n = (counters.get(work.info.series) ?? 0) + 1;
      counters.set(work.info.series, n);
      work.info.seriesOrder = n;
    }
    // 按后台表单的顺序排一下，打开 yml 时好找
    const order = ['title', 'author', 'cp', 'updated', 'summary', 'series', 'seriesOrder', 'status'];
    work.info = Object.fromEntries(Object.entries(work.info).sort(([a], [b]) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99)));
    const yml = toWorkYaml(work);
    parseWorkYaml(yml, target); // 写出去之前再检查一遍
    await writeFile(target, yml);
    if (!item.zip) await rm(item.path);
    done.push(`${item.label} → ${target}（${work.chapters.length} 章）`);
  } catch (e) {
    failedItems.add(item);
    failed.push(`${item.label}：${e.message.replace(`${item.path}：`, '')}`);
  }
}

// 压缩包处理完就删掉；里面没导入成功的文件单独放回 imports/，改好可以直接重新导入
for (const group of zips) {
  for (const item of group.entries.filter((i) => failedItems.has(i))) {
    const back = join(IMPORTS_DIR, basename(item.path));
    if (!(await exists(back))) await writeFile(back, await readFile(item.path));
  }
  await rm(join(IMPORTS_DIR, group.file));
}
await rm(tmp, { recursive: true, force: true });

if (failed.length) {
  await writeFile(
    REPORT,
    `这些文件没有导入成功，原因写在后面。改好以后重新上传，再点「开始导入」。\n这个说明文件可以删掉，下次导入会重新生成。\n\n${failed.join('\n')}\n`,
  );
} else if (await exists(REPORT)) {
  await rm(REPORT);
}

const summary = Object.entries(batch).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('、') : v}`).join('；');
if (summary) console.log(`这一批的作品信息：${summary}`);
if (!done.length && !failed.length) console.log('imports/ 里没有要导入的文件');
for (const d of done) console.log(`✓ ${d}`);
for (const f of failed) console.log(`✗ ${f}`);

// 给 GitHub Actions 的运行摘要
if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = ['## 批量导入', ''];
  if (summary) lines.push(`这一批的作品信息：${summary}`, '');
  lines.push(...done.map((d) => `- ✓ ${d}`), ...failed.map((f) => `- ✗ ${f}`));
  if (!done.length && !failed.length) lines.push('没有要导入的文件');
  await writeFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`, { flag: 'a' });
}
// 有失败也不让工作流报错：成功的部分照常提交，失败原因写在说明文件里
