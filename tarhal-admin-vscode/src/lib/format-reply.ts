// Turns the model's light markdown into safe blocks the widget can render (no HTML injection).
export type Part = { text: string; bold: boolean };
export type Block = { type: 'h' | 'li' | 'p' | 'gap'; parts: Part[] };

function inline(text: string): Part[] {
  const clean = text.replace(/`+/g, '').replace(/(?<!\*)\*(?!\*)/g, '').replace(/__/g, '');
  return clean.split(/\*\*(.+?)\*\*/g).map((t, i) => ({ text: t, bold: i % 2 === 1 })).filter((p) => p.text !== '');
}

export function formatReply(raw: string): Block[] {
  const out: Block[] = [];
  for (const line of raw.replace(/\r/g, '').split('\n')) {
    const t = line.trim();
    if (!t) { if (out.length && out[out.length - 1].type !== 'gap') out.push({ type: 'gap', parts: [] }); continue; }
    if (/^[-*_=─—\s|:]{3,}$/.test(t)) continue; // ---, ***, table separator rows
    let m: RegExpMatchArray | null;
    if ((m = t.match(/^#{1,6}\s*(.+?)\s*#*$/))) out.push({ type: 'h', parts: inline(m[1]).map((p) => ({ ...p, bold: true })) });
    else if ((m = t.match(/^[-*•]\s+(.*)$/))) out.push({ type: 'li', parts: inline(m[1]) });
    else if (t.startsWith('|') && t.endsWith('|')) out.push({ type: 'li', parts: inline(t.slice(1, -1).split('|').map((c) => c.trim()).filter(Boolean).join(' · ')) });
    else out.push({ type: 'p', parts: inline(t) });
  }
  while (out.length && out[out.length - 1].type === 'gap') out.pop();
  return out;
}
