-- ---------------------------------------------------------------------------
-- Learning Workspace — initial schema
-- Apply with the Supabase CLI (`supabase db reset`) or via the SQL editor.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  experience_level text not null default 'beginner'
    check (experience_level in ('beginner', 'some_experience', 'intermediate', 'advanced')),
  learning_goal text not null default 'general'
    check (learning_goal in ('general', 'career', 'projects', 'interviews', 'academic', 'curiosity')),
  preferred_mode text not null default 'coach'
    check (preferred_mode in ('coach', 'partner')),
  weekly_minutes integer not null default 120
    check (weekly_minutes between 15 and 3000),
  hint_preference text not null default 'balanced'
    check (hint_preference in ('hints', 'direct', 'balanced')),
  onboarding_completed boolean not null default false,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Create a profile whenever Supabase Auth creates a user. This keeps auth and
-- application data linked without trusting client-supplied profile creation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Curriculum
-- ---------------------------------------------------------------------------

create table public.learning_tracks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  language text not null default 'python',
  position integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.learning_tracks (id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null default '',
  difficulty text not null default 'beginner'
    check (difficulty in ('beginner', 'intermediate', 'advanced')),
  estimated_minutes integer not null default 30 check (estimated_minutes between 5 and 600),
  position integer not null default 0,
  objectives jsonb not null default '[]'::jsonb,
  content jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (track_id, position)
);

create table public.lesson_prerequisites (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  prerequisite_lesson_id uuid not null references public.lessons (id) on delete cascade,
  primary key (lesson_id, prerequisite_lesson_id),
  check (lesson_id <> prerequisite_lesson_id)
);

create table public.lesson_concepts (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  concept_id uuid not null references public.concepts (id) on delete cascade,
  primary key (lesson_id, concept_id)
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  slug text not null,
  title text not null,
  instructions text not null,
  expected_behavior text not null default '',
  starter_code text not null default '',
  language text not null default 'python',
  difficulty text not null default 'beginner'
    check (difficulty in ('beginner', 'intermediate', 'advanced')),
  position integer not null default 0,
  hints jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (lesson_id, slug),
  unique (lesson_id, position)
);

-- Test code and expected answers are intentionally isolated in server-only
-- tables. They have RLS enabled and no policies for anon/authenticated.
create table public.exercise_tests (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  name text not null,
  code text not null,
  is_hidden boolean not null default false,
  position integer not null default 0,
  unique (exercise_id, position)
);

-- ---------------------------------------------------------------------------
-- Initial assessment content
-- ---------------------------------------------------------------------------

create table public.assessment_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessment_definitions (id) on delete cascade,
  concept_id uuid references public.concepts (id) on delete set null,
  key text not null unique,
  type text not null
    check (type in ('multiple_choice', 'code_output', 'short_answer', 'code')),
  difficulty integer not null default 1 check (difficulty between 1 and 3),
  position integer not null default 0,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  starter_code text not null default '',
  is_published boolean not null default true,
  unique (assessment_id, position)
);

create table public.assessment_question_keys (
  question_id uuid primary key references public.assessment_questions (id) on delete cascade,
  answer jsonb not null,
  explanation text not null default '',
  self_assessed boolean not null default false,
  optional_if_execution_unavailable boolean not null default false
);

-- ---------------------------------------------------------------------------
-- Learner activity
-- ---------------------------------------------------------------------------

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  assessment_id uuid not null references public.assessment_definitions (id) on delete cascade,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  summary jsonb not null default '{}'::jsonb
);

create table public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  question_id uuid not null references public.assessment_questions (id) on delete cascade,
  response jsonb,
  is_correct boolean,
  score numeric(5, 2),
  skipped boolean not null default false,
  created_at timestamptz not null default now(),
  unique (assessment_id, question_id)
);

create table public.concept_mastery (
  user_id uuid not null references auth.users (id) on delete cascade,
  concept_id uuid not null references public.concepts (id) on delete cascade,
  status text not null default 'not_assessed'
    check (status in ('not_assessed', 'insufficient_evidence', 'developing', 'demonstrated', 'ready_for_challenge')),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  practical_successes integer not null default 0 check (practical_successes >= 0),
  last_evidence_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, concept_id),
  check (correct_count <= evidence_count)
);

create table public.lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, lesson_id)
);

