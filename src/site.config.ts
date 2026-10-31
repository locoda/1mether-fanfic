// 网站设置在 src/site.yml（也可以在网页后台的「网站设置」里改），这里负责读取并补上默认值。
// 界面文字（ui）在本文件下半部分，换语言或者改说法时改这里。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'astro/zod';
import { FONT_IDS, DEFAULT_FONT } from './lib/fonts.mjs';

// 网页后台保存时，没填的项目可能写成 "" 或 null，一律当作没写、用默认值
// （先换成默认值再校验，这样 features 这种嵌套对象里的每一项也会补上默认值）
const opt = <T extends z.ZodTypeAny>(schema: T, fallback: unknown) =>
  z.preprocess((v) => (v === '' || v === null || v === undefined ? fallback : v), schema);

const SiteSchema = z.object({
  title: opt(z.string(), '我的同人站'),
  tagline: opt(z.string(), ''),
  author: opt(z.string(), '作者'),
  description: opt(z.string(), ''),
  lang: opt(z.string(), 'zh-CN'),
  links: opt(z.array(z.object({ label: z.string(), href: z.string() })), []),
  // 只给 GitHub Actions 看（scripts/deploy-target.mjs），网站本身不用
  githubPages: opt(z.boolean(), true),
  perPage: opt(z.number().int().positive(), 20),
  readingSpeed: opt(z.number().positive(), 500),
  features: opt(
    z.object({
      leadStory: opt(z.boolean(), true),
      dropCap: opt(z.boolean(), true),
      endMark: opt(z.boolean(), true),
      progressBar: opt(z.boolean(), true),
      wordCount: opt(z.boolean(), true),
      readingTime: opt(z.boolean(), true),
      byline: opt(z.boolean(), true),
      chapterPicker: opt(z.boolean(), true),
      keyboardNav: opt(z.boolean(), true),
      related: opt(z.boolean(), true),
      autoSummary: opt(z.boolean(), true),
      customAuthor: opt(z.boolean(), false),
      status: opt(z.boolean(), true),
      updatedDate: opt(z.boolean(), true),
      darkMode: opt(z.enum(['auto', 'system', 'off']), 'auto'),
      font: opt(z.enum(FONT_IDS as [string, ...string[]]), DEFAULT_FONT),
    }),
    {},
  ),
});

// site.yml 分三组（和网页后台「网站设置」的分组一致）：
//   info     网站信息：站名、作者名、简介、页脚链接……
//   display  显示设置：深色模式、每页作品数、首页头条、首字放大……
//   works    作品设置：每篇作品的作者名、署名、连载状态、更新日期、字数……
// 旧版不分组的写法（title、features 直接写在最外层）也照样能读。
const GROUPS = {
  info: ['title', 'tagline', 'author', 'description', 'lang', 'links', 'githubPages'],
  display: ['font', 'darkMode', 'perPage', 'leadStory', 'dropCap', 'endMark', 'progressBar', 'chapterPicker', 'keyboardNav'],
  works: ['customAuthor', 'byline', 'status', 'updatedDate', 'wordCount', 'readingTime', 'readingSpeed', 'autoSummary', 'related'],
} as const;
const TOP_LEVEL = new Set(['title', 'tagline', 'author', 'description', 'lang', 'links', 'githubPages', 'perPage', 'readingSpeed']);

/** 把分组写法摊平成内部使用的结构：{ title, …, perPage, readingSpeed, features: { … } } */
function flatten(raw: Record<string, any>) {
  const flat: Record<string, any> = { ...raw, features: { ...(raw.features ?? {}) } };
  for (const [group, keys] of Object.entries(GROUPS)) {
    const values = raw[group];
    delete flat[group];
    if (!values || typeof values !== 'object') continue;
    for (const key of keys) {
      if (!(key in values)) continue;
      if (TOP_LEVEL.has(key)) flat[key] = values[key];
      else flat.features[key] = values[key];
    }
  }
  return flat;
}

/** 报错时按分组写法指出位置，比如 display.perPage */
const where = (path: PropertyKey[]) => {
  const key = String(path[0] === 'features' ? path[1] : path[0]);
  const group = Object.entries(GROUPS).find(([, keys]) => (keys as readonly string[]).includes(key))?.[0];
  return group ? `${group}.${key}` : path.join('.');
};

function loadSite() {
  const file = join(process.cwd(), 'src', 'site.yml');
  const result = SiteSchema.safeParse(flatten(parse(readFileSync(file, 'utf8')) ?? {}));
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${where(i.path)}: ${i.message}`).join('\n');
    throw new Error(`src/site.yml 写得不对：\n${issues}`);
  }
  return result.data;
}

export const site = loadSite();

// 界面文字。做成模板后，换语言只改这里。
export const ui = {
  allWorks: '全部作品',
  cpIndex: '配对',
  seriesIndex: '系列',
  chapters: '章',
  chapterOf: (n: number, total: number) => `第 ${n} 章 / 共 ${total} 章`,
  words: (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1)} 万字` : `${n.toLocaleString('zh-CN')} 字`),
  minutes: (n: number) => `约 ${n} 分钟`,
  works: (n: number) => `${n} 篇`,
  prev: '上一页',
  next: '下一页',
  prevChapter: '上一章',
  nextChapter: '下一章',
  allChapters: '全部章节',
  startReading: '开始阅读',
  inSeries: '收录于系列',
  // 系列里的序号，和章节一样只写数字：01、02……
  seriesPart: (n: number) => String(n).padStart(2, '0'),
  prevInSeries: '系列上一篇',
  nextInSeries: '系列下一篇',
  moreFromCp: (cp: string) => `更多${cp}作品`,
  viewSeries: '查看整个系列',
  viewCp: (cp: string) => `${cp}全部作品`,
  latest: '最新',
  byline: (name: string) => `文 / ${name}`,
  authorNote: '作者注',
  empty: '还没有作品。',
  notFound: '这一页不存在。',
  backHome: '回到首页',
  ongoing: '连载中',
  finished: '已完结',
};
