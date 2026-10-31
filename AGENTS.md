# AGENTS.md

给 AI 编程助手看的工作手册。动手之前先读完这一份；给用户看的使用说明在 README.md。

## 项目是什么

同人作者的个人作品存档站。Astro 生成纯静态网站，杂志式排版，按 CP（界面上叫「配对」）和系列整理作品，多章作品一章一页。用户多数**不写代码**，靠 Pages CMS 网页后台写作品、改设置。

有两类仓库，改动前先确认自己在哪一类：

| 仓库 | 是什么 | 在这里改什么 |
|---|---|---|
| `locoda/fanfic-site-template` | 模板，上游 | 代码、样式、脚本、工作流、README、本文件 |
| 用模板建的站（如 `locoda/1mether-fanfic`） | 下游 | 只改作品 `src/content/works/`、设置 `src/site.yml`、站点自己的 README |

**代码改动一律先改模板**，合并后再同步到下游站点（见「上游和下游」）。不要在下游站点直接改代码，否则同步时会冲突，模板也得不到改进。

## 技术栈

- Astro 7（content layer + 自定义 loader），Node 22.23.4 以上（`.node-version`）
- Markdown 用 `@astrojs/markdown-remark` 的 `unified()` 处理器（Astro 7 默认是 Sätteri，但本项目的 rehype 插件依赖 unified）
- `compressHTML: true`：Astro 7 默认的 `'jsx'` 会删掉行内元素之间的空格，日期 · 字数这类分隔处会变挤
- 字体自托管：中文字体来自中文网字计划的 npm 包（`@chinese-fonts/*`，按字频切片），默认思源屏显臻宋；西文 Libre Caslon（Fontsource）。不要用 Google Fonts 或外部 CDN，国内读者加载不了
- 部署：默认 GitHub Pages（`.github/workflows/deploy.yml`）；Cloudflare Pages 是可选项，网站设置 `info.githubPages: false` 时 GitHub Pages 工作流只跑检查、不部署（判断在 `scripts/deploy-target.mjs`，只检出脚本和 site.yml、不装依赖，所以用正则不用 yaml 库）。Cloudflare 不需要开关：连上仓库后每次推送它自己构建部署，暂停要在 Cloudflare 后台操作。不读仓库变量
- 网页后台：Pages CMS（`.pages.yml`）

## 目录和数据流

```
src/content/works/<作品>.yml     一篇作品一个文件：作品信息 + chapters 列表（每章 title + body）
src/content.config.ts             works 集合（glob loader 读 yml，zod 校验）+ chapters 集合（自定义 loader 拆章并渲染 Markdown）
src/lib/rehype-fanfic.mjs         排版插件：首段加 class="lead"（首字下沉）、末段加 class="last"（♦）、「作者注：」单段转作者注
src/lib/works.ts                  loadWorks / loadCps / loadSeries，网址、字数、简介都在这里算
src/site.yml                      网站设置和功能开关（Pages CMS 的「网站设置」编辑的就是它）
src/site.config.ts                读取 site.yml 并补默认值；界面文字 ui 也在这里
src/pages/                        首页分页 [...page]、配对 cp/、系列 series/、章节页 works/[work]/[chapter]
src/styles/global.css             全部样式，颜色和字体是开头的 CSS 变量
src/lib/fonts.mjs                 可选的中文字体列表（id → 显示名、font-family、CSS 路径）
scripts/import.mjs                npm run import：md / txt / docx → yml（解析在 scripts/lib/importers.mjs）
scripts/export-md.mjs             npm run export：yml → export/<作品>.md（export/ 不进 git）
scripts/lib/work-md.mjs           yml ⇄ md 的转换规则，导入导出共用
scripts/import-uploads.mjs        后台「批量导入」：imports/ 里的文件和 zip → yml，文件名当作品名
scripts/rename-works.mjs          时间戳文件名 → 作品名.yml（网址不变才改）
scripts/deploy-target.mjs         读 site.yml 的 info.githubPages，给工作流判断要不要部署到 GitHub Pages
scripts/release-name.mjs          「导出作品」工作流的 zip 命名：<仓库名>-works-<日期>.zip
.github/workflows/deploy.yml      部署到 GitHub Pages
.github/workflows/import.yml      后台「开始导入」按钮触发，运行 import-uploads.mjs，提交后触发部署
.github/workflows/rename-works.yml  每天凌晨把后台新建的时间戳文件改名成作品名
.github/workflows/export-release.yml  手动运行，把全部作品打包成 zip 发到 Releases（默认草稿）
.pages.yml                        Pages CMS 配置
```

### 网址规则（改动时不能变）