create table public.exercise_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  status text not null default 'attempted'
    check (status in ('attempted', 'passed')),
  attempts integer not null default 0 check (attempts >= 0),
  passed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create table public.exercise_drafts (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  code text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create trigger exercise_drafts_set_updated_at
before update on public.exercise_drafts
for each row execute function public.set_updated_at();

create table public.code_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  exercise_id uuid references public.exercises (id) on delete set null,
  attempt_kind text not null default 'run'
    check (attempt_kind in ('run', 'submit', 'assessment')),
  code text not null,
  language text not null default 'python',
  execution_status text not null
    check (execution_status in (
      'success', 'runtime_error', 'syntax_error', 'timeout', 'processing',
      'service_unavailable', 'invalid_request', 'test_failure', 'unknown'
    )),
  stdout text not null default '',
  stderr text not null default '',
  exit_code integer,
  duration_ms integer,
  test_results jsonb not null default '[]'::jsonb,
  provider text,
  provider_submission_id text,
  is_successful boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.tutor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  exercise_id uuid references public.exercises (id) on delete set null,
  exploration_session_id uuid,
  mode text not null default 'coach' check (mode in ('coach', 'partner')),
  title text not null default 'Tutoring session',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tutor_conversations_set_updated_at
before update on public.tutor_conversations
for each row execute function public.set_updated_at();

create table public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.tutor_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 20000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.exploration_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null check (char_length(topic) between 2 and 240),
  language text not null default 'python',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger exploration_sessions_set_updated_at
before update on public.exploration_sessions
for each row execute function public.set_updated_at();

alter table public.tutor_conversations
  add constraint tutor_conversations_exploration_fk
  foreign key (exploration_session_id)
  references public.exploration_sessions (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Spaced review
-- ---------------------------------------------------------------------------

create table public.review_cards (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.concepts (id) on delete cascade,
  key text not null unique,
  type text not null check (type in ('multiple_choice', 'code_output', 'short_answer')),
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.review_card_keys (
  card_id uuid primary key references public.review_cards (id) on delete cascade,
  answer jsonb not null,
  explanation text not null default ''
);

create table public.review_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.review_cards (id) on delete cascade,
  concept_id uuid not null references public.concepts (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  due_at timestamptz not null default now(),
  interval_days integer not null default 1 check (interval_days >= 0),
  repetitions integer not null default 0 check (repetitions >= 0),
  ease numeric(4, 2) not null default 2.50 check (ease >= 1.30 and ease <= 3.50),
  lapses integer not null default 0 check (lapses >= 0),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, card_id)
);

create table public.review_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  review_item_id uuid not null references public.review_items (id) on delete cascade,
  response jsonb,
  is_correct boolean,
  quality integer check (quality between 0 and 5),
  confidence text check (confidence in ('low', 'medium', 'high')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Activity + operational usage
-- ---------------------------------------------------------------------------

create table public.learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in (
    'onboarding_completed', 'assessment_started', 'assessment_completed',
    'lesson_started', 'exercise_passed', 'lesson_completed',
    'review_completed', 'exploration_started', 'tutor_message'
  )),
  lesson_id uuid references public.lessons (id) on delete set null,
  exercise_id uuid references public.exercises (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  route text not null,
  provider text,
  model text,
  status text not null check (status in ('success', 'error', 'rate_limited', 'invalid_response')),
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('ai', 'execution', 'assessment', 'review', 'explore')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index learning_tracks_published_position_idx on public.learning_tracks (is_published, position);
create index lessons_track_position_idx on public.lessons (track_id, position);
create index lessons_published_idx on public.lessons (is_published);
create index exercises_lesson_position_idx on public.exercises (lesson_id, position);
create index exercise_tests_exercise_idx on public.exercise_tests (exercise_id, position);
create index assessment_questions_assessment_idx on public.assessment_questions (assessment_id, position);
create index assessments_user_idx on public.assessments (user_id, started_at desc);
create index assessment_responses_attempt_idx on public.assessment_responses (assessment_id);
create index concept_mastery_user_idx on public.concept_mastery (user_id);
create index lesson_progress_user_idx on public.lesson_progress (user_id, last_viewed_at desc);
create index exercise_progress_user_idx on public.exercise_progress (user_id);
create index code_attempts_user_created_idx on public.code_attempts (user_id, created_at desc);
create index code_attempts_user_exercise_idx on public.code_attempts (user_id, exercise_id, created_at desc);
create index tutor_conversations_user_idx on public.tutor_conversations (user_id, updated_at desc);
create index tutor_messages_conversation_idx on public.tutor_messages (conversation_id, created_at);
create index exploration_sessions_user_idx on public.exploration_sessions (user_id, updated_at desc);
create index review_items_user_due_idx on public.review_items (user_id, due_at);
create index review_attempts_user_idx on public.review_attempts (user_id, created_at desc);
create index review_attempts_item_idx on public.review_attempts (review_item_id);
create index learning_events_user_created_idx on public.learning_events (user_id, created_at desc);
create index ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);
create index usage_events_user_kind_created_idx on public.usage_events (user_id, kind, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.learning_tracks enable row level security;
alter table public.concepts enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_prerequisites enable row level security;
alter table public.lesson_concepts enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_tests enable row level security;
alter table public.assessment_definitions enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_question_keys enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_responses enable row level security;
alter table public.concept_mastery enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.exercise_progress enable row level security;
alter table public.exercise_drafts enable row level security;
alter table public.code_attempts enable row level security;
alter table public.tutor_conversations enable row level security;
alter table public.tutor_messages enable row level security;
alter table public.exploration_sessions enable row level security;
alter table public.review_cards enable row level security;
alter table public.review_card_keys enable row level security;
alter table public.review_items enable row level security;
alter table public.review_attempts enable row level security;
alter table public.learning_events enable row level security;
alter table public.ai_usage enable row level security;
alter table public.usage_events enable row level security;

-- Profiles: a learner can read and update only their own row.
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Published curriculum is readable without authentication.
create policy "tracks_read_published" on public.learning_tracks
  for select to anon, authenticated using (is_published);

create policy "concepts_read_all" on public.concepts
  for select to anon, authenticated using (true);

create policy "lessons_read_published" on public.lessons
  for select to anon, authenticated using (is_published);

create policy "prerequisites_read_published" on public.lesson_prerequisites
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.is_published
    )
  );

create policy "lesson_concepts_read_published" on public.lesson_concepts
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.is_published
    )
  );

