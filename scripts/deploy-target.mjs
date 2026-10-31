// 读网站设置里的「部署到」（info.deploy），给 GitHub Actions 判断要不要部署到 GitHub Pages。
//
//   node scripts/deploy-target.mjs     # 输出 github 或 cloudflare
//
// 不装依赖也能跑（工作流里只检出这一个脚本和 site.yml），所以没有用 yaml 库，只认 `deploy: xxx` 这一行。
// 旧版用仓库变量 DEPLOY=cloudflare 的写法也照样认。
import { readFileSync, appendFileSync } from 'node:fs';

let target = 'github';
try {
  const m = readFileSync('src/site.yml', 'utf8').match(/^\s*deploy:\s*["']?([A-Za-z]+)/m);
  if (m) target = m[1].toLowerCase();
} catch {}
if ((process.env.DEPLOY || '').toLowerCase() === 'cloudflare') target = 'cloudflare';
if (target !== 'cloudflare') target = 'github';

console.log(target);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `target=${target}\n`);