- 作品：`/works/<slug>/`，`slug` 是 yml 文件名经 `github-slugger` 处理（小写、去标点、保留中文）。`/works/<slug>/` 本身是跳转页，跳到第一章
- 网页后台新建的作品文件名是时间戳（`20261031-203512.yml`，Pages CMS 的 slugify 会删光中文，只能这样），这类文件的 slug 改用作品名生成；重名时按文件名排序依次加 `-2`、`-3`。逻辑在 `works.ts` 的 `assignSlugs()`，普通文件名优先占用 slug。`rename-works.yml` 每天凌晨跑 `scripts/rename-works.mjs` 把时间戳文件改名成作品名，只在改名后 slug 不变时才改（不在保存后立刻改：编辑中途文件被改名，后台再保存会出问题）
- 章节：`/works/<slug>/01/`、`/02/`……，按 `chapters` 列表顺序编号，单章作品也是 `/01/`
- 配对：`/cp/<CP 名 slug>/`，系列：`/series/<系列名 slug>/`
- 首页分页 `/2/`、`/3/`……，每页篇数是 `site.yml` 的 `display.perPage`
- 所有站内链接必须经过 `src/lib/works.ts` 的 `url()`（带上 `BASE_URL`），否则 GitHub Pages 项目站（子路径 `/<仓库名>/`）会断链

### 作品内容约定

- `body` 是标准 Markdown。作者注写成 `<aside class="author-note" aria-label="作者注">…</aside>`，章末用 `aria-label="章末注"`，里面每一行单独一段
- 正文里不要出现以 `# ` 开头的一级标题：导出成 md 时 `#` 用来分章
- 没写 `summary` 时，列表里的简介取第一章开头，会跳过作者注和「01」这种短分节标记
- 单章作品的章节名等于作品名时，页面上不重复显示

## 网站设置

- `src/site.yml` 是用户可以在后台改的设置，分三组：`info`（网站信息）、`display`（显示设置）、`works`（作品设置），和后台「网站设置」的分组一一对应
- `src/site.config.ts` 读取时用 `GROUPS` 把分组摊平成内部结构（`site.title`、`site.perPage`、`site.features.xxx`），页面代码只用这个内部结构。旧版不分组的写法（`title`、`features` 写在最外层）也能读，下游站点可能还是旧格式
- 报错信息按分组写法指出位置（如 `display.perPage`）
- Astro 7 用的是 **zod 4**：`.default()` 不会再解析嵌套对象里的默认值。补默认值要用 `z.preprocess(v => v ?? fallback, schema)`（见 `opt()`），否则 `features` 缺省时所有开关都会变成 undefined
- Pages CMS 保存 `site.yml` 时会**删掉所有注释**，空列表也会被去掉。所以设置说明只能写在 README 和 `.pages.yml` 的 `description` 里，代码必须能处理缺失的项
- 新增功能开关时，这几处都要改：`site.yml` 对应分组里的默认值、`site.config.ts` 的 schema 和 `GROUPS`、`.pages.yml` 网站设置里对应分组的字段、README 里对应分组的表格。改完检查 `.pages.yml` 每组的字段和 `site.yml` 每组的键完全一致

## 中文字体

- 字体在 `display.font` 里选，id 列表在 `src/lib/fonts.mjs`。`astro.config.mjs` 构建时读 `site.yml`，把 Vite 别名 `site-font` 指向所选字体的 CSS，`Base.astro` 里 `import 'site-font'`，所以每次构建只打包一种字体；`system` 指向空文件 `src/styles/no-font.css`
- `Base.astro` 输出 `--cn-font` 变量，`global.css` 的 `--serif` / `--display` 用它
- 加字体：在 `fonts.mjs` 加一项（family 要和字体包 CSS 里的 `font-family` 一致），装对应的 `@chinese-fonts/*` 包，再在 `.pages.yml` 的 `font` 选项和 README 字体表里加上。`site.config.ts` 的枚举从 `FONT_IDS` 生成，不用改

## 批量导入

- 后台的「批量导入」是 Pages CMS 的 media 目录 `imports/`（`rename: false` 保留原文件名）。Pages CMS 一次只能传一个文件，所以支持 `.zip`（jszip 解开，文件名先按 UTF-8 解码、失败再按 GB18030，兼容 Windows 自带压缩）
- 上传本身不触发导入。media 上配了 Pages CMS 的 action「开始导入」，点击时弹框填配对、系列、状态、更新日期、作者，以 `workflow_dispatch` 的 `inputs.payload`（JSON，填的值在 `.inputs` 里）触发 `import.yml`，脚本从环境变量 `PAGES_CMS_PAYLOAD` 读。这些值只补文件里没写的项目；填了系列的按文件名顺序接在该系列现有最大 `seriesOrder` 后面
- Pages CMS action 的 select 选项用 `label` / `value`（和字段的 `options.values` 写法不同），「不填」用 `none` 而不是空字符串
- 作品名和 yml 文件名都是上传的文件名；已有同名作品不覆盖；成功的源文件删掉，失败的留下，原因写进 `imports/_导入失败说明.txt`
- 工作流用 GITHUB_TOKEN 推送不会触发别的工作流，所以最后用 `gh workflow run deploy.yml` 手动触发部署（关掉 `githubPages` 时跳过）

## Pages CMS 的限制（踩过的坑）

