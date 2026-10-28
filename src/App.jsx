import React, { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from './lib/supabase';
import darkBrandLogo from '../assets/intersect-logo-dark.svg';
import lightBrandLogo from '../assets/intersect-logo-light.svg';

const people = [
  { id: 'alex', name: 'Alex Morgan', age: 27, avatar: 'A', bio: 'Curious about quiet places, unexpected details, and people who notice them.', interests: ['Books', 'Films', 'Coffee'], preference: 'Friendship', prompt: 'What hobby could you talk about for hours?' },
  { id: 'sam', name: 'Sam Rivera', age: 29, avatar: 'S', bio: 'Always looking for a new trail, a good playlist, and a reason to make something.', interests: ['Music', 'Art', 'Fitness'], preference: 'Both', prompt: 'Choose one: late-night conversations or spontaneous adventures?' },
  { id: 'jordan', name: 'Jordan Lee', age: 25, avatar: 'J', bio: 'Film nerd, casual gamer, and enthusiastic organiser of low-key group nights.', interests: ['Films', 'Gaming', 'Books'], preference: 'Friendship', prompt: 'What movie do you wish you could watch again for the first time?' },
];

const hangoutSeed = [
  { id: 'circle', title: 'Question Circle', type: 'Conversation', description: 'A gentle round of prompts for people who like meaningful conversations.', host: 'Maya', participants: 6, capacity: 10, visibility: 'Public' },
  { id: 'this-or-that', title: 'This or That', type: 'Playful', description: 'Vote, compare, and discover where your preferences overlap.', host: 'Alex', participants: 8, capacity: 12, visibility: 'Public' },
  { id: 'common-ground', title: 'Common Ground', type: 'Interests', description: 'Find the small things you have in common with a welcoming group.', host: 'Sam', participants: 4, capacity: 8, visibility: 'Public' },
];

const chatServerSeed = [
  { id: 'intersect', name: 'Intersect', icon: 'I', channels: [{ id: 'welcome', name: 'welcome', topic: 'Start here and say hello.' }, { id: 'general', name: 'general', topic: 'Talk about anything curious.' }, { id: 'films', name: 'films', topic: 'Recommendations, rewatches, and scene debates.' }] },
  { id: 'slow-makers', name: 'Slow Makers', icon: 'S', channels: [{ id: 'lounge', name: 'lounge', topic: 'Share works in progress.' }, { id: 'feedback', name: 'feedback', topic: 'Thoughtful feedback only.' }] },
];

const initialData = {
  screen: 'landing',
  requests: [],
  receivedRequests: ['sam'],
  connected: [],
  joinedHangouts: [],
  hangouts: hangoutSeed,
  joinedCommunities: [],
  messages: [{ id: 'alex', name: 'Alex Morgan', avatar: 'A', body: 'That prompt was a good one. What are you reading lately?', unread: 1, history: [] }],
  notifications: [{ id: 'welcome', text: 'Welcome to Intersect. Start by exploring people with shared interests.', read: false }],
  profile: { name: 'Your name', bio: 'Still figuring out what to put here.', interests: ['Books', 'Films'], preference: 'Friendship', location: '', pronouns: '', occupation: '', about: '', lookingFor: 'New conversations', availability: 'Open to messages' },
  settings: { requestPolicy: 'People with shared interests', visibility: 'Discoverable' },
  chatServers: chatServerSeed,
  stickers: [{ id: 'spark', name: 'Spark', emoji: '✨' }, { id: 'wave', name: 'Wave', emoji: '👋' }, { id: 'coffee', name: 'Coffee', emoji: '☕' }],
  channelMessages: {
    welcome: [{ author: 'Maya', avatar: 'M', body: 'Welcome to Intersect. Tell us one thing you are curious about today.', time: 'Today at 10:12' }],
    general: [{ author: 'Alex Morgan', avatar: 'A', body: 'What is everyone making time for lately?', time: 'Today at 10:18' }],
    films: [{ author: 'Jordan Lee', avatar: 'J', body: 'The Film Club is sharing comfort-movie recommendations in here.', time: 'Yesterday at 19:42' }],
    lounge: [{ author: 'Maya', avatar: 'M', body: 'A quiet place to share what you are working on.', time: 'Today at 09:05' }],
    feedback: [],
  },
};

function loadData(storageKey = 'intersect-social') {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return {
      ...initialData,
      ...saved,
      messages: Array.isArray(saved.messages) && saved.messages.length ? saved.messages : initialData.messages,
      requests: Array.isArray(saved.requests) ? saved.requests : initialData.requests,
      receivedRequests: Array.isArray(saved.receivedRequests) ? saved.receivedRequests : initialData.receivedRequests,
      connected: Array.isArray(saved.connected) ? saved.connected : initialData.connected,
      channelMessages: saved.channelMessages && typeof saved.channelMessages === 'object' ? { ...initialData.channelMessages, ...saved.channelMessages } : initialData.channelMessages,
      hangouts: Array.isArray(saved.hangouts) && saved.hangouts.length ? saved.hangouts : hangoutSeed,
      chatServers: Array.isArray(saved.chatServers) && saved.chatServers.length ? saved.chatServers : chatServerSeed,
      stickers: Array.isArray(saved.stickers) ? saved.stickers : initialData.stickers,
      profile: { ...initialData.profile, ...(saved.profile || {}) },
      screen: 'landing',
    };
  } catch {
    return initialData;
  }
}

