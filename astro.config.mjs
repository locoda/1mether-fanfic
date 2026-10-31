import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import rehypeFanfic from './src/lib/rehype-fanfic.mjs';
import { FONTS, DEFAULT_FONT } from './src/lib/fonts.mjs';

// 网站设置里选的中文字体（display.font；旧版不分组的写法是 font）。只打包这一款，页面不用下载其他字体的 CSS
const siteYml = parse(readFileSync(new URL('./src/site.yml', import.meta.url), 'utf8')) ?? {};
const fontId = siteYml.display?.font || siteYml.font || DEFAULT_FONT;
const font = FONTS[fontId] ?? FONTS[DEFAULT_FONT];
const fontCss = font.css ?? fileURLToPath(new URL('./src/styles/no-font.css', import.meta.url));

export default defineConfig({
  output: 'static',
  // 和 Astro 4/5 一样的 HTML 压缩方式：保留行内元素之间的空格，显示效果不变
  compressHTML: true,
  // 网站的网址和子路径。部署到 GitHub Pages 时由工作流自动传入（见 .github/workflows/deploy.yml），
  // 比如 https://用户名.github.io/仓库名/ 的子路径是 /仓库名/；Cloudflare Pages 和本地预览用默认值
  base: process.env.SITE_BASE || '/',
  site: process.env.SITE_URL || undefined,
  markdown: {
    // 正文排版（作者注、首字下沉、文末 ♦）用的是 unified 插件
    processor: unified({ rehypePlugins: [rehypeFanfic] }),
  },
  vite: {
    resolve: {
      // src/layouts/Base.astro 里 import 'site-font' 指向选中字体的 CSS
      alias: { 'site-font': fontCss },
    },
  },
});
