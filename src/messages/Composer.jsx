import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Icon from './icons.jsx';
import { EmojiPicker } from './ui.jsx';
import { MAX_LEN } from './useChatStore.js';
import { snippet } from './format.jsx';

export default function Composer({ scope, label, draft, setDraft, onSend, onSticker, stickers, addSticker, canSticker, replyTo, replyName, cancelReply, onTyping, onEditLast, members, locked, lockedNote, focusKey }) {
  const ta = useRef(null);
  const [panel, setPanel] = useState('');
  const [caret, setCaret] = useState(0);
  const [pick, setPick] = useState(0);
  const [sName, setSName] = useState(''); const [sEmoji, setSEmoji] = useState('');

  useLayoutEffect(() => { const el = ta.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 180)}px`; }, [draft, scope]);
  useEffect(() => { setPanel(''); if (!window.matchMedia('(hover: none)').matches) ta.current?.focus(); }, [scope, focusKey]);
  useEffect(() => { if (replyTo) ta.current?.focus(); }, [replyTo]);

  const query = useMemo(() => { const m = draft.slice(0, caret).match(/(?:^|\s)@([^\s@]{0,24})$/u); return m ? m[1].toLowerCase() : null; }, [draft, caret]);
  const matches = useMemo(() => query === null ? [] : members.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 5), [query, members]);
  useEffect(() => setPick(0), [query]);

  const insertAtCursor = (text) => { const el = ta.current; const s = el?.selectionStart ?? draft.length; const e = el?.selectionEnd ?? draft.length; setDraft(draft.slice(0, s) + text + draft.slice(e)); requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(s + text.length, s + text.length); }); };
  const complete = (p) => { const s = ta.current.selectionStart; const before = draft.slice(0, s).replace(/@[^\s@]{0,24}$/u, `@${p.name} `); setDraft(before + draft.slice(s)); requestAnimationFrame(() => { ta.current.focus(); ta.current.setSelectionRange(before.length, before.length); }); };
  const submit = () => { if (!draft.trim() || locked) return; onSend(draft); setPanel(''); };

  const onKey = (e) => {
    if (matches.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setPick((i) => (i + 1) % matches.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setPick((i) => (i - 1 + matches.length) % matches.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); complete(matches[pick]); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
    else if (e.key === 'Escape') { if (panel) setPanel(''); else if (replyTo) cancelReply(); }
    else if (e.key === 'ArrowUp' && !draft) { e.preventDefault(); onEditLast(); }
  };

  if (locked) return <div className="mx-composer-wrap"><div className="mx-locked"><Icon name="lock" size={16} /><span>{lockedNote}</span></div></div>;
  const left = MAX_LEN - draft.length;
  return <div className="mx-composer-wrap">
    {matches.length > 0 && <div className="mx-pop mx-mentions" role="listbox">{matches.map((p, i) => <button type="button" role="option" aria-selected={i === pick} className={i === pick ? 'on' : ''} key={p.id} onMouseDown={(e) => { e.preventDefault(); complete(p); }}>@{p.name}</button>)}</div>}
    {panel === 'emoji' && <EmojiPicker onPick={(e) => insertAtCursor(e)} />}
    {panel === 'sticker' && <div className="mx-pop mx-stickers">
      <div className="mx-sticker-grid">{stickers.map((s) => <button type="button" key={s.id} onClick={() => { onSticker(s); setPanel(''); }}><span>{s.emoji}</span><small>{s.name}</small></button>)}</div>
      <div className="mx-sticker-add"><input value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Name" maxLength="16" /><input value={sEmoji} onChange={(e) => setSEmoji(e.target.value)} placeholder="Emoji" maxLength="4" /><button type="button" className="mx-btn" disabled={!sName.trim() || !sEmoji.trim()} onClick={() => { addSticker(sName.trim(), sEmoji.trim()); setSName(''); setSEmoji(''); }}>Add</button></div>
    </div>}
    {replyTo && <div className="mx-replying"><Icon name="reply" size={14} /><span>Replying to <b>{replyName}</b> · {snippet(replyTo, 60)}</span><button type="button" className="mx-icon-btn" onClick={cancelReply} aria-label="Cancel reply"><Icon name="close" size={14} /></button></div>}
    <div className={`mx-composer ${replyTo ? 'has-reply' : ''}`}>
      <textarea ref={ta} rows="1" value={draft} aria-label={label} placeholder={label} maxLength={MAX_LEN}
        onChange={(e) => { setDraft(e.target.value); setCaret(e.target.selectionStart); if (e.target.value) onTyping(); }}
        onSelect={(e) => setCaret(e.target.selectionStart)} onKeyDown={onKey} />
      <div className="mx-composer-actions">
        {left < 200 && <span className={`mx-count ${left < 20 ? 'warn' : ''}`}>{left}</span>}
        {canSticker && <button type="button" className={`mx-icon-btn ${panel === 'sticker' ? 'on' : ''}`} title="Stickers" aria-label="Stickers" onClick={() => setPanel(panel === 'sticker' ? '' : 'sticker')}><Icon name="sticker" /></button>}
        <button type="button" className={`mx-icon-btn ${panel === 'emoji' ? 'on' : ''}`} title="Emoji" aria-label="Emoji" onClick={() => setPanel(panel === 'emoji' ? '' : 'emoji')}><Icon name="smile" /></button>
        <button type="button" className="mx-send" title="Send (Enter)" aria-label="Send" disabled={!draft.trim()} onClick={submit}><Icon name="send" size={17} /></button>
      </div>
    </div>
    <div className="mx-hint"><span>Enter to send · Shift+Enter for a new line · **bold** *italic* `code`</span></div>
  </div>;
}
