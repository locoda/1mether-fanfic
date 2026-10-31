import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 一篇作品 = src/content/works/ 下的一个文件夹：
//
//   src/content/works/性别问题/
//     index.yml   ← 作品信息：标题、CP、日期……（没有正文）
//     01.md       ← 章节：开头写章节名和 order，下面写正文
//     02.md
//
// 单章作品也一样：一个 index.yml 加一个 01.md。
// 章节顺序看 order（1、2、3……），和文件名无关；网址也按 order 生成（/works/性别问题/02/）。
// 作品信息和章节是两种文件，所以在网页后台（Pages CMS）里也是「作品」「章节」两个入口。

const WORKS_DIR = './src/content/works';

// 网页后台保存时，没填的字段可能写成 "" 或 null，这里一律当作没写
const blank = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), schema.optional());

// 用原始路径做 id（例如 "性别问题/index"、"性别问题/02"），网址在 src/lib/works.ts 里生成
const keepPath = ({ entry }: { entry: string }) => entry.replace(/\.(ya?ml|md)$/i, '');

const works = defineCollection({
  loader: glob({ pattern: '*/index.{yml,yaml}', base: WORKS_DIR, generateId: keepPath }),
  schema: z.object({
    title: z.string(),
    // CP：一个或多个，例如 ["世界树", "马北"]
    cp: blank(z.union([z.string(), z.array(z.string())])),
    // 更新日期，决定首页排序
    updated: blank(z.coerce.date()),
    // 一句话简介；不写就自动取正文开头
    summary: blank(z.string()),
    // 系列：同名的作品会自动串在一起，seriesOrder 决定先后
    series: blank(z.string()),
    seriesOrder: blank(z.number()),
    // ongoing（连载中）/ finished（已完结）；不写就不显示
    status: blank(z.enum(['ongoing', 'finished'])),
  }),
});

const chapters = defineCollection({
  loader: glob({ pattern: '*/*.md', base: WORKS_DIR, generateId: keepPath }),
  schema: z.object({
    // 章节名；单章作品可以不写（或者写成作品名）
    title: blank(z.string()),
    // 第几章；多章作品必填，单章作品可以不写
    order: blank(z.number().int().positive()),
  }),
});

export const collections = { works, chapters };
