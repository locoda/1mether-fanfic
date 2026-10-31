# 作品导出（自动生成）

这个文件夹里每篇作品一个 Markdown 文件，由 `npm run export` 从 `src/content/works/*.yml` 生成，作品更新后 GitHub Actions 会自动重新导出。

**不要在这里改**：改这里不会影响网站，下次导出还会被覆盖。要改作品请用网页后台，或者改 `src/content/works/` 里的 .yml。

想把这里的 md 改完再放回网站：`npm run import -- export/作品名.md --force`。
