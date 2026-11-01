// 提交前的自动检查：npm run check
//
// 开 PR 时 GitHub 会自动运行（.github/workflows/check.yml），本地也可以手动跑。检查这些：
//   1. 配置文件和作品文件都是合法的 YAML
//   2. 后台表单（.pages.yml「网站设置」）、site.config.ts 的 GROUPS、site.yml 三者的设置项对得上
//   3. 每篇作品 yml → md → yml 往返后内容不变（导出备份能原样导回来）
//   4. 网站能构建成功，并且模拟 GitHub Pages 子路径时，没有漏掉前缀的站内链接
//
//   npm run check              全部检查
//   npm run check -- --no-build  跳过第 4 项（快）
//
// 第 4 项构建出的 dist/ 用的是测试前缀，只用来检查；预览或部署前照常 npm run build。
import { readFileSync, readdirSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import YAML from 'yaml';
import { parseWorkYaml, toWorkMarkdown, parseWorkMarkdown } from './lib/work-md.mjs';

const WORKS_DIR = 'src/content/works';
const CHECK_BASE = '/check-base/';
const results = []; // { name, errors: [] }
const gh = !!process.env.GITHUB_ACTIONS;

function section(name, fn) {
  const errors = [];
  const fail = (msg, file) => {
    errors.push(file ? `${file}：${msg}` : msg);
    if (gh) console.log(`::error${file ? ` file=${file}` : ''}::${msg.replace(/\n/g, '%0A')}`);
  };
  try {
    fn(fail);
  } catch (e) {
    fail(`检查本身出错：${e.message}`);
  }
  results.push({ name, errors });
  console.log(`${errors.length ? '✗' : '✓'} ${name}${errors.length ? `（${errors.length} 个问题）` : ''}`);
  for (const e of errors) console.log(`    ${e}`);
}

const readYaml = (file) => YAML.parse(readFileSync(file, 'utf8'));
const files = (dir, re) => (existsSync(dir) ? readdirSync(dir).filter((f) => re.test(f)).map((f) => join(dir, f)) : []);

// ---------------------------------------------------------------- 1. YAML

section('配置和作品文件都是合法的 YAML', (fail) => {
  const list = ['.pages.yml', 'src/site.yml', ...files('.github/workflows', /\.ya?ml$/), ...files(WORKS_DIR, /\.ya?ml$/)];
  for (const f of list) {
    try {
      const doc = YAML.parseDocument(readFileSync(f, 'utf8'));
      if (doc.errors.length) fail(doc.errors[0].message.split('\n')[0], f);
    } catch (e) {
      fail(e.message.split('\n')[0], f);
    }
  }
});

// ---------------------------------------------------------------- 2. 设置项

section('后台表单、网站设置代码、site.yml 的设置项对得上', (fail) => {
  const cms = readYaml('.pages.yml');
  const form = (cms.content ?? []).find((c) => c.path === 'src/site.yml');
  if (!form) return fail('.pages.yml 里没找到 path 为 src/site.yml 的「网站设置」', '.pages.yml');

  // site.config.ts 是 TypeScript，不直接导入，从 GROUPS 那一段读出键名
  const ts = readFileSync('src/site.config.ts', 'utf8');
  const block = ts.match(/const GROUPS = \{([\s\S]*?)\}\s*as const/);
  if (!block) return fail('site.config.ts 里没找到 GROUPS', 'src/site.config.ts');
  const groups = {};
  for (const m of block[1].matchAll(/(\w+):\s*\[([^\]]*)\]/g)) groups[m[1]] = [...m[2].matchAll(/'(\w+)'/g)].map((x) => x[1]);

  const formGroups = Object.fromEntries((form.fields ?? []).map((g) => [g.name, (g.fields ?? []).map((f) => f.name)]));
  for (const g of new Set([...Object.keys(groups), ...Object.keys(formGroups)])) {
    const a = groups[g] ?? [];
    const b = formGroups[g] ?? [];
    const onlyCode = a.filter((k) => !b.includes(k));
    const onlyForm = b.filter((k) => !a.includes(k));
    if (onlyCode.length) fail(`「${g}」组里 ${onlyCode.join('、')} 在 site.config.ts 的 GROUPS 里有，后台表单里没有`, '.pages.yml');
    if (onlyForm.length) fail(`「${g}」组里 ${onlyForm.join('、')} 在后台表单里有，site.config.ts 的 GROUPS 里没有`, 'src/site.config.ts');
  }

  // site.yml 可以缺项（后台保存会删掉空列表，缺的用默认值），但不能有不认识的项
  const site = readYaml('src/site.yml') ?? {};
  for (const [g, values] of Object.entries(site)) {
    if (!groups[g]) continue; // 旧版不分组的写法，交给构建时的校验
    if (!values || typeof values !== 'object') continue;
    const unknown = Object.keys(values).filter((k) => !groups[g].includes(k));
    if (unknown.length) fail(`「${g}」组里有不认识的设置项：${unknown.join('、')}（拼错了，或者模板里已经删掉了）`, 'src/site.yml');
  }
});

