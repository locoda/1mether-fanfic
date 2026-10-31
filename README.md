# 同人文存档模板

一个给同人作者用的个人作品存档站模板：纽约客式的杂志排版，有配对（CP）目录、系列、分页、多章节导航；可以在网页后台里写作品、改设置，不用碰代码；能从 Markdown、txt、Word 和 AO3 下载的 HTML 导入作品，也能把全部作品打包成 Markdown 下载。用 [Astro](https://astro.build) 生成纯静态网站，免费部署在 Cloudflare Pages 或 GitHub Pages。

模板里带了三篇公有领域的示例作品（鲁迅《野草》选三篇、朱自清《匆匆》《背影》），用来展示多章作品和系列，文件是 `src/content/works/example-*.yml`，开始写自己的作品前删掉就好。

## 有什么

- **纽约客式排版**：纯白底、黑字、细线分隔；标题用常规字重的大号衬线（西文 Libre Caslon，中文思源屏显臻宋），小标签用无衬线；首字下沉，完结章文末 ♦。字体自托管，国内也能正常加载。自带深色模式。
- **首页**：最新一篇做头条，其余按更新时间倒序，自动分页（每页篇数在网站设置里改）。
- **配对**：`/cp/` 列出全部 CP 和篇数；每个 CP 有自己的分页列表 `/cp/<CP>/`。
- **系列**：`/series/` 列出全部系列；同系列的作品在文末互相链接，有上一篇 / 下一篇。
- **多章作品**：章节页有上一章 / 下一章、全部章节目录，键盘 ← → 也能翻章。
- **阅读体验**：顶部阅读进度条、字数与阅读时长估算；作者注排成正文前后的小字区块，保留换行。
- **相关推荐**：每篇文末列出同 CP 的其他作品。

## 开始使用

1. 点这个仓库右上角的 **Use this template → Create a new repository**，建一个自己的仓库。
2. 改 `src/site.yml`：站名、作者、简介、页脚链接、每页篇数和功能开关（接上网页后台后也可以在后台改）。
3. 删掉 `src/content/works/example-*.yml`，放进自己的作品（写法见下面「写作品」，也可以用导入命令）。
4. 部署（二选一）：
   - **Cloudflare Pages**（推荐）：Cloudflare 后台 Workers & Pages → Create → Pages → 连接 GitHub 仓库；构建命令填 `npm run build`，输出目录填 `dist`。Node 版本会自动读取 `.node-version`。之后每次推送都会自动部署。
   - **GitHub Pages**：见下面「部署到 GitHub Pages」。
5. 想在网页上写作品、改设置，接上 Pages CMS（见下面「网页后台」）。

需要 Node.js 22.23.4 以上（写在 `.node-version`）。本地预览：

```
npm install
npm run dev      # 本地预览
npm run build    # 构建到 dist/
```

## 写作品

**一篇作品 = `src/content/works/` 下的一个 `.yml` 文件**，作品信息和所有章节都在里面。文件名就是网址（`野草.yml` → `/works/野草/`），建议用作品名或英文缩写。

推荐用下面的[网页后台](#网页后台pages-cms)写，不用自己管格式。直接编辑文件的话，格式是这样：

```yaml
title: 野草
cp: [示例配对]          # 可以写多个：[示例配对, 另一个配对]
updated: 2026-10-28     # 决定首页排序
series: 鲁迅散文诗       # 同名系列自动归在一起（可不写）
seriesOrder: 1          # 系列里的第几篇（可不写）
summary: 一句话简介       # 不写就自动取第一章开头
status: finished        # ongoing（连载中）/ finished（已完结），不写不显示
chapters:
  - title: 秋夜
    body: |
      第一章正文，每行前面空六格。

      空一行是分段。
  - title: 好的故事
    body: |
      第二章正文……
```

- 除了 `title` 和 `chapters`，其他都可以不写。
- 章节顺序就是列表顺序，网址按顺序生成（第二章 → `/works/野草/02/`）。
- 单章作品只写一章，章节名可以不写。
- 正文写在 `body: |` 下面，每行都要比 `body` 多缩进两格。

写错了构建时会报错并指出是哪篇作品、哪一章，比如没有章节、某一章没有正文。

### 导入 / 导出

网站的正本是 `src/content/works/*.yml`，另外有两个单向转换的命令（需要时手动运行）。

**导入（文件 → 网站）**：

```
npm run import -- 新作品.md            # 文件名就是网址：新作品.md → /works/新作品/
npm run import -- 草稿/*.txt           # 一次导入多篇
npm run import -- 新作品.docx --force  # 覆盖已有的同名作品
```

支持这些格式：

| 格式 | 作品名 | 怎么分章 | 其他 |
|---|---|---|---|
| `.md` | 开头 `---` 里的 `title` | `# 章节名` | 作品信息写在开头（见下） |
| `.txt` | 文件名 | 「第一章」「第二章：重逢」「番外」「Chapter 1」「# 章节名」这样单独一行 | 整篇没有空行时每行算一段；GBK 编码也能读 |
| `.docx`（Word） | 文件名；开头只有一个「标题 1」时用它 | 「标题 1」样式的段落（开头有「标题 1」当作品名时，用「标题 2」） | 保留加粗、斜体 |
| `.html`（AO3 下载） | 作品标题 | AO3 的章节 | 自动读出 CP（Relationship）、系列、更新日期、连载状态、简介，作者注变成作者注区块，去掉 AO3 的提示文字 |

AO3 的 CP 名通常很长（比如 `Kimura Keito/Sawamoto Natsuki`），导入后可以在后台改成简称。

md 的写法：开头 `---` 之间写作品信息（字段同上），下面写正文；多章作品每章前面写一行 `# 章节名`。

```markdown
---
title: 野草
cp: [示例配对]
updated: 2026-10-28
---

# 秋夜

第一章正文……

# 好的故事

第二章正文……
```

单章作品不用写 `#`，整段正文就是这一章。正文里的标题请用 `##`，`#` 留给分章。

**导出（网站 → md）**：`npm run export` 把每篇作品导出成一份 md，放到 `export/`，方便备份、搬家、用别的编辑器看。`export/` 不进 git，改它不会影响网站；想改完放回网站，就用上面的导入命令加 `--force`。

**打包下载全部作品**：仓库的 **Actions** 页面 → 左边选「导出作品」→ **Run workflow**，会把全部作品导出成 md、打包成一个 zip（`<仓库名>-works-<日期>.zip`），发布到 **Releases** 页面。默认发布成草稿，只有对仓库有写权限的人能看到；运行时选「公开」则所有能看到仓库的人都能下载。

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
4. **加一章**：在作品页面的「章节」下面点「Add an item」。拖动卡片左边的 ⠿ 可以调整章节顺序；单章作品只留一章就行。章节名可以不填，作者注的写法见上面「作者注」。
5. 保存后会自动提交到仓库，Cloudflare Pages 随后自动重新部署，一两分钟后网站上就能看到。
6. **网站设置**：左边「网站设置」里可以改站名、作者、页脚链接、每页篇数和全部功能开关。

正文是纯文本编辑框，写法和 Markdown 一样：空一行是分段，`**粗体**`。配置在仓库根目录的 `.pages.yml`。

## 网站设置

网站设置在 `src/site.yml`（也可以在网页后台的「网站设置」里改）：站名、页脚小字、作者、外部链接、每页篇数、阅读速度、功能开关。没写的项目用默认值，写错了构建时会指出是哪一项。

界面上的全部文字在 `src/site.config.ts` 的 `ui` 里，换语言或者改说法时改这里。颜色和字体是 `src/styles/global.css` 顶部的变量。

### 功能开关

`site.yml` 里的 `features`，`true` 打开、`false` 关闭（在网页后台里是一排勾选框）：

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
| `darkMode` | `auto` 跟随系统并显示切换按钮；`system` 只跟随系统；`off` 始终浅色 |

没有任何作品写 CP 或系列时，导航里的「配对」「系列」会自动隐藏。

## 字体

- 中文：思源屏显臻宋（思源宋体的屏幕显示优化版，基于 SIL OFL 1.1 的思源宋体），来自[中文网字计划](https://github.com/KonghaYao/chinese-free-web-font-storage)的 npm 包 `@chinese-fonts/sypxzs`，已按字频切片，浏览器只下载页面用到的部分。
- 西文：Libre Caslon Text / Display（OFL），来自 Fontsource。
- 字体文件随站点一起部署，不依赖外部 CDN，国内也能正常加载。

## 部署到 GitHub Pages

1. 把 `.github/workflows/deploy.yml.example` 改名为 `deploy.yml`（去掉 `.example`）。
2. 改 `astro.config.mjs`：
   - 仓库叫 `<用户名>.github.io`：`base` 保持 `'/'`；
   - 其他仓库名（网址是 `<用户名>.github.io/<仓库名>/`）：`base: '/<仓库名>/'`；
   - 两种都加上 `site: 'https://<用户名>.github.io'`。
3. 仓库 Settings → Pages → Source 选 **GitHub Actions**。

之后每次推送到 main 都会自动部署。用 Cloudflare Pages 的话不用管这个文件，它不会运行。

> 国内访问 github.io 和 pages.dev 都不太稳定。想让国内读者访问更顺，可以买一个自己的域名绑定到 Cloudflare Pages。

## 从模板同步更新

用「Use this template」建的仓库和模板是分开的。模板以后有改进，想同步过来：

```
git remote add template https://github.com/locoda/fanfic-site-template.git
git fetch template
git merge template/main --allow-unrelated-histories   # 第一次需要这个参数，以后直接 git merge template/main
```

有冲突时：`src/site.yml` 和 `src/content/works/` 保留你自己的版本，其他文件一般用模板的版本。合并进来的示例作品（`example-*.yml`）删掉即可。

## 授权

代码以 [MIT](LICENSE) 授权，随便用、随便改。示例作品属于公有领域（文字来自维基文库）。字体各有授权（都是 SIL OFL，可免费商用）。你自己的作品版权归你。
