import React, { useEffect, useState } from 'react';
import Icon from './icons.jsx';
import { tone } from './format.jsx';

export function Avatar({ person, size = 36, status, onClick, title }) {
  const letter = person?.avatar || person?.name?.[0]?.toUpperCase() || '?';
  const Tag = onClick ? 'button' : 'span';
  return <Tag type={onClick ? 'button' : undefined} className={`mx-avatar t${tone(person?.id || person?.name)}`} style={{ '--s': `${size}px` }} onClick={onClick} title={title}>
    <span>{letter}</span>
    {status && <i className={`mx-dot ${status}`} aria-label={status === 'on' ? 'Online' : 'Offline'} />}
  </Tag>;
}

export const EMOJI = {
  Smileys: ['😀', '😄', '😂', '🥹', '😊', '😍', '😎', '🤔', '😴', '🥲', '😅', '🙃', '😌', '🤗', '😮', '😢'],
  Hands: ['👍', '👎', '👏', '🙌', '🙏', '💪', '👋', '🤝', '👀', '🫶', '✌️', '🤞'],
  Hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '✨', '🔥', '💯'],
  Things: ['🎉', '🎵', '🎨', '📚', '🎬', '☕', '🍜', '🌿', '🌙', '☀️', '🚀', '💡', '🎮', '🏔️', '🐈', '🌧️'],
};
const QUICK = ['👍', '❤️', '😂', '🔥', '👀', '🎉'];

export function EmojiPicker({ onPick, quick = false }) {
  const [recent, setRecent] = useState(() => { try { return JSON.parse(localStorage.getItem('intersect-recent-emoji') || '[]'); } catch { return []; } });
  const pick = (e) => {
    const next = [e, ...recent.filter((x) => x !== e)].slice(0, 8);
    setRecent(next); try { localStorage.setItem('intersect-recent-emoji', JSON.stringify(next)); } catch { /* ignore */ }
    onPick(e);
  };
  if (quick) return <div className="mx-pop mx-quick" role="menu">{QUICK.map((e) => <button key={e} type="button" onClick={() => pick(e)}>{e}</button>)}</div>;
  return <div className="mx-pop mx-emoji" role="menu">
    {recent.length > 0 && <><b>Recent</b><div>{recent.map((e) => <button key={e} type="button" onClick={() => pick(e)}>{e}</button>)}</div></>}
    {Object.entries(EMOJI).map(([k, list]) => <React.Fragment key={k}><b>{k}</b><div>{list.map((e) => <button key={e} type="button" onClick={() => pick(e)}>{e}</button>)}</div></React.Fragment>)}
  </div>;
}

export function Modal({ title, eyebrow, onClose, children, wide }) {
  useEffect(() => { const h = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return <div className="mx-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className={`mx-modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="mx-icon-btn mx-modal-x" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      {eyebrow && <div className="mx-eyebrow">{eyebrow}</div>}
      <h3>{title}</h3>
      {children}
    </div>
  </div>;
}
