// 整个站点只需要改这一个文件（外加 src/content 里的作品）。
// Site-wide settings: edit this one file, then add works under src/content.
export const site = {
  title: '1mether 的同人站',
  // 页脚的一行小字，可留空
  tagline: '同人作品存档',
  author: '1mether',
  description: '1mether 的同人作品存档。',
  // 页面语言，影响排版与读屏
  lang: 'zh-CN',
  // 首页上显示的链接，可删可加，例如：{ label: 'AO3', href: 'https://archiveofourown.org/users/xxx' }
  links: [] as { label: string; href: string }[],
  // 每页显示多少篇作品（首页、CP 页通用）
  perPage: 20,
  // 阅读速度（字/分钟），用来估算阅读时长
  readingSpeed: 500,
  // 首页第一页是否把最新一篇做成大标题头条
  featureLatest: true,
};

// 界面文字。做成模板后，换语言只改这里。
export const ui = {
  allWorks: '全部作品',
  cpIndex: 'CP 目录',
  seriesIndex: '系列',
  chapters: '章',
  chapterOf: (n: number, total: number) => `第 ${n} 章 / 共 ${total} 章`,
  words: (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1)} 万字` : `${n.toLocaleString('zh-CN')} 字`),
  minutes: (n: number) => `约 ${n} 分钟`,
  works: (n: number) => `${n} 篇`,
  prev: '上一页',
  next: '下一页',
  prevChapter: '上一章',
  nextChapter: '下一章',
  allChapters: '全部章节',
  startReading: '开始阅读',
  inSeries: '收录于系列',
  seriesPart: (n: number) => `第 ${n} 篇`,
  prevInSeries: '系列上一篇',
  nextInSeries: '系列下一篇',
  moreFromCp: (cp: string) => `更多${cp}作品`,
  viewSeries: '查看整个系列',
  viewCp: (cp: string) => `${cp}全部作品`,
  latest: '最新',
  byline: (name: string) => `文 / ${name}`,
  authorNote: '作者注',
  empty: '还没有作品。',
  notFound: '这一页不存在。',
  backHome: '回到首页',
  ongoing: '连载中',
  finished: '已完结',
};
