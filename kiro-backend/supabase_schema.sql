-- KYROO Supabase schema
-- Run this whole file once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run

create extension if not exists "pgcrypto";

-- ─── users ─────────────────────────────────────────────────────────────────
create table if not exists users (
    id             uuid primary key default gen_random_uuid(),
    name           text not null,
    email          text not null unique,
    phone          text not null,
    city           text default '',
    age            int default 0,
    language       text default 'Hinglish',
    nudge_time     text default '7 AM',
    fitness_level  text default '',
    fitness_goal   text default '',
    sleep_hours    text default '',
    stress_level   int default 0,
    money_habit    text default '',
    diet_type      text default '',
    energy_peak    text default '',
    plan           text default 'free',
    is_active      boolean default true,
    created_at     timestamptz default now(),
    injuries          text default '',
    fitness_workouts  text[] default '{}',
    sleep_quality     text default '',
    sleep_issues      text[] default '{}',
    stress_triggers   text[] default '{}',
    income_range      text default '',
    eat_habits        text[] default '{}',
    diet_restrictions text default '',
    job_type          text default '',
    onboarding_step   int default 99,
    -- Per-domain nudge times. nudge_time above already covers the "mind"
    -- domain slot; these three cover money/fitness/study. All start at a
    -- sensible default (same times the old fixed slots used) and get
    -- overwritten by set_domain_nudge_time whenever KYROO picks up on the
    -- user's own stated routine in conversation — never hardcoded per user.
    money_nudge_time   text default '1 PM',
    fitness_nudge_time text default '6:30 PM',
    study_nudge_time   text default '9 PM',
    -- Recurring subscription tracking (Razorpay Subscriptions, not one-off
    -- orders) - plan_expires_at is the current billing period's end,
    -- updated on every subscription.charged webhook; subscription_status
    -- mirrors Razorpay's own status field (active/halted/cancelled/etc)
    -- so the cron safety-net job can tell a healthy subscription apart
    -- from one that's lapsed without relying on plan_expires_at alone.
    subscription_id     text,
    subscription_status text,
    plan_expires_at      timestamptz,
    -- Running balance of purchased top-up messages - consumed one at a
    -- time once a free/pro user is over their daily cap, never expires
    -- or resets on its own (a user who pays for 25 extra messages should
    -- get to use all 25, not lose unused ones at midnight).
    bonus_messages       int default 0
);

-- Looked up on every single inbound WhatsApp message via get_or_create_user()
-- — the hottest query in the product — with no index until now, meaning a
-- full table scan per message.
create index if not exists idx_users_phone on users(phone);

-- Migration for an existing table (safe to run even if columns already exist):
alter table users add column if not exists injuries          text default '';
alter table users add column if not exists fitness_workouts  text[] default '{}';
alter table users add column if not exists sleep_quality     text default '';
alter table users add column if not exists sleep_issues      text[] default '{}';
alter table users add column if not exists stress_triggers   text[] default '{}';
alter table users add column if not exists income_range      text default '';
alter table users add column if not exists eat_habits        text[] default '{}';
alter table users add column if not exists diet_restrictions text default '';
alter table users add column if not exists job_type          text default '';
-- 99 = "already complete / not applicable" so every existing row (all of
-- which came through the website) is treated as already onboarded by
-- default; only get_or_create_user() explicitly sets this to -1 for a
-- brand new WhatsApp-first contact, gating them into the WhatsApp-native
-- onboarding flow instead of full chat.
alter table users add column if not exists onboarding_step   int default 99;
alter table users add column if not exists money_nudge_time   text default '1 PM';
alter table users add column if not exists fitness_nudge_time text default '6:30 PM';
alter table users add column if not exists study_nudge_time   text default '9 PM';
alter table users add column if not exists subscription_id     text;
alter table users add column if not exists subscription_status text;
alter table users add column if not exists plan_expires_at      timestamptz;
alter table users add column if not exists bonus_messages       int default 0;

-- ─── email_otps ────────────────────────────────────────────────────────────
create table if not exists email_otps (
    id           uuid primary key default gen_random_uuid(),
    email        text not null,
    otp_code     text not null,
    expires_at   timestamptz not null,
    verified     boolean default false,
    attempts     int default 0,
    created_at   timestamptz default now()
);
create index if not exists idx_email_otps_email on email_otps(email, created_at desc);
alter table email_otps add column if not exists attempts int default 0;

-- ─── processed_messages ────────────────────────────────────────────────────
-- Dedup guard for Meta's WhatsApp webhook: Meta redelivers the identical
-- payload (same message id) if it doesn't get a fast 200 back, and without
-- this a slow reply (vision + tool calls easily take longer than Meta's ack
-- window) gets processed twice — the user sees the same explanation sent
-- twice. DB-backed rather than in-memory so this survives a Render restart
-- and works correctly even if this ever runs as more than one process.
create table if not exists processed_messages (
    message_id  text primary key,
    created_at  timestamptz default now()
);
create index if not exists idx_processed_messages_created on processed_messages(created_at);

