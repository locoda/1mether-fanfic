# 1mether 的同人站

1mether 的同人作品存档。用 Astro 7 生成静态页，部署在 Cloudflare Pages（构建命令 `npm run build`，输出目录 `dist`）。需要 Node.js 22.23.4 以上，版本写在 `.node-version`，Cloudflare 会自动读取。

## 功能

- **纽约客式排版**：纯白底、黑字、细线分隔；标题用常规字重的大号衬线（西文 Libre Caslon，中文思源屏显臻宋），小标签用无衬线；首字下沉，完结章文末 ♦。字体自托管，国内也能正常加载。自带深色模式。
- **首页**：最新一篇做头条，其余按更新时间倒序，自动分页（每页篇数在 `site.config.ts` 里改）。
- **配对**：`/cp/` 列出全部 CP 和篇数；每个 CP 有自己的分页列表 `/cp/<CP>/`。
- **系列**：`/series/` 列出全部系列；同系列的作品在文末互相链接，有上一篇 / 下一篇。
- **多章作品**：章节页有上一章 / 下一章、全部章节目录，键盘 ← → 也能翻章。
- **阅读体验**：顶部阅读进度条、字数与阅读时长估算；作者注排成正文前后的小字区块，保留换行。
- **相关推荐**：每篇文末列出同 CP 的其他作品。

## 写作品

**一篇作品 = `src/content/works/` 下的一个 `.yml` 文件**，作品信息和所有章节都在里面。文件名就是网址（`性别问题.yml` → `/works/性别问题/`），建议用作品名或英文缩写。

推荐用下面的[网页后台](#网页后台pages-cms)写，不用自己管格式。直接编辑文件的话，格式是这样：

```yaml
title: 性别问题
cp: [辉慧]              # 可以写多个：[辉慧, 辉树]
updated: 2022-09-24     # 决定首页排序
series: 度量空间         # 同名系列自动归在一起（可不写）
seriesOrder: 4          # 系列里的第几篇（可不写）
summary: 一句话简介       # 不写就自动取第一章开头
status: finished        # ongoing（连载中）/ finished（已完结），不写不显示
chapters:
  - title: 正文/一发完
    body: |
      第一章正文，每行前面空六格。

      空一行是分段。
  - title: 番外/慧人的烦恼
    body: |
      第二章正文……
```

- 除了 `title` 和 `chapters`，其他都可以不写。
- 章节顺序就是列表顺序，网址按顺序生成（第二章 → `/works/性别问题/02/`）。
- 单章作品只写一章，章节名可以不写。
- 正文写在 `body: |` 下面，每行都要比 `body` 多缩进两格。

写错了构建时会报错并指出是哪篇作品、哪一章，比如没有章节、某一章没有正文。

### 用 Markdown 导入 / 导出

网站的正本是 `src/content/works/*.yml`，另外有两个单向转换的命令（需要时手动运行）：

**导入（md → 网站）**：在别的编辑器（Typora、Obsidian……）写好一篇 md，放进网站：

```
npm run import -- 新作品.md            # 文件名就是网址：新作品.md → /works/新作品/
npm run import -- 草稿/*.md            # 一次导入多篇
npm run import -- 新作品.md --force    # 覆盖已有的同名作品
```

md 的写法：开头 `---` 之间写作品信息（字段同上），下面写正文；多章作品每章前面写一行 `# 章节名`。

```markdown
---
title: 性别问题
cp: [辉慧]
updated: 2022-09-24
---

# 正文/一发完

第一章正文……

# 番外/慧人的烦恼

第二章正文……
```

单章作品不用写 `#`，整段正文就是这一章。正文里的标题请用 `##`，`#` 留给分章。

**导出（网站 → md）**：`npm run export` 把每篇作品导出成一份 md，放到 `export/`，方便备份、搬家、用别的编辑器看。`export/` 不进 git，改它不会影响网站；想改完放回网站，就用上面的导入命令加 `--force`。

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
2. 左边「作品」里列出所有作品，点开一篇，**同一页里**上面是作品信息（作品名、CP、日期、系列……），下面是「章节」，每章一张卡片（章节名 + 正文）。
3. **新建作品**：点右上角「＋」，填作品信息，在「章节」里写第一章。
4. **加一章**：在作品页面的「章节」下面点「添加」。拖动卡片可以调整章节顺序。
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

### 功能开关

`site.config.ts` 里的 `features`，`true` 打开、`false` 关闭：

| 开关 | 作用 |
|---|---|
| `leadStory` | 首页第一页把最新一篇做成大标题头条 |
| `dropCap` | 正文第一个字放大（首字下沉） |
| `endMark` | 完结章最后一段末尾加 ♦ |
| `progressBar` | 章节页顶部的阅读进度条 |
| `wordCount` | 显示字数 |
| `readingTime` | 显示预计阅读时长 |
| `byline` | 标题下的「文 / 作者」署名 |
| `chapterPicker` | 多章作品点「第 N 章 / 共 M 章」弹出章节菜单 |
| `keyboardNav` | 键盘 ← → 翻章 |
| `related` | 文末「更多同 CP 作品」推荐 |
| `autoSummary` | 没写简介时，列表里自动显示正文开头 |
| `darkMode` | `'auto'` 跟随系统并显示切换按钮；`'system'` 只跟随系统；`'off'` 始终浅色 |

没有任何作品写 CP 或系列时，导航里的「配对」「系列」会自动隐藏。

1. 清空 `src/content/works/` 和 `src/content/chapters/`，放进自己的作品。
2. 改 `src/site.config.ts`。
3. 部署在子路径（如 GitHub Pages 项目站）时，改 `astro.config.mjs` 里的 `base`。
