-- ============================================================
-- ColocEvents — Schéma complet Supabase
-- À exécuter dans Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ============ CORE ============

create table if not exists colocations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_at timestamptz default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  colocation_id uuid references colocations(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  room text,
  role text default 'member' check (role in ('admin', 'member')),
  presence_status text default 'home' check (presence_status in ('home', 'away_tonight', 'traveling')),
  presence_return_date date,
  created_at timestamptz default now(),
  unique(user_id, colocation_id)
);

-- ============ ÉVÉNEMENTS ============

create table if not exists spaces (
  id uuid primary key default gen_random_uuid(),
  colocation_id uuid references colocations(id) on delete cascade,
  name text not null,
  icon text
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  colocation_id uuid references colocations(id) on delete cascade,
  created_by uuid references members(id) on delete set null,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  guest_count int default 0,
  noise_level text default 'moderate' check (noise_level in ('quiet', 'moderate', 'festive')),
  status text default 'confirmed' check (status in ('confirmed', 'contested', 'cancelled', 'vote_approved')),
  created_at timestamptz default now()
);

create table if not exists event_spaces (
  event_id uuid references events(id) on delete cascade,
  space_id uuid references spaces(id) on delete cascade,
  primary key (event_id, space_id)
);

-- ============ RÉACTIONS ============

create table if not exists event_reactions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  reaction text not null check (reaction in ('thumbs_up', 'party', 'neutral', 'thumbs_down', 'oppose')),
  created_at timestamptz default now(),
  unique(event_id, member_id)
);

