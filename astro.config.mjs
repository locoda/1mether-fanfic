import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rehypeFanfic from './src/lib/rehype-fanfic.mjs';

export default defineConfig({
  output: 'static',
  // 和 Astro 4/5 一样的 HTML 压缩方式：保留行内元素之间的空格，显示效果不变
  compressHTML: true,
  // 部署在子路径时改这里，例如 GitHub Pages 项目站：base: '/fanfic-site-template/'
  base: '/',
  // 填上正式域名后会生成正确的绝对链接（可选）
  // site: 'https://example.com',
  markdown: {
    // 正文排版（作者注、首字下沉、文末 ♦）用的是 unified 插件
    processor: unified({ rehypePlugins: [rehypeFanfic] }),
  },
});
