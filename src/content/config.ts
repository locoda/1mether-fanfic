import { defineCollection, z } from 'astro:content';

// 一篇作品 = src/content/works/ 下的一个文件夹：
//
//   src/content/works/溶/
//     index.md   ← 单章作品：作品信息 + 正文，一个文件
//
//   src/content/works/性别问题/
//     index.md   ← 多章作品：只写作品信息
//     01.md      ← 章节文件，文件名随意，开头写 title 和 order
//     02.md
//
// 章节顺序看 order（1、2、3……），和文件名无关；网址也按 order 生成（/works/性别问题/02/）。
// 两种文件放在同一个集合里，字段都是可选的，必填项在 src/lib/works.ts 里检查。
// 网页后台（Pages CMS）保存时，没填的字段可能写成 "" 或 null，这里一律当作没写
const blank = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), schema.optional());

const works = defineCollection({
  type: 'content',
  schema: z.object({
    // index.md：作品标题（必填）；章节文件：章节名（可选）
    title: blank(z.string()),
    // 章节文件：第几章。多章作品必填，单章作品不用写
    order: blank(z.number().int().positive()),
    // 以下只在 index.md 里写
    // CP：写一个字符串，或者多个：cp: ["世界树", "马北"]
    cp: blank(z.union([z.string(), z.array(z.string())])),
    updated: blank(z.coerce.date()),
    // 一句话简介，显示在列表里；不写就自动取正文开头
    summary: blank(z.string()),
    // 系列：同名的作品会自动串在一起，seriesOrder 决定先后
    series: blank(z.string()),
    seriesOrder: blank(z.number()),
    // ongoing（连载中）/ finished（已完结）；不写就不显示
    status: blank(z.enum(['ongoing', 'finished'])),
  }),
});

export const collections = { works };