-- ============ VOTES ============

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  initiated_by uuid references members(id) on delete set null,
  reason text,
  status text default 'open' check (status in ('open', 'approved', 'rejected', 'expired')),
  closes_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists vote_ballots (
  id uuid primary key default gen_random_uuid(),
  vote_id uuid references votes(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  choice text not null check (choice in ('approve', 'reject', 'abstain')),
  created_at timestamptz default now(),
  unique(vote_id, member_id)
);

-- ============ CHAT ============

create table if not exists chat_channels (
  id uuid primary key default gen_random_uuid(),
  colocation_id uuid references colocations(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  name text not null,
  type text default 'general' check (type in ('general', 'event')),
  created_at timestamptz default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references chat_channels(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  content text not null,
  reply_to uuid references chat_messages(id) on delete set null,
  is_system boolean default false,
  created_at timestamptz default now()
);

create table if not exists message_read_receipts (
  message_id uuid references chat_messages(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  read_at timestamptz default now(),
  primary key (message_id, member_id)
);

-- ============ RÈGLES ============

create table if not exists coloc_rules (
  id uuid primary key default gen_random_uuid(),
  colocation_id uuid references colocations(id) on delete cascade,
  rule_key text not null,
  rule_value jsonb not null,
  updated_at timestamptz default now(),
  unique(colocation_id, rule_key)
);

-- ============ DÉPENSES ============

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  colocation_id uuid references colocations(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  paid_by uuid references members(id) on delete set null,
  title text not null,
  amount decimal(10,2) not null,
  created_at timestamptz default now()
);

create table if not exists expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  amount decimal(10,2) not null,
  settled boolean default false,
  settled_at timestamptz
);

-- ============ TÂCHES ============

create table if not exists chores (
  id uuid primary key default gen_random_uuid(),
  colocation_id uuid references colocations(id) on delete cascade,
  name text not null,
  icon text,
  frequency text default 'weekly' check (frequency in ('daily', 'weekly', 'biweekly', 'monthly')),
  created_at timestamptz default now()
);

create table if not exists chore_assignments (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid references chores(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  week_start date not null,
  completed boolean default false,
  completed_at timestamptz,
  swapped_with uuid references members(id),
  swap_accepted boolean,
  unique(chore_id, member_id, week_start)
);

-- ============ ANNONCES ============

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  colocation_id uuid references colocations(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  content text not null,
  pinned boolean default false,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

-- ============ NOTIFICATIONS ============

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(endpoint)
);

create table if not exists notification_preferences (
  member_id uuid references members(id) on delete cascade primary key,
  events_new boolean default true,
  events_modified boolean default true,
  events_reminder boolean default true,
  votes_new boolean default true,
  votes_result boolean default true,
  chat_all boolean default false,
  chat_mentions boolean default true,
  chores_reminder boolean default true,
  announcements boolean default true
);

-- ============ RLS ============

alter table colocations enable row level security;
alter table members enable row level security;
alter table spaces enable row level security;
alter table events enable row level security;
alter table event_spaces enable row level security;
alter table event_reactions enable row level security;
alter table votes enable row level security;
alter table vote_ballots enable row level security;
alter table chat_channels enable row level security;
alter table chat_messages enable row level security;
alter table message_read_receipts enable row level security;
alter table coloc_rules enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table chores enable row level security;
alter table chore_assignments enable row level security;
alter table announcements enable row level security;
alter table push_subscriptions enable row level security;
alter table notification_preferences enable row level security;

-- Fonction helper : retourne les IDs de colocation de l'utilisateur connecté
create or replace function get_user_colocation_ids(uid uuid)
returns setof uuid as $$
  select colocation_id from members where user_id = uid;
$$ language sql security definer stable;

-- ============ POLICIES RLS ============

-- colocations
create policy "colocations_select" on colocations for select using (
  id in (select get_user_colocation_ids(auth.uid()))
);
create policy "colocations_insert" on colocations for insert with check (true);

-- members
create policy "members_select" on members for select using (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);
create policy "members_insert" on members for insert with check (
  user_id = auth.uid()
);
create policy "members_update" on members for update using (
  user_id = auth.uid()
);

-- spaces
create policy "spaces_select" on spaces for select using (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);
create policy "spaces_insert" on spaces for insert with check (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);
create policy "spaces_update" on spaces for update using (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);
create policy "spaces_delete" on spaces for delete using (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);

-- events
create policy "events_select" on events for select using (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);
create policy "events_insert" on events for insert with check (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);
create policy "events_update" on events for update using (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);
create policy "events_delete" on events for delete using (
  created_by in (select id from members where user_id = auth.uid())
);

-- event_spaces
create policy "event_spaces_select" on event_spaces for select using (
  event_id in (select id from events where colocation_id in (select get_user_colocation_ids(auth.uid())))
);
create policy "event_spaces_insert" on event_spaces for insert with check (
  event_id in (select id from events where colocation_id in (select get_user_colocation_ids(auth.uid())))
);
create policy "event_spaces_delete" on event_spaces for delete using (
  event_id in (select id from events where colocation_id in (select get_user_colocation_ids(auth.uid())))
);

-- event_reactions
create policy "event_reactions_select" on event_reactions for select using (
  event_id in (select id from events where colocation_id in (select get_user_colocation_ids(auth.uid())))
);
create policy "event_reactions_insert" on event_reactions for insert with check (
  member_id in (select id from members where user_id = auth.uid())
);
create policy "event_reactions_update" on event_reactions for update using (
  member_id in (select id from members where user_id = auth.uid())
);
create policy "event_reactions_delete" on event_reactions for delete using (
  member_id in (select id from members where user_id = auth.uid())
);

-- votes
create policy "votes_select" on votes for select using (
  event_id in (select id from events where colocation_id in (select get_user_colocation_ids(auth.uid())))
);
create policy "votes_insert" on votes for insert with check (
  event_id in (select id from events where colocation_id in (select get_user_colocation_ids(auth.uid())))
);
create policy "votes_update" on votes for update using (
  event_id in (select id from events where colocation_id in (select get_user_colocation_ids(auth.uid())))
);

-- vote_ballots
create policy "vote_ballots_select" on vote_ballots for select using (
  vote_id in (
    select v.id from votes v
    join events e on v.event_id = e.id
    where e.colocation_id in (select get_user_colocation_ids(auth.uid()))
  )
);
create policy "vote_ballots_insert" on vote_ballots for insert with check (
  member_id in (select id from members where user_id = auth.uid())
);
create policy "vote_ballots_update" on vote_ballots for update using (
  member_id in (select id from members where user_id = auth.uid())
);

-- chat_channels
create policy "chat_channels_select" on chat_channels for select using (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);
create policy "chat_channels_insert" on chat_channels for insert with check (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);

-- chat_messages
create policy "chat_messages_select" on chat_messages for select using (
  channel_id in (
    select id from chat_channels
    where colocation_id in (select get_user_colocation_ids(auth.uid()))
  )
);
create policy "chat_messages_insert" on chat_messages for insert with check (
  channel_id in (
    select id from chat_channels
    where colocation_id in (select get_user_colocation_ids(auth.uid()))
  )
);

-- message_read_receipts
create policy "read_receipts_select" on message_read_receipts for select using (
  member_id in (select id from members where user_id = auth.uid())
);
create policy "read_receipts_insert" on message_read_receipts for insert with check (
  member_id in (select id from members where user_id = auth.uid())
);

-- coloc_rules
create policy "coloc_rules_select" on coloc_rules for select using (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);
create policy "coloc_rules_insert" on coloc_rules for insert with check (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);
create policy "coloc_rules_update" on coloc_rules for update using (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);

-- expenses
create policy "expenses_select" on expenses for select using (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);
create policy "expenses_insert" on expenses for insert with check (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);

-- expense_splits
create policy "expense_splits_select" on expense_splits for select using (
  expense_id in (
    select id from expenses
    where colocation_id in (select get_user_colocation_ids(auth.uid()))
  )
);
create policy "expense_splits_insert" on expense_splits for insert with check (
  expense_id in (
    select id from expenses
    where colocation_id in (select get_user_colocation_ids(auth.uid()))
  )
);
create policy "expense_splits_update" on expense_splits for update using (
  member_id in (select id from members where user_id = auth.uid())
);

-- chores
create policy "chores_select" on chores for select using (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);
create policy "chores_insert" on chores for insert with check (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);
create policy "chores_update" on chores for update using (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);
create policy "chores_delete" on chores for delete using (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);

-- chore_assignments
create policy "chore_assignments_select" on chore_assignments for select using (
  chore_id in (
    select id from chores
    where colocation_id in (select get_user_colocation_ids(auth.uid()))
  )
);
create policy "chore_assignments_insert" on chore_assignments for insert with check (
  chore_id in (
    select id from chores
    where colocation_id in (select get_user_colocation_ids(auth.uid()))
  )
);
create policy "chore_assignments_update" on chore_assignments for update using (
  chore_id in (
    select id from chores
    where colocation_id in (select get_user_colocation_ids(auth.uid()))
  )
);

-- announcements
create policy "announcements_select" on announcements for select using (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);
create policy "announcements_insert" on announcements for insert with check (
  colocation_id in (select get_user_colocation_ids(auth.uid()))
);
create policy "announcements_update" on announcements for update using (
  member_id in (select id from members where user_id = auth.uid())
    or exists (
      select 1 from members
      where user_id = auth.uid()
        and colocation_id = announcements.colocation_id
        and role = 'admin'
    )
);
create policy "announcements_delete" on announcements for delete using (
  member_id in (select id from members where user_id = auth.uid())
);

-- push_subscriptions
create policy "push_subscriptions_select" on push_subscriptions for select using (
  member_id in (select id from members where user_id = auth.uid())
);
create policy "push_subscriptions_insert" on push_subscriptions for insert with check (
  member_id in (select id from members where user_id = auth.uid())
);
create policy "push_subscriptions_delete" on push_subscriptions for delete using (
  member_id in (select id from members where user_id = auth.uid())
);

-- notification_preferences
create policy "notif_prefs_select" on notification_preferences for select using (
  member_id in (select id from members where user_id = auth.uid())
);
create policy "notif_prefs_insert" on notification_preferences for insert with check (
  member_id in (select id from members where user_id = auth.uid())
);
create policy "notif_prefs_update" on notification_preferences for update using (
  member_id in (select id from members where user_id = auth.uid())
);

-- ============ REALTIME ============
-- Activer Realtime sur les tables nécessaires
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table event_reactions;
alter publication supabase_realtime add table votes;
alter publication supabase_realtime add table vote_ballots;
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table message_read_receipts;
alter publication supabase_realtime add table members;
alter publication supabase_realtime add table announcements;
