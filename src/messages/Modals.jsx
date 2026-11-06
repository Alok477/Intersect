import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './icons.jsx';
import { Avatar, Modal } from './ui.jsx';
import { slug } from './format.jsx';

export function CreateCommunity({ onClose, onCreate }) {
  const [name, setName] = useState(''); const [desc, setDesc] = useState('');
  return <Modal title="Give your people a place to gather" eyebrow="Create community" onClose={onClose}>
    <form className="mx-form" onSubmit={(e) => { e.preventDefault(); if (name.trim() && desc.trim()) onCreate({ name: name.trim(), description: desc.trim() }); }}>
      <label>Community name<input autoFocus required maxLength="32" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sunday Sketch Club" /></label>
      <label>What is it about?<textarea required maxLength="160" rows="3" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the conversation this community is for." /></label>
      <div className="mx-form-actions"><button type="button" className="mx-btn" onClick={onClose}>Cancel</button><button className="mx-btn primary" disabled={!name.trim() || !desc.trim()}>Create</button></div>
    </form>
  </Modal>;
}

export function CreateChannel({ community, onClose, onCreate }) {
  const [name, setName] = useState(''); const [topic, setTopic] = useState('');
  const clean = slug(name);
  return <Modal title={`New channel in ${community.name}`} eyebrow="Create channel" onClose={onClose}>
    <form className="mx-form" onSubmit={(e) => { e.preventDefault(); if (clean) onCreate({ name: clean, topic: topic.trim() || `Talk about ${clean}.` }); }}>
      <label>Channel name<span className="mx-prefix"><i>#</i><input autoFocus required maxLength="30" value={name} onChange={(e) => setName(e.target.value)} placeholder="book-club" /></span></label>
      <label>Topic (optional)<input maxLength="120" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What belongs here?" /></label>
      <div className="mx-form-actions"><button type="button" className="mx-btn" onClick={onClose}>Cancel</button><button className="mx-btn primary" disabled={!clean}>Create channel</button></div>
    </form>
  </Modal>;
}

export function Explore({ all, joined, onJoin, onLeave, onOpen, onCreate, onClose }) {
  return <Modal title="Find a community" eyebrow="Explore" onClose={onClose} wide>
    <div className="mx-explore">
      {all.map((c) => { const isIn = joined.includes(c.id); return <div className="mx-explore-row" key={c.id}>
        <span className="mx-server-ico static">{c.icon}</span>
        <div><b>{c.name}</b><p>{c.description}</p><small>{c.channels.length} channel{c.channels.length > 1 ? 's' : ''}{c.official ? ' · Official' : ''}</small></div>
        {isIn ? <><button type="button" className="mx-btn" onClick={() => onOpen(c)}>Open</button>{c.id !== 'intersect' && <button type="button" className="mx-btn ghost" onClick={() => onLeave(c.id)}>Leave</button>}</> : <button type="button" className="mx-btn primary" onClick={() => onJoin(c)}>Join</button>}
      </div>; })}
    </div>
    <div className="mx-form-actions"><button type="button" className="mx-btn" onClick={onCreate}><Icon name="plus" size={15} />Create your own</button></div>
  </Modal>;
}

export function Confirm({ title, body, action, onConfirm, onClose }) {
  return <Modal title={title} onClose={onClose}>
    <p className="mx-modal-text">{body}</p>
    <div className="mx-form-actions"><button type="button" className="mx-btn" onClick={onClose}>Cancel</button><button type="button" autoFocus className="mx-btn danger" onClick={onConfirm}>{action}</button></div>
  </Modal>;
}

export function Switcher({ items, onPick, onClose }) {
  const [q, setQ] = useState(''); const [i, setI] = useState(0); const list = useRef(null);
  const shown = useMemo(() => items.filter((x) => x.label.toLowerCase().includes(q.toLowerCase().replace(/^[#@]/, ''))).slice(0, 12), [items, q]);
  useEffect(() => setI(0), [q]);
  useEffect(() => { list.current?.querySelector('.on')?.scrollIntoView({ block: 'nearest' }); }, [i]);
  const key = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setI((n) => Math.min(n + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setI((n) => Math.max(n - 1, 0)); }
    else if (e.key === 'Enter' && shown[i]) { e.preventDefault(); onPick(shown[i]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };
  return <div className="mx-backdrop top" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="mx-switcher" role="dialog" aria-label="Quick switcher" onKeyDown={key}>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jump to a channel or person…" />
      <div ref={list}>{shown.map((x, n) => <button type="button" key={x.key} className={n === i ? 'on' : ''} onMouseEnter={() => setI(n)} onClick={() => onPick(x)}>
        {x.person ? <Avatar person={x.person} size={24} /> : <span className="mx-hash"><Icon name="hash" size={15} /></span>}<b>{x.label}</b><small>{x.hint}</small>
      </button>)}{!shown.length && <p className="mx-modal-text">Nothing matches “{q}”.</p>}</div>
      <footer><span>↑↓ navigate</span><span>↵ open</span><span>esc close</span></footer>
    </div>
  </div>;
}