-- ─── story_cache ───────────────────────────────────────────────────────────
-- A rotating pool of ~10 short story gists (title + a short excerpt, not
-- full posts) fetched periodically from Reddit, offered to users who seem
-- bored — KYROO retells these in its own words, never pastes them verbatim.
create table if not exists story_cache (
    id           uuid primary key default gen_random_uuid(),
    source       text default 'reddit',
    subreddit    text,
    title        text not null,
    gist         text default '',
    url          text default '',
    fetched_at   timestamptz default now()
);

-- ─── slang_cache ───────────────────────────────────────────────────────────
-- Urban Dictionary lookups keyed by term, so the same slang/meme term asked
-- by different users doesn't re-hit the external API every single time -
-- definitions for a given term are stable, not per-user or time-sensitive.
create table if not exists slang_cache (
    term         text primary key,
    definition   text not null,
    cached_at    timestamptz default now()
);

-- ─── chat_history ──────────────────────────────────────────────────────────
create table if not exists chat_history (
    id             uuid primary key default gen_random_uuid(),
    user_id        uuid not null references users(id) on delete cascade,
    user_message   text not null,
    kiro_response  text not null,
    module         text default 'general',
    created_at     timestamptz default now()
);
create index if not exists idx_chat_history_user on chat_history(user_id, created_at desc);

-- ─── user_tracking (one row per user per day) ─────────────────────────────
create table if not exists user_tracking (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null references users(id) on delete cascade,
    date              date not null,

    steps             int,
    workout_done      boolean,
    workout_name      text,
    workout_duration  int,
    calories_burned   int,
    water_glasses     int,
    weight_kg         numeric,

    spent_today       numeric,
    spent_category    text,
    saved_today       numeric,

    mood_score        int,
    stress_score      int,
    journal_entry     text,

    sleep_hours       numeric,
    sleep_quality     int,
    bedtime           text,
    wake_time         text,

    study_minutes     int,
    study_topic       text,

    created_at        timestamptz default now(),
    unique (user_id, date)
);
create index if not exists idx_user_tracking_user on user_tracking(user_id, date desc);
alter table user_tracking add column if not exists study_minutes int;
alter table user_tracking add column if not exists study_topic   text;

-- ─── weekly_reports ────────────────────────────────────────────────────────
create table if not exists weekly_reports (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references users(id) on delete cascade,
    report_text   text not null,
    week_start    text default '',
    week_end      text default '',
    created_at    timestamptz default now()
);
create index if not exists idx_weekly_reports_user on weekly_reports(user_id, created_at desc);

-- ─── reminders ─────────────────────────────────────────────────────────────
create table if not exists reminders (
    id               uuid primary key default gen_random_uuid(),
    user_id          uuid not null references users(id) on delete cascade,
    message          text not null,
    remind_at        timestamptz not null,
    pre_alert_at     timestamptz not null,
    is_sent          boolean default false,
    pre_alert_sent   boolean default false,
    created_at       timestamptz default now()
);
create index if not exists idx_reminders_user on reminders(user_id, remind_at);

-- ─── sent_nudges ───────────────────────────────────────────────────────────
-- Idempotency guard for the nudges cron: nudges (unlike reminders) have no
-- row of their own to atomically claim via an is_sent flag, and the prior
-- "already sent today" check (a chat_history lookup) is check-then-act —
-- two overlapping cron runs (e.g. GitHub Actions and an external cron
-- service both hitting /nudges/check-and-send around the same time) could
-- both pass that check before either logs the send, producing a duplicate
-- WhatsApp message. The primary key here makes the claim atomic: whichever
-- run's INSERT lands first wins, the other gets a constraint violation and
-- skips. Same rationale as processed_messages for the webhook.
create table if not exists sent_nudges (
    user_id     uuid not null references users(id) on delete cascade,
    slot        text not null,
    sent_date   date not null,
    created_at  timestamptz default now(),
    primary key (user_id, slot, sent_date)
);

-- ─── message_usage ─────────────────────────────────────────────────────────
-- One row per user per day, incremented on every inbound WhatsApp message
-- that reaches an LLM call (see increment_message_usage below) - drives the
-- free/pro daily message cap. A separate table rather than columns on
-- users so the increment can be a single atomic upsert (INSERT ... ON
-- CONFLICT) instead of a read-then-write on the users row, which is
-- written by many other things (nudge times, tracking, etc) and would
-- risk losing a concurrent increment.
create table if not exists message_usage (
    user_id     uuid not null references users(id) on delete cascade,
    date        date not null,
    count       int not null default 0,
    primary key (user_id, date)
);

