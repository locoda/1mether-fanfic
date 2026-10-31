// 正文排版辅助（Markdown → HTML 时运行）：
// - 第一个正文段落加 class="lead"（首字下沉），跳过作者注和 "01" 这类短分节标记
// - 最后一个正文段落加 class="last"（完结章在这里放 ♦ 结束符）
// - 以「作者注：」「章注：」「章末注：」开头的单段文字，自动转成作者注区块
//   （多行作者注请直接写 <aside class="author-note" aria-label="作者注"> … </aside>）
const NOTE = /^(作者注|章注|章末注)[:：]\s*/;

const textOf = (node) =>
  node.type === 'text' ? node.value : (node.children || []).map(textOf).join('');

export default function rehypeFanfic() {
  return (tree) => {
    const kids = tree.children || [];
    for (let i = 0; i < kids.length; i++) {
      const node = kids[i];
      if (node.type !== 'element' || node.tagName !== 'p') continue;
      const m = textOf(node).trim().match(NOTE);
      if (!m) continue;
      const first = node.children[0];
      if (first?.type === 'text') first.value = first.value.replace(NOTE, '');
      kids[i] = {
        type: 'element',
        tagName: 'aside',
        properties: { className: ['author-note'], ariaLabel: m[1] === '章末注' ? '章末注' : '作者注' },
        children: [node],
      };
    }
    // 作者注可能是原始 HTML（<aside> 和 </aside> 是两个 raw 节点，中间的段落和正文是兄弟节点），要跳过
    const paras = [];
    let inNote = false;
    for (const n of kids) {
      if (n.type === 'raw') {
        if (/<aside\b/i.test(n.value)) inNote = true;
        if (/<\/aside>/i.test(n.value)) inNote = false;
      } else if (!inNote && n.type === 'element' && n.tagName === 'p') {
        paras.push(n);
      }
    }
    const lead = paras.find((p) => textOf(p).trim().length >= 8);
    if (lead) (lead.properties.className ||= []).push('lead');
    const last = paras[paras.length - 1];
    if (last) (last.properties.className ||= []).push('last');
  };
}
