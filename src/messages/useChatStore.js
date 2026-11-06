import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { seedCommunities, seedMessages } from './seed';
import { mentionsMe } from './format.jsx';

const PAGE = 50;
export const MAX_LEN = 2000;
export const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); }));
const byTime = (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0);
const isDm = (scope) => scope.startsWith('dm:');
const key = (scope) => scope.slice(scope.indexOf(':') + 1);

function loadLocal(storeKey) {
  try { return JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch { return {}; }
}

function fromRow(row, scope) {
  return { id: row.id, scope, senderId: row.sender_id, body: row.body, sticker: row.sticker || null, replyTo: row.reply_to || null, editedAt: row.edited_at || null, createdAt: row.created_at, reactions: {} };
}

/**
 * One store for channels + DMs, in local-demo mode (localStorage) or Supabase mode.
 * Optional DB features (replies, edits, reactions) are probed so the app keeps working on the old schema.
 */
export function useChatStore({ session, onIncoming, myName }) {
  const remote = Boolean(supabase && session);
  const meId = session?.user?.id || 'local-user';
  const storeKey = `intersect-chat:${session?.user?.id || 'local'}`;
  const [persisted] = useState(() => loadLocal(storeKey));
  const [msgs, setMsgs] = useState(() => (supabase ? {} : persisted.msgs || seedMessages()));
  const [status, setStatus] = useState({});
  const [more, setMore] = useState({});
  const [refs, setRefs] = useState({});
  const [reads, setReads] = useState(() => persisted.reads || {});
  const [muted, setMuted] = useState(() => persisted.muted || {});
  const [drafts, setDrafts] = useState({});
  const [custom, setCustom] = useState(() => persisted.custom || []);
  const [joined, setJoined] = useState(() => persisted.joined || ['intersect', 'slow-makers']);
  const [features, setFeatures] = useState({ rich: !remote, reactions: !remote, ready: !remote });
  const [error, setError] = useState('');
  const conv = useRef({ byPartner: {}, byId: {} });
  const incoming = useRef(onIncoming); incoming.current = onIncoming;
  const nameRef = useRef(myName); nameRef.current = myName;
  const msgsRef = useRef(msgs); msgsRef.current = msgs;
  const featRef = useRef(features); featRef.current = features;
  const mutedRef = useRef({});

  mutedRef.current = muted;
  const allCommunities = useMemo(() => [...seedCommunities, ...custom], [custom]);
  const communities = useMemo(() => allCommunities.filter((c) => joined.includes(c.id)), [allCommunities, joined]);
  const channelIds = useMemo(() => allCommunities.flatMap((c) => c.channels.map((ch) => ch.id)), [allCommunities]);

  // identity changed (auth resolved / sign-in / sign-out): reload that user's device state
  const loadedKey = useRef(storeKey);
  useEffect(() => {
    if (loadedKey.current === storeKey) return;
    loadedKey.current = storeKey;
    const d = loadLocal(storeKey);
    setMsgs(supabase ? {} : d.msgs || seedMessages()); setReads(d.reads || {}); setMuted(d.muted || {}); setCustom(d.custom || []); setJoined(d.joined || ['intersect', 'slow-makers']);
    setStatus({}); setMore({}); setRefs({}); setDrafts({});
  }, [storeKey]);

  // ---- persistence (device-level) ----
  useEffect(() => {
    if (loadedKey.current !== storeKey) return undefined;
    const t = setTimeout(() => {
      try {
        const clean = remote ? undefined : Object.fromEntries(Object.entries(msgs).map(([k, v]) => [k, v.filter((m) => !m.pending && !m.failed)]));
        localStorage.setItem(storeKey, JSON.stringify({ reads, muted, custom, joined, msgs: clean }));
      } catch { /* storage unavailable */ }
    }, 300);
    return () => clearTimeout(t);
  }, [msgs, reads, muted, custom, joined, remote, storeKey]);

  // ---- message list helpers ----
  const upsert = useCallback((m) => setMsgs((prev) => {
    const list = prev[m.scope] || [];
    const i = list.findIndex((x) => x.id === m.id);
    const next = i >= 0 ? list.map((x, j) => (j === i ? { ...x, ...m, reactions: m.reactions && Object.keys(m.reactions).length ? m.reactions : x.reactions } : x)) : [...list, m].sort(byTime);
    return { ...prev, [m.scope]: next };
  }), []);
  const patch = useCallback((scope, id, fn) => setMsgs((prev) => ({ ...prev, [scope]: (prev[scope] || []).map((m) => (m.id === id ? { ...m, ...(typeof fn === 'function' ? fn(m) : fn) } : m)) })), []);
  const scopeOf = (id) => Object.keys(msgsRef.current).find((s) => msgsRef.current[s].some((m) => m.id === id));

  // ---- remote plumbing ----
  const select = (dm) => {
    const f = featRef.current;
    return ['id', 'sender_id', 'body', 'created_at', dm ? 'conversation_id' : 'channel_id', ...(dm ? (f.rich ? ['sticker', 'reply_to', 'edited_at'] : []) : ['sticker', ...(f.rich ? ['reply_to', 'edited_at'] : [])])].join(',');
  };
  const loadConvs = useCallback(async () => {
    const { data } = await supabase.from('conversations').select('id, member_a, member_b');
    const c = { byPartner: {}, byId: {} };
    (data || []).forEach((r) => { const p = r.member_a === meId ? r.member_b : r.member_a; c.byPartner[p] = r.id; c.byId[r.id] = p; });
    conv.current = c;
  }, [meId]);
  const ensureConv = async (partnerId) => {
    if (conv.current.byPartner[partnerId]) return conv.current.byPartner[partnerId];
    const [a, b] = [meId, partnerId].sort();
    const { data, error: e } = await supabase.from('conversations').upsert({ member_a: a, member_b: b }, { onConflict: 'member_a,member_b' }).select('id').single();
    if (e) throw e;
    conv.current.byPartner[partnerId] = data.id; conv.current.byId[data.id] = partnerId;
    return data.id;
  };
  const rowScope = (table, row) => table === 'messages' ? (conv.current.byId[row.conversation_id] ? `dm:${conv.current.byId[row.conversation_id]}` : null) : `ch:${row.channel_id}`;

  const hydrate = useCallback(async (rows, scopeFor) => {
    // reactions + reply targets for a batch of rows
    const list = rows.map((r) => ({ r, scope: scopeFor(r) })).filter((x) => x.scope);
    const out = list.map(({ r, scope }) => fromRow(r, scope));
    if (featRef.current.reactions && rows.length) {
      for (const dm of [true, false]) {
        const ids = list.filter((x) => isDm(x.scope) === dm).map((x) => x.r.id);
        if (!ids.length) continue;
        const { data } = await supabase.from(dm ? 'message_reactions' : 'channel_message_reactions').select('message_id, user_id, emoji').in('message_id', ids);
        (data || []).forEach((x) => { const m = out.find((o) => o.id === x.message_id); if (m) (m.reactions[x.emoji] ||= []).push(x.user_id); });
      }
    }
    const known = new Set(Object.values(msgsRef.current).flat().map((m) => m.id).concat(out.map((m) => m.id)));
    const missing = {};
    out.forEach((m) => { if (m.replyTo && !known.has(m.replyTo)) (missing[isDm(m.scope) ? 'messages' : 'channel_messages'] ||= new Set()).add(m.replyTo); });
    for (const [table, ids] of Object.entries(missing)) {
      const { data } = await supabase.from(table).select('id, sender_id, body').in('id', [...ids]);
      if (data?.length) setRefs((p) => ({ ...p, ...Object.fromEntries(data.map((d) => [d.id, { senderId: d.sender_id, body: d.body }])) }));
    }
    return out;
  }, []);

  // probe optional schema features, then preload previews + realtime
  useEffect(() => {
    if (!remote) return undefined;
    let active = true;
    (async () => {
      const probe = async (t, c) => !(await supabase.from(t).select(c).limit(1)).error;
      const [dmCols, chCols, r1, r2] = await Promise.all([probe('messages', 'reply_to,edited_at,sticker'), probe('channel_messages', 'reply_to,edited_at'), probe('message_reactions', 'id'), probe('channel_message_reactions', 'id')]);
      if (!active) return;
      const f = { rich: dmCols && chCols, reactions: r1 && r2, ready: true };
      featRef.current = f; setFeatures(f);
      if (!f.rich) console.info('[Intersect] Run supabase/migrations/002_messaging.sql to enable replies, edits, reactions and DM stickers.');
      await loadConvs();
      const [dm, ch] = await Promise.all([
        supabase.from('messages').select(select(true)).order('created_at', { ascending: false }).limit(200),
        supabase.from('channel_messages').select(select(false)).in('channel_id', channelIds).order('created_at', { ascending: false }).limit(200),
      ]);
      if (!active) return;
      const a = await hydrate(dm.data || [], (r) => rowScope('messages', r));
      const b = await hydrate(ch.data || [], (r) => rowScope('channel_messages', r));
      if (!active) return;
      setMsgs((prev) => { const next = { ...prev }; [...a, ...b].forEach((m) => { const l = next[m.scope] || []; if (!l.some((x) => x.id === m.id)) next[m.scope] = [...l, m].sort(byTime); }); return next; });
      setReads((prev) => { const next = { ...prev }; const now = new Date().toISOString(); channelIds.forEach((id) => { if (!next[`ch:${id}`]) next[`ch:${id}`] = now; }); return next; });
    })();
    return () => { active = false; };
  }, [remote, meId]); // eslint-disable-line react-hooks/exhaustive-deps

  // baseline reads for local mode
  useEffect(() => {
    if (remote) return;
    setReads((prev) => { const next = { ...prev }; const now = new Date().toISOString(); channelIds.forEach((id) => { if (!next[`ch:${id}`]) next[`ch:${id}`] = now; }); return next; });
  }, [remote, channelIds]);

  // realtime
  useEffect(() => {
    if (!remote) return undefined;
    let active = true;
    const handle = (table) => async (payload) => {
      if (!active) return;
      const { eventType, new: row, old } = payload;
      if (eventType === 'DELETE') { const s = scopeOf(old.id); if (s) setMsgs((p) => ({ ...p, [s]: p[s].filter((m) => m.id !== old.id) })); return; }
      if (table === 'messages' && !conv.current.byId[row.conversation_id]) await loadConvs();
      const scope = rowScope(table, row);
      if (!scope || !active) return;
      if (eventType === 'UPDATE') { patch(scope, row.id, { body: row.body, editedAt: row.edited_at || null }); return; }
      const exists = (msgsRef.current[scope] || []).some((m) => m.id === row.id);
      const [m] = await hydrate([row], () => scope);
      upsert({ ...m, pending: false });
      if (!exists && row.sender_id !== meId) incoming.current?.({ scope, message: m, mention: mentionsMe(m.body, nameRef.current), muted: Boolean(mutedRef.current[scope]) });
    };
    const react = (event) => (payload) => {
      const r = event === 'INSERT' ? payload.new : payload.old; const s = scopeOf(r.message_id);
      if (!s || !r.emoji) return;
      patch(s, r.message_id, (m) => {
        const cur = new Set(m.reactions[r.emoji] || []);
        event === 'INSERT' ? cur.add(r.user_id) : cur.delete(r.user_id);
        const next = { ...m.reactions }; cur.size ? (next[r.emoji] = [...cur]) : delete next[r.emoji];
        return { reactions: next };
      });
    };
    const ch = supabase.channel(`chat:${meId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, handle('messages'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_messages' }, handle('channel_messages'));
    ['message_reactions', 'channel_message_reactions'].forEach((t) => ['INSERT', 'DELETE'].forEach((ev) => ch.on('postgres_changes', { event: ev, schema: 'public', table: t }, react(ev))));
    ch.subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [remote, meId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- public actions ----
  const open = useCallback(async (scope) => {
    if (!remote || status[scope] === 'ready' || status[scope] === 'loading') return;
    setStatus((s) => ({ ...s, [scope]: 'loading' }));
    try {
      let rows = [];
      if (isDm(scope)) { const cid = conv.current.byPartner[key(scope)]; if (cid) rows = (await supabase.from('messages').select(select(true)).eq('conversation_id', cid).order('created_at', { ascending: false }).limit(PAGE + 1)).data || []; }
      else rows = (await supabase.from('channel_messages').select(select(false)).eq('channel_id', key(scope)).order('created_at', { ascending: false }).limit(PAGE + 1)).data || [];
      setMore((m) => ({ ...m, [scope]: rows.length > PAGE }));
      const list = await hydrate(rows.slice(0, PAGE), () => scope);
      setMsgs((prev) => { const keep = (prev[scope] || []).filter((m) => m.pending || m.failed); const merged = new Map([...(prev[scope] || []).map((m) => [m.id, m]), ...list.map((m) => [m.id, m]), ...keep.map((m) => [m.id, m])]); return { ...prev, [scope]: [...merged.values()].sort(byTime) }; });
      setStatus((s) => ({ ...s, [scope]: 'ready' }));
    } catch (e) { setStatus((s) => ({ ...s, [scope]: 'error' })); setError(`Messages could not load: ${e.message}`); }
  }, [remote, status, hydrate]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadEarlier = useCallback(async (scope) => {
    const first = (msgsRef.current[scope] || [])[0]; if (!first || !remote) return;
    const dm = isDm(scope); const cid = dm ? conv.current.byPartner[key(scope)] : key(scope);
    const { data } = await supabase.from(dm ? 'messages' : 'channel_messages').select(select(dm)).eq(dm ? 'conversation_id' : 'channel_id', cid).lt('created_at', first.createdAt).order('created_at', { ascending: false }).limit(PAGE + 1);
    const rows = data || []; setMore((m) => ({ ...m, [scope]: rows.length > PAGE }));
    const list = await hydrate(rows.slice(0, PAGE), () => scope);
    setMsgs((prev) => ({ ...prev, [scope]: [...list, ...(prev[scope] || [])].sort(byTime) }));
  }, [remote, hydrate]); // eslint-disable-line react-hooks/exhaustive-deps

  const deliver = useCallback(async (m) => {
    const dm = isDm(m.scope); const f = featRef.current;
    try {
      const row = { id: m.id, sender_id: meId, body: m.body };
      if (dm) row.conversation_id = await ensureConv(key(m.scope)); else row.channel_id = key(m.scope);
      if (m.sticker && (!dm || f.rich)) row.sticker = m.sticker;
      if (m.replyTo && f.rich) row.reply_to = m.replyTo;
      const { data, error: e } = await supabase.from(dm ? 'messages' : 'channel_messages').insert(row).select('created_at').single();
      if (e && e.code !== '23505') throw e;
      patch(m.scope, m.id, { pending: false, failed: false, ...(data ? { createdAt: data.created_at } : {}) });
    } catch (e) { patch(m.scope, m.id, { pending: false, failed: true }); setError(`Message could not be sent: ${e.message}`); }
  }, [meId, patch]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback((scope, { body, sticker = null, replyTo = null }) => {
    const text = body.trim().slice(0, MAX_LEN); if (!text) return;
    const m = { id: uid(), scope, senderId: meId, body: text, sticker, replyTo, editedAt: null, createdAt: new Date().toISOString(), reactions: {}, pending: remote };
    upsert(m); setDrafts((d) => ({ ...d, [scope]: '' }));
    if (remote) deliver(m);
  }, [meId, remote, upsert, deliver]);

  const retry = useCallback((scope, id) => { const m = (msgsRef.current[scope] || []).find((x) => x.id === id); if (!m) return; patch(scope, id, { failed: false, pending: true }); deliver(m); }, [deliver, patch]);

  const edit = useCallback(async (scope, id, body) => {
    const text = body.trim(); const prev = (msgsRef.current[scope] || []).find((m) => m.id === id);
    if (!prev || !text || text === prev.body) return;
    patch(scope, id, { body: text, editedAt: new Date().toISOString() });
    if (!remote) return;
    const { error: e } = await supabase.from(isDm(scope) ? 'messages' : 'channel_messages').update({ body: text, edited_at: new Date().toISOString() }).eq('id', id);
    if (e) { patch(scope, id, { body: prev.body, editedAt: prev.editedAt }); setError(`Edit failed: ${e.message}`); }
  }, [remote, patch]);

  const remove = useCallback(async (scope, id) => {
    const prev = (msgsRef.current[scope] || []).find((m) => m.id === id); if (!prev) return;
    setMsgs((p) => ({ ...p, [scope]: p[scope].filter((m) => m.id !== id) }));
    if (!remote || prev.failed) return;
    const { error: e } = await supabase.from(isDm(scope) ? 'messages' : 'channel_messages').delete().eq('id', id);
    if (e) { upsert(prev); setError(`Delete failed: ${e.message}`); }
  }, [remote, upsert]);

  const react = useCallback(async (scope, id, emoji) => {
    const m = (msgsRef.current[scope] || []).find((x) => x.id === id); if (!m || m.pending) return;
    const mine = (m.reactions[emoji] || []).includes(meId);
    const apply = (add) => patch(scope, id, (cur) => { const set = new Set(cur.reactions[emoji] || []); add ? set.add(meId) : set.delete(meId); const next = { ...cur.reactions }; set.size ? (next[emoji] = [...set]) : delete next[emoji]; return { reactions: next }; });
    apply(!mine);
    if (!remote) return;
    const t = isDm(scope) ? 'message_reactions' : 'channel_message_reactions';
    const { error: e } = mine ? await supabase.from(t).delete().match({ message_id: id, user_id: meId, emoji }) : await supabase.from(t).insert({ message_id: id, user_id: meId, emoji });
    if (e && e.code !== '23505') { apply(mine); setError(`Reaction failed: ${e.message}`); }
  }, [remote, meId, patch]);

  // ---- reads / unread ----
  const markRead = useCallback((scope) => {
    const list = msgsRef.current[scope] || []; const at = list.length ? list[list.length - 1].createdAt : new Date().toISOString();
    setReads((r) => (r[scope] && r[scope] >= at ? r : { ...r, [scope]: at }));
  }, []);
  const unread = useCallback((scope) => { const r = reads[scope]; if (r === undefined && !isDm(scope)) return 0; return (msgs[scope] || []).filter((m) => m.senderId !== meId && !m.pending && m.createdAt > (r || '')).length; }, [reads, msgs, meId]);
  const last = useCallback((scope) => { const l = msgs[scope] || []; return l[l.length - 1] || null; }, [msgs]);
  const toggleMute = useCallback((scope) => setMuted((m) => { const n = { ...m }; n[scope] ? delete n[scope] : (n[scope] = true); return n; }), []);
  const setDraft = useCallback((scope, text) => setDrafts((d) => ({ ...d, [scope]: text })), []);
  const markAll = useCallback((scopes) => scopes.forEach(markRead), [markRead]);

  // ---- communities (device-level, as before; seeds are shared demo communities) ----
  const createCommunity = useCallback(({ name, description }) => {
    const id = `c-${uid().slice(0, 8)}`;
    const c = { id, name, icon: name.slice(0, 1).toUpperCase(), official: false, ownerId: meId, description, channels: [{ id: `${id}-general`, name: 'general', topic: description }] };
    setCustom((p) => [...p, c]); setJoined((j) => [...j, id]); return c;
  }, [meId]);
  const addChannel = useCallback((communityId, { name, topic }) => {
    const ch = { id: `${communityId}-${name}-${uid().slice(0, 4)}`, name, topic };
    setCustom((p) => p.map((c) => (c.id === communityId ? { ...c, channels: [...c.channels, ch] } : c)));
    return ch;
  }, []);
  const joinCommunity = useCallback((id) => setJoined((j) => (j.includes(id) ? j : [...j, id])), []);
  const leaveCommunity = useCallback((id) => setJoined((j) => j.filter((x) => x !== id)), []);

  return { remote, meId, msgs, status, more, refs, features, error, clearError: () => setError(''), drafts, setDraft, reads, muted, communities, allCommunities, open, loadEarlier, send, retry, edit, remove, react, markRead, markAll, unread, last, toggleMute, createCommunity, addChannel, joinCommunity, leaveCommunity };
}
