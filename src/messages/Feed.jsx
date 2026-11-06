import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Icon from './icons.jsx';
import { Avatar, EmojiPicker } from './ui.jsx';
import { clock, dayLabel, fullTime, isSameDay, renderBody, snippet, mentionsMe } from './format.jsx';

const GROUP_MS = 5 * 60 * 1000;

export default function Feed({ scope, list, loading, hasMore, onLoadEarlier, me, personOf, names, refs, query, firstUnread, empty, actions, canReact, canEdit, onReply, onProfile, editing, setEditing, onDelete }) {
  const box = useRef(null);
  const stick = useRef(true);
  const heightBefore = useRef(0);
  const prevLen = useRef(0);
  const [away, setAway] = useState(0);
  const [showJump, setShowJump] = useState(false);
  const [active, setActive] = useState(null);
  const [reactFor, setReactFor] = useState(null);
  const [flash, setFlash] = useState(null);

  const toBottom = (smooth) => { const el = box.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); };
  useLayoutEffect(() => { stick.current = true; prevLen.current = 0; setAway(0); setActive(null); setReactFor(null); toBottom(false); }, [scope]);
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    if (heightBefore.current) { el.scrollTop += el.scrollHeight - heightBefore.current; heightBefore.current = 0; prevLen.current = list.length; return; }
    const added = list.length - prevLen.current; const lastMine = list[list.length - 1]?.senderId === me.id;
    if (stick.current || lastMine || prevLen.current === 0) { toBottom(prevLen.current > 0); setAway(0); }
    else if (added > 0) setAway((n) => n + added);
    prevLen.current = list.length;
  }, [list, me.id]);

  const onScroll = () => { const el = box.current; const gap = el.scrollHeight - el.scrollTop - el.clientHeight; stick.current = gap < 80; setShowJump(gap > 320); if (stick.current) setAway(0); };
  const jumpTo = (id) => { const el = box.current?.querySelector(`[data-id="${CSS.escape(id)}"]`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); setFlash(id); setTimeout(() => setFlash(null), 1400); } };
  useEffect(() => { const h = (e) => { if (e.key === 'Escape') { setActive(null); setReactFor(null); } }; document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h); }, []);

  const rows = useMemo(() => {
    const out = []; let prev = null;
    list.forEach((m) => {
      const day = !prev || !isSameDay(prev.createdAt, m.createdAt);
      if (day) out.push({ type: 'day', key: `d-${m.id}`, label: dayLabel(m.createdAt) });
      if (m.id === firstUnread) out.push({ type: 'new', key: `n-${m.id}` });
      const grouped = !day && prev && prev.senderId === m.senderId && !m.replyTo && m.id !== firstUnread && new Date(m.createdAt) - new Date(prev.createdAt) < GROUP_MS && !prev.failed;
      out.push({ type: 'msg', key: m.id, m, grouped });
      prev = m;
    });
    return out;
  }, [list, firstUnread]);

  return <div className="mx-feed" ref={box} onScroll={onScroll} onClick={(e) => { if (!e.target.closest('.mx-msg') && !e.target.closest('.mx-pop')) { setActive(null); setReactFor(null); } }}>
    <div className="mx-feed-inner">
      {hasMore && <button type="button" className="mx-more" onClick={() => { heightBefore.current = box.current.scrollHeight; onLoadEarlier(); }}>Load earlier messages</button>}
      {loading && <div className="mx-loading"><span /><span /><span /></div>}
      {!hasMore && !loading && empty}
      {rows.map((r) => {
        if (r.type === 'day') return <div className="mx-day" key={r.key}><span>{r.label}</span></div>;
        if (r.type === 'new') return <div className="mx-newline" key={r.key}><span>New</span></div>;
        const { m, grouped } = r; const p = personOf(m.senderId); const mine = m.senderId === me.id;
        const ref = m.replyTo ? ((list.find((x) => x.id === m.replyTo)) || refs[m.replyTo]) : null; const refP = ref ? personOf(ref.senderId) : null;
        const isEditing = editing === m.id;
        const hot = !mine && mentionsMe(m.body, me.name);
        return <article key={r.key} data-id={m.id} className={`mx-msg ${grouped ? 'grouped' : ''} ${mine ? 'mine' : ''} ${hot ? 'hot' : ''} ${flash === m.id ? 'flash' : ''} ${active === m.id || reactFor === m.id ? 'active' : ''} ${m.pending ? 'pending' : ''} ${m.failed ? 'failed' : ''}`} onClick={() => window.matchMedia('(hover: none)').matches && setActive(active === m.id ? null : m.id)}>
          {m.replyTo && <button type="button" className="mx-replyref" onClick={() => ref && jumpTo(m.replyTo)} disabled={!ref}>
            <Icon name="reply" size={12} />{ref ? <><b>@{refP.name}</b><span>{snippet(ref, 80)}</span></> : <span>Original message unavailable</span>}
          </button>}
          <div className="mx-msg-row">
            <div className="mx-gutter">{grouped ? <time title={fullTime(m.createdAt)}>{clock(m.createdAt)}</time> : <Avatar person={p} size={38} onClick={(e) => onProfile(p.id, e.currentTarget)} title={`${p.name}'s profile`} />}</div>
            <div className="mx-body">
              {!grouped && <div className="mx-meta"><button type="button" className="mx-author" onClick={(e) => onProfile(p.id, e.currentTarget)}>{p.name}</button><time title={fullTime(m.createdAt)}>{clock(m.createdAt)}</time></div>}
              {isEditing ? <Editor initial={m.body} onSave={(v) => { actions.edit(m.id, v); setEditing(null); }} onCancel={() => setEditing(null)} />
                : m.sticker ? <div className="mx-sticker" title={m.body}><span>{m.sticker}</span><small>{m.body}</small></div>
                : <p>{renderBody(m.body, names, me.name, query)}{m.editedAt && <em className="mx-edited" title={fullTime(m.editedAt)}>(edited)</em>}</p>}
              {m.failed && <div className="mx-fail">Not sent. <button type="button" onClick={() => actions.retry(m.id)}>Retry</button> · <button type="button" onClick={() => actions.remove(m.id)}>Discard</button></div>}
              {Object.keys(m.reactions || {}).length > 0 && <div className="mx-reactions">
                {Object.entries(m.reactions).map(([e, users]) => <button type="button" key={e} className={users.includes(me.id) ? 'mine' : ''} disabled={!canReact} title={users.map((u) => personOf(u).name).join(', ')} onClick={() => actions.react(m.id, e)}><span>{e}</span><b>{users.length}</b></button>)}
                {canReact && <button type="button" className="add" aria-label="Add reaction" onClick={() => setReactFor(reactFor === m.id ? null : m.id)}><Icon name="smile" size={14} /></button>}
              </div>}
            </div>
          </div>
          {!isEditing && !m.pending && !m.failed && <div className="mx-tools" role="toolbar" aria-label="Message actions">
            {canReact && <button type="button" title="Add reaction" aria-label="Add reaction" onClick={() => setReactFor(reactFor === m.id ? null : m.id)}><Icon name="smile" size={16} /></button>}
            <button type="button" title="Reply" aria-label="Reply" onClick={() => onReply(m)}><Icon name="reply" size={16} /></button>
            {mine && canEdit && !m.sticker && <button type="button" title="Edit" aria-label="Edit" onClick={() => setEditing(m.id)}><Icon name="edit" size={16} /></button>}
            {mine && canEdit && <button type="button" title="Delete" aria-label="Delete" onClick={() => onDelete(m)}><Icon name="trash" size={16} /></button>}
            {!mine && !m.sticker && <button type="button" title="Copy text" aria-label="Copy text" onClick={() => navigator.clipboard?.writeText(m.body)}><Icon name="copy" size={16} /></button>}
          </div>}
          {reactFor === m.id && <div className="mx-react-pop"><EmojiPicker quick onPick={(e) => { actions.react(m.id, e); setReactFor(null); }} /></div>}
        </article>;
      })}
      {list.length === 0 && !loading && query && <div className="mx-nomatch">No matches for “{query}” in loaded messages.</div>}
    </div>
    {(showJump || away > 0) && <button type="button" className="mx-jump" onClick={() => { toBottom(true); setAway(0); }}>{away > 0 ? `${away} new message${away > 1 ? 's' : ''}` : 'Jump to latest'}<Icon name="down" size={14} /></button>}
  </div>;
}

function Editor({ initial, onSave, onCancel }) {
  const [v, setV] = useState(initial); const ref = useRef(null);
  useEffect(() => { const el = ref.current; el.focus(); el.setSelectionRange(v.length, v.length); }, []); // eslint-disable-line
  return <div className="mx-editor">
    <textarea ref={ref} rows="2" value={v} maxLength={2000} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(v); } else if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } }} />
    <small>Esc to <button type="button" onClick={onCancel}>cancel</button> · Enter to <button type="button" onClick={() => onSave(v)}>save</button></small>
  </div>;
}
