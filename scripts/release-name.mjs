// 给「导出作品」的 zip 起名字，供 .github/workflows/export-release.yml 使用。
// 输出 GitHub Actions 的环境变量：
//   FILE  zip 文件名：<仓库名>-works-<日期>.zip，例如 1mether-fanfic-works-20261101.zip
//   TAG   Release 的标签：works-<日期>-<时分>（同一天运行多次也不会重名）
//   DAY   日期，用在 Release 标题里
// 时间按环境变量 TZ 计算，工作流里设成北京时间。
const now = new Date();
const tz = process.env.TZ || 'Asia/Shanghai';
const part = (opts) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, hour12: false, ...opts }).format(now);
const day = part({ year: 'numeric', month: '2-digit', day: '2-digit' }); // 2026-11-01
const time = part({ hour: '2-digit', minute: '2-digit' }).replace(':', ''); // 0326
const date = day.replaceAll('-', '');
const repo = (process.env.GITHUB_REPOSITORY ?? '').split('/').pop() || 'site';

console.log(`FILE=${repo}-works-${date}.zip`);
console.log(`TAG=works-${date}-${time}`);
console.log(`DAY=${day}`);
