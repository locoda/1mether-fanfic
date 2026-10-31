// 各种文件格式 → { info, chapters: [{ title, body }] }，body 是 Markdown。
//
// 支持：
//   .md          开头 --- 写作品信息，「# 章节名」分章（见 work-md.mjs）
//   .txt         纯文本；「第一章」「Chapter 1」「# 章节名」这样的行会自动分章；GBK 编码也能读
//   .docx        Word 文档；「标题 1」样式的段落分章
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { parse as parseHtml, NodeType } from 'node-html-parser';
import { parseWorkMarkdown } from './work-md.mjs';

export const SUPPORTED = ['.md', '.markdown', '.txt', '.docx'];

/** 读任意支持的文件，返回 { info, chapters } */
export async function importFile(file) {
  const ext = extname(file).toLowerCase();
  const name = basename(file, extname(file));
  switch (ext) {
    case '.md':
    case '.markdown':
      return parseMd(await readText(file), name, file);
    case '.txt':
      return parseTxt(await readText(file), name, file);
    case '.docx':
      return parseDocx(file, name);
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

// ---------------------------------------------------------------- Markdown

/** md：开头有 --- 作品信息就照写的来；没有（或没写 title）就用文件名当作品名 */
function parseMd(text, name, where) {
  text = text.replace(/\r\n?/g, '\n');
  if (!/^---\n[\s\S]*?\n---(\n|$)/.test(text)) return parseWorkMarkdown(`---\ntitle: ${JSON.stringify(name)}\n---\n\n${text}`, where);
  if (!/^---\n[\s\S]*?^title\s*:/m.test(text.split(/\n---(\n|$)/)[0] + '\n')) {
    text = text.replace(/^---\n/, `---\ntitle: ${JSON.stringify(name)}\n`);
  }
  return parseWorkMarkdown(text, where);
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
  return parseWordHtml(`<body>${html}</body>`, name, file);
}

// ---------------------------------------------------------------- Word 转出来的 HTML → 章节

function parseWordHtml(html, name, where) {
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
