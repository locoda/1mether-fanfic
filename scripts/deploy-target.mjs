// 读网站设置里的「部署到 GitHub Pages」（info.githubPages），给 deploy.yml / import.yml 判断要不要部署。
//
//   node scripts/deploy-target.mjs     # 输出 github=true 或 github=false
//
// 工作流里只检出这个脚本和 site.yml、不装依赖，所以没有用 yaml 库，只认 `githubPages: true/false` 这一行。
// Cloudflare Pages 不需要这里管：它连上仓库后每次推送都会自己构建部署。
import { readFileSync, appendFileSync } from 'node:fs';

let github = true;
try {
  const m = readFileSync('src/site.yml', 'utf8').match(/^\s*githubPages:\s*["']?(true|false)\b/m);
  if (m) github = m[1] === 'true';
} catch {}

console.log(`github=${github}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `github=${github}\n`);
