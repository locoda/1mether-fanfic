import { defineCollection, z } from 'astro:content';

const works = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    // 可选：不填就用 site.config 里的作者名
    author: z.string().optional(),
    fandom: z.string().optional(),
    pairing: z.string().optional(),
    status: z.enum(['连载中', '已完结', '暂停']).default('连载中'),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    warnings: z.array(z.string()).default([]),
    rating: z.string().optional(),
    series: z.string().optional(),
    updated: z.coerce.date().optional(),
  }),
});

const chapters = defineCollection({
  type: 'content',
  // 章节文件放在 src/content/chapters/<作品 slug>/ 下面，
  // 例如 src/content/chapters/example-work/01.md
  schema: z.object({
    title: z.string(),
    // 章节序号：01、02…… 决定排序，不用在标题里再写“第 X 章”
    order: z.number(),
    date: z.coerce.date().optional(),
    summary: z.string().optional(),
  }),
});

export const collections = { works, chapters };
