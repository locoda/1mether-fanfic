import { getCollection, type CollectionEntry } from 'astro:content';
import { site } from '../site.config';

export type Work = CollectionEntry<'works'>;
export type Chapter = CollectionEntry<'chapters'>;

export interface WorkInfo {
  slug: string;
  title: string;
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

// 章节 slug 形如 "example-work/01"，第一段是作品 slug。
export const workSlugOf = (chapterSlug: string) => chapterSlug.split('/')[0];
const chapterPart = (chapterSlug: string) => chapterSlug.split('/').slice(1).join('/');
export const chapterUrl = (c: Chapter) => url(`works/${workSlugOf(c.slug)}/${chapterPart(c.slug)}/`);

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
    const [works, chapters] = await Promise.all([getCollection('works'), getCollection('chapters')]);
    const byWork = new Map<string, Chapter[]>();
    for (const c of chapters) {
      const key = workSlugOf(c.slug);
      if (!byWork.has(key)) byWork.set(key, []);
      byWork.get(key)!.push(c);
    }
    const infos = works.map((w): WorkInfo => {
      const chs = (byWork.get(w.slug) ?? []).sort((a, b) => a.data.order - b.data.order);
      if (chs.length === 0) throw new Error(`作品「${w.data.title}」没有章节：请在 src/content/chapters/${w.slug}/ 下放至少一个文件`);
      const words = chs.reduce((n, c) => n + countWords(c.body), 0);
      const cp = w.data.cp;
      return {
        slug: w.slug,
        title: w.data.title,
        cps: (Array.isArray(cp) ? cp : cp ? [cp] : []).map((s) => s.trim()).filter(Boolean),
        updated: w.data.updated,
        summary: w.data.summary,
        status: w.data.status,
        series: w.data.series,
        seriesOrder: w.data.seriesOrder,
        chapters: chs,
        words,
        minutes: Math.max(1, Math.round(words / site.readingSpeed)),
        url: chapterUrl(chs[0]),
        dek: w.data.summary ?? excerpt(chs[0].body),
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

/** CP 目录：按作品数倒序，同数按名字。 */
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
