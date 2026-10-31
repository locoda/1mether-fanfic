import { getCollection } from 'astro:content';

// 章节 slug 形如 "example-work/01"，第一段是作品 slug。
export function workSlugOf(chapterSlug: string) {
  return chapterSlug.split('/')[0];
}

export async function chaptersOf(workSlug: string) {
  const all = await getCollection('chapters');
  return all
    .filter((c) => workSlugOf(c.slug) === workSlug)
    .sort((a, b) => a.data.order - b.data.order);
}

export function countWords(body: string) {
  // 粗略字数：去掉 Markdown 标记后按字符计，够在列表页展示即可。
  const text = body.replace(/[#>*`\[\]()!_-]/g, '').replace(/\s+/g, '');
  return text.length;
}
