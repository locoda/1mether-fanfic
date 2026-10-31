// 读网站设置里的「部署到」（info.deploy 下的 github / cloudflare 两个勾选），决定往哪里部署。
//
//   node scripts/deploy-target.mjs          # 输出 github=true cloudflare=false 这样的结果
//   node scripts/deploy-target.mjs --cloudflare-build
//       给 Cloudflare Pages 用（npm run build 之前自动运行，见 package.json 的 prebuild）：
//       在 Cloudflare 上构建、但没勾 Cloudflare Pages 时让构建失败，Cloudflare 就不会更新网站
//
// GitHub Actions 里只检出这个脚本和 site.yml、不装依赖，所以没有用 yaml 库，只认 deploy 下面的两行。
import { readFileSync, appendFileSync } from 'node:fs';

export const DEFAULTS = { github: true, cloudflare: false };

export function readTargets(text) {
  const targets = { ...DEFAULTS };
  const lines = text.split(/\r?\n/);
  const i = lines.findIndex((l) => /^\s*deploy:/.test(l));
  if (i < 0) return targets;
  const set = (s) => {
    for (const m of s.matchAll(/(github|cloudflare)\s*:\s*["']?(true|false)\b/g)) targets[m[1]] = m[2] === 'true';
  };
  set(lines[i]); // deploy: { github: true, cloudflare: false } 写在一行的情况
  const indent = lines[i].match(/^\s*/)[0].length;
  for (const line of lines.slice(i + 1)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (line.match(/^\s*/)[0].length <= indent) break;
    set(line);
  }
  return targets;
}

let text = '';
try {
  text = readFileSync('src/site.yml', 'utf8');
} catch {}
const targets = readTargets(text);

if (process.argv.includes('--cloudflare-build')) {
  if (process.env.CF_PAGES && !targets.cloudflare) {
    console.error('网站设置里「部署到」没有勾选 Cloudflare Pages，这次不在 Cloudflare 上更新网站。');
    process.exit(1);
  }
} else {
  console.log(`github=${targets.github} cloudflare=${targets.cloudflare}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `github=${targets.github}\n`);
}
