# 1mether 的同人站

1mether 的同人作品存档。部署在 Cloudflare Pages（构建命令 `npm run build`，输出目录 `dist`），每次推送到 main 自动更新。

网站代码来自模板 [fanfic-site-template](https://github.com/locoda/fanfic-site-template)。**写作品、网页后台、导入导出、网站设置和功能开关的用法，都看模板的 [README](https://github.com/locoda/fanfic-site-template#readme)**，这里只记这个站自己的事。

## 这个站自己的东西

- `src/content/works/`：作品，一篇一个 `.yml`
- `src/site.yml`：网站设置（也可以在 Pages CMS 的「网站设置」里改）
- 本文件

其他文件都和模板一致，改代码请改模板，再同步过来。

## 从模板同步更新

```
git remote add template https://github.com/locoda/fanfic-site-template.git   # 只需要第一次
git config merge.ours.driver true                                             # 只需要第一次（见 .gitattributes）
git fetch template
git merge template/main
```

`README.md` 和 `src/site.yml` 会自动保留这里的版本（`.gitattributes`）。其他有冲突时，`src/content/works/` 保留这里的版本，其他文件用模板的版本；合并进来的示例作品（`example-*.yml`）和 `LICENSE` 删掉即可。

**同步模板的 PR 要用「Create a merge commit」合并，不要用 squash**，否则和模板的关联会断掉，下次同步又要从头解决冲突。
