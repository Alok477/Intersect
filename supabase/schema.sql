-- Run this once in Supabase Dashboard > SQL Editor.
-- The browser only uses the public anon key; never put a service-role key in Vite.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  bio text not null default '',
  about text not null default '',
  location text not null default '',
  pronouns text not null default '',
  occupation text not null default '',
  interests jsonb not null default '[]'::jsonb,
  looking_for text not null default 'New conversations',
  availability text not null default 'Open to messages',
  connection_preference text not null default 'Friendship',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

alter table public.profiles add column if not exists discoverable boolean not null default true;

drop policy if exists "Authenticated users can discover profiles" on public.profiles;
create policy "Authenticated users can discover profiles"
  on public.profiles for select
  to authenticated
  using (discoverable = true or auth.uid() = id);

create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connection_requests_not_self check (requester_id <> addressee_id),
  constraint connection_requests_unique_pair unique (requester_id, addressee_id)
);

alter table public.connection_requests enable row level security;

drop policy if exists "Users can view their connection requests" on public.connection_requests;
create policy "Users can view their connection requests"
  on public.connection_requests for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Users can send connection requests" on public.connection_requests;
create policy "Users can send connection requests"
  on public.connection_requests for insert
  to authenticated
  with check (auth.uid() = requester_id and requester_id <> addressee_id);

drop policy if exists "Recipients can respond to connection requests" on public.connection_requests;
create policy "Recipients can respond to connection requests"
  on public.connection_requests for update
  to authenticated
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id);

drop policy if exists "Requesters can cancel connection requests" on public.connection_requests;
create policy "Requesters can cancel connection requests"
  on public.connection_requests for delete
  to authenticated
  using (auth.uid() = requester_id);

drop trigger if exists connection_requests_set_updated_at on public.connection_requests;
create trigger connection_requests_set_updated_at
  before update on public.connection_requests
  for each row execute procedure public.set_updated_at();

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  member_a uuid not null references public.profiles(id) on delete cascade,
  member_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversations_distinct_members check (member_a <> member_b),
  constraint conversations_ordered_members check (member_a < member_b),
  constraint conversations_unique_pair unique (member_a, member_b)
);

alter table public.conversations enable row level security;

drop policy if exists "Conversation members can view conversations" on public.conversations;
create policy "Conversation members can view conversations"
  on public.conversations for select
  to authenticated
  using (auth.uid() = member_a or auth.uid() = member_b);

drop policy if exists "Users can create conversations they belong to" on public.conversations;
create policy "Users can create conversations they belong to"
  on public.conversations for insert
  to authenticated
  with check ((auth.uid() = member_a or auth.uid() = member_b) and member_a < member_b);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_at_idx
  on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

drop policy if exists "Conversation members can read messages" on public.messages;
create policy "Conversation members can read messages"
  on public.messages for select
  to authenticated
  using (exists (
    select 1 from public.conversations
    where conversations.id = messages.conversation_id
      and (conversations.member_a = auth.uid() or conversations.member_b = auth.uid())
  ));

drop policy if exists "Conversation members can send messages" on public.messages;
create policy "Conversation members can send messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
        and (conversations.member_a = auth.uid() or conversations.member_b = auth.uid())
    )
  );

create table if not exists public.channel_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  sticker text,
  created_at timestamptz not null default now()
);

create index if not exists channel_messages_channel_created_at_idx
  on public.channel_messages (channel_id, created_at);

alter table public.channel_messages enable row level security;

drop policy if exists "Authenticated users can read channel messages" on public.channel_messages;
create policy "Authenticated users can read channel messages"
  on public.channel_messages for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can send channel messages" on public.channel_messages;
create policy "Authenticated users can send channel messages"
  on public.channel_messages for insert
  to authenticated
  with check (sender_id = auth.uid());
