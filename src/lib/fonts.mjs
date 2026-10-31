// 可选的中文字体（都来自中文网字计划，按字频切片，浏览器只下载页面用到的部分）。
// 网站设置里「显示设置 → 中文字体」选的是这里的 id。构建时只打包选中的那一款（见 astro.config.mjs）。
// 想加别的字体：npm 装上 @chinese-fonts/<包名>，在这里加一项，再在 .pages.yml 和 site.config.ts 里加上 id。
export const FONTS = {
  sypxzs: {
    label: '思源屏显臻宋（现代宋体，屏幕上清晰）',
    family: 'Source Han Serif CN for Display',
    css: '@chinese-fonts/sypxzs/dist/思源屏显臻宋/result.css',
  },
  'lxgw-neo-zhi-song': {
    label: '霞鹜新致宋（清秀的明朝体）',
    family: 'LXGW Neo ZhiSong',
    css: '@chinese-fonts/lxgw-neo-zhi-song/dist/LXGWNeoZhiSong/result.css',
  },
  jhlst: {
    label: '京华老宋体（民国老报刊风）',
    family: 'KingHwa_OldSong',
    css: '@chinese-fonts/jhlst/dist/京華老宋体v2_002/result.css',
  },
  zqfs: {
    label: '朱雀仿宋（清瘦文气）',
    family: 'Zhuque Fangsong (technical preview)',
    css: '@chinese-fonts/zqfs/dist/ZhuqueFangsong-Regular/result.css',
  },
  lxgwwenkai: {
    label: '霞鹜文楷（楷体）',
    family: 'LXGW WenKai',
    css: '@chinese-fonts/lxgwwenkai/dist/LXGWWenKai-Regular/result.css',
  },
  system: {
    label: '系统自带宋体（不下载字体，加载最快）',
    family: 'Songti SC',
    css: null,
  },
};

export const DEFAULT_FONT = 'sypxzs';
export const FONT_IDS = Object.keys(FONTS);
