import { getCollection, type CollectionEntry } from 'astro:content';
import GithubSlugger from 'github-slugger';
import { site } from '../site.config';

type Entry = CollectionEntry<'chapters'>;

// 作品文件名 → 网址（小写、去掉标点，中文保留）
const folderSlug = (folder: string) => new GithubSlugger().slug(folder);

// 网页后台新建的作品，文件名是创建时间（如 20261031-203512），因为后台生成文件名时会把中文删掉。
// 这种作品的网址改用作品名生成；其他作品（导入的、手动建的）照旧用文件名。
const AUTO_NAME = /^\d{8}-\d{6}$/;

/** 给每篇作品分配网址，重名时在后面加 -2、-3 */
function assignSlugs(entries: { id: string; data: { title: string } }[]) {
  const slugs = new Map<string, string>();
  const used = new Set<string>();
  // 先给用文件名的作品分配，保证它们的网址不会因为新作品而变
  const ordered = [...entries].sort((a, b) => Number(AUTO_NAME.test(a.id)) - Number(AUTO_NAME.test(b.id)) || a.id.localeCompare(b.id));
  for (const e of ordered) {
    const base = (AUTO_NAME.test(e.id) && folderSlug(e.data.title)) || folderSlug(e.id) || e.id;
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    slugs.set(e.id, slug);
  }
  return slugs;
}

export interface Chapter {
  /** 原始内容条目（render() / body 从这里取） */
  entry: Entry;
  /** 唯一标识，形如 "biased-coin/01"（作品文件夹 + order） */
  slug: string;
  /** 第几章，从 1 开始 */
  order: number;
  /** 网址里的章节部分，由 order 生成，形如 "01" */
  key: string;
  /** 章节名：没写 title 时，单章用作品名，多章用「第 N 章」 */
  title: string;
  url: string;
}

export interface WorkInfo {
  slug: string;
  title: string;
  /** 署名：打开 customAuthor 且作品写了 author 时用作品的，否则用网站设置的 */
  author: string;
  /** 作者和网站作者不同（列表里要单独显示作者） */
  guestAuthor: boolean;
  cps: string[];
  updated?: Date;
  summary?: string;
  status?: 'ongoing' | 'finished';
  series?: string;
  seriesOrder?: number;
  chapters: Chapter[];
  words: number;
  minutes: number;
  /** 作品入口：第一章 */
  url: string;
  /** 简介；没写 summary 时取正文开头 */
  dek: string;
}

export const base = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

export const url = (path = '') => `${base}${path.replace(/^\//, '')}`;

