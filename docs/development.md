# 二次开发指南

常见改动怎么做、改完要检查什么、PR 怎么提。先读 [architecture.md](architecture.md) 了解结构，部署和工作流相关的坑见 [deployment.md](deployment.md)。

## 开始之前

```
npm install
npm run dev      # http://localhost:4321
npm run build    # 生成到 dist/，模板 3 篇示例作品是 15 页
npm run check    # 自动检查，开 PR 时 GitHub 也会跑同一套
```

- 先确认你在哪个仓库：模板 `locoda/fanfic-site-template` 改代码；下游站点只改作品、`site.yml` 和站点自己的 README
- 用户多数不写代码，改动最终都要落到「在后台点一点就能用」

## 常见改动

### 加一个功能开关

这几处都要改，少一处就会出问题：

1. `src/site.yml`：在对应分组（`info` / `display` / `works`）加默认值和一行注释
2. `src/site.config.ts`：schema 里加 `opt(z.boolean(), 默认值)`，并把键名加进 `GROUPS` 对应的分组
3. `.pages.yml`：「网站设置」对应分组里加字段；说明写在 `description`（后台保存会删掉 site.yml 的注释）
4. `README.md`：第四步的文字说明和「进阶」里对应分组的表格
5. 页面里用 `site.features.xxx` 读

漏改哪一处，`npm run check` 会报出来（后台表单和 `GROUPS` 对不上、`site.yml` 里有不认识的项）。

默认值为 `true` 的开关，同步到下游时要把它写进下游的 `site.yml`（原因见 deployment.md 的 Pages CMS 一节）。

### 加一个中文字体

1. `npm install -D @chinese-fonts/<包名>`（选发布超过两周的版本）
2. `src/lib/fonts.mjs` 加一项：`label`（后台显示名）、`family`（**必须和字体包 CSS 里的 `font-family` 一致**）、`css`（包里 `result.css` 的路径）
3. `.pages.yml` 的 `font` 选项加上，name 要加引号
4. README 第四步、显示设置表格、「字体」一节（写明授权）加上

`site.config.ts` 的枚举从 `FONT_IDS` 生成，不用改。分别用新字体构建一次，确认 `dist/_astro/` 里只有这一种字体的 woff2。

### 改界面文字、颜色、版式

- 界面文字在 `site.config.ts` 的 `ui`
- 颜色和字体是 `global.css` 开头的 CSS 变量，深色模式在同一个文件里
- 声称「外观不变」的改动必须截图对比（见下面「检查」）

### 加一种导入格式

1. `scripts/lib/importers.mjs`：在 `SUPPORTED` 加扩展名，`importFile()` 里加分支，返回 `{ info, chapters: [{ title, body }] }`，最后走 `finish()` 做检查
2. `scripts/import-uploads.mjs` 的 `SUPPORTED` 也要加
3. `.pages.yml` 批量导入的 `extensions` 加上
4. README「一次导入很多篇」和「进阶 → 导入作品」的表格

### 改网址相关

网址规则不能变（见 architecture.md）。所有站内链接走 `url()`。改完用 `SITE_BASE=/<仓库名>/ npm run build` 检查子路径。

## 改完要检查什么

### 自动检查（每次都要过）

`npm run check`（`scripts/check.mjs`）。开 PR、往 PR 推新提交时，`.github/workflows/check.yml` 会在 GitHub 上跑同一套，结果显示在 PR 页面（绿勾 / 红叉，点 Details 看哪里没过）。检查这些：

1. 配置文件、工作流、作品文件都是合法的 YAML
2. 后台表单（`.pages.yml` 的「网站设置」）和 `site.config.ts` 的 `GROUPS` 设置项完全一致；`site.yml` 里没有不认识的项（可以缺项）
3. 每篇作品 yml → md → yml 往返后内容不变（空值、日期格式的差别不算）；正文里有一级标题也会在这里报出来
4. 用测试前缀 `SITE_BASE=/check-base/` 构建成功，生成的 HTML / CSS 里没有漏掉前缀的站内链接

