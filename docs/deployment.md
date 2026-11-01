# 部署和工作流的难点

网站怎么上线、各个 GitHub Actions 工作流做什么、Pages CMS 的坑，以及下游站点怎么同步模板。踩过的坑都记在这里。

> Actions 和 Pages CMS 在本地都跑不了。改了这些东西，PR 里要写明「需要在 GitHub 上实际运行验证」。

## GitHub Pages（默认）

工作流：`.github/workflows/deploy.yml`，推送到 main 或手动运行时触发。

- **子路径**：项目站的网址是 `https://<用户>.github.io/<仓库名>/`。工作流用 `actions/configure-pages` 的输出 `origin` / `base_path`，作为 `SITE_URL` / `SITE_BASE` 传给构建，`astro.config.mjs` 读这两个环境变量。用户绑了自定义域名时 `base_path` 是空的，也照样对。所以**站内链接一律走 `url()`**，否则子路径下会断链
- **第一次会失败**：用模板建仓库时工作流会自动跑一次，这时用户还没在 Settings → Pages 把 Source 选成 GitHub Actions，所以失败。README 里让用户打开后手动重跑一次
- **check 任务**：工作流先跑一个只检出 `src/site.yml` 和 `scripts/deploy-target.mjs` 的小任务（不装依赖，所以脚本用正则读 `githubPages:` 这一行，没用 yaml 库），`info.githubPages: false` 时后面的构建和部署都跳过
- 本地模拟子路径：`SITE_BASE=/<仓库名>/ npm run build`，然后检查 `dist/` 里没有不带前缀的站内链接和字体路径

## Cloudflare Pages（可选）

- 在 Cloudflare 里连上仓库，构建命令 `npm run build`，输出目录 `dist`。之后每次推送 Cloudflare 自己构建部署，**仓库这边不需要任何开关**
- 用 Cloudflare 的站要把 `info.githubPages` 设成 `false`，否则 GitHub Pages 工作流也会跑，而且因为没打开 Pages 会失败
- 想暂停 Cloudflare 只能在 Cloudflare 后台操作。以前试过在构建里判断设置、故意让构建失败，太绕，删掉了
- 以前用仓库变量 `DEPLOY=cloudflare` 控制，现在**不再读仓库变量**，只看 `site.yml`

## 工作流一览

| 文件 | 触发 | 做什么 |
|---|---|---|
| `deploy.yml` | 推送到 main、手动 | check → 构建 → 部署到 GitHub Pages |
| `import.yml` | 后台「批量导入」页面的「开始导入」按钮（`workflow_dispatch`） | 跑 `import-uploads.mjs`，提交导入结果，再触发 `deploy.yml` |
| `rename-works.yml` | 每天北京时间 04:17、手动 | 把后台新建的时间戳文件改名成「作品名.yml」 |
| `export-release.yml` | 手动 | 全部作品导出成 md，打包成 `<仓库名>-works-<日期>.zip` 发到 Releases，默认草稿 |

### 用 GITHUB_TOKEN 推送不会触发别的工作流

GitHub 的规定：工作流用默认的 `GITHUB_TOKEN` 推送的提交，不会触发其他工作流（防止无限循环）。所以：

- `import.yml` 提交完要用 `gh workflow run deploy.yml --ref main` 手动触发部署（`githubPages: false` 时跳过，Cloudflare 自己能检测到推送）。这一步需要 `actions: write` 权限
- `rename-works.yml` 改名不改网址，所以不需要重新部署

### 批量导入（import.yml + import-uploads.mjs）

- 后台的「批量导入」是 Pages CMS 的 media 目录 `imports/`，`rename: false` 保留原文件名，因为文件名就是作品名
- **Pages CMS 一次只能上传一个文件**，Upload 按钮和拖放都一样。源码里 DropZone 看起来支持多个，用户实测不行。所以支持 `.zip`：用 jszip 解开，文件名先按 UTF-8 解码，失败再按 GB18030（Windows 自带压缩打出来的是 GBK）。`__MACOSX/` 和隐藏文件跳过
- **上传本身不触发导入**。media 上配了 Pages CMS 的 action「开始导入」，弹框里可以填配对、系列、状态、更新日期、作者。Pages CMS 用 `workflow_dispatch` 触发工作流，把一个 JSON 作为 `inputs.payload` 传过去（弹框填的值在 `.inputs` 里），脚本从环境变量 `PAGES_CMS_PAYLOAD` 读
  - 工作流必须声明一个必填的字符串输入 `payload`。从 GitHub 手动运行时填 `{}`
  - action 里 select 的选项写法是 `label` / `value`，和字段的 `options.values` 写法不一样；「不填」用 `none`，不要用空字符串
