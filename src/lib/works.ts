import { getCollection, type CollectionEntry } from 'astro:content';
import GithubSlugger from 'github-slugger';
import { site } from '../site.config';

type Entry = CollectionEntry<'chapters'>;

// 作品文件夹名 → 网址（和之前的规则一致：小写、去掉标点，中文保留）
const folderSlug = (folder: string) => new GithubSlugger().slug(folder);

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
    // 按文件夹分组：<作品文件夹>/index.yml 是作品信息，<作品文件夹>/*.md 是章节
    const byFolder = new Map<string, Entry[]>();
    for (const e of chapterEntries) {
      const folder = e.id.split('/')[0];
      if (!byFolder.has(folder)) byFolder.set(folder, []);
      byFolder.get(folder)!.push(e);
    }
    const infoFolders = new Set(infoEntries.map((e) => e.id.split('/')[0]));
    for (const folder of byFolder.keys()) {
      if (!infoFolders.has(folder)) throw new Error(`作品文件夹 src/content/works/${folder}/ 里缺少 index.yml（写标题、CP 等作品信息）`);
    }

    const infos = infoEntries.map((info): WorkInfo => {
      const folder = info.id.split('/')[0];
      const where = `src/content/works/${folder}/`;
      const d = info.data;
      const title = d.title;
      const raw = byFolder.get(folder) ?? [];
      if (raw.length === 0) throw new Error(`作品「${title}」没有章节：请在 ${where} 下放至少一个章节文件，例如 01.md`);
      const slug = folderSlug(folder);
      const file = (e: Entry) => `${e.id.split('/')[1]}.md`;
      // 章节顺序只看 order，文件名随意。单章作品可以不写 order。
      if (raw.length > 1) {
        const missing = raw.filter((e) => e.data.order === undefined).map(file);
        if (missing.length) throw new Error(`「${title}」有多个章节，每章都要写 order（第几章）：${where}${missing.join('、')}`);
        const seen = new Map<number, string>();
        for (const e of raw) {
          if (seen.has(e.data.order!)) throw new Error(`「${title}」里 ${seen.get(e.data.order!)} 和 ${file(e)} 的 order 都是 ${e.data.order}`);
          seen.set(e.data.order!, file(e));
        }
      }
      const sorted = [...raw].sort((a, b) => (a.data.order ?? 1) - (b.data.order ?? 1));
      const chapters: Chapter[] = sorted.map((e) => {
        const order = e.data.order ?? 1;
        const key = String(order).padStart(2, '0');
        return {
          entry: e,
          slug: `${slug}/${key}`,
          order,
          key,
          title: e.data.title ?? (sorted.length === 1 ? title : `第 ${order} 章`),
          url: url(`works/${slug}/${key}/`),
        };
      });
      const words = chapters.reduce((n, c) => n + countWords(c.entry.body ?? ''), 0);
      return {
        slug,
        title,
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
        dek: d.summary ?? excerpt(chapters[0].entry.body ?? ''),
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