function App() {
  const [data, setData] = useState(loadData);
  const [theme, setTheme] = useState(() => localStorage.getItem('intersect-theme') === 'light');
  const [storageNotice, setStorageNotice] = useState('');
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(supabaseConfigured);
  const [authNotice, setAuthNotice] = useState('');
  const [remotePeople, setRemotePeople] = useState([]);
  const [remoteRequests, setRemoteRequests] = useState([]);
  const dataStorageKey = session ? `intersect-social:${session.user.id}` : 'intersect-social';
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data: result, error }) => {
      if (!active) return;
      if (error) setAuthNotice(error.message);
      setSession(result?.session || null);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (session) setData(loadData(`intersect-social:${session.user.id}`));
  }, [session]);
  useEffect(() => {
    if (!supabase || !session) return;
    let active = true;
    const syncSocialData = async () => {
      const [{ data: profile }, { data: profiles }, { data: requests }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
        supabase.from('profiles').select('*').eq('discoverable', true).neq('id', session.user.id).order('display_name'),
        supabase.from('connection_requests').select('*').or(`requester_id.eq.${session.user.id},addressee_id.eq.${session.user.id}`).order('created_at', { ascending: false }),
      ]);
      if (!active) return;
      if (profile) {
        const accountName = session.user.user_metadata?.display_name?.trim();
        if (!profile.display_name && accountName) {
          await supabase.from('profiles').upsert({ id: session.user.id, display_name: accountName }, { onConflict: 'id' });
        }
        setData((current) => ({
          ...current,
          profile: {
            ...current.profile,
            name: profile.display_name || accountName || current.profile.name,
            bio: profile.bio ?? current.profile.bio,
            about: profile.about ?? current.profile.about,
            location: profile.location ?? current.profile.location,
            pronouns: profile.pronouns ?? current.profile.pronouns,
            occupation: profile.occupation ?? current.profile.occupation,
            interests: Array.isArray(profile.interests) ? profile.interests : current.profile.interests,
            lookingFor: profile.looking_for ?? current.profile.lookingFor,
            availability: profile.availability ?? current.profile.availability,
            preference: profile.connection_preference ?? current.profile.preference,
          },
        }));
      }
      setRemotePeople((profiles || []).map((item) => ({
        id: item.id,
        name: item.display_name || 'Intersect member',
        age: item.age || '',
        avatar: (item.display_name || 'I').slice(0, 1).toUpperCase(),
        bio: item.bio || 'Still writing their introduction.',
        about: item.about || '',
        interests: Array.isArray(item.interests) ? item.interests : [],
        preference: item.connection_preference || 'Friendship',
        prompt: 'What are you making time for lately?',
      })));
      setRemoteRequests((current) => {
        const fetched = requests || [];
        const currentById = new Map(current.filter((request) => !String(request.id).startsWith('pending-')).map((request) => [request.id, request]));
        const merged = fetched.map((request) => currentById.get(request.id) || request);
        const fetchedPairs = new Set(fetched.map((request) => `${request.requester_id}:${request.addressee_id}`));
        return [...merged, ...current.filter((request) => String(request.id).startsWith('pending-') && !fetchedPairs.has(`${request.requester_id}:${request.addressee_id}`))];
      });
    };
    syncSocialData();
    const channel = supabase.channel(`social:${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connection_requests' }, syncSocialData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, syncSocialData)
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [session]);
  useEffect(() => {
    if (!supabase || !session) return undefined;
    let active = true;
    const handleIncomingMessage = async (payload) => {
      const message = payload.new;
      if (!message || message.sender_id === session.user.id) return;
      const { data: conversation } = await supabase
        .from('conversations')
        .select('member_a, member_b')
        .eq('id', message.conversation_id)
        .maybeSingle();
      if (!active || !conversation) return;
      const senderId = conversation.member_a === session.user.id ? conversation.member_b : conversation.member_a;
      const sender = remotePeople.find((person) => person.id === senderId);
      const senderName = sender?.name || 'A connection';
      setData((current) => {
        const notifications = Array.isArray(current.notifications) ? current.notifications : [];
        if (notifications.some((item) => item.id === `message-${message.id}`)) return current;
        const directMessages = Array.isArray(current.messages) ? current.messages : [];
        const existing = directMessages.find((item) => item.id === senderId);
        const nextConversation = existing
          ? { ...existing, name: senderName, avatar: sender?.avatar || existing.avatar, body: message.body, unread: (existing.unread || 0) + 1 }
          : { id: senderId, name: senderName, avatar: sender?.avatar || senderName.slice(0, 1).toUpperCase(), body: message.body, unread: 1, history: [] };
        return {
          ...current,
          messages: [...directMessages.filter((item) => item.id !== senderId), nextConversation],
          notifications: [...notifications, {
            id: `message-${message.id}`,
            text: `${senderName} sent you a message: ${message.body}`,
            read: false,
            screen: `chat:${senderId}`,
          }],
        };
      });
    };
    const channel = supabase.channel(`inbox:${session.user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, handleIncomingMessage)
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [session, remotePeople]);
  useEffect(() => {
    try { localStorage.setItem(dataStorageKey, JSON.stringify(data)); } catch { setStorageNotice('Local saving is unavailable; changes will last for this session.'); }
  }, [data, dataStorageKey]);
  useEffect(() => {
    try { localStorage.setItem('intersect-theme', theme ? 'light' : 'dark'); } catch { setStorageNotice('Theme preference could not be saved.'); }
    document.body.classList.toggle('light-mode', theme);
  }, [theme]);
  const navigate = (screen) => setData((current) => ({ ...current, screen }));
  const update = (patch) => setData((current) => ({ ...current, ...patch }));
  const sendConnectionRequest = async (person) => {
    if (!supabase || !session) return;
    setRemoteRequests((current) => [...current, {
      id: `pending-${person.id}`,
      requester_id: session.user.id,
      addressee_id: person.id,
      status: 'pending',
    }]);
    const { error } = await supabase.from('connection_requests').insert({ requester_id: session.user.id, addressee_id: person.id });
    if (error && error.code !== '23505') {
      setRemoteRequests((current) => current.filter((request) => request.id !== `pending-${person.id}`));
      setAuthNotice(`Connection request failed: ${error.message}`);
    }
  };
  const respondToConnection = async (request, status) => {
    if (!supabase) return;
    setRemoteRequests((current) => current.map((item) => item.id === request.id ? { ...item, status } : item));
    const { error } = await supabase.from('connection_requests').update({ status }).eq('id', request.id);
    if (error) {
      setRemoteRequests((current) => current.map((item) => item.id === request.id ? request : item));
      setAuthNotice(`Connection update failed: ${error.message}`);
    }
  };
  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setAuthNotice(error.message);
  };
  if (authLoading) return <div className="auth-loading"><img className="auth-loading-logo" src={theme ? lightBrandLogo : darkBrandLogo} alt="" /><span>Loading your Intersect session…</span></div>;
  if (supabaseConfigured && !session) return <AuthScreen notice={authNotice} setNotice={setAuthNotice} theme={theme} />;
  return <div className={`app-shell ${theme ? 'light-theme' : ''}`}>
    <header className="topbar app-topbar">
      <button className="brand" onClick={() => navigate('landing')} aria-label="Intersect home"><img className="brand-logo" src={theme ? lightBrandLogo : darkBrandLogo} alt="Intersect" /></button>
      <nav className="main-nav" aria-label="Main navigation">
        {[['landing', 'home'], ['discover', 'discover'], ['messages', 'messages'], ['connections', 'connections']].map(([screen, label]) => <button key={screen} className={data.screen === screen ? 'active' : ''} onClick={() => navigate(screen)}>{label}</button>)}
      </nav>
      <div className="topbar-right"><button className="theme-toggle" type="button" onClick={() => setTheme((value) => !value)} aria-label={`Switch to ${theme ? 'dark' : 'light'} theme`} title={`Switch to ${theme ? 'dark' : 'light'} theme`}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{theme ? <path d="M20.2 15.4A8.6 8.6 0 0 1 8.6 3.8 8.7 8.7 0 1 0 20.2 15.4Z" /> : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>}</svg></button><button className="profile-menu" onClick={() => navigate('profile')}>{data.profile.name}</button></div>
    </header>
    <div key={data.screen} className="screen-transition">
      {data.screen === 'landing' && <Landing />}
      {data.screen === 'discover' && <Discover data={data} update={update} navigate={navigate} remotePeople={remotePeople} remoteRequests={remoteRequests} sendConnectionRequest={sendConnectionRequest} />}
      {data.screen.startsWith('person:') && <Person id={data.screen.split(':')[1]} data={data} update={update} navigate={navigate} remotePeople={remotePeople} remoteRequests={remoteRequests} sendConnectionRequest={sendConnectionRequest} />}
      {data.screen === 'messages' && <Messages data={data} update={update} navigate={navigate} remotePeople={remotePeople} remoteRequests={remoteRequests} session={session} />}
      {data.screen.startsWith('chat:') && <Chat id={data.screen.split(':')[1]} data={data} update={update} navigate={navigate} remotePeople={remotePeople} remoteRequests={remoteRequests} session={session} />}
      {data.screen === 'connections' && <Connections data={data} update={update} navigate={navigate} remotePeople={remotePeople} remoteRequests={remoteRequests} respondToConnection={respondToConnection} />}
      {data.screen === 'notifications' && <Notifications data={data} update={update} navigate={navigate} />}
      {data.screen === 'profile' && <Profile data={data} update={update} session={session} />}
      {data.screen === 'settings' && <Settings data={data} update={update} theme={theme} setTheme={setTheme} navigate={navigate} />}
    </div>
    {storageNotice && <div className="toast" role="status">{storageNotice}</div>}
    {data.screen !== 'landing' && <footer className="footer"><img className="footer-brand-logo" src={theme ? lightBrandLogo : darkBrandLogo} alt="Intersect" /> <span>Signed in as {session?.user?.email || 'local demo'}</span><button className="text-button" onClick={() => navigate('notifications')}>Notifications ({data.notifications.filter((item) => !item.read).length})</button><button className="text-button" onClick={() => navigate('settings')}>Settings</button>{session && <button className="text-button" onClick={signOut}>Sign out</button>}</footer>}
  </div>;
}

