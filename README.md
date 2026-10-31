# 1mether 的同人站

1mether 的同人作品存档。用 Astro 生成静态页，部署在 Cloudflare Pages（构建命令 `npm run build`，输出目录 `dist`）。

## 功能

- **纽约客式排版**：纯白底、黑字、细线分隔；标题用常规字重的大号衬线（西文 Libre Caslon，中文思源屏显臻宋），小标签用无衬线；首字下沉，完结章文末 ♦。字体自托管，国内也能正常加载。自带深色模式。
- **首页**：最新一篇做头条，其余按更新时间倒序，自动分页（每页篇数在 `site.config.ts` 里改）。
- **配对**：`/cp/` 列出全部 CP 和篇数；每个 CP 有自己的分页列表 `/cp/<CP>/`。
- **系列**：`/series/` 列出全部系列；同系列的作品在文末互相链接，有上一篇 / 下一篇。
- **多章作品**：章节页有上一章 / 下一章、全部章节目录，键盘 ← → 也能翻章。
- **阅读体验**：顶部阅读进度条、字数与阅读时长估算；作者注排成正文前后的小字区块，保留换行。
- **相关推荐**：每篇文末列出同 CP 的其他作品。

## 写作品

**一篇作品 = `src/content/works/` 下的一个文件夹。** 文件夹名就是网址，建议用作品名或英文缩写。

```
src/content/works/
  溶/
    index.md     ← 作品信息
    01.md        ← 正文
  性别问题/
    index.md
    01.md        ← 章节文件，文件名随意（也可以叫 正文.md、番外.md）
    02.md
    03.md
    04.md
```

### index.md：作品信息

只写开头这一段，下面不用写正文。除了 `title`，其他都可以不写：

```yaml
---
title: "性别问题"
cp: "辉慧"              # 多个 CP 写成 ["辉慧", "辉树"]
updated: 2022-09-24     # 决定首页排序
series: "度量空间"       # 同名系列自动归在一起
seriesOrder: 4          # 系列里的第几篇
summary: "一句话简介"     # 不写就自动取正文开头
status: finished        # ongoing（连载中）/ finished（已完结），不写不显示
---
```

### 章节文件

**单章作品**：什么都不用写，直接写正文。

**多章作品**：每章开头写章节名和 `order`（第几章）。章节顺序只看 `order`，和文件名无关；网址也按 `order` 生成（`order: 2` → `/works/性别问题/02/`）。

```markdown
---
title: "番外/慧人的烦恼"
order: 2
---

木村慧人最近不太开心。
```

漏写 `order`、或者两章写了同一个数字，构建时会报错并指出是哪个文件。

**加一章** = 在文件夹里新建一个文件，写上 `order`；**加一篇** = 新建一个文件夹，放 `index.md` 和正文文件。

### 作者注

放在正文前或正文后：

```html
<aside class="author-note" aria-label="作者注">

第一行

第二行

</aside>
```

单行的作者注也可以直接写成一段 `作者注：……`，会自动转换。正文后的作者注把 `aria-label` 写成 `章末注`。

## 本地预览

```
npm install
npm run dev      # 本地预览
npm run build    # 构建到 dist/
```

## 字体

- 中文：思源屏显臻宋（思源宋体的屏幕显示优化版，基于 SIL OFL 1.1 的思源宋体），来自[中文网字计划](https://github.com/KonghaYao/chinese-free-web-font-storage)的 npm 包 `@chinese-fonts/sypxzs`，已按字频切片，浏览器只下载页面用到的部分。
- 西文：Libre Caslon Text / Display（OFL），来自 Fontsource。
- 字体文件随站点一起部署，不依赖外部 CDN，国内也能正常加载。

## 做成自己的站（模板用法）

所有站点级设置都在 `src/site.config.ts`：站名、页脚小字、作者、外部链接、每页篇数、阅读速度，以及界面上的全部文字（`ui`，换语言只改这里）。颜色和字体是 `src/styles/global.css` 顶部的变量。

1. 清空 `src/content/works/` 和 `src/content/chapters/`，放进自己的作品。
2. 改 `src/site.config.ts`。
3. 部署在子路径（如 GitHub Pages 项目站）时，改 `astro.config.mjs` 里的 `base`。
