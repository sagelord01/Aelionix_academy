import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { curricula } from "../data/curriculum/index.js";

function stableId(namespace) {
  const hash = createHash("sha256").update(`learning-workspace:${namespace}`).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `a${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}

function sql(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function json(value) {
  return `${sql(JSON.stringify(value))}::jsonb`;
}

function insert(table, columns, values) {
  return `insert into public.${table} (${columns.join(", ")})\nvalues (${values.join(", ")})\n`;
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
  return value;
}

/**
 * Validate one curriculum before it can become seed SQL. This is intentionally
 * generic: another language or subject only needs the same shape.
 */
export function validateCurriculum(curriculum) {
  if (!curriculum || typeof curriculum !== "object") {
    throw new Error("A curriculum entry is required.");
  }

  const { track, concepts, assessment, reviewCards } = curriculum;
  if (!track || typeof track !== "object") {
    throw new Error("Curriculum track is required.");
  }

  requireString(track.slug, "track.slug");
  requireString(track.title, "track.title");
  requireString(track.language, `track (${track.slug}) language`);

  const conceptSlugs = new Set();
  for (const concept of requireArray(concepts, `track (${track.slug}) concepts`)) {
    const slug = requireString(concept?.slug, `track (${track.slug}) concept slug`);
    if (conceptSlugs.has(slug)) {
      throw new Error(`Track ${track.slug} repeats concept ${slug}.`);
    }
    conceptSlugs.add(slug);
  }

  if (!assessment || typeof assessment !== "object") {
    throw new Error(`Track ${track.slug} needs an assessment.`);
  }
  requireString(assessment.slug, `track (${track.slug}) assessment.slug`);
  for (const question of requireArray(
    assessment.questions,
    `track (${track.slug}) assessment.questions`,
  )) {
    requireString(question?.key, `track (${track.slug}) question key`);
    requireString(question?.concept, `track (${track.slug}) question ${question.key} concept`);
    if (!conceptSlugs.has(question.concept)) {
      throw new Error(
        `Question ${question.key} references unknown concept ${question.concept}.`,
      );
    }
  }

  for (const card of requireArray(
    reviewCards,
    `track (${track.slug}) reviewCards`,
  )) {
    requireString(card?.key, `track (${track.slug}) review card key`);
    requireString(card?.concept, `track (${track.slug}) review card ${card.key} concept`);
    if (!conceptSlugs.has(card.concept)) {
      throw new Error(
        `Review card ${card.key} references unknown concept ${card.concept}.`,
      );
    }
  }

  const lessonSlugs = new Set();
  const lessons = requireArray(track.lessons, `track (${track.slug}) lessons`);
  for (const lesson of lessons) {
    const lessonSlug = requireString(
      lesson?.slug,
      `track (${track.slug}) lesson slug`,
    );
    if (lessonSlugs.has(lessonSlug)) {
      throw new Error(`Track ${track.slug} repeats lesson ${lessonSlug}.`);
    }
    lessonSlugs.add(lessonSlug);

    for (const conceptSlug of requireArray(
      lesson.concepts,
      `lesson (${lessonSlug}) concepts`,
    )) {
      if (!conceptSlugs.has(conceptSlug)) {
        throw new Error(
          `Lesson ${lessonSlug} references unknown concept ${conceptSlug}.`,
        );
      }
    }

    const exerciseSlugs = new Set();
    for (const exercise of requireArray(
      lesson.exercises,
      `lesson (${lessonSlug}) exercises`,
    )) {
      const exerciseSlug = requireString(
        exercise?.slug,
        `lesson (${lessonSlug}) exercise slug`,
      );
      if (exerciseSlugs.has(exerciseSlug)) {
        throw new Error(
          `Lesson ${lessonSlug} repeats exercise ${exerciseSlug}.`,
        );
      }
      exerciseSlugs.add(exerciseSlug);

      const mappedConcepts = requireArray(
        exercise.concepts,
        `exercise (${lessonSlug}/${exerciseSlug}) concepts`,
      );
      const seen = new Set();
      for (const conceptSlug of mappedConcepts) {
        if (!conceptSlugs.has(conceptSlug)) {
          throw new Error(
            `Exercise ${lessonSlug}/${exerciseSlug} references unknown concept ${conceptSlug}.`,
          );
        }
        if (seen.has(conceptSlug)) {
          throw new Error(
            `Exercise ${lessonSlug}/${exerciseSlug} repeats concept ${conceptSlug}.`,
          );
        }
        seen.add(conceptSlug);
      }

      requireArray(
        exercise.tests,
        `exercise (${lessonSlug}/${exerciseSlug}) tests`,
      );
    }
  }

  for (const lesson of lessons) {
    for (const prerequisite of requireArray(
      lesson.prerequisites,
      `lesson (${lesson.slug}) prerequisites`,
    )) {
      if (!lessonSlugs.has(prerequisite)) {
        throw new Error(
          `Lesson ${lesson.slug} references unknown prerequisite ${prerequisite}.`,
        );
      }
    }
  }

  return lessons.flatMap((lesson) =>
    lesson.exercises
      .filter((exercise) => !exercise.concepts.length)
      .map(
        (exercise) =>
          `Exercise ${lesson.slug}/${exercise.slug} has no concept mapping; passing it will not award mastery.`,
      ),
  );
}

/**
 * Build the complete seed SQL without touching the filesystem so tests can
 * verify determinism and curriculum validity.
 */
export function buildSeed() {
  if (!curricula.length) throw new Error("At least one curriculum is required.");

  const allConcepts = new Map();
  const warnings = [];
  const lessonSlugs = new Set();

  for (const curriculum of curricula) {
    warnings.push(...validateCurriculum(curriculum));

    for (const concept of curriculum.concepts) {
      if (!allConcepts.has(concept.slug)) {
        allConcepts.set(concept.slug, concept);
      }
    }

    for (const lesson of curriculum.track.lessons) {
      if (lessonSlugs.has(lesson.slug)) {
        throw new Error(`Curriculum slugs must be globally unique: ${lesson.slug}.`);
      }
      lessonSlugs.add(lesson.slug);
    }
  }

  const out = [];
  out.push("-- Generated by scripts/generate-seed.mjs. Do not edit by hand.");
  out.push("-- Run: npm run seed:generate\n");

  // Concepts -----------------------------------------------------------------
  for (const concept of allConcepts.values()) {
    out.push(
      insert("concepts", ["id", "slug", "title", "description"], [
        sql(stableId(`concept:${concept.slug}`)),
        sql(concept.slug),
        sql(concept.title),
        sql(concept.description),
      ]) +
        `on conflict (id) do update set\n  slug = excluded.slug,\n  title = excluded.title,\n  description = excluded.description;\n`,
    );
  }

  for (const { track, assessment, reviewCards } of curricula) {
    // Track ------------------------------------------------------------------
    const trackId = stableId(`track:${track.slug}`);
    out.push(
      insert(
        "learning_tracks",
        ["id", "slug", "title", "description", "language", "position", "is_published"],
        [
          sql(trackId),
          sql(track.slug),
          sql(track.title),
          sql(track.description),
          sql(track.language),
          track.position,
          "true",
        ],
      ) +
        "on conflict (id) do update set\n  slug = excluded.slug,\n  title = excluded.title,\n  description = excluded.description,\n  language = excluded.language,\n  position = excluded.position,\n  is_published = excluded.is_published;\n",
    );

    // Lessons ----------------------------------------------------------------
    for (const lesson of track.lessons) {
      const lessonId = stableId(`lesson:${lesson.slug}`);
      out.push(
        insert(
          "lessons",
          [
            "id",
            "track_id",
            "slug",
            "title",
            "description",
            "difficulty",
            "estimated_minutes",
            "position",
            "objectives",
            "content",
            "is_published",
          ],
          [
            sql(lessonId),
            sql(trackId),
            sql(lesson.slug),
            sql(lesson.title),
            sql(lesson.description),
            sql(lesson.difficulty),
            lesson.estimatedMinutes,
            lesson.position,
            json(lesson.objectives),
            json(lesson.content),
            "true",
          ],
        ) +
          "on conflict (id) do update set\n  track_id = excluded.track_id,\n  slug = excluded.slug,\n  title = excluded.title,\n  description = excluded.description,\n  difficulty = excluded.difficulty,\n  estimated_minutes = excluded.estimated_minutes,\n  position = excluded.position,\n  objectives = excluded.objectives,\n  content = excluded.content,\n  is_published = excluded.is_published;\n",
      );
    }

    // Lesson relationships ---------------------------------------------------
    for (const lesson of track.lessons) {
      for (const conceptSlug of lesson.concepts) {
        out.push(
          insert(
            "lesson_concepts",
            ["lesson_id", "concept_id"],
            [sql(stableId(`lesson:${lesson.slug}`)), sql(stableId(`concept:${conceptSlug}`))],
          ) + "on conflict (lesson_id, concept_id) do nothing;\n",
        );
      }
      for (const prereq of lesson.prerequisites) {
        out.push(
          insert(
            "lesson_prerequisites",
            ["lesson_id", "prerequisite_lesson_id"],
            [sql(stableId(`lesson:${lesson.slug}`)), sql(stableId(`lesson:${prereq}`))],
          ) + "on conflict (lesson_id, prerequisite_lesson_id) do nothing;\n",
        );
      }
    }

    // Exercises + tests + assessed concepts ---------------------------------
    for (const lesson of track.lessons) {
      for (const exercise of lesson.exercises) {
        const exerciseId = stableId(`exercise:${lesson.slug}:${exercise.slug}`);
        out.push(
          insert(
            "exercises",
            [
              "id",
              "lesson_id",
              "slug",
              "title",
              "instructions",
              "expected_behavior",
              "starter_code",
              "language",
              "difficulty",
              "position",
              "hints",
              "is_published",
            ],
            [
              sql(exerciseId),
              sql(stableId(`lesson:${lesson.slug}`)),
              sql(exercise.slug),
              sql(exercise.title),
              sql(exercise.instructions),
              sql(exercise.expectedBehavior),
              sql(exercise.starterCode),
              sql(exercise.language || track.language),
              sql(exercise.difficulty),
              exercise.position,
              json(exercise.hints),
              "true",
            ],
          ) +
            "on conflict (id) do update set\n  lesson_id = excluded.lesson_id,\n  slug = excluded.slug,\n  title = excluded.title,\n  instructions = excluded.instructions,\n  expected_behavior = excluded.expected_behavior,\n  starter_code = excluded.starter_code,\n  difficulty = excluded.difficulty,\n  position = excluded.position,\n  hints = excluded.hints,\n  is_published = excluded.is_published;\n",
        );

        exercise.tests.forEach((test, index) => {
          out.push(
            insert(
              "exercise_tests",
              ["id", "exercise_id", "name", "code", "is_hidden", "position"],
              [
                sql(stableId(`test:${lesson.slug}:${exercise.slug}:${index}`)),
                sql(exerciseId),
                sql(test.name),
                sql(test.code),
                test.hidden ? "true" : "false",
                index + 1,
              ],
            ) +
              "on conflict (id) do update set\n  exercise_id = excluded.exercise_id,\n  name = excluded.name,\n  code = excluded.code,\n  is_hidden = excluded.is_hidden,\n  position = excluded.position;\n",
          );
        });

        // Delete first so removing a mapping from the source also removes it
        // from the database. The seed remains idempotent and exact.
        out.push(
          `delete from public.exercise_concepts where exercise_id = ${sql(exerciseId)};\n`,
        );
        exercise.concepts.forEach((conceptSlug, index) => {
          out.push(
            insert(
              "exercise_concepts",
              ["exercise_id", "concept_id", "position"],
              [
                sql(exerciseId),
                sql(stableId(`concept:${conceptSlug}`)),
                index + 1,
              ],
            ) +
              "on conflict (exercise_id, concept_id) do update set\n  position = excluded.position;\n",
          );
        });
      }
    }

    // Assessment -------------------------------------------------------------
    const assessmentId = stableId(`assessment:${assessment.slug}`);
    out.push(
      insert(
        "assessment_definitions",
        ["id", "slug", "title", "description", "is_published"],
        [
          sql(assessmentId),
          sql(assessment.slug),
          sql(assessment.title),
          sql(assessment.description),
          "true",
        ],
      ) +
        "on conflict (id) do update set\n  slug = excluded.slug,\n  title = excluded.title,\n  description = excluded.description,\n  is_published = excluded.is_published;\n",
    );

    assessment.questions.forEach((question, index) => {
      const questionId = stableId(`question:${question.key}`);
      out.push(
        insert(
          "assessment_questions",
          [
            "id",
            "assessment_id",
            "concept_id",
            "key",
            "type",
            "difficulty",
            "position",
            "prompt",
            "options",
            "starter_code",
            "is_published",
          ],
          [
            sql(questionId),
            sql(assessmentId),
            sql(stableId(`concept:${question.concept}`)),
            sql(question.key),
            sql(question.type),
            question.difficulty,
            index + 1,
            sql(question.prompt),
            json(question.options || []),
            sql(question.starterCode || ""),
            "true",
          ],
        ) +
          "on conflict (id) do update set\n  concept_id = excluded.concept_id,\n  key = excluded.key,\n  type = excluded.type,\n  difficulty = excluded.difficulty,\n  position = excluded.position,\n  prompt = excluded.prompt,\n  options = excluded.options,\n  starter_code = excluded.starter_code,\n  is_published = excluded.is_published;\n",
      );

      out.push(
        insert(
          "assessment_question_keys",
          ["question_id", "answer", "explanation", "self_assessed", "optional_if_execution_unavailable"],
          [
            sql(questionId),
            json({
              ...question.answer,
              ...(question.acceptedAnswers?.length
                ? { acceptedAnswers: question.acceptedAnswers }
                : {}),
            }),
            sql(question.explanation || ""),
            question.selfAssessed ? "true" : "false",
            question.optionalIfExecutionUnavailable ? "true" : "false",
          ],
        ) +
          "on conflict (question_id) do update set\n  answer = excluded.answer,\n  explanation = excluded.explanation,\n  self_assessed = excluded.self_assessed,\n  optional_if_execution_unavailable = excluded.optional_if_execution_unavailable;\n",
      );
    });

    // Review cards -----------------------------------------------------------
    for (const card of reviewCards) {
      const cardId = stableId(`review-card:${card.key}`);
      out.push(
        insert(
          "review_cards",
          ["id", "concept_id", "key", "type", "prompt", "options", "is_published"],
          [
            sql(cardId),
            sql(stableId(`concept:${card.concept}`)),
            sql(card.key),
            sql(card.type),
            sql(card.prompt),
            json(card.options || []),
            "true",
          ],
        ) +
          "on conflict (id) do update set\n  concept_id = excluded.concept_id,\n  key = excluded.key,\n  type = excluded.type,\n  prompt = excluded.prompt,\n  options = excluded.options,\n  is_published = excluded.is_published;\n",
      );
      out.push(
        insert(
          "review_card_keys",
          ["card_id", "answer", "explanation"],
          [sql(cardId), json(card.answer), sql(card.explanation || "")],
        ) +
          "on conflict (card_id) do update set\n  answer = excluded.answer,\n  explanation = excluded.explanation;\n",
      );
    }
  }

  return {
    sql: out.join("\n"),
    statements: out.length,
    warnings,
  };
}

const isCli =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const { sql: seedSql, statements, warnings } = buildSeed();
  const target = resolve(process.cwd(), "supabase/seed.sql");
  writeFileSync(target, seedSql, "utf8");
  for (const warning of warnings) console.warn(`Warning: ${warning}`);
  console.log(`Wrote ${target} (${statements} statements).`);
}
