import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from './icons.jsx';
import Feed from './Feed.jsx';
import Composer from './Composer.jsx';
import { Avatar } from './ui.jsx';
import { DmProfile, Interests, MemberList, ProfileCard, sharedWith } from './Panels.jsx';
import { Confirm, CreateChannel, CreateCommunity, Explore, Switcher } from './Modals.jsx';
import { shortWhen, snippet } from './format.jsx';

const badge = (n) => (n > 99 ? '99+' : n);

export default function Messages({ data, update, navigate, dmId, chat, presence, people, connectedIds, requestState, connect }) {
  const meId = chat.meId;
  const me = useMemo(() => ({ id: meId, name: data.profile.name || 'You', avatar: (data.profile.name || 'Y').slice(0, 1).toUpperCase(), interests: data.profile.interests }), [meId, data.profile]);
  const directory = useMemo(() => { const m = new Map(people.map((p) => [p.id, p])); m.set(meId, { ...(m.get(meId) || {}), ...me }); return m; }, [people, me, meId]);
  const personOf = useCallback((id) => directory.get(id) || { id, name: 'Intersect member', avatar: 'I' }, [directory]);
  const members = useMemo(() => [...directory.values()].sort((a, b) => a.name.localeCompare(b.name)), [directory]);
  const names = useMemo(() => members.map((p) => p.name), [members]);

  const [mode, setMode] = useState('channels');
  const [communityId, setCommunityId] = useState(chat.communities[0]?.id);
  const [channelByCommunity, setChannelByCommunity] = useState({});
  const [pane, setPane] = useState(dmId ? 'chat' : 'nav');
  const [wide] = useState(() => window.matchMedia('(min-width: 1180px)').matches);
  const [showInfo, setShowInfo] = useState(wide);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [card, setCard] = useState(null);
  const [menu, setMenu] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [focusKey, setFocusKey] = useState(0);
  const [toast, setToast] = useState('');

  const community = chat.communities.find((c) => c.id === communityId) || chat.communities[0];
  const channel = community ? (community.channels.find((c) => c.id === channelByCommunity[community.id]) || community.channels[0]) : null;
  const inDm = Boolean(dmId);
  const scope = inDm ? `dm:${dmId}` : mode === 'channels' && channel ? `ch:${channel.id}` : null;
  const partner = inDm ? personOf(dmId) : null;
  const connected = inDm && connectedIds.has(dmId);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(''), 2200); };

  // load + read tracking
  const [anchor, setAnchor] = useState({ scope: null, at: undefined });
  useEffect(() => { setReplyTo(null); setEditing(null); setQuery(''); setSearchOpen(false); if (scope) { setAnchor({ scope, at: chat.reads[scope] }); chat.open(scope); } }, [scope]); // eslint-disable-line
  const list = scope ? chat.msgs[scope] || [] : [];
  const lastId = list[list.length - 1]?.id;
  useEffect(() => { if (scope && (pane === 'chat' || window.innerWidth > 760)) chat.markRead(scope); }, [scope, lastId, pane]); // eslint-disable-line
  useEffect(() => { const h = () => document.visibilityState === 'visible' && scope && chat.markRead(scope); document.addEventListener('visibilitychange', h); return () => document.removeEventListener('visibilitychange', h); }, [scope]); // eslint-disable-line
  useEffect(() => { if (dmId) setPane('chat'); }, [dmId]);
  useEffect(() => { if (!chat.error) return undefined; const t = setTimeout(chat.clearError, 5000); return () => clearTimeout(t); }, [chat.error]); // eslint-disable-line
  useEffect(() => { const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setModal({ type: 'switch' }); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);

  const firstUnread = anchor.scope === scope ? list.find((m) => m.senderId !== meId && m.createdAt > (anchor.at || ''))?.id : null;
  const filtered = query.trim() ? list.filter((m) => `${m.body} ${personOf(m.senderId).name}`.toLowerCase().includes(query.trim().toLowerCase())) : list;

  // sidebar data
  const dmIds = useMemo(() => [...new Set([...connectedIds, ...Object.keys(chat.msgs).filter((s) => s.startsWith('dm:') && chat.msgs[s].length).map((s) => s.slice(3))])], [connectedIds, chat.msgs]);
  const dmRows = useMemo(() => dmIds.map((id) => ({ id, p: personOf(id), last: chat.last(`dm:${id}`), n: chat.unread(`dm:${id}`) })).sort((a, b) => (b.last?.createdAt || '').localeCompare(a.last?.createdAt || '') || a.p.name.localeCompare(b.p.name)), [dmIds, chat, personOf]);
  const eff = (s) => (chat.muted[s] ? 0 : chat.unread(s));
  const dmTotal = dmRows.reduce((n, r) => n + (chat.muted[`dm:${r.id}`] ? 0 : r.n), 0);
  const commUnread = (c) => c.channels.reduce((n, ch) => n + eff(`ch:${ch.id}`), 0);

  const openChannel = (c, ch) => { setMode('channels'); setCommunityId(c.id); setChannelByCommunity((m) => ({ ...m, [c.id]: ch.id })); if (dmId) navigate('messages'); setPane('chat'); setMenu(false); };
  const openDm = (id) => { navigate(`chat:${id}`); setPane('chat'); };
  const goHome = () => { setMode('home'); if (dmId) navigate('messages'); setPane('nav'); };
  const openProfile = (id, el) => { if (id === meId) return navigate('profile'); setCard({ id, el }); };
  const actions = useMemo(() => ({ edit: (id, v) => chat.edit(scope, id, v), remove: (id) => chat.remove(scope, id), retry: (id) => chat.retry(scope, id), react: (id, e) => chat.react(scope, id, e) }), [chat, scope]);
  const editLast = () => { const mine = [...list].reverse().find((m) => m.senderId === meId && !m.sticker && !m.pending); if (mine && chat.features.rich) setEditing(mine.id); };

  const typingNames = scope ? presence.typingIn(scope) : [];
  const typingText = typingNames.length === 1 ? `${typingNames[0]} is typing…` : typingNames.length === 2 ? `${typingNames[0]} and ${typingNames[1]} are typing…` : typingNames.length > 2 ? 'Several people are typing…' : '';
  const online = presence.online;
  const mine = data.profile.interests || [];
  const stickers = data.stickers || [];
  const switchItems = useMemo(() => [...chat.communities.flatMap((c) => c.channels.map((ch) => ({ key: `ch-${ch.id}`, label: ch.name, hint: c.name, c, ch }))), ...dmRows.map((r) => ({ key: `dm-${r.id}`, label: r.p.name, hint: 'Direct message', person: r.p, dm: r.id }))], [chat.communities, dmRows]);

  const icebreakers = inDm ? [partner.prompt, sharedWith(partner.interests, mine)[0] ? `You both like ${sharedWith(partner.interests, mine)[0]}. What got you into it?` : null, 'What are you making time for lately?'].filter(Boolean) : [];
  const dmEmpty = inDm && <div className="mx-dm-empty">
    <Avatar person={partner} size={84} status={online.has(dmId) ? 'on' : 'off'} />
    <h2>{partner.name}</h2>
    <p>{connected ? (list.length ? `This is the beginning of your conversation with ${partner.name}.` : `Say hello to ${partner.name}. A good first message is specific and curious.`) : 'You are not connected yet.'}</p>
    {partner.interests?.length > 0 && <Interests items={partner.interests} mine={mine} />}
    {connected && !list.length && <><div className="mx-eyebrow">Break the ice</div><div className="mx-ice">{icebreakers.map((t) => <button type="button" key={t} onClick={() => { chat.setDraft(scope, t); setFocusKey((k) => k + 1); }}>{t}</button>)}</div></>}
  </div>;
  const channelEmpty = channel && !inDm && <div className="mx-ch-empty"><div className="mx-ch-hash"><Icon name="hash" size={30} /></div><h2>Welcome to #{channel.name}</h2><p>{channel.topic} This is the start of the channel — say something.</p></div>;

  const lockedNote = !connected && inDm ? (requestState(dmId) === 'pending' ? `Your request to ${partner.name} is pending. You can chat once they accept.` : requestState(dmId) === 'incoming' ? `${partner.name} sent you a request. Accept it to start chatting.` : `Connect with ${partner.name} to start a conversation.`) : '';
  const canReact = chat.features.reactions; const canEdit = chat.features.rich;
  const send = (text) => { chat.send(scope, { body: text, replyTo: replyTo?.id || null }); setReplyTo(null); };
  const sendSticker = (s) => chat.send(scope, { body: s.name, sticker: s.emoji, replyTo: replyTo?.id || null });
  const markAllRead = () => { chat.markAll([...(community?.channels || []).map((c) => `ch:${c.id}`)]); setMenu(false); };

  const pickSwitch = (x) => { setModal(null); x.dm ? openDm(x.dm) : openChannel(x.c, x.ch); };
  const createCommunity = (v) => { const c = chat.createCommunity(v); setModal(null); openChannel(c, c.channels[0]); };
  const showSide = pane === 'nav';

  return <div className="mx" data-pane={pane} data-info={showInfo ? 'on' : 'off'}>
    {/* rail */}
    <nav className="mx-rail" aria-label="Communities">
      <button type="button" className={`mx-server home ${mode === 'home' || inDm ? 'active' : ''}`} onClick={goHome} title="Direct messages"><Icon name="chat" size={20} />{dmTotal > 0 && <b className="mx-badge">{badge(dmTotal)}</b>}</button>
      <span className="mx-rail-sep" />
      {chat.communities.map((c) => { const n = commUnread(c); const on = !inDm && mode === 'channels' && community?.id === c.id; return <button type="button" key={c.id} className={`mx-server ${on ? 'active' : ''} ${n ? 'unread' : ''}`} onClick={() => openChannel(c, c.channels.find((x) => x.id === channelByCommunity[c.id]) || c.channels[0])} title={c.name}><span>{c.icon}</span>{n > 0 && <b className="mx-badge">{badge(n)}</b>}</button>; })}
      <button type="button" className="mx-server ghost" onClick={() => setModal({ type: 'create' })} title="Create a community"><Icon name="plus" size={20} /></button>
      <button type="button" className="mx-server ghost" onClick={() => setModal({ type: 'explore' })} title="Explore communities"><Icon name="compass" size={20} /></button>
    </nav>

    {/* sidebar */}
    <aside className="mx-side" hidden={!showSide && false}>
      {mode === 'home' || inDm ? <>
        <div className="mx-side-head"><strong>Messages</strong><button type="button" className="mx-icon-btn" title="Quick switcher (Ctrl/⌘ K)" aria-label="Quick switcher" onClick={() => setModal({ type: 'switch' })}><Icon name="search" /></button></div>
        <div className="mx-side-scroll">
          <div className="mx-eyebrow row">Direct messages <button type="button" className="mx-icon-btn" title="Find people" aria-label="Find people" onClick={() => navigate('discover')}><Icon name="plus" size={15} /></button></div>
          {dmRows.map((r) => { const m = chat.muted[`dm:${r.id}`]; return <button type="button" key={r.id} className={`mx-row dm ${dmId === r.id ? 'active' : ''} ${r.n && !m ? 'unread' : ''} ${m ? 'muted' : ''}`} onClick={() => openDm(r.id)}>
            <Avatar person={r.p} size={34} status={online.has(r.id) ? 'on' : 'off'} />
            <span className="mx-row-text"><b>{r.p.name}</b><small>{r.last ? `${r.last.senderId === meId ? 'You: ' : ''}${snippet(r.last, 38)}` : 'No messages yet'}</small></span>
            <span className="mx-row-meta">{r.last && <time>{shortWhen(r.last.createdAt)}</time>}{r.n > 0 && !m && <b className="mx-badge inline">{badge(r.n)}</b>}</span>
          </button>; })}
          {!dmRows.length && <p className="mx-side-empty">No conversations yet. Connect with someone in Discover to start one.</p>}
          <button type="button" className="mx-row link" onClick={() => navigate('connections')}><Icon name="users" size={16} />Connections &amp; requests</button>
        </div>
      </> : community ? <>
        <button type="button" className="mx-side-head menu" onClick={() => setMenu((v) => !v)} aria-expanded={menu}><strong>{community.name}</strong><Icon name="chevron" size={16} /></button>
        {menu && <div className="mx-menu" onMouseLeave={() => setMenu(false)}>
          <button type="button" onClick={markAllRead}><Icon name="check" size={15} />Mark all as read</button>
          {community.ownerId === meId && <button type="button" onClick={() => { setMenu(false); setModal({ type: 'channel' }); }}><Icon name="plus" size={15} />New channel</button>}
          {community.id !== 'intersect' && <button type="button" className="danger" onClick={() => { setMenu(false); setModal({ type: 'leave' }); }}>Leave community</button>}
        </div>}
        <div className="mx-side-scroll">
          <div className="mx-eyebrow row">Text channels {community.ownerId === meId && <button type="button" className="mx-icon-btn" title="New channel" aria-label="New channel" onClick={() => setModal({ type: 'channel' })}><Icon name="plus" size={15} /></button>}</div>
          {community.channels.map((ch) => { const n = chat.unread(`ch:${ch.id}`); const m = chat.muted[`ch:${ch.id}`]; const on = ch.id === channel?.id; return <button type="button" key={ch.id} className={`mx-row ch ${on ? 'active' : ''} ${n && !m ? 'unread' : ''} ${m ? 'muted' : ''}`} onClick={() => openChannel(community, ch)}><Icon name="hash" size={16} /><b>{ch.name}</b>{m ? <Icon name="bellOff" size={13} /> : n > 0 && !on ? <b className="mx-badge inline">{badge(n)}</b> : null}</button>; })}
        </div>
      </> : <div className="mx-side-scroll"><p className="mx-side-empty">You have not joined a community yet.</p><button type="button" className="mx-btn primary" onClick={() => setModal({ type: 'explore' })}>Explore communities</button></div>}
      <div className="mx-user">
        <button type="button" className="mx-user-id" onClick={() => navigate('profile')} title="Edit your profile"><Avatar person={me} size={34} status="on" /><span><b>{me.name}</b><small>{data.profile.availability || 'Open to messages'}</small></span></button>
        <button type="button" className="mx-icon-btn" title="Settings" aria-label="Settings" onClick={() => navigate('settings')}><Icon name="gear" /></button>
      </div>
    </aside>

    {/* main */}
    <section className="mx-main">
      {scope ? <>
        <header className="mx-head">
          <button type="button" className="mx-icon-btn mx-back" onClick={() => setPane('nav')} aria-label="Back"><Icon name="back" /></button>
          {inDm ? <button type="button" className="mx-head-title" onClick={(e) => openProfile(dmId, e.currentTarget)}><Avatar person={partner} size={28} status={online.has(dmId) ? 'on' : 'off'} /><h2>{partner.name}</h2><small>{online.has(dmId) ? 'Online' : 'Offline'}</small></button>
            : <div className="mx-head-title"><Icon name="hash" size={20} /><h2>{channel.name}</h2><small title={channel.topic}>{channel.topic}</small></div>}
          <div className="mx-head-actions">
            {searchOpen ? <div className="mx-search"><Icon name="search" size={15} /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && (setQuery(''), setSearchOpen(false))} placeholder="Search loaded messages" /><button type="button" className="mx-icon-btn" onClick={() => { setQuery(''); setSearchOpen(false); }} aria-label="Close search"><Icon name="close" size={14} /></button></div>
              : <button type="button" className="mx-icon-btn" title="Search" aria-label="Search" onClick={() => setSearchOpen(true)}><Icon name="search" /></button>}
            <button type="button" className={`mx-icon-btn ${chat.muted[scope] ? 'on' : ''}`} title={chat.muted[scope] ? 'Unmute' : 'Mute notifications'} aria-label="Toggle mute" onClick={() => { chat.toggleMute(scope); flash(chat.muted[scope] ? 'Unmuted' : 'Muted — no badges or notifications'); }}><Icon name={chat.muted[scope] ? 'bellOff' : 'bell'} /></button>
            <button type="button" className={`mx-icon-btn ${showInfo ? 'on' : ''}`} title={inDm ? 'Profile' : 'Members'} aria-label="Toggle side panel" onClick={() => setShowInfo((v) => !v)}><Icon name={inDm ? 'sidebar' : 'users'} /></button>
          </div>
        </header>
        {chat.error && <div className="mx-error" role="alert">{chat.error}<button type="button" onClick={chat.clearError} aria-label="Dismiss"><Icon name="close" size={14} /></button></div>}
        <Feed scope={scope} list={filtered} loading={chat.status[scope] === 'loading' && !list.length} hasMore={Boolean(chat.more[scope]) && !query}
          onLoadEarlier={() => chat.loadEarlier(scope)} me={me} personOf={personOf} names={names} refs={chat.refs} query={query.trim()} firstUnread={query ? null : firstUnread}
          empty={inDm ? dmEmpty : channelEmpty} actions={actions} canReact={canReact} canEdit={canEdit} onReply={(m) => setReplyTo(m)} onProfile={openProfile}
          editing={editing} setEditing={setEditing} onDelete={(m) => setModal({ type: 'delete', m })} />
        <div className="mx-typing" aria-live="polite">{typingText && <><span className="mx-dots"><i /><i /><i /></span>{typingText}</>}</div>
        <Composer scope={scope} focusKey={focusKey} label={inDm ? `Message ${partner.name}` : `Message #${channel.name}`} draft={chat.drafts[scope] || ''} setDraft={(t) => chat.setDraft(scope, t)}
          onSend={send} onSticker={sendSticker} stickers={stickers} canSticker={!inDm || chat.features.rich} addSticker={(name, emoji) => update({ stickers: [...stickers, { id: `sticker-${Date.now()}`, name, emoji }] })}
          replyTo={replyTo} replyName={replyTo ? personOf(replyTo.senderId).name : ''} cancelReply={() => setReplyTo(null)} onTyping={() => presence.notifyTyping(scope)} onEditLast={editLast}
          members={inDm ? [partner] : members.filter((p) => p.id !== meId)} locked={inDm && !connected} lockedNote={lockedNote} />
        {inDm && !connected && <div className="mx-connect-bar">{requestState(dmId) === 'none' ? <button type="button" className="mx-btn primary" onClick={() => connect(partner)}>Send connection request</button> : requestState(dmId) === 'incoming' ? <button type="button" className="mx-btn primary" onClick={() => navigate('connections')}>Review request</button> : null}</div>}
      </> : <div className="mx-home">
        <div className="mx-eyebrow">Messages</div>
        <h2>Say hello to someone</h2>
        <p>Conversations live here, next to your communities. Pick someone you’re connected with, or jump into a channel.</p>
        <div className="mx-home-grid">
          {dmRows.slice(0, 6).map((r) => <button type="button" key={r.id} onClick={() => openDm(r.id)}><Avatar person={r.p} size={40} status={online.has(r.id) ? 'on' : 'off'} /><span><b>{r.p.name}</b><small>{r.last ? snippet(r.last, 40) : 'Start the conversation'}</small></span></button>)}
        </div>
        <div className="mx-home-actions"><button type="button" className="mx-btn primary" onClick={() => navigate('discover')}>Find people</button><button type="button" className="mx-btn" onClick={() => setModal({ type: 'explore' })}>Explore communities</button></div>
        <small className="mx-kbd">Tip: press <kbd>Ctrl</kbd> <kbd>K</kbd> to jump anywhere.</small>
      </div>}
      {toast && <div className="mx-toast" role="status">{toast}</div>}
    </section>

    {/* info panel */}
    {scope && <aside className="mx-info" aria-label={inDm ? 'Profile' : 'Members'}>
      <div className="mx-info-head"><strong>{inDm ? 'Profile' : 'Members'}</strong><button type="button" className="mx-icon-btn mx-info-x" onClick={() => setShowInfo(false)} aria-label="Close panel"><Icon name="close" /></button></div>
      {inDm ? <DmProfile person={partner} mine={mine} online={online.has(dmId)} state={requestState(dmId)} onConnect={connect} onProfile={() => navigate(`person:${dmId}`)} onRequests={() => navigate('connections')} />
        : <MemberList members={members} online={online} meId={meId} onOpen={openProfile} />}
    </aside>}

    {card && <ProfileCard person={personOf(card.id)} anchor={card.el} mine={mine} online={online.has(card.id)} state={requestState(card.id)} onClose={() => setCard(null)} onConnect={(p) => { connect(p); flash(`Request sent to ${p.name}`); setCard(null); }}
      onMessage={() => { const id = card.id; setCard(null); openDm(id); }} onProfile={() => { const id = card.id; setCard(null); navigate(`person:${id}`); }} onRequests={() => { setCard(null); navigate('connections'); }} />}
    {modal?.type === 'create' && <CreateCommunity onClose={() => setModal(null)} onCreate={createCommunity} />}
    {modal?.type === 'channel' && community && <CreateChannel community={community} onClose={() => setModal(null)} onCreate={(v) => { const ch = chat.addChannel(community.id, v); setModal(null); setChannelByCommunity((m) => ({ ...m, [community.id]: ch.id })); setPane('chat'); }} />}
    {modal?.type === 'explore' && <Explore all={chat.allCommunities} joined={chat.communities.map((c) => c.id)} onClose={() => setModal(null)} onCreate={() => setModal({ type: 'create' })}
      onJoin={(c) => { chat.joinCommunity(c.id); setModal(null); openChannel(c, c.channels[0]); }} onLeave={(id) => { chat.leaveCommunity(id); if (communityId === id) setCommunityId(chat.communities.find((c) => c.id !== id)?.id); }} onOpen={(c) => { setModal(null); openChannel(c, c.channels[0]); }} />}
    {modal?.type === 'leave' && community && <Confirm title={`Leave ${community.name}?`} body="You can rejoin anytime from Explore." action="Leave" onClose={() => setModal(null)} onConfirm={() => { const id = community.id; const next = chat.communities.find((c) => c.id !== id); chat.leaveCommunity(id); setCommunityId(next?.id); if (!next) setMode('home'); setModal(null); }} />}
    {modal?.type === 'delete' && <Confirm title="Delete this message?" body={snippet(modal.m, 140)} action="Delete" onClose={() => setModal(null)} onConfirm={() => { chat.remove(scope, modal.m.id); setModal(null); }} />}
    {modal?.type === 'switch' && <Switcher items={switchItems} onPick={pickSwitch} onClose={() => setModal(null)} />}
  </div>;
}
