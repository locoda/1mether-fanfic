# 1mether 的同人站

1mether 的同人作品存档。用 Astro 生成静态页，部署在 Cloudflare Pages（构建命令 `npm run build`，输出目录 `dist`）。

## 功能

- **纽约客式排版**：纯白底、黑字、细线分隔；标题用常规字重的大号衬线（西文 Libre Caslon，中文文津宋体），小标签用无衬线；首字下沉，完结章文末 ♦。字体自托管，国内也能正常加载。自带深色模式。
- **首页**：最新一篇做头条，其余按更新时间倒序，自动分页（每页篇数在 `site.config.ts` 里改）。
- **CP 目录**：`/cp/` 列出全部 CP 和篇数；每个 CP 有自己的分页列表 `/cp/<CP>/`。
- **系列**：`/series/` 列出全部系列；同系列的作品在文末互相链接，有上一篇 / 下一篇。
- **多章作品**：章节页有上一章 / 下一章、全部章节目录，键盘 ← → 也能翻章。
- **阅读体验**：顶部阅读进度条、字数与阅读时长估算；作者注排成正文前后的小字区块，保留换行。
- **相关推荐**：每篇文末列出同 CP 的其他作品。

## 写作品

一篇作品 = 一个作品文件 + 一个章节文件夹：

```
src/content/works/交换律.md          ← 作品信息
src/content/chapters/交换律/01.md    ← 第一章
src/content/chapters/交换律/02.md    ← 第二章……
```

作品文件只有 frontmatter，除了 `title` 都可以不写：

```yaml
---
title: "交换律"
cp: "辉树"              # 多个 CP 写成 ["辉树", "世界树"]
updated: 2026-02-28     # 决定排序
series: "度量空间"       # 同名系列自动归在一起
seriesOrder: 4          # 系列里的第几篇
summary: "一句话简介"     # 不写就自动取正文开头
status: finished        # ongoing / finished，不写不显示
---
```

章节文件：

```yaml
---
title: "正文"
order: 1
---

正文……
```

作者注（可选，放在正文前或正文后）：

```html
<aside class="author-note" aria-label="作者注">

第一行

第二行

</aside>
```

单行的作者注也可以直接写成一段 `作者注：……`，会自动转换。

## 本地预览

```
npm install
npm run dev      # 本地预览
npm run build    # 构建到 dist/
```

## 字体

中文用[文津宋体](https://github.com/takushun-wu/WenJinMincho)（SIL OFL 1.1）。`npm run build` / `npm run dev` 之前会自动运行 `scripts/build-fonts.mjs`，扫描 `src/` 里用到的字，只把这些字裁剪进 `public/fonts/wenjin/`（约 1MB，不进 git）。新增作品后重新构建即可。

## 做成自己的站（模板用法）

所有站点级设置都在 `src/site.config.ts`：站名、页脚小字、作者、外部链接、每页篇数、阅读速度，以及界面上的全部文字（`ui`，换语言只改这里）。颜色和字体是 `src/styles/global.css` 顶部的变量。

1. 清空 `src/content/works/` 和 `src/content/chapters/`，放进自己的作品。
2. 改 `src/site.config.ts`。
3. 部署在子路径（如 GitHub Pages 项目站）时，改 `astro.config.mjs` 里的 `base`。