create policy "exercises_read_published" on public.exercises
  for select to anon, authenticated
  using (
    is_published
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.is_published
    )
  );

create policy "assessment_definitions_read_published" on public.assessment_definitions
  for select to anon, authenticated using (is_published);

create policy "assessment_questions_read_published" on public.assessment_questions
  for select to authenticated
  using (
    is_published
    and exists (
      select 1 from public.assessment_definitions a
      where a.id = assessment_id and a.is_published
    )
  );

create policy "review_cards_read_published" on public.review_cards
  for select to authenticated using (is_published);

-- User-owned records: select only. Mutations happen through server-side
-- operations that validate ownership and evidence before using the admin client.
create policy "assessments_select_own" on public.assessments
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "assessment_responses_select_own" on public.assessment_responses
  for select to authenticated
  using (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_id and a.user_id = (select auth.uid())
    )
  );

create policy "concept_mastery_select_own" on public.concept_mastery
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "lesson_progress_select_own" on public.lesson_progress
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "exercise_progress_select_own" on public.exercise_progress
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "exercise_drafts_select_own" on public.exercise_drafts
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "exercise_drafts_insert_own" on public.exercise_drafts
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "exercise_drafts_update_own" on public.exercise_drafts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "exercise_drafts_delete_own" on public.exercise_drafts
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "code_attempts_select_own" on public.code_attempts
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "tutor_conversations_select_own" on public.tutor_conversations
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "tutor_messages_select_own" on public.tutor_messages
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "exploration_sessions_select_own" on public.exploration_sessions
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "review_items_select_own" on public.review_items
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "review_attempts_select_own" on public.review_attempts
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "learning_events_select_own" on public.learning_events
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);

-- Sensitive tables have RLS enabled and intentionally no anon/authenticated
-- policies. Only the service role can read or write them.
revoke all on public.exercise_tests from anon, authenticated;
revoke all on public.assessment_question_keys from anon, authenticated;
revoke all on public.review_card_keys from anon, authenticated;
revoke all on public.usage_events from anon, authenticated;

grant select on public.learning_tracks, public.concepts, public.lessons,
  public.lesson_prerequisites, public.lesson_concepts, public.exercises,
  public.assessment_definitions, public.assessment_questions,
  public.review_cards, public.profiles, public.assessments,
  public.assessment_responses, public.concept_mastery, public.lesson_progress,
  public.exercise_progress, public.exercise_drafts, public.code_attempts,
  public.tutor_conversations, public.tutor_messages, public.exploration_sessions,
  public.review_items, public.review_attempts, public.learning_events,
  public.ai_usage
  to authenticated;

grant select on public.learning_tracks, public.concepts, public.lessons,
  public.lesson_prerequisites, public.lesson_concepts, public.exercises,
  public.assessment_definitions
  to anon;

grant insert, update, delete on public.exercise_drafts to authenticated;

-- ---------------------------------------------------------------------------
-- Retention note
-- ---------------------------------------------------------------------------
-- Code attempts can contain learner-authored text and are kept so the learner
-- can review their history. The application only reads the most recent
-- attempts, and account deletion cascades to all learner-owned rows. Operators
-- who need a shorter retention window can add a scheduled job deleting
-- code_attempts/tutor_messages older than the documented policy.
