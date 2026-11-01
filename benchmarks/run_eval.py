#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BENCH = Path(__file__).parent

def main():
    try:
        data = json.loads((BENCH / "python_tutor_eval.json").read_text(encoding="utf-8"))
    except Exception as e:
        print(f"Failed to load benchmark: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Loaded {len(data)} cases\n")
    print("=" * 60)
    for i, case in enumerate(data):
        print(f"[{i+1}] {case['id']} | {case['category']}")
        print(f"    lesson: {case.get('lesson_slug')} | exercise: {case.get('exercise_slug')} | mapped: {case.get('is_mapped')} | concepts: {case.get('concepts_mapped')}")
        print(f"    judge0.status: {case.get('judge0',{}).get('status')} | harness_mode: {case.get('harness_mode')}")
        if case.get('learner_code'):
            print("    learner_code:")
            for line in case['learner_code'].splitlines():
                print(f"      {line}")
        if case.get('learner_stuck_code'):
            print("    learner_stuck_code:")
            for line in case['learner_stuck_code'].splitlines():
                print(f"      {line}")
        if case.get('tests_from_curriculum'):
            print(f"    tests_from_curriculum: {len(case['tests_from_curriculum'])} test(s)")
        print("=" * 60)
    
    print("\nExecution-trace schema shape (for model eval):")
    print("messages: [{role: system/user/assistant, content: ...}]")
    print("metadata: {task_type, lesson_slug, exercise_slug, concepts_mapped, is_mapped, mode, judge0:{status,exit_code,stdout,stderr}, tests:[], fixed_code_passes, source}")
    print("\nTo run against the actual harness: use lib/execution/service.runLearnerCode with admin + exerciseId, or lib/execution/judge0.executePython for direct runs.")
    print("Note: judge0 credentials required for real execution; see .env.example")

if __name__ == "__main__":
    main()
