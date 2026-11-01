# 技术要点

这个项目是怎么搭起来的、数据怎么流、哪些规则不能动。改代码之前先读这一份。部署相关见 [deployment.md](deployment.md)，怎么动手改见 [development.md](development.md)。

## 技术栈

- **Astro 7**，纯静态输出。作品用 content layer：一个 glob loader 读作品信息，一个自定义 loader 拆章节
- **Node 22.23.4 以上**（`.node-version`）
- **Markdown 处理器**：用 `@astrojs/markdown-remark` 的 `unified()`（`astro.config.mjs`）。Astro 7 默认是 Sätteri，但本项目的 rehype 插件依赖 unified，不能换
- **`compressHTML: true`**：Astro 7 默认的 `'jsx'` 模式会删掉行内元素之间的空格，「日期 · 字数」这类分隔会挤在一起
- **zod 4**（Astro 7 自带）：`.default()` 不会再解析嵌套对象里的默认值，要补默认值得用 `z.preprocess`（见下面「网站设置」）
- **字体自托管**：中文来自中文网字计划的 npm 包 `@chinese-fonts/*`（按字频切片），西文 Libre Caslon（Fontsource）。**不能用 Google Fonts 或任何外部 CDN**，国内读者加载不了
- **网页后台**：Pages CMS，配置在 `.pages.yml`
- **其他依赖**：`yaml`（读写作品）、`github-slugger`（作品网址）、`mammoth` + `node-html-parser`（Word 导入）、`jszip`（zip 导入）

## 目录

```
src/content/works/<作品>.yml     一篇作品一个文件：作品信息 + chapters 列表（每章 title + body）
src/content.config.ts             works 集合（glob loader + zod 校验）+ chapters 集合（自定义 loader 拆章、渲染 Markdown）
src/lib/works.ts                  loadWorks / loadCps / loadSeries；网址、字数、简介、排序都在这里算
src/lib/rehype-fanfic.mjs         排版插件：首段 class="lead"（首字下沉）、末段 class="last"（♦）、「作者注：」单段转作者注
src/lib/fonts.mjs                 可选中文字体：id → 显示名、font-family、CSS 路径
src/site.yml                      网站设置（后台「网站设置」编辑的就是它）
src/site.config.ts                读取 site.yml、补默认值、摊平分组；界面文字 ui 也在这里
src/layouts/Base.astro            页面骨架：刊头、导航、页脚、深色模式、字体变量
src/pages/                        首页分页 [...page]、配对 cp/、系列 series/、作品跳转 works/[work]、章节页 works/[work]/[chapter]、404
src/components/                   WorkItem（列表里的一篇）、Pagination
src/styles/global.css             全部样式；颜色和字体是开头的 CSS 变量
src/styles/no-font.css            字体选「系统字体」时 site-font 别名指向的空文件
scripts/import.mjs                npm run import：md / txt / docx → yml
scripts/lib/importers.mjs         各种格式 → { info, chapters } 的解析
scripts/lib/work-md.mjs           yml ⇄ md 的转换规则，导入导出共用
scripts/export-md.mjs             npm run export：yml → export/<作品>.md（export/ 不进 git）
scripts/import-uploads.mjs        后台「批量导入」：imports/ 里的文件和 zip → yml
scripts/rename-works.mjs          时间戳文件名 → 作品名.yml
scripts/deploy-target.mjs         读 site.yml 的 info.githubPages，给工作流判断要不要部署
scripts/release-name.mjs          「导出作品」的 zip 命名
scripts/check.mjs                 npm run check：PR 自动检查的内容
imports/                          后台「批量导入」的上传目录（平时只有 .gitkeep）
.github/workflows/                check / deploy / import / rename-works / export-release，见 deployment.md
.pages.yml                        Pages CMS 配置
```

## 数据怎么流

1. **作品文件** `src/content/works/*.yml`：`title` 和 `chapters` 必填，其他（`author` `cp` `updated` `summary` `series` `seriesOrder` `status`）可选。
2. **works 集合**（`content.config.ts`）：glob loader 读每个 yml，zod 校验。后台保存时没填的字段可能是 `""` 或 `null`，`blank()` 把它们当成没写。
3. **chapters 集合**：自定义 loader 再读一遍 yml，把每章拆成一条记录，id 是 `<文件名>/01`，用 `renderMarkdown` 渲染（rehype-fanfic 在这一步生效）。
4. **`works.ts` 的 `loadWorks()`**：把两个集合拼起来，算出网址、字数、阅读时长、简介、作者名，按更新日期倒序排（没有日期的排最后）。页面只通过它拿数据。
5. **页面**：首页、配对、系列都是 `loadWorks()` 的不同切法；章节页按 `chapters` 生成。

