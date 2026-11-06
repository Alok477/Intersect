import React from 'react';

const pad = (n) => String(n).padStart(2, '0');
export const clock = (iso) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function dayLabel(iso) {
  const d = new Date(iso); const now = new Date();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return 'Today';
  if (sameDay(d, y)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}
export const fullTime = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' });
export const isSameDay = (a, b) => sameDay(new Date(a), new Date(b));

/** Short label for sidebar rows: time today, "Yesterday", else weekday/date. */
export function shortWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso); const now = new Date();
  if (sameDay(d, now)) return clock(iso);
  const diff = (now - d) / 864e5;
  if (diff < 2) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const tone = (key = '') => { let h = 0; for (const c of String(key)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 6; };
export const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
export const snippet = (m, n = 90) => m ? (m.sticker ? `${m.sticker} ${m.body}` : m.body).replace(/\s+/g, ' ').slice(0, n) : '';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Safe rich text: links, **bold**, *italic*, `code`, @mentions. Returns React nodes (no innerHTML). */
export function renderBody(body, names = [], myName = '', query = '') {
  const mention = names.length ? `|(@(?:${[...names].sort((a, b) => b.length - a.length).map(esc).join('|')}))(?![\\p{L}\\p{N}])` : '';
  const re = new RegExp(`(\`[^\`\\n]+\`)|(https?:\\/\\/[^\\s<]+[^\\s<.,;:!?)\\]])|(\\*\\*[^*\\n]+\\*\\*)|(\\*[^*\\n]+\\*)${mention}`, 'giu');
  const out = []; let last = 0; let k = 0; let m;
  const plain = (t) => {
    if (!query) return t;
    const parts = t.split(new RegExp(`(${esc(query)})`, 'ig'));
    return parts.map((p, i) => p.toLowerCase() === query.toLowerCase() ? <mark key={i}>{p}</mark> : p);
  };
  while ((m = re.exec(body))) {
    if (m.index > last) out.push(<React.Fragment key={k++}>{plain(body.slice(last, m.index))}</React.Fragment>);
    const t = m[0];
    if (m[1]) out.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else if (m[2]) out.push(<a key={k++} href={t} target="_blank" rel="noopener noreferrer">{t}</a>);
    else if (m[3]) out.push(<strong key={k++}>{plain(t.slice(2, -2))}</strong>);
    else if (m[4]) out.push(<em key={k++}>{plain(t.slice(1, -1))}</em>);
    else out.push(<span key={k++} className={`mx-mention ${t.slice(1).toLowerCase() === myName.toLowerCase() ? 'me' : ''}`}>{t}</span>);
    last = m.index + t.length;
  }
  if (last < body.length) out.push(<React.Fragment key={k++}>{plain(body.slice(last))}</React.Fragment>);
  return out;
}

export const mentionsMe = (body, myName) => !!myName && new RegExp(`@${esc(myName)}(?![\\p{L}\\p{N}])`, 'iu').test(body);
