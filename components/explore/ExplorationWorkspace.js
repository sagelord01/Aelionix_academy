"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Code2,
  Eraser,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
} from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import CodeEditor from "@/components/workspace/CodeEditor";
import ExecutionResult from "@/components/workspace/ExecutionResult";
import TutorPanel from "@/components/tutor/TutorPanel";
import { postJson } from "@/lib/client/request";
import { formatDateTime } from "@/lib/utils/format";
import styles from "./ExplorationWorkspace.module.css";

const STARTER = `# Scratchpad — this code is stored in this browser only.
# Run it to see real output, then ask the partner a specific question.

topic = "exploration"
print(f"Ready to explore: {topic}")
`;

function readStoredCode(key) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export default function ExplorationWorkspace({
  session,
  tutor,
  executionConfigured,
  aiConfigured,
}) {
  const storageKey = `learning-workspace:exploration:${session.id}:code`;
  const [code, setCode] = useState(() => readStoredCode(storageKey) ?? STARTER);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, code);
        setSavedAt(new Date());
      } catch {
        setSavedAt(null);
      }
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [code, storageKey]);

  const savedLabel = useMemo(() => {
    if (!savedAt) return "Scratchpad stored in this browser";
    return `Saved locally at ${savedAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [savedAt]);

  async function runCode() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const payload = await postJson("/api/code/run", {
        code,
        language: "python",
        mode: "run",
      });
      setResult(payload.result);
      if (payload.warning) setError(payload.warning);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <Link href="/explore" className={styles.back}>
          <ArrowLeft size={14} aria-hidden="true" /> Explore
        </Link>
        <div className={styles.topicHead}>
          <div className={styles.topicCopy}>
            <p className="eyebrow">Exploration · {session.language}</p>
            <h1 className={styles.title}>{session.topic}</h1>
            <p className={styles.meta}>
              Opened {formatDateTime(session.created_at)} ·{" "}
              <Badge tone="neutral">{session.status}</Badge>
            </p>
          </div>
          <div className={styles.topicNote}>
            <Sparkles size={14} strokeWidth={1.6} aria-hidden="true" />
            <p>
              Exploration is ungraded. Nothing here changes lesson completion or
              mastery unless you later submit a graded exercise.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <section className={styles.studio} aria-labelledby="scratchpad-title">
          <div className={styles.studioHead}>
            <div>
              <p className="eyebrow">Scratchpad</p>
              <h2 id="scratchpad-title" className={styles.studioTitle}>
                Try the idea in real Python.
              </h2>
            </div>
            <span className={styles.saveState}>{savedLabel}</span>
          </div>

          <div className={styles.editorHead}>
            <span className={styles.fileLabel}>
              <Code2 size={13} aria-hidden="true" /> scratchpad.py
            </span>
            <div className={styles.editorActions}>
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={() => {
                  setCode(STARTER);
                  setResult(null);
                }}
                disabled={busy}
              >
                Reset
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={Play}
                onClick={runCode}
                disabled={busy || !executionConfigured}
              >
                {busy ? "Running…" : "Run"}
              </Button>
              {busy ? <Spinner size={14} label="Running scratchpad" /> : null}
            </div>
          </div>

          <div className={styles.editorSurface}>
            <CodeEditor
              value={code}
              onChange={setCode}
              height={400}
              ariaLabel="Exploration scratchpad"
            />
          </div>

          {!executionConfigured ? (
            <div className={styles.notice}>
              <Alert tone="warning" title="Python execution not configured">
                The scratchpad saves locally, but code cannot run until the
                isolated execution service is configured. No output is simulated.
              </Alert>
            </div>
          ) : null}

          {error ? (
            <div className={styles.notice}>
              <Alert tone="error">{error}</Alert>
            </div>
          ) : null}

          {result ? (
            <ExecutionResult result={result} label="isolated scratchpad run" />
          ) : (
            <div className={styles.placeholder}>
              <Terminal size={15} strokeWidth={1.5} aria-hidden="true" />
              <p>
                Run the scratchpad to see real stdout, errors, and timing. Runs
                here are not saved as graded attempts.
              </p>
            </div>
          )}

          <div className={styles.studioFoot}>
            <Eraser size={13} aria-hidden="true" />
            <p>
              The scratchpad is deliberately browser-only. Clear site data or use
              another browser and this code will not follow you.
            </p>
          </div>
        </section>

        <aside className={styles.aside}>
          <div className={styles.tutorSticky}>
            <TutorPanel
              initialByMode={tutor}
              preferredMode="partner"
              explorationSessionId={session.id}
              code={code}
              currentQuestion={session.topic}
              aiConfigured={aiConfigured}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
