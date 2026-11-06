import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

/** Who is online + who is typing, over Supabase Realtime presence/broadcast (no tables needed). */
export function usePresence(session, name) {
  const me = session?.user?.id || 'local-user';
  const [online, setOnline] = useState(() => new Set([me]));
  const [typing, setTyping] = useState({});
  const ch = useRef(null); const lastSent = useRef(0); const nameRef = useRef(name); nameRef.current = name;

  useEffect(() => {
    if (!supabase || !session) { setOnline(new Set([me])); return undefined; }
    const channel = supabase.channel('intersect:presence', { config: { presence: { key: me }, broadcast: { self: false } } });
    channel
      .on('presence', { event: 'sync' }, () => setOnline(new Set([me, ...Object.keys(channel.presenceState())])))
      .on('broadcast', { event: 'typing' }, ({ payload }) => setTyping((t) => ({ ...t, [`${payload.scope}|${payload.userId}`]: { ...payload, at: Date.now() } })))
      .subscribe((s) => { if (s === 'SUBSCRIBED') channel.track({ name: nameRef.current, at: Date.now() }); });
    ch.current = channel;
    return () => { supabase.removeChannel(channel); ch.current = null; };
  }, [session, me]);

  useEffect(() => {
    const t = setInterval(() => setTyping((cur) => { const now = Date.now(); const next = Object.fromEntries(Object.entries(cur).filter(([, v]) => now - v.at < 5000)); return Object.keys(next).length === Object.keys(cur).length ? cur : next; }), 1500);
    return () => clearInterval(t);
  }, []);

  /** scope = what *I* am viewing: "dm:<recipient>" or "ch:<id>". Receivers match dm scope against their own id. */
  const notifyTyping = useCallback((scope) => {
    if (!ch.current || Date.now() - lastSent.current < 2500) return;
    lastSent.current = Date.now();
    ch.current.send({ type: 'broadcast', event: 'typing', payload: { scope, userId: me, name: nameRef.current } });
  }, [me]);

  const typingIn = useCallback((scope) => Object.values(typing).filter((v) => v.userId !== me && (scope.startsWith('dm:') ? v.scope === `dm:${me}` && v.userId === scope.slice(3) : v.scope === scope)).map((v) => v.name || 'Someone'), [typing, me]);

  return { online, notifyTyping, typingIn };
}
