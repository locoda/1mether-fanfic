# 1mether 的同人站

网址：<https://fanfic.1mether.me>（Cloudflare Pages 自动部署）。

模板使用 [fanfic-site-template](https://github.com/locoda/fanfic-site-template) ，怎么写作品、改设置都看模板的 README。

作品在 `src/content/works/`，网站设置在 `src/site.yml`，其余代码跟模板保持一致：要改代码就去改模板，再同步过来。

## 同步模板

```
git remote add template https://github.com/locoda/fanfic-site-template.git   # 第一次
git config merge.ours.driver true                                             # 第一次
git fetch template
git merge template/main
```

README 和 `site.yml` 合并时会自动保留这边的版本（见 `.gitattributes`）。其他文件有冲突的话，作品留这边的，代码用模板的；顺带过来的 `example-*.yml` 和 `LICENSE` 删掉。
