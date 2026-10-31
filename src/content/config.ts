import { defineCollection, z } from 'astro:content';

// 作品元数据。只有 title 必填，其余都可以不写。
const works = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    // CP：写一个字符串，或者多个：cp: ["世界树", "马北"]
    cp: z.union([z.string(), z.array(z.string())]).optional(),
    updated: z.coerce.date().optional(),
    // 一句话简介，显示在列表和系列页
    summary: z.string().optional(),
    // 系列：同名的作品会自动串在一起，seriesOrder 决定先后
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    // 连载中 / 已完结；不写就不显示
    status: z.enum(['ongoing', 'finished']).optional(),
  }),
});

// 章节放在 src/content/chapters/<作品 slug>/ 下，一章一个文件。
const chapters = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    order: z.number(),
  }),
});

export const collections = { works, chapters };