`npm run check -- --no-build` 跳过第 4 项，几秒就跑完。第 4 项生成的 `dist/` 带测试前缀，预览前照常 `npm run build`。

自动检查管不到外观、Actions 和 Pages CMS 后台，下面这些按改动范围补做，PR 的 Test plan 里写清楚做了哪些、结果是什么。

### 按改动范围补做

1. **写下 `npm run build` 的页数**（模板 3 篇示例作品是 15 页），和改动前对比
2. **改了导入导出或 `work-md.mjs`**：自动检查只比较内容；要求文件逐字节不变时再做一次：
   ```
   cp -r src/content/works /tmp/orig && npm run export && npm run import -- export/*.md --force && diff -r /tmp/orig src/content/works
   ```
3. **改了页面或样式，声称外观不变**：用改动前的版本（比如 `git worktree add /tmp/base origin/main`，在里面构建）和改动后各构建一份，用 Playwright 截全页图逐像素比较。组合是电脑 1280px / 手机 390px × 浅色 / 深色，页面至少包括首页、章节页、配对、系列。HTML 不一样不代表外观变了（比如 `class=""` 和没有 class），以截图为准
4. **改了链接或部署**：自动检查已经查子路径；部署方式本身的改动要在 GitHub 上实际跑一次
5. **加了依赖**：`npm audit` 要是 0；选发布超过两周的版本
6. **改了工作流**：自动检查只查 YAML 合法；PR 里注明需要用户在 GitHub 上实际运行
7. **改了 `.pages.yml`**：对照 Pages CMS 文档确认字段写法；PR 里请用户在后台打开确认

截图对比可以用这样的脚本（Playwright 已装好时 `require('playwright')` 直接能用）：

```js
// node compare.cjs <改动前 dist> <改动后 dist>
const { chromium } = require('playwright');
// 1. 用 http.createServer 分别在两个端口伺服两个 dist（目录请求返回 index.html）
// 2. 对每个 视口(1280/390) × colorScheme(light/dark) × 页面：
//    page.goto → document.fonts.ready → page.screenshot({ fullPage: true })
// 3. Buffer.equals 比较两边截图，不同的打印出来
```

## Git 和 PR

- **每个 PR 都从最新的 main 新建分支**，只放这个 PR 自己的提交。用户一般 squash 合并，合并后分支自动删除；复用旧分支会把已合并的提交全带进新 PR
- **推送前先确认上一个 PR 是否已合并**。已合并就开新 PR，不要往已合并的分支追加提交，也不要改已合并 PR 的标题和描述
- 用户允许对 agent 自己的分支用 `git push --force-with-lease`（远端分支已被自动删除时 lease 会失败，直接普通推送）
- PR 标题用 conventional commit（`feat:` `fix:` `docs:` `chore:` …）；描述用中文，结构是 Summary / Changes（按 feat、fix、docs、chore 分组）/ Test plan
- 提交信息写清楚做了什么、为什么
- 模板合并后，下游同步见 deployment.md（同步 PR 必须用 merge commit 合并）

## 写给用户看的文字

- 用户和读者都用中文。口语、直接，不要「这里只记……」「以下是……」这类腔调，也不要给不写代码的人解释术语叫什么
- README 按「不写代码的人从零开始」组织：准备工作 → 一步步建站 → 日常写作 → 常见问题；命令行内容放在最后的「进阶」
- 不确定的事要明说（比如没在真实环境验证过），不要写成确定的结论
- 下游站点的 README 只写站点自己的事，使用说明链接到模板 README

## 用户明确不要的

- 网站上不放作品下载按钮；打包下载只通过手动运行的「导出作品」工作流，默认发成草稿
- 不要自动导出 md 并提交进仓库（试过，被撤掉了）；`export/` 不进 git
- 不要用 Google Fonts 或任何国内访问不了的外部资源
- 不要在作品列表或后台里加重复、啰嗦的提示文字
- 不要做 AO3 HTML 导入（做过，被删掉了）