// ---------------------------------------------------------------- 3. 往返

/** 后台保存的空值（""、null、[]）当作没写；日期统一成字符串 */
function normalize(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.length ? v.map(normalize) : undefined;
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) {
      const n = normalize(x);
      if (n !== undefined) out[k] = n;
    }
    return out;
  }
  return v === '' || v === null ? undefined : v;
}
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

section('作品导出成 md 再导回来，内容不变', (fail) => {
  for (const f of files(WORKS_DIR, /\.ya?ml$/)) {
    try {
      const work = parseWorkYaml(readFileSync(f, 'utf8'), f);
      const back = parseWorkMarkdown(toWorkMarkdown(work, f), f);
      const strip = (s) => s.replace(/\s+$/, '');
      const a = normalize(work.info);
      const b = normalize(back.info);
      if (!sameJson(a, b)) {
        fail('作品信息导出后变了', f);
        continue;
      }
      if (work.chapters.length !== back.chapters.length) {
        fail(`导出后章节数变了（${work.chapters.length} → ${back.chapters.length}）`, f);
        continue;
      }
      work.chapters.forEach((c, i) => {
        const d = back.chapters[i];
        // 单章作品没写章节名时，导回来会用作品名，两者等价
        const title = c.title ?? (work.chapters.length === 1 ? work.info.title : undefined);
        if (title !== d.title) fail(`第 ${i + 1} 章的章节名导出后变了（「${title ?? ''}」→「${d.title ?? ''}」）`, f);
        if (strip(c.body) !== strip(d.body)) fail(`第 ${i + 1} 章的正文导出后变了`, f);
      });
    } catch (e) {
      fail(e.message.replace(`${f}：`, '').replace(`${f} `, '').split('\n')[0], f);
    }
  }
});

// ---------------------------------------------------------------- 4. 构建

if (!process.argv.includes('--no-build')) {
  section(`网站能构建成功，子路径（${CHECK_BASE}）下没有漏掉前缀的链接`, (fail) => {
    try {
      execSync('npx astro build', { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, SITE_BASE: CHECK_BASE }, encoding: 'utf8' });
    } catch (e) {
      const out = `${e.stdout ?? ''}\n${e.stderr ?? ''}`;
      const lines = out.split('\n').filter((l) => /error|错误|写得不对|不对|required|Invalid/i.test(l)).slice(0, 10);
      return fail(`构建失败：\n${(lines.length ? lines : out.split('\n').slice(-15)).join('\n')}`);
    }
    const bad = new Map(); // 链接 → 出现在哪些页面
    const walk = (dir) => {
      for (const f of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, f.name);
        if (f.isDirectory()) walk(p);
        else if (/\.(html|css)$/.test(f.name)) {
          const text = readFileSync(p, 'utf8');
          for (const m of text.matchAll(/(?:href|src|action)="(\/[^"]*)"|url\((\/[^)]*)\)/g)) {
            const link = m[1] ?? m[2];
            if (link.startsWith('//') || link.startsWith(CHECK_BASE)) continue;
            if (!bad.has(link)) bad.set(link, new Set());
            bad.get(link).add(p.replace(/^dist\//, ''));
          }
        }
      }
    };
    walk('dist');
    for (const [link, pages] of [...bad].slice(0, 20)) {
      const where = [...pages];
      fail(`站内链接 ${link} 没带网站前缀，部署到 GitHub Pages 子路径时会打不开（出现在 ${where.length} 个页面，比如 ${where[0]}）。链接要用 works.ts 的 url() 生成`);
    }
  });
}

// ---------------------------------------------------------------- 汇总

const failed = results.filter((r) => r.errors.length);
console.log(failed.length ? `\n有 ${failed.length} 项没通过，看上面 ✗ 的说明。` : '\n全部通过。');

if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = ['## 自动检查', ''];
  for (const r of results) {
    lines.push(`- ${r.errors.length ? '❌' : '✅'} ${r.name}`);
    for (const e of r.errors.slice(0, 20)) lines.push(`  - ${e.replace(/\n/g, ' ')}`);
  }
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
}
process.exit(failed.length ? 1 : 0);
