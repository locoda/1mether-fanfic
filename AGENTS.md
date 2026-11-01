# AGENTS.md

给 AI 编程助手看的入口。动手之前先读完这一份，再按要改的东西读对应文档。给用户看的使用说明在 README.md。

## 项目是什么

同人作者的个人作品存档站。Astro 生成纯静态网站，杂志式排版，按 CP（界面上叫「配对」）和系列整理作品，多章作品一章一页。用户多数**不写代码**，靠 Pages CMS 网页后台写作品、改设置，网站放在 GitHub Pages（或 Cloudflare Pages）上。

## 先确认你在哪个仓库

| 仓库 | 是什么 | 在这里改什么 |
|---|---|---|
| `locoda/fanfic-site-template` | 模板，上游 | 代码、样式、脚本、工作流、文档 |
| 用模板建的站（如 `locoda/1mether-fanfic`） | 下游 | 只改作品 `src/content/works/`、设置 `src/site.yml`、站点自己的 README |

**代码改动一律先改模板**，合并后再同步到下游。在下游直接改代码，同步时会冲突，模板也得不到改进。

## 文档

| 文档 | 什么时候读 |
|---|---|
| [docs/architecture.md](docs/architecture.md) | 技术要点：技术栈、目录、数据流、**网址规则**、作品格式、网站设置、字体、导入导出 |
| [docs/deployment.md](docs/deployment.md) | 部署和工作流：GitHub Pages / Cloudflare、四个 Actions 工作流、批量导入、**Pages CMS 的坑**、下游同步 |
| [docs/development.md](docs/development.md) | 二次开发：加开关、加字体、加导入格式的步骤，**改完要做的检查**，Git 和 PR 流程，写给用户的文字规范 |

## 不能破的规矩

- 网址规则不能变；所有站内链接走 `src/lib/works.ts` 的 `url()`（architecture.md）
- 不用 Google Fonts 或任何国内访问不了的外部资源
- 网站上不放作品下载按钮；不自动导出 md 提交进仓库
- 代码必须能处理 `site.yml` 里任何一项缺失（后台保存会删注释和空列表）
- 改 `.pages.yml` 前对照 Pages CMS 文档，写错整个后台打不开
- 每个 PR 从最新的 main 新建分支；推送前确认上一个 PR 是否已合并，已合并就开新 PR
- 同步模板到下游的 PR 必须用「Create a merge commit」合并
- `npm run build` 必须通过；声称外观不变要截图逐像素对比（development.md）
- Actions 和 Pages CMS 本地跑不了，没验证过的要在 PR 和回复里明说
- 写给用户的文字用中文，口语、直接，不要 AI 腔
