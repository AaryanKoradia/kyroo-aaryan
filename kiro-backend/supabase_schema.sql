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
    created_at     timestamptz default now()
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

    created_at        timestamptz default now(),
    unique (user_id, date)
);
create index if not exists idx_user_tracking_user on user_tracking(user_id, date desc);

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

do $$
declare
    t text;
begin
    foreach t in array array['users','chat_history','user_tracking','weekly_reports','reminders','emotional_memory','user_style','memory_embeddings']
    loop
        execute format(
            'create policy "service_role_all_%s" on %I for all to service_role using (true) with check (true);',
            t, t
        );
    end loop;
end $$;
