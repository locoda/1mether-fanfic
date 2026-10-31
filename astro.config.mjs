import { defineConfig } from 'astro/config';
import rehypeFanfic from './src/lib/rehype-fanfic.mjs';

export default defineConfig({
  output: 'static',
  // 部署在子路径时改这里，例如 GitHub Pages 项目站：base: '/1mether-fanfic/'
  base: '/',
  // 填上正式域名后会生成正确的绝对链接（可选）
  // site: 'https://example.com',
  markdown: {
    rehypePlugins: [rehypeFanfic],
  },
});
