// 作品 .yml ⇄ .md 的转换规则，导入和导出共用。
//
// md 格式：
//
//   ---
//   title: 性别问题
//   cp: [辉慧]
//   updated: 2022-09-24
//   ---
//
//   # 正文/一发完
//
//   第一章正文……
//
//   # 番外/慧人的烦恼
//
//   第二章正文……
//
// - 开头 --- 之间是作品信息，字段和 .yml 一样（除了 chapters）
// - 每个「# 章节名」开始新的一章；章节名留空就写一个「#」
// - 单章作品可以不写「#」，整段正文就是这一章
import YAML from 'yaml';

const HEADING = /^#(?:[ \t]+(.*?))?[ \t]*#*[ \t]*$/;

const yamlString = (value) => {
  const doc = new YAML.Document(value);
  // 只含文字的短列表（比如 cp）写成一行：cp: [辉慧, 辉树]
  YAML.visit(doc, {
    Seq(_, node) {
      if (node.items.every((i) => YAML.isScalar(i))) node.flow = true;
    },
  });
  return doc.toString({ blockQuote: 'literal', lineWidth: 0, flowCollectionPadding: false });
};

/** 读 .yml 文本，返回 { info, chapters } */
export function parseWorkYaml(text, where) {
  const data = YAML.parse(text) ?? {};
  if (typeof data.title !== 'string' || !data.title.trim()) throw new Error(`${where}：缺少作品名 title`);
  if (!Array.isArray(data.chapters) || data.chapters.length === 0) throw new Error(`${where}：至少要有一章`);
  const { chapters, ...info } = data;
  return {
    info,
    chapters: chapters.map((c, i) => {
      if (typeof c?.body !== 'string') throw new Error(`${where}：第 ${i + 1} 章没有正文`);
      return { title: typeof c.title === 'string' && c.title.trim() ? c.title : undefined, body: c.body };
    }),
  };
}

/** { info, chapters } → .yml 文本 */
export function toWorkYaml({ info, chapters }) {
  const doc = { ...info, chapters: chapters.map((c) => (c.title ? { title: c.title, body: c.body } : { body: c.body })) };
  return yamlString(doc);
}

/** 一章正文里不能有「# 」开头的行，否则导出后再导入会被当成新的一章 */
function checkBody(body, where) {
  let inFence = false;
  for (const line of body.split('\n')) {
    if (/^(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence && HEADING.test(line)) {
      throw new Error(`${where}：正文里有以「#」开头的一级标题「${line}」，md 里会被当成分章，请改成「##」`);
    }
  }
}

/** { info, chapters } → .md 文本 */
export function toWorkMarkdown({ info, chapters }, where) {
  const fm = yamlString(info).trimEnd();
  const single = chapters.length === 1;
  const parts = chapters.map((c, i) => {
    const body = c.body.replace(/\s+$/, '') + '\n';
    checkBody(body, `${where} 第 ${i + 1} 章`);
    // 单章作品：章节名和作品名一样（或没写）时不写标题，正文直接开始
    if (single && (!c.title || c.title === info.title)) return body;
    return `${c.title ? `# ${c.title}` : '#'}\n\n${body}`;
  });
  return `---\n${fm}\n---\n\n${parts.join('\n')}`;
}

/** .md 文本 → { info, chapters } */
export function parseWorkMarkdown(text, where) {
  const m = text.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${where}：开头要有 --- 包起来的作品信息（至少写 title）`);
  const info = YAML.parse(m[1]) ?? {};
  if (typeof info.title !== 'string' || !info.title.trim()) throw new Error(`${where}：作品信息里缺少 title`);
  if ('chapters' in info) throw new Error(`${where}：md 里的章节写在正文里，用「# 章节名」分章，不要在开头写 chapters`);

  const chapters = [];
  let current = null;
  let preamble = [];
  let inFence = false;
  for (const line of m[2].replace(/\r\n/g, '\n').split('\n')) {
    if (/^(```|~~~)/.test(line)) inFence = !inFence;
    const h = !inFence && line.match(HEADING);
    if (h) {
      current = { title: h[1]?.trim() || undefined, lines: [] };
      chapters.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  const tidy = (lines) => lines.join('\n').replace(/^\s*\n/, '').replace(/\s+$/, '') + '\n';
  const pre = tidy(preamble);
  if (pre.trim()) chapters.unshift({ title: undefined, lines: preamble });
  if (chapters.length === 0) throw new Error(`${where}：没有正文`);

  return {
    info,
    chapters: chapters.map((c, i) => {
      const body = tidy(c.lines);
      if (!body.trim()) throw new Error(`${where}：第 ${i + 1} 章${c.title ? `「${c.title}」` : ''}没有正文`);
      // 单章作品没写章节名时，用作品名（和网站上原有作品一致）
      const title = c.title ?? (chapters.length === 1 ? info.title : undefined);
      return { title, body };
    }),
  };
}
