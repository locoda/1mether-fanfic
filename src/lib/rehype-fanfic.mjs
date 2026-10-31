// 给正文段落打标记，方便排版：
// - 以「章注：」「作者注：」或 AO3 的 "See the end of the work…" 开头的段落 → class="note"（作者注样式）
// - 第一个真正的正文段落（跳过作者注和 "01" 这类短分节标记）→ class="lead"（首字下沉）
const NOTE = /^(章注|作者注|前注|注)[:：]|^See the end of the work/i;

const textOf = (node) =>
  node.type === 'text' ? node.value : (node.children || []).map(textOf).join('');

export default function rehypeFanfic() {
  return (tree) => {
    let leadDone = false;
    for (const node of tree.children || []) {
      if (node.type !== 'element' || node.tagName !== 'p') continue;
      const text = textOf(node).trim();
      const cls = (node.properties.className ||= []);
      if (NOTE.test(text)) {
        cls.push('note');
      } else if (!leadDone && text.length >= 8) {
        cls.push('lead');
        leadDone = true;
      }
    }
  };
}
