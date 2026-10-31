// 各种文件格式 → { info, chapters: [{ title, body }] }，body 是 Markdown。
//
// 支持：
//   .md          开头 --- 写作品信息，「# 章节名」分章（见 work-md.mjs）
//   .txt         纯文本；「第一章」「Chapter 1」「# 章节名」这样的行会自动分章；GBK 编码也能读
//   .docx        Word 文档；「标题 1」样式的段落分章
//   .html .htm   AO3 下载的 HTML（会读出 CP、系列、简介、作者注）；其他 HTML 按 <h1> 分章
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { parse as parseHtml, NodeType } from 'node-html-parser';
import { parseWorkMarkdown } from './work-md.mjs';

export const SUPPORTED = ['.md', '.markdown', '.txt', '.docx', '.html', '.htm'];

/** 读任意支持的文件，返回 { info, chapters } */
export async function importFile(file) {
  const ext = extname(file).toLowerCase();
  const name = basename(file, extname(file));
  switch (ext) {
    case '.md':
    case '.markdown':
      return parseWorkMarkdown(await readText(file), file);
    case '.txt':
      return parseTxt(await readText(file), name, file);
    case '.docx':
      return parseDocx(file, name);
    case '.html':
    case '.htm': {
      const html = await readText(file);
      return isAo3(html) ? parseAo3(html, name, file) : parseGenericHtml(html, name, file);
    }
    default:
      throw new Error(`${file}：不支持 ${ext || '没有扩展名的'} 文件，支持 ${SUPPORTED.join(' ')}`);
  }
}

/** 读文本：先按 UTF-8，读出乱码就换 GB18030（兼容 GBK / GB2312） */
async function readText(file) {
  const buf = await readFile(file);
  const utf8 = new TextDecoder('utf-8').decode(buf);
  if (!utf8.includes('�')) return utf8.replace(/^﻿/, '');
  return new TextDecoder('gb18030').decode(buf);
}

// ---------------------------------------------------------------- 纯文本

const CN_NUM = '0-9０-９一二三四五六七八九十百千零〇两';
const CHAPTER_LINE = new RegExp(
  `^(?:#\\s+(.+)|((?:第[${CN_NUM}]+[章节回卷部篇]|序章|楔子|尾声|番外|后记|Chapter\\s*\\d+|Prologue|Epilogue)(?:[\\s:：·.、\\-—]+.*)?))$`,
  'i',
);

export function parseTxt(text, name, where) {
  text = text.replace(/\r\n?/g, '\n');
  if (/^---\n/.test(text)) return parseWorkMarkdown(text, where); // 带了 md 那样的作品信息
  const lines = text.split('\n').map((l) => l.replace(/^[\s　]+|[\s　]+$/g, ''));
  // 有空行就按空行分段；整篇没有空行（常见于中文 txt）就每行一段
  const blankSeparated = /\n[ \t　]*\n/.test(text.trim());
  const chapters = [];
  let current = { title: undefined, paras: [], buf: [] };
  const flush = () => {
    if (current.buf.length) current.paras.push(current.buf.join(blankSeparated ? '' : '\n'));
    current.buf = [];
  };
  for (const line of lines) {
    const m = line.match(CHAPTER_LINE);
    if (m) {
      flush();
      if (current.paras.length || current.title !== undefined) chapters.push(current);
      current = { title: (m[1] ?? m[2]).trim(), paras: [], buf: [] };
    } else if (!line) {
      flush();
    } else if (blankSeparated) {
      current.buf.push(line);
    } else {
      current.paras.push(line);
    }
  }
  flush();
  if (current.paras.length || current.title !== undefined) chapters.push(current);
  return finish({ title: name }, chapters.map((c) => ({ title: c.title, body: c.paras.join('\n\n') })), where);
}

// ---------------------------------------------------------------- Word

async function parseDocx(file, name) {
  const mammoth = (await import('mammoth')).default;
  const { value: html } = await mammoth.convertToHtml({ path: file });
  return parseGenericHtml(`<body>${html}</body>`, name, file);
}

// ---------------------------------------------------------------- 普通 HTML（Word 转出来的也走这里）

