import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import type { Loader } from 'astro/loaders';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

// 一篇作品 = src/content/works/ 下的一个 .yml 文件，作品信息和所有章节都在里面：
//
//   title: 性别问题
//   cp: [辉慧]
//   updated: 2022-09-24
//   chapters:
//     - title: 正文/一发完
//       body: |
//         正文……
//     - title: 番外/慧人的烦恼
//       body: |
//         正文……
//
// 章节顺序就是列表顺序，网址按顺序生成（第二章 → /works/性别问题/02/）。
// 文件名就是网址，例如 性别问题.yml → /works/性别问题/。

const WORKS_DIR = 'src/content/works';

// 网页后台保存时，没填的字段可能写成 "" 或 null，这里一律当作没写
const blank = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), schema.optional());

const chapterSchema = z.object({
  // 章节名；单章作品可以不写
  title: blank(z.string()),
  body: z.string({ required_error: '每一章都要有正文（body）' }),
});

const works = defineCollection({
  loader: glob({ pattern: '*.{yml,yaml}', base: `./${WORKS_DIR}`, generateId: ({ entry }) => entry.replace(/\.ya?ml$/i, '') }),
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
    chapters: z.array(chapterSchema).min(1, '至少要有一章'),
  }),
});

// 把每篇作品里的章节拆出来，单独渲染成 Markdown（作者注、首字下沉等排版规则照常生效）
const chapterLoader: Loader = {
  name: 'fanfic-chapters',
  load: async ({ store, parseData, renderMarkdown, generateDigest, watcher, logger }) => {
    const sync = async () => {
      store.clear();
      const files = (await readdir(WORKS_DIR)).filter((f) => /\.ya?ml$/i.test(f));
      for (const file of files) {
        const work = file.replace(/\.ya?ml$/i, '');
        const raw = await readFile(join(WORKS_DIR, file), 'utf8');
        const doc = parseYaml(raw) ?? {};
        const list: unknown[] = Array.isArray(doc.chapters) ? doc.chapters : [];
        for (const [i, item] of list.entries()) {
          const order = i + 1;
          const id = `${work}/${String(order).padStart(2, '0')}`;
          // 字段是否填对由上面 works 集合的 schema 检查，这里只负责拆分和渲染
          const ch = (item ?? {}) as { title?: unknown; body?: unknown };
          const title = typeof ch.title === 'string' && ch.title.trim() ? ch.title : undefined;
          const body = typeof ch.body === 'string' ? ch.body : '';
          const data = await parseData({ id, data: { title, order } });
          store.set({
            id,
            data,
            body,
            digest: generateDigest(`${title ?? ''}\n${body}`),
            rendered: await renderMarkdown(body),
          });
        }
      }
      logger.info(`${files.length} 篇作品`);
    };
    await sync();
    watcher?.on('change', (path) => path.includes(WORKS_DIR) && sync());
    watcher?.on('add', (path) => path.includes(WORKS_DIR) && sync());
    watcher?.on('unlink', (path) => path.includes(WORKS_DIR) && sync());
  },
};

const chapters = defineCollection({
  loader: chapterLoader,
  schema: z.object({
    title: z.string().optional(),
    order: z.number(),
  }),
});

export const collections = { works, chapters };
