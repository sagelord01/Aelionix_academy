"use client";

import { useEffect } from "react";
import { ArrowRight, CheckCircle2, Sparkles, Trophy, X } from "lucide-react";
import Button from "@/components/ui/Button";
import styles from "./VictoryModal.module.css";

export default function VictoryModal({
  isOpen,
  onClose,
  exerciseTitle,
  onNextExercise,
  hasNextExercise,
  lessonTitle,
  nextLessonSlug,
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className={styles.glow} />

        <div className={styles.badgeRow}>
          <span className={styles.badge}>
            <Sparkles size={13} className={styles.sparkleIcon} />
            <span>EXERCISE CONQUERED</span>
          </span>
        </div>

        <div className={styles.iconCircle}>
          <Trophy size={36} className={styles.trophyIcon} />
        </div>

        <h2 className={styles.title}>All Checks Passed!</h2>
        <p className={styles.subtitle}>
          You solved <strong>{exerciseTitle}</strong> with clean, verified Python code.
        </p>

        <div className={styles.statsCard}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>XP Earned</span>
            <span className={styles.statValue}>+50 XP</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Mastery Level</span>
            <span className={styles.statValueHighlight}>+15% Evidence</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Status</span>
            <span className={styles.statValueSuccess}>
              <CheckCircle2 size={13} /> Verified
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          {hasNextExercise ? (
            <Button
              variant="primary"
              size="lg"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => {
                onClose();
                onNextExercise();
              }}
              className={styles.nextBtn}
            >
              Next Challenge
            </Button>
          ) : nextLessonSlug ? (
            <Button
              variant="primary"
              size="lg"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => {
                onClose();
                window.location.href = `/learn/${nextLessonSlug}`;
              }}
              className={styles.nextBtn}
            >
              Continue to Next Lesson
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={onClose}
              className={styles.nextBtn}
            >
              Review Code
            </Button>
          )}

          <Button variant="ghost" size="md" onClick={onClose}>
            Inspect Solution
          </Button>
        </div>
      </div>
    </div>
  );
}