function parseGenericHtml(html, name, where) {
  const root = parseHtml(html, { comment: false });
  const body = root.querySelector('body') ?? root;
  const blocks = body.childNodes.filter((n) => n.nodeType === NodeType.ELEMENT_NODE || n.text.trim());
  const heads = (tag) => blocks.filter((n) => n.tagName === tag);
  let title = name;
  let splitTag = 'H1';
  // 开头只有一个「标题 1」、下面用「标题 2」分章：标题 1 当作品名
  if (heads('H1').length === 1 && blocks[0]?.tagName === 'H1' && heads('H2').length > 0) {
    title = blocks.shift().text.trim() || name;
    splitTag = 'H2';
  }
  const chapters = [];
  let current = { title: undefined, nodes: [] };
  for (const n of blocks) {
    if (n.tagName === splitTag) {
      if (current.nodes.length || current.title !== undefined) chapters.push(current);
      current = { title: n.text.trim() || undefined, nodes: [] };
    } else {
      current.nodes.push(n);
    }
  }
  if (current.nodes.length || current.title !== undefined) chapters.push(current);
  return finish({ title }, chapters.map((c) => ({ title: c.title, body: nodesToMarkdown(c.nodes) })), where);
}

// ---------------------------------------------------------------- AO3

const isAo3 = (html) => /archiveofourown\.org/i.test(html) && /id="(preface|chapters)"/i.test(html);

// AO3 自动加的提示文字，导入时去掉
const AO3_BOILERPLATE = /^\(?\s*See the end of the (work|chapter) for (more )?notes\.?\s*\)?$/i;

function parseAo3(html, name, where) {
  const root = parseHtml(html, { comment: false });
  const preface = root.querySelector('#preface') ?? root;
  const info = { title: (preface.querySelector('h1')?.text ?? name).trim() || name };

  // 标签区：<dt>Relationship:</dt><dd>…</dd>
  const tags = {};
  for (const dt of preface.querySelectorAll('dl.tags dt, dl dt')) {
    const dd = dt.nextElementSibling;
    if (dd?.tagName === 'DD') tags[dt.text.trim().replace(/[:：]$/, '').toLowerCase()] = dd;
  }
  const rel = tags.relationship ?? tags.relationships;
  if (rel) {
    const cps = rel.querySelectorAll('a').map((a) => a.text.trim()).filter(Boolean);
    if (cps.length) info.cp = cps;
  }
  const seriesText = tags.series?.text.replace(/\s+/g, ' ').trim();
  const sm = seriesText?.match(/Part\s+(\d+)\s+of\s+(.+)$/i);
  if (sm) {
    info.series = sm[2].trim();
    info.seriesOrder = Number(sm[1]);
  }
  const stats = tags.stats?.text.replace(/\s+/g, ' ') ?? '';
  const date = (k) => stats.match(new RegExp(`${k}:\\s*(\\d{4}-\\d{2}-\\d{2})`, 'i'))?.[1];
  const updated = date('Completed') ?? date('Updated') ?? date('Published');
  if (updated) info.updated = updated;
  const ch = stats.match(/Chapters:\s*(\d+)\/(\d+|\?)/i);
  if (ch) info.status = ch[2] !== '?' && ch[1] === ch[2] ? 'finished' : 'ongoing';

  // 简介和作品前注：<p>Summary</p><blockquote>…</blockquote>
  const labelled = (scope, label) => {
    for (const p of scope?.querySelectorAll('p') ?? []) {
      if (p.text.trim().toLowerCase() === label.toLowerCase()) {
        const next = p.nextElementSibling;
        if (next?.tagName === 'BLOCKQUOTE') return next;
      }
    }
    return undefined;
  };
  const summary = labelled(preface, 'Summary');
  if (summary) {
    const text = summary.text.replace(/\s+/g, ' ').trim();
    if (text) info.summary = text;
  }
  const workNotes = noteBlock(labelled(preface, 'Notes'), '作者注');
  const workEndNotes = noteBlock(labelled(root.querySelector('#afterword') ?? root.querySelector('#endnotes'), 'End Notes') ?? root.querySelector('#endnotes blockquote'), '章末注');

  // 章节
  const container = root.querySelector('#chapters') ?? root;
  const headings = container.querySelectorAll('h2.heading');
  let chapters;
  if (headings.length) {
    chapters = headings.map((h, i) => {
      const group = h.closest('.meta') ?? h.parentNode;
      // 正文是 meta 后面第一个 .userstuff
      let el = group.nextElementSibling;
      while (el && !el.classList?.contains('userstuff')) el = el.nextElementSibling;
      const startNote = noteBlock(labelled(group, 'Chapter Notes'), '作者注');
      let endEl = el?.nextElementSibling;
      while (endEl && !/endnote/i.test(`${endEl.id} ${endEl.getAttribute('class') ?? ''}`) && !endEl.querySelector('h2.heading')) endEl = endEl.nextElementSibling;
      const endNote = endEl && /endnote/i.test(`${endEl.id} ${endEl.getAttribute('class') ?? ''}`) ? noteBlock(endEl.querySelector('blockquote'), '章末注') : '';
      const raw = h.text.replace(/\s+/g, ' ').trim();
      const title = raw.replace(/^Chapter\s+\d+\s*[:：]?\s*/i, '').trim() || (headings.length > 1 ? undefined : info.title);
      return { title, body: [startNote, el ? nodesToMarkdown(el.childNodes) : '', endNote].filter(Boolean).join('\n\n') };
    });
  } else {
    const content = container.querySelector('.userstuff') ?? container;
    chapters = [{ title: info.title, body: nodesToMarkdown(content.childNodes) }];
  }
  if (workNotes) chapters[0].body = `${workNotes}\n\n${chapters[0].body}`;
  if (workEndNotes) chapters[chapters.length - 1].body += `\n\n${workEndNotes}`;
  return finish(info, chapters, where);
}