/** 把 CP / 系列名变成 URL 片段：保留中文，去掉会破坏路径的字符。 */
export function slugify(name: string) {
  return name
    .trim()
    .replace(/[\/\\?#%&:*"<>|\s]+/g, '-')
    .replace(/[。，、！？…·.,!]+$/g, '')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export const cpUrl = (cp: string, page = 1) => url(`cp/${slugify(cp)}/${page > 1 ? `${page}/` : ''}`);
export const seriesUrl = (name: string) => url(`series/${slugify(name)}/`);

export function countWords(body: string) {
  // 粗略字数：中文按字、英文按词，去掉 Markdown 标记。
  const text = body.replace(/[#>*`\[\]()!_~|-]/g, ' ');
  const cjk = (text.match(/[㐀-鿿豈-﫿぀-ヿ]/g) || []).length;
  const latin = (text.replace(/[㐀-鿿豈-﫿぀-ヿ]/g, ' ').match(/[A-Za-z0-9']+/g) || []).length;
  return cjk + latin;
}

/** 正文开头做简介：跳过章注、AO3 提示和 "01" 这类分节小标题。 */
export function excerpt(body: string, len = 80) {
  const paras = body
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, '')
    .split(/\n\s*\n/)
    .map((p) =>
      p
        .replace(/^#+\s*/gm, '')
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*_`>~]/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((p) => p.length >= 8 && !/^(章注|作者注|注[:：]|See the end of the work)/i.test(p));
  const text = paras.join(' ');
  return text.length > len ? `${text.slice(0, len)}……` : text;
}

let cache: Promise<WorkInfo[]> | undefined;

/** 全部作品，按更新时间倒序，带好章节、字数、CP 列表。 */
export function loadWorks(): Promise<WorkInfo[]> {
  cache ??= (async () => {
    const [infoEntries, chapterEntries] = await Promise.all([getCollection('works'), getCollection('chapters')]);
    // 章节 id 形如 "性别问题/02"：前半是作品文件名，后半是第几章
    const byWork = new Map<string, Entry[]>();
    for (const e of chapterEntries) {
      const work = e.id.split('/')[0];
      if (!byWork.has(work)) byWork.set(work, []);
      byWork.get(work)!.push(e);
    }

    const slugs = assignSlugs(infoEntries);
    const infos = infoEntries.map((info): WorkInfo => {
      const d = info.data;
      const title = d.title;
      const slug = slugs.get(info.id)!;
      const raw = (byWork.get(info.id) ?? []).sort((a, b) => a.data.order - b.data.order);
      const chapters: Chapter[] = raw.map((e) => {
        const order = e.data.order;
        const key = String(order).padStart(2, '0');
        return {
          entry: e,
          slug: `${slug}/${key}`,
          order,
          key,
          title: e.data.title ?? (raw.length === 1 ? title : `第 ${order} 章`),
          url: url(`works/${slug}/${key}/`),
        };
      });
      const words = chapters.reduce((n, c) => n + countWords(c.entry.body ?? ''), 0);
      const author = (site.features.customAuthor && d.author?.trim()) || site.author;
      return {
        slug,
        title,
        author,
        guestAuthor: author !== site.author,
        cps: (Array.isArray(d.cp) ? d.cp : d.cp ? [d.cp] : []).map((x) => x.trim()).filter(Boolean),
        updated: d.updated,
        summary: d.summary,
        status: d.status,
        series: d.series,
        seriesOrder: d.seriesOrder,
        chapters,
        words,
        minutes: Math.max(1, Math.round(words / site.readingSpeed)),
        url: chapters[0].url,
        dek: d.summary ?? (site.features.autoSummary ? excerpt(chapters[0].entry.body ?? '') : ''),
      };
    });
    return infos.sort((a, b) => (b.updated?.getTime() ?? 0) - (a.updated?.getTime() ?? 0) || a.title.localeCompare(b.title, 'zh'));
  })();
  return cache;
}

export interface Group {
  name: string;
  slug: string;
  works: WorkInfo[];
  latest?: Date;
}

/** 配对目录：按作品数倒序，同数按名字。 */
export async function loadCps(): Promise<Group[]> {
  const works = await loadWorks();
  const map = new Map<string, Group>();
  for (const w of works) {
    for (const cp of w.cps) {
      const slug = slugify(cp);
      if (!map.has(slug)) map.set(slug, { name: cp, slug, works: [] });
      map.get(slug)!.works.push(w);
    }
  }
  const groups = [...map.values()];
  for (const g of groups) g.latest = g.works[0]?.updated;
  return groups.sort((a, b) => b.works.length - a.works.length || a.name.localeCompare(b.name, 'zh'));
}

/** 系列：系列内按 seriesOrder 正序，系列之间按最近更新倒序。 */
export async function loadSeries(): Promise<Group[]> {
  const works = await loadWorks();
  const map = new Map<string, Group>();
  for (const w of works) {
    if (!w.series) continue;
    const slug = slugify(w.series);
    if (!map.has(slug)) map.set(slug, { name: w.series, slug, works: [] });
    map.get(slug)!.works.push(w);
  }
  const groups = [...map.values()];
  for (const g of groups) {
    g.latest = g.works.reduce<Date | undefined>((d, w) => (w.updated && (!d || w.updated > d) ? w.updated : d), undefined);
    g.works.sort((a, b) => (a.seriesOrder ?? Infinity) - (b.seriesOrder ?? Infinity) || (a.updated?.getTime() ?? 0) - (b.updated?.getTime() ?? 0));
  }
  return groups.sort((a, b) => (b.latest?.getTime() ?? 0) - (a.latest?.getTime() ?? 0));
}

export const fmtDate = (d?: Date) => (d ? d.toISOString().slice(0, 10) : '');
