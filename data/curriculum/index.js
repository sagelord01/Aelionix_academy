import {
  assessment,
  concepts,
  pythonTrack,
  reviewCards,
} from "./python.js";

/**
 * Seed input for every shipped curriculum. Add a new entry here when a new
 * track is introduced; the seed builder does not assume a language or track.
 */
export const curricula = [
  {
    track: pythonTrack,
    concepts,
    assessment,
    reviewCards,
  },
];