/** <blockquote> 里的作者注 → <aside class="author-note"> 区块，一段一行 */
function noteBlock(el, label) {
  if (!el) return '';
  const md = nodesToMarkdown(el.childNodes)
    .split(/\n{2,}/)
    .filter((p) => !AO3_BOILERPLATE.test(p.replace(/[*_[\]()]/g, '').trim()))
    .join('\n\n')
    .trim();
  return md ? `<aside class="author-note" aria-label="${label}">\n\n${md}\n\n</aside>` : '';
}

// ---------------------------------------------------------------- HTML → Markdown

function inline(node) {
  if (node.nodeType === NodeType.TEXT_NODE) return node.text.replace(/[ \t\r\n]+/g, ' ');
  if (node.nodeType !== NodeType.ELEMENT_NODE) return '';
  const inner = node.childNodes.map(inline).join('');
  switch (node.tagName) {
    case 'BR':
      return '<br>\n'; // Markdown 里单个换行会被合并成空格，用 <br> 保留原文的换行
    case 'STRONG':
    case 'B':
      return inner.trim() ? `**${inner.trim()}**` : '';
    case 'EM':
    case 'I':
      return inner.trim() ? `*${inner.trim()}*` : '';
    case 'S':
    case 'DEL':
    case 'STRIKE':
      return inner.trim() ? `~~${inner.trim()}~~` : '';
    case 'A': {
      const href = node.getAttribute('href');
      return href && /^https?:/i.test(href) && inner.trim() && inner.trim() !== href ? `[${inner.trim()}](${href})` : inner;
    }
    case 'IMG':
      return '';
    default:
      return inner;
  }
}

const BLOCK = new Set(['P', 'DIV', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'TABLE', 'PRE', 'CENTER', 'SECTION', 'ARTICLE']);

function nodesToMarkdown(nodes) {
  const out = [];
  let line = '';
  const push = (s) => {
    const t = s.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').trim();
    if (t) out.push(t);
  };
  for (const n of nodes) {
    if (n.nodeType === NodeType.ELEMENT_NODE && BLOCK.has(n.tagName)) {
      push(line);
      line = '';
      const tag = n.tagName;
      if (tag === 'HR') out.push('***');
      else if (/^H[1-6]$/.test(tag)) push(`## ${n.text.trim()}`); // 正文里的小标题统一用 ##，# 留给分章
      else if (tag === 'BLOCKQUOTE') {
        const inner = nodesToMarkdown(n.childNodes);
        if (inner) out.push(inner.split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n'));
      } else if (tag === 'UL' || tag === 'OL') {
        const items = n.childNodes.filter((c) => c.tagName === 'LI');
        out.push(items.map((li, i) => `${tag === 'OL' ? `${i + 1}.` : '-'} ${nodesToMarkdown(li.childNodes).replace(/\n+/g, ' ')}`).join('\n'));
      } else if (tag === 'P' || tag === 'LI' || tag === 'PRE') push(inline(n));
      else {
        const inner = nodesToMarkdown(n.childNodes);
        if (inner) out.push(inner);
      }
    } else {
      line += inline(n);
    }
  }
  push(line);
  // 段落开头的全角空格缩进去掉；Markdown 里一行开头的 # 会被当成标题，转义掉
  return out
    .map((p) => p.replace(/^[　 ]+/gm, '').replace(/^#(?!#)/gm, '\\#'))
    .filter((p) => !AO3_BOILERPLATE.test(p))
    .join('\n\n');
}

// ---------------------------------------------------------------- 收尾检查

function finish(info, chapters, where) {
  const list = chapters
    .map((c) => ({ title: c.title?.trim() || undefined, body: c.body.trim() }))
    .filter((c) => c.body);
  if (list.length === 0) throw new Error(`${where}：没有读到正文`);
  // 单章作品没写章节名时，用作品名（和其他导入方式一致）
  if (list.length === 1 && !list[0].title) list[0].title = info.title;
  return { info, chapters: list.map((c) => ({ title: c.title, body: `${c.body}\n` })) };
}