- 规则：
  - 作品名和 yml 文件名都用上传的文件名
  - 弹框填的信息只补文件里没写的项目
  - 更新日期：文件里写了或弹框填了才有，不会自动填今天
  - 填了系列的，按文件名顺序接在该系列现有最大的 `seriesOrder` 后面
  - 已有同名作品不覆盖
  - 成功的源文件删掉；失败的留下（zip 里失败的单独放回 `imports/`），原因写进 `imports/_导入失败说明.txt`
- 工作流提交前 `git pull --rebase`，防止导入期间有人在后台保存导致推送失败

### 时间戳文件名和自动改名

- Pages CMS 新建文件时用 `strict` 模式生成文件名，**中文会被全部删掉**（「迷路指南」会变成空字符串）。所以 `.pages.yml` 里作品文件名用模板 `{year}{month}{day}-{hour}{minute}{second}.yml`，`field: false` 不让用户填
- 网址按作品名生成（见 architecture.md 的网址规则），读者看不到时间戳
- `rename-works.mjs` 只在改名后 slug 不变时才改名，重名、只有标点、含特殊字符导致 slug 变化的都跳过
- **不要改成保存后立刻改名**：用户新建完作品往往还开着编辑页，这时文件被改名，后台再保存会出错，或者在旧路径生成一篇重复作品。所以放到凌晨跑

## Pages CMS 的坑

改 `.pages.yml` 之前对照 Pages CMS 文档确认字段类型和选项名。它的校验很严格，写错一处整个后台都打不开。

- **一个文件对应一个编辑页**，同一集合只能有一套字段。所以作品信息和章节放在同一个 yml 里，章节是 `list: true` 的 object 字段（卡片，可以添加、拖动排序）
- **列表字段的 `description` 会在每一项下面重复显示**，不要给 `chapters` 这类列表写 description
- **保存时没填的字段可能写成 `""` 或 `null`**，schema 里用 `blank()` / `opt()` 当成没填
- **保存 `site.yml` 会删掉所有注释和空列表**
- **`required: true` 在保存前校验**（字符串是 `min(1)`），只填空格能通过，所以构建时的 zod 校验是第二道防线
- **date 字段新建时默认是当天**；想默认留空要写 `default: ""`。作品的 `updated` 现在不写 default，就是默认当天
- **boolean 字段在文件里缺失时，表单可能显示成未勾选**，用户一保存就会写成 `false`。所以新增默认为 `true` 的开关时，下游同步要把这一项写进下游的 `site.yml`
- YAML 里的 `off` `on` `yes` `no` 在旧解析器里会变成布尔值，select 选项的 `name` 要加引号
- 媒体上传：`rename: false` 保留原文件名

## 下游站点同步模板

下游 = 用模板建的站（比如 `locoda/1mether-fanfic`）。**代码改动一律先改模板**，合并后再同步到下游，不要在下游直接改代码。

```
git remote add template https://github.com/locoda/fanfic-site-template.git   # 第一次
git config merge.ours.driver true                                             # 第一次，配合 .gitattributes
git fetch template
git merge template/main        # 第一次同步要加 --allow-unrelated-histories
```

- 下游的 `.gitattributes` 里有 `README.md merge=ours` 和 `src/site.yml merge=ours`，同步时这两个文件自动保留下游版本。所以模板改了 `site.yml` 的结构（新增分组或开关）时，**同步 PR 里要手动把下游的 `site.yml` 迁移过去**，保留下游原来的值，新开关写上下游想要的值
- 其他冲突：作品保留下游的，代码用模板的。合并进来的 `example-*.yml` 和 `LICENSE` 在下游删掉（MIT 是模板代码的授权，放在下游容易被理解成作品也是 MIT）
- **同步 PR 必须用「Create a merge commit」合并，不能 squash**，否则和模板的关联会断掉，下次同步要从头解决所有冲突。PR 描述开头要醒目地写出来
- 用 Cloudflare 部署的下游，确认 `site.yml` 里有 `githubPages: false`
- 同步后对比：用同步前的 main 和同步后各构建一份，页面列表应该一致；声称外观不变的话要截图对比（方法见 development.md）

## 还没在真实环境验证过的

- 「导出作品」工作流
- 改名工作流（`rename-works.yml`）
- 打开一篇原本没有日期的旧作品时，后台会不会自动填上当天
- Pages CMS 官方托管版是否收费，文档里没写

已经实际跑通的：GitHub Pages 部署（模板演示站 https://locoda.github.io/fanfic-site-template/）、Cloudflare Pages 部署（1mether-fanfic）、批量导入（1mether-fanfic 上上传 zip、点「开始导入」、自动提交）。
