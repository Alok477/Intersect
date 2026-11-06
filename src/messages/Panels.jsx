import React, { useLayoutEffect, useRef, useState } from 'react';
import Icon from './icons.jsx';
import { Avatar } from './ui.jsx';

export const sharedWith = (a = [], b = []) => a.filter((x) => b.some((y) => y.toLowerCase() === x.toLowerCase()));

export function Interests({ items = [], mine = [] }) {
  const shared = new Set(sharedWith(items, mine).map((x) => x.toLowerCase()));
  return <div className="mx-tags">{items.map((t) => <span key={t} className={shared.has(t.toLowerCase()) ? 'shared' : ''} title={shared.has(t.toLowerCase()) ? 'You share this' : ''}>{t}</span>)}</div>;
}

function ConnectAction({ state, person, onConnect, onMessage, onRequests }) {
  if (state === 'connected') return <button type="button" className="mx-btn primary" onClick={onMessage}><Icon name="chat" size={15} />Message</button>;
  if (state === 'pending') return <button type="button" className="mx-btn" disabled>Request sent</button>;
  if (state === 'incoming') return <button type="button" className="mx-btn primary" onClick={onRequests}>Respond to request</button>;
  return <button type="button" className="mx-btn primary" onClick={() => onConnect(person)}>Connect</button>;
}

/** Floating profile card anchored to the clicked avatar/name. */
export function ProfileCard({ person, anchor, mine, state, online, onClose, onConnect, onMessage, onProfile, onRequests }) {
  const ref = useRef(null); const [pos, setPos] = useState({ left: 12, top: 12 });
  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect(); const w = 300; const h = ref.current?.offsetHeight || 260;
    setPos({ left: Math.max(12, Math.min(window.innerWidth - w - 12, r.right + 10)), top: Math.max(12, Math.min(window.innerHeight - h - 12, r.top - 20)) });
  }, [anchor]);
  return <div className="mx-backdrop clear" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="mx-card" ref={ref} style={pos} role="dialog" aria-label={`${person.name} profile`}>
      <div className="mx-card-top"><Avatar person={person} size={56} status={online ? 'on' : 'off'} /><div><h4>{person.name}{person.age ? `, ${person.age}` : ''}</h4><small>{online ? 'Online' : 'Offline'}{person.pronouns ? ` · ${person.pronouns}` : ''}</small></div></div>
      {person.bio && <p>{person.bio}</p>}
      {person.interests?.length > 0 && <><div className="mx-eyebrow">Interests</div><Interests items={person.interests} mine={mine} /></>}
      {sharedWith(person.interests, mine).length > 0 && <small className="mx-shared">You both like {sharedWith(person.interests, mine).join(', ')}.</small>}
      <div className="mx-card-actions"><ConnectAction state={state} person={person} onConnect={onConnect} onMessage={onMessage} onRequests={onRequests} /><button type="button" className="mx-btn" onClick={onProfile}>View profile</button></div>
    </div>
  </div>;
}

export function MemberList({ members, online, meId, onOpen }) {
  const on = members.filter((p) => online.has(p.id) || p.id === meId); const off = members.filter((p) => !on.includes(p));
  const row = (p, isOn) => <button type="button" key={p.id} className={`mx-member ${isOn ? '' : 'off'}`} onClick={(e) => onOpen(p.id, e.currentTarget)}><Avatar person={p} size={32} status={isOn ? 'on' : 'off'} /><span><b>{p.name}{p.id === meId ? ' (you)' : ''}</b><small>{p.bio ? p.bio.slice(0, 34) : isOn ? 'Online' : 'Offline'}</small></span></button>;
  return <div className="mx-members">
    <div className="mx-eyebrow">Online — {on.length}</div>{on.map((p) => row(p, true))}
    {off.length > 0 && <><div className="mx-eyebrow">Offline — {off.length}</div>{off.map((p) => row(p, false))}</>}
  </div>;
}

export function DmProfile({ person, mine, online, state, onConnect, onProfile, onRequests }) {
  return <div className="mx-dmprofile">
    <div className="mx-dm-banner" />
    <Avatar person={person} size={76} status={online ? 'on' : 'off'} />
    <h3>{person.name}</h3><small>{online ? 'Online now' : 'Offline'}</small>
    {person.bio && <p>{person.bio}</p>}
    {(person.location || person.occupation) && <p className="mx-facts">{[person.occupation, person.location].filter(Boolean).join(' · ')}</p>}
    {person.interests?.length > 0 && <><div className="mx-eyebrow">Interests</div><Interests items={person.interests} mine={mine} /></>}
    {person.preference && <><div className="mx-eyebrow">Here for</div><p>{person.preference}</p></>}
    <div className="mx-card-actions">{state !== 'connected' && <ConnectAction state={state} person={person} onConnect={onConnect} onRequests={onRequests} />}<button type="button" className="mx-btn" onClick={onProfile}>View profile</button></div>
  </div>;
}