- 一个文件对应一个编辑页面；同一集合只能有一套字段。所以作品信息和章节放在同一个 yml 里，章节是 `list: true` 的 object 字段（卡片，可添加、拖动排序）
- 列表字段的 `description` 会在**每一项下面重复显示**，不要给 `chapters` 这类列表写 description
- 后台保存时，没填的字段可能写成 `""` 或 `null`；schema 里用 `blank()` / `opt()` 把它们当成没填
- YAML 里的 `off`、`on`、`yes`、`no` 在旧解析器里会变成布尔值，select 选项的 `name` 要加引号
- 改 `.pages.yml` 之前，对照 Pages CMS 文档确认字段类型和选项名；它的校验很严格，写错整个后台会打不开

## 每次改动后的检查

按改动范围选做，PR 的 Test plan 里写清楚做了哪些：

1. `npm run build` 必须通过，记下页数（模板 3 篇示例作品是 15 页）
2. 改了导入导出或 `work-md.mjs`：对所有作品做往返测试（yml → md → yml），结果必须和原文件完全一致
3. 改了页面或样式，但声称「外观不变」：先用改动前的版本构建一份，两边用 Playwright 截全页图逐像素对比（电脑 1280px / 手机 390px × 浅色 / 深色）。HTML 不一致不代表外观变了（比如 `class=""` 和 `class`），以截图为准
4. 改了链接或部署相关：用 `SITE_BASE=/<仓库名>/ npm run build` 模拟 GitHub Pages 子路径，确认没有不带前缀的站内链接和字体路径
5. 加了依赖：`npm audit` 要是 0；选发布超过两周的版本，不要选刚发布几天的
6. 工作流文件：至少确认是合法的 YAML；Actions 在本地跑不了，PR 里注明需要用户实际运行验证

## Git 和 PR 流程

- 每个 PR 都从**最新的 main** 新建分支，只放这个 PR 自己的提交。用户的 PR 一般用 squash 合并，合并后分支会自动删除；继续复用旧分支会把已合并的旧提交全带进新 PR
- 推送前先确认上一个 PR 是否已经合并。已合并就开新 PR，不要往已合并的分支上追加提交，也不要去改已合并 PR 的标题和描述
- 用户允许对 agent 自己的分支用 `git push --force-with-lease`
- PR 标题用 conventional commit 格式（`feat:` `fix:` `docs:` `chore:` …）；描述用中文，结构是 Summary / Changes（按 feat、fix、docs、chore 分组）/ Test plan
- 提交信息写清楚做了什么和为什么

## 上游和下游

下游站点同步模板的方法：

```
git remote add template https://github.com/locoda/fanfic-site-template.git   # 第一次
git config merge.ours.driver true                                             # 第一次，配合 .gitattributes
git fetch template
git merge template/main        # 第一次同步要加 --allow-unrelated-histories
```

- 下游的 `.gitattributes` 里有 `README.md merge=ours` 和 `src/site.yml merge=ours`，同步时这两个文件自动保留下游版本。所以模板改了 `site.yml` 的结构（比如新增分组或开关）时，同步 PR 里要手动把下游的 `site.yml` 迁移过去，保留下游原来的值
- 其他冲突：作品保留下游的，代码用模板的；合并进来的 `example-*.yml` 和 `LICENSE` 在下游删掉（MIT 是模板代码的授权，放在下游容易被理解成作品也是 MIT）
- **同步模板的 PR 必须用「Create a merge commit」合并，不能 squash**，否则和模板的关联会断掉，下次同步要从头解决所有冲突。在 PR 描述开头醒目地写出来
- 用 Cloudflare 部署的下游站点，同步时在下游 `site.yml` 的 `info` 里写上 `githubPages: false`（`site.yml` 同步时保留下游版本，不会自动带进来），否则合并后 GitHub Pages 工作流会跑起来并失败

## 写给用户看的文字

- 用户和读者都用中文。写法要口语、直接，不要「这里只记……」「以下是……」这类腔调，也不要给不写代码的人解释术语叫什么
- README 按「不写代码的人从零开始」组织：准备工作 → 一步步建站 → 日常写作 → 常见问题；命令行内容放在最后的「进阶」
- 不确定的事要明说（比如没在真实环境验证过的步骤），不要写成确定的结论
- 下游站点的 README 只写站点自己的事，使用说明链接到模板 README，不要复制一份

## 用户明确不要的

- 网站上不提供作品下载按钮；打包下载只通过手动运行的「导出作品」工作流，默认发成草稿
- 不要自动导出 md 并提交进仓库（试过，被撤掉了）；`export/` 不进 git
- 不要用 Google Fonts 或任何国内访问不了的外部资源
- 不要在作品列表或后台里加重复、啰嗦的提示文字

## 已知但还没验证的

- 批量导入（含 Pages CMS media 上的「开始导入」按钮和弹框传值）、改名工作流、时间戳文件名，都还没在真实的 GitHub / Pages CMS 上跑过
- GitHub Pages 部署和「导出作品」工作流需要在 GitHub 上实际运行才能确认
- Pages CMS 官方托管版是否收费，文档里没写
