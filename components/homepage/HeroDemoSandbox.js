"use client";

import { useState } from "react";
import { Bot, Bug, CheckCircle2, Play, RefreshCw, Sparkles, Terminal } from "lucide-react";
import Button from "@/components/ui/Button";
import styles from "./HeroDemoSandbox.module.css";

const SCENARIOS = [
  {
    id: "discount",
    label: "🛒 E-Commerce Discount",
    title: "AI forgot the return statement",
    initialCode: `def calculate_discount(price, is_vip):
    if is_vip:
        price = price * 0.8
    # Bug: function forgets to return!`,
    testRun: (code) => {
      const trimmed = code.replace(/\s+/g, " ");
      if (/return\s+price/.test(code)) {
        return {
          ok: true,
          output: "calculate_discount(100, True) => 80.0\n✅ All 3 verification tests passed!",
          coach: "Spot on! 🎯 You caught a silent return bug that would have cost a live store real money. Understanding beats blind copy-pasting every time.",
        };
      }
      return {
        ok: false,
        output: "calculate_discount(100, True) => None\n⚠️ Warning: Function returned None instead of 80.0",
        coach: "Look at the end of the function! Python returns None by default unless you explicitly send something back. Add 'return price' and re-run!",
      };
    },
  },
  {
    id: "slice",
    label: "📊 Data Slicing",
    title: "AI off-by-one slice error",
    initialCode: `def get_top_tags(tags):
    # AI tried to get the first 3 tags
    return tags[0:2]`,
    testRun: (code) => {
      if (/tags\[\s*0?\s*:\s*3\s*\]/.test(code) || /tags\[\s*:\s*3\s*\]/.test(code)) {
        return {
          ok: true,
          output: "get_top_tags(['python', 'ai', 'cloud', 'db']) => ['python', 'ai', 'cloud']\n✅ Correct: Returned exactly 3 items.",
          coach: "Boom! 🚀 That off-by-one slice slip is one of the most frequent mistakes AI copilots generate. You knew the exact boundary rule.",
        };
      }
      return {
        ok: false,
        output: "get_top_tags(['python', 'ai', 'cloud', 'db']) => ['python', 'ai']\n⚠️ Returned only 2 items instead of 3.",
        coach: "Python slice bounds are exclusive at the end! `tags[0:2]` only takes indices 0 and 1. Change index 2 to 3 to include the 3rd element.",
      };
    },
  },
  {
    id: "security",
    label: "🛡️ Security Gate",
    title: "AI boolean precedence flaw",
    initialCode: `def can_access(is_admin, is_staff, is_active):
    # AI wrote: allow admin or staff if active
    return is_admin or is_staff and is_active`,
    testRun: (code) => {
      if (/\(\s*(is_admin\s+or\s+is_staff|is_staff\s+or\s+is_admin)\s*\)\s*and\s*is_active/.test(code)) {
        return {
          ok: true,
          output: "can_access(True, False, False) => False\n✅ Security check passed: Inactive users cannot enter.",
          coach: "Exceptional catch! 🛡️ In Python, 'and' evaluates before 'or'. Without parentheses, inactive admins slipped right through.",
        };
      }
      return {
        ok: false,
        output: "can_access(True, False, False) => True\n🚨 VULNERABILITY DETECTED: Inactive admin was granted access!",
        coach: "Watch out! `and` binds tighter than `or`. Group `(is_admin or is_staff) and is_active` so the `is_active` guard applies to everyone!",
      };
    },
  },
];

export default function HeroDemoSandbox() {
  const [activeIdx, setActiveIdx] = useState(0);
  const scenario = SCENARIOS[activeIdx];
  const [codes, setCodes] = useState(() => ({
    discount: SCENARIOS[0].initialCode,
    slice: SCENARIOS[1].initialCode,
    security: SCENARIOS[2].initialCode,
  }));
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  const currentCode = codes[scenario.id];

  function handleSelectScenario(index) {
    setActiveIdx(index);
    setResult(null);
  }

  function handleReset() {
    setCodes((prev) => ({ ...prev, [scenario.id]: scenario.initialCode }));
    setResult(null);
  }

  function handleRun() {
    setRunning(true);
    setTimeout(() => {
      const evaluation = scenario.testRun(currentCode);
      setResult(evaluation);
      setRunning(false);
    }, 280);
  }

  return (
    <div className={styles.sandbox} role="region" aria-label="Interactive AI Tutor Live Preview">
      <div className={styles.header}>
        <div className={styles.windowControls}>
          <span className={`${styles.dot} ${styles.dotClose}`} />
          <span className={`${styles.dot} ${styles.dotMin}`} />
          <span className={`${styles.dot} ${styles.dotMax}`} />
        </div>
        <div className={styles.title}>
          <Bot size={13} aria-hidden="true" />
          <span>Interactive AI Bug Detective</span>
        </div>
        <span className={styles.badgeLive}>
          <span className={styles.pulseDot} />
          Live Sandbox
        </span>
      </div>

      <div className={styles.scenarioTabs}>
        {SCENARIOS.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.tab} ${idx === activeIdx ? styles.tabActive : ""}`}
            onClick={() => handleSelectScenario(idx)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.editorArea}>
        <div className={styles.editorLabel}>
          <span>Inspect & Fix the AI's Code</span>
          <span>Python 3</span>
        </div>

        <textarea
          className={styles.codeTextarea}
          value={currentCode}
          spellCheck={false}
          onChange={(e) =>
            setCodes((prev) => ({ ...prev, [scenario.id]: e.target.value }))
          }
        />

        <div className={styles.actions}>
          <Button size="sm" icon={Play} onClick={handleRun} disabled={running}>
            {running ? "Verifying…" : "Run & Critique"}
          </Button>
          <Button size="sm" variant="ghost" icon={RefreshCw} onClick={handleReset}>
            Reset Code
          </Button>
        </div>

        {result ? (
          <>
            <div className={styles.terminal}>
              <p className={styles.terminalLabel}>Execution Output</p>
              <pre className={result.ok ? styles.termSuccess : styles.termBug}>
                {result.output}
              </pre>
            </div>

            <div className={styles.coachBubble}>
              <div className={styles.coachHead}>
                <Sparkles size={13} aria-hidden="true" />
                <span>Coach Guidance</span>
              </div>
              <p className={styles.coachBody}>{result.coach}</p>
            </div>
          </>
        ) : (
          <div className={styles.coachBubble}>
            <div className={styles.coachHead}>
              <Bug size={13} aria-hidden="true" />
              <span>Challenge: {scenario.title}</span>
            </div>
            <p className={styles.coachBody}>
              Click <strong>&quot;Run &amp; Critique&quot;</strong> to watch the AI Coach diagnose the error, then fix the code and re-run!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
