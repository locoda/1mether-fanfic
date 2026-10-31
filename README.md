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

**一篇作品 = `src/content/works/` 下的一个文件夹**，里面是一个作品信息文件和若干章节文件。文件夹名就是网址，建议用作品名或英文缩写。

```
src/content/works/
  溶/
    index.yml    ← 作品信息
    01.md        ← 章节（单章作品也有一个）
  性别问题/
    index.yml
    01.md        ← 章节文件，文件名随意（也可以叫 正文.md、番外.md）
    02.md
    03.md
    04.md
```

### index.yml：作品信息

只有作品信息，没有正文。除了 `title`，其他都可以不写：

```yaml
title: "性别问题"
cp: ["辉慧"]            # 可以写多个：["辉慧", "辉树"]
updated: 2022-09-24     # 决定首页排序
series: "度量空间"       # 同名系列自动归在一起
seriesOrder: 4          # 系列里的第几篇
summary: "一句话简介"     # 不写就自动取正文开头
status: finished        # ongoing（连载中）/ finished（已完结），不写不显示
```

### 章节文件

开头写章节名和 `order`（第几章），下面写正文。章节顺序只看 `order`，和文件名无关；网址也按 `order` 生成（`order: 2` → `/works/性别问题/02/`）。

```markdown
---
title: "番外/慧人的烦恼"
order: 2
---

木村慧人最近不太开心。
```

单章作品的章节名写作品名就行（页面上不会重复显示），`order` 可以不写。

写错了构建时会报错并指出是哪个文件：缺 `index.yml`、`index.yml` 没写 `title`、作品没有章节、多章作品漏写 `order` 或两章 `order` 重复。

**加一篇** = 新建文件夹，放 `index.yml` 和 `01.md`；**加一章** = 在文件夹里新建一个 `.md`，写上 `order`。

### 作者注

放在正文前或正文后：

```html
<aside class="author-note" aria-label="作者注">

第一行

第二行

</aside>
```

单行的作者注也可以直接写成一段 `作者注：……`，会自动转换。正文后的作者注把 `aria-label` 写成 `章末注`。

## 网页后台（Pages CMS）

不想碰代码的话，可以用 [Pages CMS](https://pagescms.org) 在网页上写：

1. 打开 https://app.pagescms.org ，用 GitHub 账号登录，选这个仓库。
2. 左边有两个入口：
   - **作品**：作品名、CP、日期、系列、简介、连载状态，没有正文。
   - **章节**：先点进作品的文件夹，里面列出这篇作品的各章，每章只有章节名、第几章和正文。
3. **新建作品**：在「作品」里点「＋」填好信息；再到「章节」里点进这个作品的文件夹，点「＋」写第一章（第几章填 1）。
4. **加一章**：在「章节」里点进作品的文件夹，点「＋」，填章节名、第几章和正文。
5. 保存后会自动提交到仓库，Cloudflare Pages 随后自动重新部署，一两分钟后网站上就能看到。

正文是纯文本编辑框，写法和 Markdown 一样：空一行是分段，`**粗体**`。配置在仓库根目录的 `.pages.yml`。

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
