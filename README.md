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
    index.md     ← 单章作品：作品信息 + 正文，一个文件搞定
  性别问题/
    index.md     ← 多章作品：只写作品信息
    01.md        ← 章节文件，文件名随意（也可以叫 正文.md、番外.md）
    02.md
    03.md
    04.md
```

### index.md

开头是作品信息，除了 `title` 都可以不写；**单章作品**接着在下面写正文：

```markdown
---
title: "溶"
cp: ["世界树"]          # 可以写多个：["辉慧", "辉树"]
updated: 2025-02-14     # 决定首页排序
series: "在平凡日常中流淌着的……"   # 同名系列自动归在一起
seriesOrder: 11         # 系列里的第几篇
summary: "一句话简介"     # 不写就自动取正文开头
status: finished        # ongoing（连载中）/ finished（已完结），不写不显示
---

偏偏今天是个雨天。
……
```

**多章作品**的 `index.md` 只写作品信息，下面留空。

### 章节文件（多章作品）

每章一个文件，开头写章节名和 `order`（第几章）。章节顺序只看 `order`，和文件名无关；网址也按 `order` 生成（`order: 2` → `/works/性别问题/02/`）。

```markdown
---
title: "番外/慧人的烦恼"
order: 2
---

木村慧人最近不太开心。
```

写错了构建时会报错并指出是哪个文件：多章作品漏写 `order`、两章 `order` 重复、`index.md` 里写了正文同时又有章节文件、或者作品一个字都没有。

**加一篇单章作品** = 新建文件夹，放一个 `index.md`；**单章变多章** = 把 `index.md` 里的正文挪到 `01.md`（写上 `order: 1`），再加 `02.md`。

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
2. 左边「作品」里按文件夹列出所有作品，点开就能看到作品信息和各章节。
3. **新建作品**：点右上角「＋」，文件名填 `作品名/index.md`，填标题、CP 等信息；单章作品直接在「正文」里写。
4. **多章作品**：作品信息的「正文」留空，点作品右边的「＋」加章节，每章填章节名和「第几章」。点作品左边的展开按钮能看到它的所有章节。
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