## 网址规则（不能变，已有读者的链接靠它）

- 作品：`/works/<slug>/`，slug 是 **yml 文件名**经 `github-slugger` 处理（小写、去标点、保留中文）。`/works/<slug>/` 本身是跳转页，跳到第一章
- 后台新建的作品文件名是时间戳（`20261031-203512.yml`），这类文件的 slug 改用**作品名**生成；重名时按文件名排序依次加 `-2`、`-3`。逻辑在 `works.ts` 的 `assignSlugs()`，普通文件名优先占用 slug。为什么是时间戳见 deployment.md 的 Pages CMS 一节
- 章节：`/works/<slug>/01/`、`/02/`……，按 `chapters` 列表顺序编号，单章也是 `/01/`
- 配对 `/cp/<slug>/`，系列 `/series/<slug>/`（`works.ts` 的 `slugify()`）
- 首页分页 `/2/`、`/3/`……，每页篇数是 `display.perPage`
- **所有站内链接必须经过 `works.ts` 的 `url()`**（带上 `BASE_URL`），否则 GitHub Pages 的项目站（子路径 `/<仓库名>/`）会断链

## 作品内容约定

- `body` 是标准 Markdown
- 作者注写成 `<aside class="author-note" aria-label="作者注">…</aside>`，章末用 `aria-label="章末注"`，里面每一行单独一段。正文里单独一段以「作者注：」开头的，rehype-fanfic 也会转成作者注
- 正文里不要有 `# ` 开头的一级标题：导出成 md 时 `#` 用来分章
- 没写 `summary` 时，列表简介取第一章开头，跳过作者注和「01」这类短分节标记
- 单章作品的章节名等于作品名时，页面上不重复显示

## 网站设置

- `src/site.yml` 分三组：`info`（网站信息）、`display`（显示设置）、`works`（作品设置），和后台「网站设置」的三组一一对应
- `site.config.ts` 用 `GROUPS` 把分组摊平成内部结构：`site.title`、`site.perPage`、`site.features.xxx`。**页面代码只用内部结构**。旧版不分组的写法（`title`、`features` 写在最外层）也能读，下游站点可能还是旧格式
- 每一项都用 `opt(schema, 默认值)` 包着：`z.preprocess` 先把 `""` / `null` / 缺失换成默认值再校验。不要用 `.default()`，zod 4 下嵌套对象里的默认值会变成 undefined
- 报错信息按分组写法指出位置（如 `display.perPage`）
- 后台保存 `site.yml` 时会删掉所有注释和空列表，所以代码必须能处理任何一项缺失；设置说明只能写在 README 和 `.pages.yml` 的 `description` 里

## 字体

- 在 `display.font` 里选，可选项在 `src/lib/fonts.mjs`
- `astro.config.mjs` 构建时读 `site.yml`，把 Vite 别名 `site-font` 指向所选字体的 CSS；`Base.astro` 里 `import 'site-font'`。所以**每次构建只打包一种字体**。选 `system` 时指向空文件 `no-font.css`
- `Base.astro` 输出 `--cn-font` 变量，`global.css` 的 `--serif` / `--display` 用它

## 导入导出

- `work-md.mjs` 定义 yml ⇄ md：md 开头 `---` 写作品信息，`# 章节名` 分章，单章作品可以不写章节标题。导入导出必须能无损往返
- `importers.mjs`：
  - `.md`：没写 `title` 用文件名
  - `.txt`：「第一章」「Chapter 1」「# 章节名」这类单独一行分章；整篇没空行时每行一段；UTF-8 读出乱码时换 GB18030
  - `.docx`：mammoth 转 HTML，「标题 1」分章（开头只有一个「标题 1」时它是作品名，用「标题 2」分章）
- 后台批量导入的流程见 deployment.md

## 页面上的开关和交互

- 功能开关都在 `site.features`，页面里用 `const f = site.features` 读
- 章节页底部的内联脚本负责进度条、选章菜单、键盘翻章、禁止复制（`allowCopy` 关掉时给 `<article>` 加 `no-copy`，CSS 禁选中，脚本拦 copy / cut / contextmenu / dragstart / selectstart）
- 深色模式：`darkMode` 为 `auto` 时显示切换按钮，选择存在 localStorage；`system` 只跟随系统；`off` 始终浅色
- 页面至少一屏高（`body` 纵向 flex + `min-height: 100dvh`，`main` 撑满），内容少时页脚贴底