function AuthScreen({ notice, setNotice, theme }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() } } });
    if (result.error) setNotice(result.error.message);
    else if (mode === 'signup' && !result.data.session) setNotice('Account created. Check your email to confirm your account, then sign in.');
    setBusy(false);
  };
  return <main className={`auth-page ${theme ? 'light-theme' : ''}`}><section className="auth-card"><div className="auth-brand"><img className="auth-brand-logo" src={theme ? lightBrandLogo : darkBrandLogo} alt="Intersect" /></div><h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1><p>{mode === 'login' ? 'Sign in to continue your conversations.' : 'Join people through shared interests.'}</p><p className="auth-testing-note">Testing mode: you can use a dummy email such as test-one@example.com. Use a real email only if email confirmation is enabled.</p><form onSubmit={submit}>{mode === 'signup' && <label>Display name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label>}<label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Password<input required minLength="6" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label>{notice && <p className="auth-notice" role="alert">{notice}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}</button></form><button className="text-button auth-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setNotice(''); }}>{mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}</button></section></main>;
}

function Landing() {
  return <main className="landing page-width"><section className="hero"><div className="eyebrow"><span className="eyebrow-dot" /> A different way to meet</div><h1>Intersect</h1><p className="hero-copy">Skip the small talk. Find people with shared interests, start something together, and see where the conversation takes.</p></section><section className="home-description"><p>Intersect is a social discovery platform that brings people together through shared interests, interactive hangouts, fun activities, and meaningful conversations. Designed to make connecting beyond swipes more engaging and natural.</p></section></main>;
}