-- Atomically increments (and creates if needed) today's usage row,
-- returning the new count - a plain read-then-write from Python would
-- lose an increment if two messages from the same user landed at
-- nearly the same time.
create or replace function increment_message_usage(p_user_id uuid, p_date date)
returns int
language sql
as $$
    insert into message_usage (user_id, date, count)
    values (p_user_id, p_date, 1)
    on conflict (user_id, date)
    do update set count = message_usage.count + 1
    returning count;
$$;

-- Atomically spends one purchased top-up message, returning the new
-- balance - or NULL (via WHERE matching zero rows) if there was nothing
-- left to spend, which is how the caller tells "had a bonus message"
-- apart from "balance is now zero" without a second query.
create or replace function consume_bonus_message(p_user_id uuid)
returns int
language sql
as $$
    update users
    set bonus_messages = bonus_messages - 1
    where id = p_user_id and bonus_messages > 0
    returning bonus_messages;
$$;

-- Atomically credits a top-up purchase to a user's bonus balance.
create or replace function add_bonus_messages(p_user_id uuid, p_amount int)
returns int
language sql
as $$
    update users
    set bonus_messages = bonus_messages + p_amount
    where id = p_user_id
    returning bonus_messages;
$$;

-- ─── cron_runs ─────────────────────────────────────────────────────────────
-- One row per /nudges/check-and-send or /reminders/check-and-send hit, so a
-- "no nudges arrived today" report can be diagnosed from the actual gap
-- between runs (external cron trigger not firing) instead of guessed at —
-- query this via GET /debug/cron-status before assuming an app-code bug.
create table if not exists cron_runs (
    id          bigint generated always as identity primary key,
    job         text not null,
    ran_at      timestamptz not null default now(),
    checked     int,
    sent        int,
    failed      int,
    suppressed  int
);
create index if not exists idx_cron_runs_job_ran_at on cron_runs (job, ran_at desc);

-- ─── emotional_memory ──────────────────────────────────────────────────────
create table if not exists emotional_memory (
    id               uuid primary key default gen_random_uuid(),
    user_id          uuid not null references users(id) on delete cascade,
    event_type       text not null,
    detail           text,
    follow_up_sent   boolean default false,
    created_at       timestamptz default now()
);
create index if not exists idx_emotional_memory_user on emotional_memory(user_id, created_at desc);

-- ─── user_style ────────────────────────────────────────────────────────────
create table if not exists user_style (
    id                    uuid primary key default gen_random_uuid(),
    user_id               uuid not null unique references users(id) on delete cascade,
    avg_message_length    text,
    uses_dragged_words    boolean,
    uses_hinglish         boolean,
    common_emojis         text,
    energy_level          text,
    engagement_score      real default 0,
    message_count         int default 0,
    created_at            timestamptz default now()
);

-- ─── memory_embeddings (semantic memory, pgvector) ────────────────────────
create extension if not exists vector;

create table if not exists memory_embeddings (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references users(id) on delete cascade,
    content      text not null,
    embedding    vector(512),  -- voyage-3-lite output dimension
    source       text default 'chat',
    created_at   timestamptz default now()
);
create index if not exists idx_memory_embeddings_user on memory_embeddings(user_id);
create index if not exists idx_memory_embeddings_vector on memory_embeddings
    using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- RPC used by memory.py to run cosine-similarity search via supabase-py
create or replace function match_memories(
    query_embedding vector(512),
    match_user_id uuid,
    match_count int default 3
)
returns table (id uuid, content text, source text, similarity float, created_at timestamptz)
language sql stable
as $$
    select id, content, source,
           1 - (embedding <=> query_embedding) as similarity,
           created_at
    from memory_embeddings
    where user_id = match_user_id
    order by embedding <=> query_embedding
    limit match_count;
$$;

-- ─── Row Level Security ────────────────────────────────────────────────────
-- The backend connects with the service_role key, which always bypasses RLS.
-- We still enable RLS on every table (Supabase best practice / linter requirement)
-- and add a permissive service_role policy so behavior is explicit either way.
alter table users              enable row level security;
alter table chat_history       enable row level security;
alter table user_tracking      enable row level security;
alter table weekly_reports     enable row level security;
alter table reminders          enable row level security;
alter table emotional_memory   enable row level security;
alter table user_style         enable row level security;
alter table memory_embeddings  enable row level security;
alter table sent_nudges        enable row level security;
alter table message_usage      enable row level security;

do $$
declare
    t text;
begin
    foreach t in array array['users','chat_history','user_tracking','weekly_reports','reminders','emotional_memory','user_style','memory_embeddings','sent_nudges','message_usage']
    loop
        execute format('drop policy if exists "service_role_all_%s" on %I;', t, t);
        execute format(
            'create policy "service_role_all_%s" on %I for all to service_role using (true) with check (true);',
            t, t
        );
    end loop;
end $$;
