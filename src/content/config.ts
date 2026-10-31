import { defineCollection, z } from 'astro:content';

// 一篇作品 = src/content/works/ 下的一个文件夹：
//
//   src/content/works/性别问题/
//     index.md   ← 作品信息（标题、CP、日期……），下面不用写正文
//     01.md      ← 第一章
//     02.md      ← 第二章……（按文件名排序）
//
// 章节文件开头可以写 title 作为章节名；单章作品不用写。
// 两种文件放在同一个集合里，字段都是可选的，必填项在 src/lib/works.ts 里检查。
const works = defineCollection({
  type: 'content',
  schema: z.object({
    // index.md：作品标题（必填）；章节文件：章节名（可选）
    title: z.string().optional(),
    // 以下只在 index.md 里写
    // CP：写一个字符串，或者多个：cp: ["世界树", "马北"]
    cp: z.union([z.string(), z.array(z.string())]).optional(),
    updated: z.coerce.date().optional(),
    // 一句话简介，显示在列表里；不写就自动取正文开头
    summary: z.string().optional(),
    // 系列：同名的作品会自动串在一起，seriesOrder 决定先后
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    // ongoing（连载中）/ finished（已完结）；不写就不显示
    status: z.enum(['ongoing', 'finished']).optional(),
  }),
});

export const collections = { works };