function Page({ title, eyebrow, children, actions }) { return <main className="app-page page-width"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> {eyebrow}</div><h2>{title}</h2></div>{actions}</div>{children}</main>; }
function Tags({ items = [] }) { return <div className="tags">{items.map((item) => <span className="tag" key={item}>{item}</span>)}</div>; }
function PersonCard({ person, data, update, navigate, remoteRequests = [], sendConnectionRequest }) {
  const requests = Array.isArray(data.requests) ? data.requests : [];
  const connected = Array.isArray(data.connected) ? data.connected : [];
  const sent = requests.includes(person.id) || connected.includes(person.id) || remoteRequests.some((request) => (request.requester_id === person.id || request.addressee_id === person.id) && ['pending', 'accepted'].includes(request.status));
  const sendRequest = () => {
    if (sent) return;
    if (sendConnectionRequest) {
      sendConnectionRequest(person);
      return;
    }
    update({ requests: [...requests, person.id], notifications: [...data.notifications, { id: `request-${person.id}-${Date.now()}`, text: `Connection request sent to ${person.name}.`, read: false }] });
  };
  return <article className="person-card"><div className="avatar">{person.avatar}</div><div className="card-content"><div className="card-title"><h3>{person.name}{person.age ? `, ${person.age}` : ''}</h3><span className="status-dot">●</span></div><p>{person.bio}</p><Tags items={person.interests} /><small>{person.preference} · Shared-interest score {Math.min(99, person.interests.length * 22)}%</small><div className="card-actions"><button className="secondary-button" onClick={() => navigate(`person:${person.id}`)}>View profile</button><button className="primary-button" disabled={sent} onClick={sendRequest}>{sent ? 'Request sent' : 'Connect'}</button></div></div></article>;
}
function Discover({ data, update, navigate, remotePeople = [], remoteRequests = [], sendConnectionRequest }) {
  const [query, setQuery] = useState(''); const [preference, setPreference] = useState('All');
  const allPeople = remotePeople.length ? remotePeople : people;
  const results = allPeople.filter((person) => `${person.name} ${person.bio} ${person.interests.join(' ')}`.toLowerCase().includes(query.toLowerCase()) && (preference === 'All' || person.preference === preference || person.preference === 'Both'));
  return <Page title="Find your people" eyebrow="Discover · shared interests"><p className="lead">People are more than a profile. Start with a shared curiosity and let the rest unfold naturally.</p>{remotePeople.length > 0 && <p className="connection-note">Showing signed-in Intersect members.</p>}<div className="filter-bar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people or interests" /><select value={preference} onChange={(event) => setPreference(event.target.value)}><option>All</option><option>Friendship</option><option>Dating</option><option>Both</option></select></div><div className="section-heading"><h3>Suggested for you</h3><span>{results.length} people</span></div><div className="person-grid">{results.map((person) => <PersonCard key={person.id} person={person} data={data} update={update} navigate={navigate} remoteRequests={remoteRequests} sendConnectionRequest={sendConnectionRequest} />)}</div>{!results.length && <Empty text="No people match those filters yet." />}</Page>;
}
function Person({ id, data, update, navigate, remotePeople = [], remoteRequests = [], sendConnectionRequest }) {
  const person = [...remotePeople, ...people].find((item) => item.id === id) || people[0]; const requests = Array.isArray(data.requests) ? data.requests : []; const connectedIds = Array.isArray(data.connected) ? data.connected : []; const remoteConnection = remoteRequests.find((request) => request.requester_id === person.id || request.addressee_id === person.id); const sent = requests.includes(person.id) || ['pending', 'accepted'].includes(remoteConnection?.status); const connected = connectedIds.includes(person.id) || remoteConnection?.status === 'accepted';
  return <Page title={person.name} eyebrow="Person profile"><div className="profile-header"><div className="avatar avatar-large">{person.avatar}</div><div><h3>{person.name}{person.age ? `, ${person.age}` : ''}</h3><p>{person.bio}</p><Tags items={person.interests} /></div></div><div className="detail-grid"><section className="detail-card"><h3>About</h3><p>{person.about || 'Curious, kind, and interested in meeting people through shared experiences rather than endless small talk.'}</p><h3>Preferred connection</h3><p>{person.preference}</p></section><section className="detail-card"><h3>Conversation prompts</h3><button className="prompt-button" onClick={() => navigate(`chat:${person.id}`)}>“{person.prompt}”</button><button className="prompt-button" onClick={() => navigate(`chat:${person.id}`)}>“What are you making time for lately?”</button></section></div><div className="page-actions">{connected ? <button className="primary-button" onClick={() => navigate(`chat:${person.id}`)}>Message</button> : <button className="primary-button" disabled={sent} onClick={() => { if (sendConnectionRequest) sendConnectionRequest(person); else update({ requests: [...requests, person.id] }); }}>{sent ? 'Request pending' : 'Send connection request'}</button>}<button className="text-button" onClick={() => update({ notifications: [...data.notifications, { id: `report-${person.id}`, text: `Safety report for ${person.name} has been recorded for review.`, read: false }] })}>Block or report</button></div></Page>;
}
function Hangouts({ data, update, navigate }) { const [showCreate, setShowCreate] = useState(false); return <Page title="Hangouts" eyebrow="Experience · meet through activities" actions={<button className="primary-button" onClick={() => setShowCreate(true)}>Create hangout <span>＋</span></button>}><p className="lead">Structured activities make it easier to join a room, contribute, and find common ground.</p><div className="featured-hangout"><span className="eyebrow">Featured activity</span><h3>Question Circle</h3><p>One prompt, a few thoughtful answers, and a room full of new perspectives.</p><button className="primary-button" onClick={() => navigate('hangout:circle')}>Join featured room</button></div><div className="section-heading"><h3>Active and upcoming</h3><span>{data.hangouts.length} rooms</span></div><div className="hangout-grid">{data.hangouts.map((item) => <HangoutCard key={item.id} item={item} data={data} update={update} navigate={navigate} />)}</div>{showCreate && <CreateHangout data={data} close={() => setShowCreate(false)} update={update} navigate={navigate} />}</Page>; }
function HangoutCard({ item, data, update, navigate }) { const joined = data.joinedHangouts.includes(item.id); const full = item.participants >= item.capacity && !joined; return <article className="hangout-card"><span className="eyebrow">{item.type}</span><h3>{item.title}</h3><p>{item.description}</p><small>Hosted by {item.host} · {item.participants}/{item.capacity} participants · {item.visibility}</small><button className="secondary-button" disabled={full} onClick={() => { if (!joined) update({ joinedHangouts: [...data.joinedHangouts, item.id] }); navigate(`hangout:${item.id}`); }}>{joined ? 'Open room' : full ? 'Full' : 'Join room'}</button></article>; }
function CreateHangout({ data, close, update, navigate }) { const [title, setTitle] = useState(''); const [type, setType] = useState('Question Circle'); const [capacity, setCapacity] = useState(10); return <div className="modal-backdrop"><form className="modal-card" onSubmit={(event) => { event.preventDefault(); const cleanTitle = title.trim(); const numericCapacity = Number(capacity); if (!cleanTitle || numericCapacity < 2 || numericCapacity > 50) return; const id = `custom-${Date.now()}`; const item = { id, title: cleanTitle, type, description: 'A new space for people to meet through a shared activity.', host: 'You', participants: 1, capacity: numericCapacity, visibility: 'Public' }; update({ hangouts: [...data.hangouts, item], joinedHangouts: [...data.joinedHangouts, id], notifications: [...data.notifications, { id, text: `Your hangout “${cleanTitle}” was created.`, read: false }] }); close(); navigate(`hangout:${id}`); }}><button type="button" className="modal-close" onClick={close}>×</button><div className="eyebrow">Create hangout</div><h3>Make room for a good conversation</h3><label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Sunday sketch club" /></label><label>Activity type<select value={type} onChange={(event) => setType(event.target.value)}><option>Question Circle</option><option>This or That</option><option>Would You Rather</option><option>Common Ground</option></select></label><label>Capacity<input type="number" min="2" max="50" value={capacity} onChange={(event) => setCapacity(event.target.value)} /></label><div className="page-actions"><button type="button" className="secondary-button" onClick={close}>Cancel</button><button className="primary-button">Create</button></div></form></div>; }
function HangoutRoom({ id, data, update, navigate }) { const item = hangoutSeed.find((entry) => entry.id === id) || { title: 'Your hangout', type: 'Question Circle', description: 'A space for shared answers.' }; const [response, setResponse] = useState(''); const [answers, setAnswers] = useState([]); return <Page title={item.title} eyebrow={`Hangout room · ${item.type}`} actions={<button className="secondary-button" onClick={() => navigate('hangouts')}>Leave room</button>}><div className="room-layout"><section className="activity-card"><span className="eyebrow">Round 1</span><h3>{item.type === 'This or That' ? 'Late nights or early mornings?' : 'What hobby could you talk about for hours?'}</h3><p>Share a short answer. There are no wrong answers here.</p><form className="response-form" onSubmit={(event) => { event.preventDefault(); if (response.trim()) { setAnswers([...answers, response.trim()]); setResponse(''); } }}><input maxLength="240" value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Write your answer..." /><button className="primary-button">Share</button></form>{answers.map((answer) => <div className="response" key={answer}><span className="avatar">Y</span><p>{answer}<small>just now · ♡ React</small></p></div>)}</section><aside className="detail-card"><h3>In this room</h3><p>Alex Morgan</p><p>Sam Rivera</p><p>You</p><button className="text-button">Invite or share ↗</button></aside></div></Page>; }
function Messages({ data, update, navigate, remotePeople = [], remoteRequests = [], session }) {
  const savedServers = Array.isArray(data.chatServers) ? data.chatServers.map((item) => item && item.id && Array.isArray(item.channels) ? { ...item, channels: item.channels.filter((channel) => channel && channel.id && typeof channel.name === 'string') } : null).filter((item) => item && item.channels.length) : [];
  const servers = savedServers.length ? savedServers : chatServerSeed;
  const savedDirectMessages = Array.isArray(data.messages) ? data.messages.filter((item) => item && item.id && typeof item.name === 'string') : [];
  const connectedPeople = remotePeople.filter((person) => remoteRequests.some((request) => (request.requester_id === person.id || request.addressee_id === person.id) && request.status === 'accepted'));
  const directMessages = [...savedDirectMessages, ...connectedPeople.filter((person) => !savedDirectMessages.some((item) => item.id === person.id)).map((person) => ({ id: person.id, name: person.name, avatar: person.avatar, body: '', unread: 0, history: [] }))];
  const [serverId, setServerId] = useState(servers[0].id);
  const [channelId, setChannelId] = useState('general');
  const [body, setBody] = useState('');
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showMembers, setShowMembers] = useState(true);
  const [showChannels, setShowChannels] = useState(false);
  const [notice, setNotice] = useState('');
  const [reactions, setReactions] = useState({});
  const [picker, setPicker] = useState('');
  const [stickerName, setStickerName] = useState('');
  const [stickerEmoji, setStickerEmoji] = useState('');
  const server = servers.find((item) => item.id === serverId) || servers[0];
  const channel = server.channels.find((item) => item.id === channelId) || server.channels[0];
  const channelMessages = data.channelMessages && typeof data.channelMessages === 'object' ? data.channelMessages : initialData.channelMessages;
  const allMessages = Array.isArray(channelMessages[channel.id]) ? channelMessages[channel.id].filter((item) => item && typeof item.body === 'string' && typeof item.author === 'string') : [];
  const [sharedMessages, setSharedMessages] = useState([]);
  const [sharedLoading, setSharedLoading] = useState(Boolean(supabase && session));
  const [sharedError, setSharedError] = useState('');
  const currentUserId = session?.user?.id || 'local-user';
  useEffect(() => {
    if (!supabase || !session) {
      setSharedLoading(false);
      setSharedMessages([]);
      return undefined;
    }
    let active = true;
    setSharedLoading(true);
    setSharedError('');
    const loadChannelMessages = async () => {
      const { data: rows, error } = await supabase.from('channel_messages').select('id, channel_id, sender_id, body, sticker, created_at').eq('channel_id', channel.id).order('created_at', { ascending: true });
      if (!active) return;
      if (error) setSharedError(`Channel messages could not load: ${error.message}`);
      else setSharedMessages((rows || []).map((row) => {
        const sender = row.sender_id === currentUserId ? { name: data.profile.name || 'You', avatar: (data.profile.name || 'Y').slice(0, 1).toUpperCase() } : remotePeople.find((person) => person.id === row.sender_id);
        return { id: row.id, author: sender?.name || 'Intersect member', avatar: sender?.avatar || 'I', body: row.body, sticker: row.sticker || undefined, time: new Date(row.created_at).toLocaleString() };
      }));
      setSharedLoading(false);
    };
    loadChannelMessages();
    const realtimeChannel = supabase.channel(`channel:${channel.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'channel_messages', filter: `channel_id=eq.${channel.id}` }, (payload) => {
        if (!active) return;
        const row = payload.new;
        setSharedMessages((current) => current.some((message) => message.id === row.id) ? current : [...current, {
          id: row.id,
          author: row.sender_id === currentUserId ? (data.profile.name || 'You') : (remotePeople.find((person) => person.id === row.sender_id)?.name || 'Intersect member'),
          avatar: row.sender_id === currentUserId ? (data.profile.name || 'Y').slice(0, 1).toUpperCase() : (remotePeople.find((person) => person.id === row.sender_id)?.avatar || 'I'),
          body: row.body,
          sticker: row.sticker || undefined,
          time: new Date(row.created_at).toLocaleString(),
        }]);
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(realtimeChannel); };
  }, [channel.id, session, remotePeople, data.profile.name]);
  const visibleMessages = supabase && session ? sharedMessages : allMessages;
  const messages = visibleMessages.filter((item) => !search.trim() || item.body.toLowerCase().includes(search.toLowerCase()) || item.author.toLowerCase().includes(search.toLowerCase()));
  const selectChannel = (nextId) => { setChannelId(nextId); setSearch(''); setSearchOpen(false); setPicker(''); setBody(''); };
  const showNotice = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 2200); };
  const openProfile = (name) => {
    if (name === data.profile.name || name === 'You') navigate('profile');
    else {
      const person = [...remotePeople, ...people].find((item) => item.name === name);
      if (person) navigate(`person:${person.id}`);
      else showNotice(`${name} does not have a public profile yet.`);
    }
  };
  const onlineMembers = [
    { name: data.profile.name || 'You', avatar: (data.profile.name || 'Y').slice(0, 1).toUpperCase(), status: 'Online', id: currentUserId, current: true },
    ...remotePeople.filter((person) => person.id !== currentUserId).map((person) => ({ ...person, status: 'Online' })),
  ];
  const sendMessage = (event) => {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody) return;
    if (supabase && session) {
      const sendSharedMessage = async () => {
        setSharedError('');
        const { error } = await supabase.from('channel_messages').insert({ channel_id: channel.id, sender_id: currentUserId, body: cleanBody });
        if (error) setSharedError(`Message could not be sent: ${error.message}`);
        else {
          setBody('');
          setPicker('');
        }
      };
      sendSharedMessage();
      return;
    }
    update({ channelMessages: { ...channelMessages, [channel.id]: [...allMessages, { author: data.profile.name || 'You', avatar: (data.profile.name || 'Y').slice(0, 1).toUpperCase(), body: cleanBody, time: 'Just now' }] } });
    setBody('');
    setPicker('');
  };
  const insertEmoji = (emoji) => { setBody((current) => `${current}${emoji}`); setPicker(''); };
  const sendSticker = (sticker) => {
    if (supabase && session) {
      const sendSharedSticker = async () => {
        setSharedError('');
        const { error } = await supabase.from('channel_messages').insert({ channel_id: channel.id, sender_id: currentUserId, body: sticker.name, sticker: sticker.emoji });
        if (error) setSharedError(`Sticker could not be sent: ${error.message}`);
        else setPicker('');
      };
      sendSharedSticker();
      return;
    }
    update({ channelMessages: { ...channelMessages, [channel.id]: [...allMessages, { author: data.profile.name || 'You', avatar: (data.profile.name || 'Y').slice(0, 1).toUpperCase(), body: sticker.name, sticker: sticker.emoji, time: 'Just now' }] } });
    setPicker('');
  };
  const addSticker = () => {
    const name = stickerName.trim();
    const emoji = stickerEmoji.trim();
    if (!name || !emoji) return;
    update({ stickers: [...(Array.isArray(data.stickers) ? data.stickers : initialData.stickers), { id: `sticker-${Date.now()}`, name, emoji }] });
    setStickerName('');
    setStickerEmoji('');
    showNotice(`${name} was added to your stickers.`);
  };
  return <main className="discord-page page-width">
    <div className="discord-shell">
      <aside className="discord-servers" aria-label="Servers">{servers.map((item) => <button key={item.id} className={`server-icon ${item.id === server.id ? 'active' : ''}`} title={`Open ${item.name}`} onClick={() => { setServerId(item.id); selectChannel(item.channels[0].id); setShowChannels(true); }}>{item.icon}</button>)}<button className="server-icon add-server" title="Create a community" onClick={() => setShowCreateCommunity(true)}>＋</button></aside>
      <aside className={`discord-channels ${showChannels ? 'mobile-open' : ''}`}>
        <div className="discord-server-heading"><strong>{server.name}</strong><button className="icon-button" title="Server options" onClick={() => showNotice('Server settings are available when this demo has a shared backend.')}>···</button></div>
        <div className="channel-section-label">TEXT CHANNELS <button className="icon-button" title="Create a community" onClick={() => setShowCreateCommunity(true)}>＋</button></div>
        {server.channels.map((item) => <button key={item.id} className={`channel-button ${item.id === channel.id ? 'active' : ''}`} onClick={() => { selectChannel(item.id); setShowChannels(false); }}><span>#</span>{item.name}{item.id === 'general' ? <b>2</b> : null}</button>)}
        <div className="channel-section-label direct-label">DIRECT MESSAGES <button className="icon-button" title="Start a direct message" onClick={() => navigate('discover')}>＋</button></div>
        {directMessages.map((item) => <button key={item.id} className={`dm-button ${item.unread ? 'unread' : ''}`} onClick={() => { update({ messages: directMessages.map((entry) => entry.id === item.id ? { ...entry, unread: 0 } : entry) }); navigate(`chat:${item.id}`); }}><span className="avatar avatar-small">{item.avatar || item.name.slice(0, 1)}</span><span>{item.name}<small>{item.body || 'No messages yet'}</small></span>{item.unread ? <b>{item.unread}</b> : null}</button>)}
      </aside>
      <section className="discord-main">
        <header className="channel-header"><div className="channel-title"><h2><span>#</span>{channel.name}</h2><p>{channel.topic}</p></div><div className="channel-actions"><button className="mobile-channel-toggle" title="Show channels" onClick={() => setShowChannels((value) => !value)}>☰</button><button title="Toggle channel notifications" onClick={() => showNotice(`Notifications ${channel.name === 'general' ? 'enabled' : 'muted'} for #${channel.name}.`)}>◔</button><button title="Show pinned messages" onClick={() => showNotice('There are no pinned messages in this channel yet.')}>⌖</button><button title="Open threads" onClick={() => showNotice('Threads will appear here when someone replies to a message.')}>↗</button><button title="Search messages" onClick={() => setSearchOpen((value) => !value)}>⌕</button><button title="Toggle member list" onClick={() => setShowMembers((value) => !value)}>♙</button></div></header>
        {searchOpen && <div className="discord-search"><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search #${channel.name}`} /><button type="button" onClick={() => { setSearch(''); setSearchOpen(false); }}>Close</button></div>}
        <div className="discord-message-list">{sharedError && <p className="auth-notice" role="alert">{sharedError}</p>}{sharedLoading && <p className="connection-note">Loading shared channel…</p>}{messages.length ? messages.map((message, index) => <article className="discord-message" key={`${message.id || message.author}-${message.time}-${index}`}><button className="avatar avatar-button" title={`Open ${message.author}'s profile`} onClick={() => openProfile(message.author)}>{message.avatar}</button><div><div className="message-meta"><button className="author-button" onClick={() => openProfile(message.author)}>{message.author}</button><time>{message.time}</time></div>{message.sticker ? <div className="message-sticker" title={message.body}>{message.sticker}<small>{message.body}</small></div> : <p>{message.body}</p>}<div className="message-reactions"><button onClick={() => setReactions((current) => ({ ...current, [`${channel.id}-${index}`]: (current[`${channel.id}-${index}`] || 0) + 1 }))}>♡ {reactions[`${channel.id}-${index}`] || ''}</button><button onClick={() => setBody((current) => `${current}${current ? ' ' : ''}@${message.author} `)}>↩ Reply</button></div></div></article>) : !sharedLoading && <div className="discord-empty"><div className="channel-welcome">#</div><h3>{search ? 'No matching messages' : `Welcome to #${channel.name}!`}</h3><p>{search ? 'Try another search.' : 'This is the beginning of this channel.'}</p></div>}</div>
        <div className="composer-wrap">{picker === 'emoji' && <div className="picker-panel emoji-picker">{['😀', '😂', '😍', '👏', '🔥', '🎉', '💡', '❤️', '🙌', '👀', '🌿', '✨', '☕', '🎨', '🎵', '🚀'].map((emoji) => <button type="button" key={emoji} onClick={() => insertEmoji(emoji)}>{emoji}</button>)}</div>}{picker === 'sticker' && <div className="picker-panel sticker-picker">{(data.stickers || initialData.stickers).map((sticker) => <button type="button" key={sticker.id} onClick={() => sendSticker(sticker)}><span>{sticker.emoji}</span><small>{sticker.name}</small></button>)}<div className="sticker-add"><input value={stickerName} onChange={(event) => setStickerName(event.target.value)} placeholder="Sticker name" /><input value={stickerEmoji} onChange={(event) => setStickerEmoji(event.target.value)} placeholder="Emoji" maxLength="4" /><button type="button" className="secondary-button" onClick={addSticker}>Add custom</button></div></div>}<form className="discord-composer" onSubmit={sendMessage}><button type="button" title="Add an attachment" onClick={() => setBody((current) => `${current}${current ? ' ' : ''}[Attachment]`)}>＋</button><input aria-label={`Message #${channel.name}`} maxLength="500" value={body} onChange={(event) => setBody(event.target.value)} placeholder={`Message #${channel.name}`} /><button type="button" title="Add a GIF" onClick={() => setBody((current) => `${current}${current ? ' ' : ''}[GIF]`)}>GIF</button><button type="button" className={picker === 'sticker' ? 'composer-active' : ''} title="Open stickers" onClick={() => setPicker((current) => current === 'sticker' ? '' : 'sticker')}>Sticker</button><button type="button" className={picker === 'emoji' ? 'composer-active' : ''} title="Open emoji picker" onClick={() => setPicker((current) => current === 'emoji' ? '' : 'emoji')}>☺</button><button type="submit" className="composer-send" title="Send message">Send</button></form></div>
      </section>
      {showMembers && <aside className="discord-members"><h3>ONLINE — {onlineMembers.length}</h3>{onlineMembers.map((member) => <button className="member-row" key={member.id} onClick={() => member.current ? navigate('profile') : navigate(`person:${member.id}`)}><span className="avatar">{member.avatar}</span><span><strong>{member.name}</strong><small><i /> {member.status}</small></span></button>)}{!remotePeople.length && <><h3 className="member-heading">DEMO PROFILES</h3>{people.map((person) => <button className="member-row offline" key={person.id} onClick={() => navigate(`person:${person.id}`)}><span className="avatar">{person.avatar}</span><span><strong>{person.name}</strong><small>Demo profile</small></span></button>)}</>}</aside>}
    </div>
    <div className="discord-mobile-dm"><button className="secondary-button" onClick={() => connectedPeople.length ? navigate(`chat:${connectedPeople[0].id}`) : navigate('discover')}>{connectedPeople.length ? 'Open direct messages' : 'Find someone to message'}</button></div>{notice && <div className="discord-notice" role="status">{notice}</div>}{showCreateCommunity && <CreateCommunity data={data} update={update} close={() => setShowCreateCommunity(false)} selectServer={(id) => { setServerId(id); setChannelId(`${id}-general`); }} />}
  </main>;
}
function CreateCommunity({ data, update, close, selectServer }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const submit = (event) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanDescription = description.trim();
    if (!cleanName || !cleanDescription) return;
    const id = `community-${Date.now()}`;
    const community = { id, name: cleanName, icon: cleanName.slice(0, 1).toUpperCase(), channels: [{ id: `${id}-general`, name: 'general', topic: cleanDescription }] };
    const servers = data.chatServers || chatServerSeed;
    update({ chatServers: [...servers, community], channelMessages: { ...(data.channelMessages || {}), [`${id}-general`]: [] }, notifications: [...data.notifications, { id, text: `${cleanName} was created with a general text channel.`, read: false }] });
    close();
    selectServer(id);
  };
  return <div className="modal-backdrop"><form className="modal-card" onSubmit={submit}><button type="button" className="modal-close" onClick={close}>×</button><div className="eyebrow">Create community</div><h3>Give your people a place to gather</h3><label>Community name<input required maxLength="40" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sunday Sketch Club" /></label><label>What is it about?<textarea required maxLength="160" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the conversation this community is for." /></label><div className="page-actions"><button type="button" className="secondary-button" onClick={close}>Cancel</button><button className="primary-button">Create community</button></div></form></div>;
}
function Chat({ id, data, update, navigate, remotePeople = [], remoteRequests = [], session }) {
  const directMessages = Array.isArray(data.messages) ? data.messages.filter((item) => item && item.id && typeof item.name === 'string') : [];
  const remotePerson = remotePeople.find((person) => person.id === id);
  const isConnected = remotePerson && remoteRequests.some((request) => (request.requester_id === id || request.addressee_id === id) && request.status === 'accepted');
  const conversation = directMessages.find((item) => item.id === id) || (isConnected ? { id, name: remotePerson.name, avatar: remotePerson.avatar, body: '', unread: 0, history: [] } : null);
  const currentUserId = session?.user?.id || 'local-user';
  const normalizeHistory = (items) => (Array.isArray(items) ? items.map((item, index) => {
    if (typeof item === 'string') {
      return { id: `legacy-${index}`, body: item, senderId: index % 2 ? currentUserId : id, senderName: index % 2 ? data.profile.name : conversation?.name };
    }
    return item && typeof item.body === 'string' ? item : null;
  }).filter(Boolean) : []);
  const [body, setBody] = useState('');
  const [history, setHistory] = useState(() => normalizeHistory(conversation?.history));
  const [remoteConversationId, setRemoteConversationId] = useState(null);
  const [remoteLoading, setRemoteLoading] = useState(Boolean(isConnected && supabase && session));
  const [remoteError, setRemoteError] = useState('');
  useEffect(() => {
    const nextConversation = directMessages.find((item) => item.id === id) || (isConnected ? conversation : null);
    setHistory(normalizeHistory(nextConversation?.history));
    setBody('');
    if (nextConversation?.unread) update({ messages: directMessages.map((item) => item.id === nextConversation.id ? { ...item, unread: 0 } : item) });
  }, [id, isConnected]);
  useEffect(() => {
    if (!supabase || !session || !isConnected) {
      setRemoteLoading(false);
      return undefined;
    }
    let active = true;
    const memberA = [session.user.id, id].sort()[0];
    const memberB = [session.user.id, id].sort()[1];
    const loadRemoteConversation = async () => {
      setRemoteLoading(true);
      setRemoteError('');
      const { data: remoteConversation, error: conversationError } = await supabase
        .from('conversations')
        .select('id')
        .eq('member_a', memberA)
        .eq('member_b', memberB)
        .maybeSingle();
      if (!active) return;
      if (conversationError) {
        setRemoteError(`Conversation could not load: ${conversationError.message}`);
        setRemoteLoading(false);
        return;
      }
      if (!remoteConversation) {
        setRemoteConversationId(null);
        setHistory([]);
        setRemoteLoading(false);
        return;
      }
      setRemoteConversationId(remoteConversation.id);
      const { data: remoteMessages, error: messageError } = await supabase
        .from('messages')
        .select('id, body, sender_id, created_at')
        .eq('conversation_id', remoteConversation.id)
        .order('created_at', { ascending: true });
      if (!active) return;
      if (messageError) setRemoteError(`Messages could not load: ${messageError.message}`);
      else setHistory((remoteMessages || []).map((message) => ({ id: message.id, body: message.body, senderId: message.sender_id, senderName: message.sender_id === currentUserId ? data.profile.name : remotePerson.name })));
      setRemoteLoading(false);
    };
    loadRemoteConversation();
    const channel = supabase.channel(`conversation:${memberA}:${memberB}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (!active || payload.new.conversation_id !== remoteConversationId) return;
        setHistory((current) => current.some((message) => message.id === payload.new.id) ? current : [...current, {
          id: payload.new.id,
          body: payload.new.body,
          senderId: payload.new.sender_id,
          senderName: payload.new.sender_id === currentUserId ? data.profile.name : remotePerson.name,
        }]);
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [id, session, isConnected, remoteConversationId]);
  if (!conversation) return <Page title="Messages" eyebrow="Continue the conversation"><Empty text="No direct messages yet. Find someone in Discover to start chatting." action={() => navigate('discover')} /></Page>;
  const sendMessage = (event) => {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody) return;
    if (supabase && session && isConnected) {
      const memberA = [session.user.id, id].sort()[0];
      const memberB = [session.user.id, id].sort()[1];
      const sendRemoteMessage = async () => {
        setRemoteError('');
        let conversationId = remoteConversationId;
        if (!conversationId) {
          const { data: createdConversation, error: conversationError } = await supabase
            .from('conversations')
            .upsert({ member_a: memberA, member_b: memberB }, { onConflict: 'member_a,member_b' })
            .select('id')
            .single();
          if (conversationError) {
            setRemoteError(`Conversation could not be created: ${conversationError.message}`);
            return;
          }
          conversationId = createdConversation.id;
          setRemoteConversationId(conversationId);
        }
        const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: currentUserId, body: cleanBody });
        if (error) setRemoteError(`Message could not be sent: ${error.message}`);
        else setBody('');
      };
      sendRemoteMessage();
      return;
    }
    const next = [...history, {
      id: `${currentUserId}-${Date.now()}`,
      body: cleanBody,
      senderId: currentUserId,
      senderName: data.profile.name || 'You',
    }];
    setHistory(next);
    setBody('');
    const savedConversation = { ...conversation, body: cleanBody, history: next, unread: 0 };
    update({ messages: [...directMessages.filter((item) => item.id !== conversation.id), savedConversation] });
  };
  return <Page title={conversation.name} eyebrow="Private chat" actions={<button className="secondary-button" onClick={() => navigate('connections')}>View connection</button>}><div className="chat-window">{remoteLoading ? <p className="connection-note">Loading shared conversation…</p> : null}{remoteError ? <p className="auth-notice" role="alert">{remoteError}</p> : null}{history.length === 0 && !remoteLoading && <div className="empty-chat"><p>Start with a prompt from their profile.</p><button className="text-button" onClick={() => setBody('What are you making time for lately?')}>Use an icebreaker ↗</button></div>}{history.map((message) => <div className={`message ${message.senderId === currentUserId ? 'mine' : ''}`} key={message.id}>{message.body}</div>)}<form className="chat-form" onSubmit={sendMessage}><input maxLength="2000" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message..." /><button className="primary-button" disabled={remoteLoading}>Send</button></form></div></Page>;
}
function Connections({ data, update, navigate, remotePeople = [], remoteRequests = [], respondToConnection }) {
  if (remotePeople.length || remoteRequests.length) {
    const profileById = new Map(remotePeople.map((person) => [person.id, person]));
    const incomingRequests = remoteRequests.filter((request) => request.status === 'pending' && profileById.has(request.requester_id));
    const sentRequests = remoteRequests.filter((request) => request.status === 'pending' && profileById.has(request.addressee_id));
    const accepted = remoteRequests.filter((request) => request.status === 'accepted');
    const connected = accepted.map((request) => profileById.get(profileById.has(request.requester_id) ? request.requester_id : request.addressee_id)).filter(Boolean);
    return <Page title="Connections" eyebrow="Your people">
      <div className="connection-summary"><span><strong>{connected.length}</strong> connected</span><span><strong>{incomingRequests.length}</strong> incoming</span><span><strong>{sentRequests.length}</strong> pending</span></div>
      <section className="connection-section"><div className="section-heading"><h3>Incoming requests</h3><span>{incomingRequests.length}</span></div>{incomingRequests.length ? <div className="connection-list">{incomingRequests.map((request) => { const person = profileById.get(request.requester_id); return <div className="connection-row" key={request.id}><button className="avatar avatar-button" onClick={() => navigate(`person:${person.id}`)}>{person.avatar}</button><button className="person-link" onClick={() => navigate(`person:${person.id}`)}>{person.name}</button><span className="connection-status">Pending</span><button className="primary-button" onClick={() => respondToConnection(request, 'accepted')}>Accept</button><button className="secondary-button" onClick={() => respondToConnection(request, 'declined')}>Decline</button></div>; })}</div> : <Empty text="No incoming requests right now." action={() => navigate('discover')} />}</section>
      <section className="connection-section"><div className="section-heading"><h3>Sent requests</h3><span>{sentRequests.length}</span></div>{sentRequests.length ? <div className="connection-list">{sentRequests.map((request) => { const person = profileById.get(request.addressee_id); return <div className="connection-row" key={request.id}><button className="avatar avatar-button" onClick={() => navigate(`person:${person.id}`)}>{person.avatar}</button><button className="person-link" onClick={() => navigate(`person:${person.id}`)}>{person.name}</button><span className="connection-status">Pending</span></div>; })}</div> : <p className="connection-note">Connection requests you send will appear here.</p>}</section>
      <section className="connection-section"><div className="section-heading"><h3>Connected</h3><span>{connected.length}</span></div>{connected.length ? <div className="connection-list">{connected.map((person) => <div className="connection-row" key={person.id}><button className="avatar avatar-button" onClick={() => navigate(`person:${person.id}`)}>{person.avatar}</button><button className="person-link" onClick={() => navigate(`person:${person.id}`)}>{person.name}</button><span className="connection-status">Connected</span><button className="secondary-button" onClick={() => navigate(`chat:${person.id}`)}>Message</button></div>)}</div> : <Empty text="Accept a request or discover someone new to build your network." action={() => navigate('discover')} />}</section>
    </Page>;
  }
  const requestIds = Array.isArray(data.requests) ? data.requests : [];
  const receivedIds = Array.isArray(data.receivedRequests) ? data.receivedRequests : [];
  const connectedIds = Array.isArray(data.connected) ? data.connected : [];
  const incoming = receivedIds.map((id) => people.find((person) => person.id === id)).filter(Boolean);
  const sent = requestIds.filter((id) => !connectedIds.includes(id)).map((id) => people.find((person) => person.id === id)).filter(Boolean);
  const connected = connectedIds.map((id) => people.find((person) => person.id === id)).filter(Boolean);
  const dismissIncoming = (person) => update({ receivedRequests: receivedIds.filter((id) => id !== person.id) });
  const accept = (person) => {
    const existing = Array.isArray(data.messages) ? data.messages : [];
    const hasChat = existing.some((item) => item.id === person.id);
    update({
      receivedRequests: receivedIds.filter((id) => id !== person.id),
      requests: requestIds.filter((id) => id !== person.id),
      connected: [...new Set([...connectedIds, person.id])],
      messages: hasChat ? existing : [...existing, { id: person.id, name: person.name, avatar: person.avatar, body: `You are now connected with ${person.name}.`, unread: 0, history: [] }],
      notifications: [...data.notifications, { id: `accepted-${person.id}-${Date.now()}`, text: `${person.name} is now connected with you.`, read: false }],
    });
  };
  const openProfile = (person) => navigate(`person:${person.id}`);
  return <Page title="Connections" eyebrow="Your people">
    <div className="connection-summary"><span><strong>{connected.length}</strong> connected</span><span><strong>{incoming.length}</strong> incoming</span><span><strong>{sent.length}</strong> pending</span></div>
    <section className="connection-section"><div className="section-heading"><h3>Incoming requests</h3><span>{incoming.length}</span></div>{incoming.length ? <div className="person-grid">{incoming.map((person) => <article className="request-card" key={person.id}><button className="avatar avatar-button" onClick={() => openProfile(person)} title={`View ${person.name}'s profile`}>{person.avatar}</button><div><button className="person-link" onClick={() => openProfile(person)}>{person.name}</button><p>Shares {person.interests.slice(0, 2).join(' and ')} with you.</p><div className="card-actions"><button className="primary-button" onClick={() => accept(person)}>Accept</button><button className="secondary-button" onClick={() => dismissIncoming(person)}>Decline</button></div></div></article>)}</div> : <Empty text="No incoming requests right now." action={() => navigate('discover')} />}</section>
    <section className="connection-section"><div className="section-heading"><h3>Sent requests</h3><span>{sent.length}</span></div>{sent.length ? <div className="connection-list">{sent.map((person) => <div className="connection-row" key={person.id}><button className="avatar avatar-button" onClick={() => openProfile(person)} title={`View ${person.name}'s profile`}>{person.avatar}</button><button className="person-link" onClick={() => openProfile(person)}>{person.name}</button><span className="connection-status">Pending</span><button className="text-button" onClick={() => update({ requests: requestIds.filter((id) => id !== person.id) })}>Cancel</button></div>)}</div> : <p className="connection-note">Connection requests you send will appear here.</p>}</section>
    <section className="connection-section"><div className="section-heading"><h3>Connected</h3><span>{connected.length}</span></div>{connected.length ? <div className="connection-list">{connected.map((person) => <div className="connection-row" key={person.id}><button className="avatar avatar-button" onClick={() => openProfile(person)} title={`View ${person.name}'s profile`}>{person.avatar}</button><button className="person-link" onClick={() => openProfile(person)}>{person.name}</button><span className="connection-status">Connected</span><button className="secondary-button" onClick={() => navigate(`chat:${person.id}`)}>Message</button></div>)}</div> : <Empty text="Accept a request or discover someone new to build your network." action={() => navigate('discover')} />}</section>
  </Page>;
}
function Notifications({ data, update, navigate }) { return <Page title="Notifications" eyebrow="Stay in the loop" actions={<button className="text-button" onClick={() => update({ notifications: data.notifications.map((item) => ({ ...item, read: true })) })}>Mark all as read</button>}><div className="notification-list">{data.notifications.map((item) => <button className={`notification ${item.read ? '' : 'unread'}`} key={item.id} onClick={() => { update({ notifications: data.notifications.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry) }); if (item.screen) navigate(item.screen); }}>{item.screen ? <span>✉</span> : <span>✦</span>}<p>{item.text}<small>In-app notification</small></p></button>)}</div>{!data.notifications.length && <Empty text="You are all caught up." />}</Page>; }
function Profile({ data, update, session }) { const [profile, setProfile] = useState({ ...initialData.profile, ...data.profile }); const [notice, setNotice] = useState(''); const setField = (field, value) => setProfile((current) => ({ ...current, [field]: value })); const save = async (event) => { event.preventDefault(); update({ profile }); if (!supabase || !session) return; const { error } = await supabase.from('profiles').upsert({ id: session.user.id, display_name: profile.name, bio: profile.bio, about: profile.about, location: profile.location, pronouns: profile.pronouns, occupation: profile.occupation, interests: profile.interests, looking_for: profile.lookingFor, availability: profile.availability, connection_preference: profile.preference }, { onConflict: 'id' }); setNotice(error ? `Profile could not be synced: ${error.message}` : 'Profile saved to your account.'); }; return <Page title="My profile" eyebrow="Your public introduction"><form className="profile-form" onSubmit={save}><label>Display name<input value={profile.name} onChange={(event) => setField('name', event.target.value)} /></label><label>Short bio<textarea maxLength="240" value={profile.bio} onChange={(event) => setField('bio', event.target.value)} placeholder="A short line people will see first" /></label><label>About you<textarea maxLength="600" value={profile.about} onChange={(event) => setField('about', event.target.value)} placeholder="What are you curious about? What should people know?" /></label><div className="profile-form-grid"><label>Location<input value={profile.location} onChange={(event) => setField('location', event.target.value)} placeholder="e.g. Bengaluru" /></label><label>Pronouns<input value={profile.pronouns} onChange={(event) => setField('pronouns', event.target.value)} placeholder="e.g. they/them" /></label><label>What you do<input value={profile.occupation} onChange={(event) => setField('occupation', event.target.value)} placeholder="e.g. Product designer" /></label></div><label>Interests<input value={profile.interests.join(', ')} onChange={(event) => setField('interests', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="Books, films, coffee" /></label><div className="profile-form-grid"><label>Here to find<select value={profile.lookingFor} onChange={(event) => setField('lookingFor', event.target.value)}><option>New conversations</option><option>Friends</option><option>Creative collaborators</option><option>A relationship</option></select></label><label>Message availability<select value={profile.availability} onChange={(event) => setField('availability', event.target.value)}><option>Open to messages</option><option>Connections only</option><option>Taking a break</option></select></label></div><label>Connection preference<select value={profile.preference} onChange={(event) => setField('preference', event.target.value)}><option>Friendship</option><option>Dating</option><option>Both</option></select></label>{notice && <p className="auth-notice" role="status">{notice}</p>}<button className="primary-button">Save changes</button></form></Page>; }
function Settings({ data, update, theme, setTheme, navigate }) { const settings = data.settings || initialData.settings; return <Page title="Settings" eyebrow="Privacy and preferences"><div className="settings-list"><label className="setting-row">Appearance <button type="button" className="secondary-button" onClick={() => setTheme((value) => !value)}>{theme ? 'Light theme' : 'Dark theme'}</button></label><label className="setting-row">Who can send connection requests <select value={settings.requestPolicy} onChange={(event) => update({ settings: { ...settings, requestPolicy: event.target.value } })}><option>People with shared interests</option><option>Anyone</option><option>No one</option></select></label><label className="setting-row">Profile visibility <select value={settings.visibility} onChange={(event) => update({ settings: { ...settings, visibility: event.target.value } })}><option>Discoverable</option><option>Connections only</option></select></label><button className="text-button" onClick={() => navigate('connections')}>Manage blocked users ↗</button></div></Page>; }
function Empty({ text, action }) { return <div className="empty-state"><span>○</span><p>{text}</p>{action && <button className="primary-button" onClick={action}>Explore Discover</button>}</div>; }

export default App;
