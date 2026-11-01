/**
 * Exercise concepts arrive from PostgREST sometimes as nested rows and
 * sometimes as plain objects in tests. Normalize without inventing evidence:
 * every concept needs a real id, and repeats are ignored.
 */
export function normalizeExerciseConcepts(concepts = []) {
  if (!Array.isArray(concepts)) return [];

  const seen = new Set();
  const normalized = [];
  for (const concept of concepts) {
    if (!concept?.id || seen.has(concept.id)) continue;
    seen.add(concept.id);
    normalized.push(concept);
  }
  return normalized;
}
