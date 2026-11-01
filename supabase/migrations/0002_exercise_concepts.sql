-- ---------------------------------------------------------------------------
-- Explicit exercise-to-concept evidence
--
-- Passing an exercise may only credit concepts that the exercise actually
-- assesses. Keep this relationship separate from lesson_concepts: sharing a
-- lesson is not evidence for every concept in that lesson.
--
-- This migration is forward-only. It does not rewrite concept_mastery:
-- evidence created before explicit mappings cannot be attributed to a
-- specific exercise concept, so existing history is left intact.
-- ---------------------------------------------------------------------------

create table public.exercise_concepts (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  concept_id uuid not null references public.concepts (id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  primary key (exercise_id, concept_id)
);

create index exercise_concepts_concept_id_idx
  on public.exercise_concepts (concept_id);

alter table public.exercise_concepts enable row level security;

create policy "exercise_concepts_read_published" on public.exercise_concepts
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.exercises e
      join public.lessons l on l.id = e.lesson_id
      where e.id = exercise_concepts.exercise_id
        and e.is_published
        and l.is_published
    )
  );

-- Curriculum mappings are server-managed. Authenticated and anonymous users
-- can read published mappings, but cannot write them through PostgREST.
revoke all on public.exercise_concepts from anon, authenticated;
grant select on public.exercise_concepts to anon, authenticated;

comment on table public.exercise_concepts is
  'Concepts explicitly assessed by an exercise. Lesson membership alone is not evidence.';

-- Backfill the shipped Python curriculum. The join uses lesson slug plus
-- exercise slug because exercise slugs are only unique within a lesson.
insert into public.exercise_concepts (exercise_id, concept_id, position)
select e.id, c.id, mapping.position
from (
  values
    ('variables-and-types', 'build-a-profile', 'variables', 1),
    ('variables-and-types', 'build-a-profile', 'data-types', 2),
    ('variables-and-types', 'temperature-conversion', 'variables', 1),
    ('variables-and-types', 'temperature-conversion', 'data-types', 2),
    ('strings-and-output', 'format-a-name', 'strings', 1),
    ('strings-and-output', 'normalize-a-tag', 'strings', 1),
    ('booleans-and-conditionals', 'classify-score', 'booleans', 1),
    ('booleans-and-conditionals', 'classify-score', 'conditionals', 2),
    ('booleans-and-conditionals', 'can-access', 'booleans', 1),
    ('loops-and-iteration', 'sum-of-evens', 'loops', 1),
    ('loops-and-iteration', 'count-vowels', 'loops', 1),
    ('lists-and-collections', 'find-largest', 'lists', 1),
    ('lists-and-collections', 'find-largest', 'loops', 2),
    ('lists-and-collections', 'remove-duplicates', 'lists', 1),
    ('dictionaries-and-lookups', 'word-frequencies', 'dictionaries', 1),
    ('dictionaries-and-lookups', 'inventory-total', 'dictionaries', 1),
    ('functions-and-parameters', 'apply-discount', 'functions', 1),
    ('functions-and-parameters', 'safe-average', 'functions', 1),
    ('debugging-and-errors', 'fix-the-average', 'debugging', 1),
    ('debugging-and-errors', 'first-item', 'debugging', 1),
    ('files-and-exceptions', 'safe-divide', 'exceptions', 1),
    ('files-and-exceptions', 'sum-file-numbers', 'files', 1),
    ('modules-and-reuse', 'price-helper', 'modules', 1),
    ('modules-and-reuse', 'price-helper', 'functions', 2),
    ('classes-and-objects', 'bank-account', 'classes', 1),
    ('practical-project', 'expense-report', 'problem-decomposition', 1),
    ('practical-project', 'expense-report', 'dictionaries', 2),
    ('practical-project', 'expense-report', 'functions', 3),
    ('practical-project', 'expense-report', 'lists', 4)
) as mapping (lesson_slug, exercise_slug, concept_slug, position)
join public.lessons l on l.slug = mapping.lesson_slug
join public.exercises e
  on e.lesson_id = l.id and e.slug = mapping.exercise_slug
join public.concepts c on c.slug = mapping.concept_slug
on conflict (exercise_id, concept_id) do update
  set position = excluded.position;
