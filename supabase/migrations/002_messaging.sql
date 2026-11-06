-- Intersect messaging upgrade: replies, edits, reactions, DM stickers.
-- Run once in the Supabase SQL editor AFTER schema.sql. Safe to re-run.
-- The app keeps working without this file; it just hides replies/edits/reactions until it is applied.

-- 1. New columns -------------------------------------------------------------
alter table public.messages add column if not exists sticker text;
alter table public.messages add column if not exists reply_to uuid references public.messages(id) on delete set null;
alter table public.messages add column if not exists edited_at timestamptz;

alter table public.channel_messages add column if not exists reply_to uuid references public.channel_messages(id) on delete set null;
alter table public.channel_messages add column if not exists edited_at timestamptz;

-- 2. Edit / delete your own messages -----------------------------------------
drop policy if exists "Senders can edit their messages" on public.messages;
create policy "Senders can edit their messages"
  on public.messages for update to authenticated
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());

drop policy if exists "Senders can delete their messages" on public.messages;
create policy "Senders can delete their messages"
  on public.messages for delete to authenticated
  using (sender_id = auth.uid());

drop policy if exists "Senders can edit their channel messages" on public.channel_messages;
create policy "Senders can edit their channel messages"
  on public.channel_messages for update to authenticated
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());

drop policy if exists "Senders can delete their channel messages" on public.channel_messages;
create policy "Senders can delete their channel messages"
  on public.channel_messages for delete to authenticated
  using (sender_id = auth.uid());

-- RLS cannot limit which columns an update touches, so only allow `body` to change
-- and stamp `edited_at` on the server.
create or replace function public.guard_message_edit()
returns trigger language plpgsql as $$
declare
  n jsonb := to_jsonb(new) - 'body' - 'edited_at';
  o jsonb := to_jsonb(old) - 'body' - 'edited_at';
begin
  -- deleting a replied-to message nulls reply_to via the foreign key; allow that
  if new.reply_to is null then
    n := n - 'reply_to';
    o := o - 'reply_to';
  end if;
  if n is distinct from o then
    raise exception 'Only the message body can be edited';
  end if;
  if new.body is distinct from old.body then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_guard_edit on public.messages;
create trigger messages_guard_edit before update on public.messages
  for each row execute function public.guard_message_edit();

drop trigger if exists channel_messages_guard_edit on public.channel_messages;
create trigger channel_messages_guard_edit before update on public.channel_messages
  for each row execute function public.guard_message_edit();

-- 3. Reactions ---------------------------------------------------------------
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  constraint message_reactions_unique unique (message_id, user_id, emoji)
);
create index if not exists message_reactions_message_idx on public.message_reactions (message_id);
alter table public.message_reactions enable row level security;

drop policy if exists "Conversation members can read reactions" on public.message_reactions;
create policy "Conversation members can read reactions"
  on public.message_reactions for select to authenticated
  using (exists (
    select 1 from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = message_reactions.message_id and (c.member_a = auth.uid() or c.member_b = auth.uid())
  ));

drop policy if exists "Conversation members can react" on public.message_reactions;
create policy "Conversation members can react"
  on public.message_reactions for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = message_reactions.message_id and (c.member_a = auth.uid() or c.member_b = auth.uid())
  ));

drop policy if exists "Users can remove their reactions" on public.message_reactions;
create policy "Users can remove their reactions"
  on public.message_reactions for delete to authenticated
  using (user_id = auth.uid());

create table if not exists public.channel_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.channel_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  constraint channel_message_reactions_unique unique (message_id, user_id, emoji)
);
create index if not exists channel_message_reactions_message_idx on public.channel_message_reactions (message_id);
alter table public.channel_message_reactions enable row level security;

drop policy if exists "Authenticated users can read channel reactions" on public.channel_message_reactions;
create policy "Authenticated users can read channel reactions"
  on public.channel_message_reactions for select to authenticated using (true);

drop policy if exists "Authenticated users can react in channels" on public.channel_message_reactions;
create policy "Authenticated users can react in channels"
  on public.channel_message_reactions for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.channel_messages m where m.id = message_id));

drop policy if exists "Users can remove their channel reactions" on public.channel_message_reactions;
create policy "Users can remove their channel reactions"
  on public.channel_message_reactions for delete to authenticated
  using (user_id = auth.uid());

-- 4. Realtime ----------------------------------------------------------------
-- Full replica identity so DELETE events carry message_id / user_id / emoji.
alter table public.message_reactions replica identity full;
alter table public.channel_message_reactions replica identity full;

do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['messages', 'channel_messages', 'message_reactions', 'channel_message_reactions'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
