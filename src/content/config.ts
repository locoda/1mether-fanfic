import { defineCollection, z } from 'astro:content';

// 作品只留标题、一个主 CP（短名）、更新日期。
const works = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    cp: z.string().optional(),
    updated: z.coerce.date().optional(),
  }),
});

const chapters = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    order: z.number(),
  }),
});

export const collections = { works, chapters };
