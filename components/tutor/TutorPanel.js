"use client";

import { useState } from "react";
import { Bot, CornerDownLeft, Send, Sparkles, UserRound } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import RichText from "@/components/ui/RichText";
import Spinner from "@/components/ui/Spinner";
import { postJson } from "@/lib/client/request";
import styles from "./TutorPanel.module.css";

const MODE_COPY = {
  coach: {
    label: "Independent Coding Coach",
    short: "Coach",
    blurb:
      "Progressive hints and questions. Full solutions are withheld until you have tried.",
    empty:
      "Ask about this lesson, describe where you are stuck, or paste an error. The coach starts with the smallest useful hint.",
  },
  partner: {
    label: "AI Coding Partner",
    short: "Partner",
    blurb:
      "Explains directly, plans with you, and can suggest code when you ask. It cannot edit or run your code.",
    empty:
      "Ask for an explanation, a plan, or a code suggestion. The partner explains directly while keeping you in control of the code.",
  },
};

function MessageMeta({ metadata }) {
  if (!metadata || typeof metadata !== "object") return null;
  const issues = Array.isArray(metadata.identifiedIssues)
    ? metadata.identifiedIssues.filter(Boolean)
    : [];
  const hasMeta =
    metadata.hintLevel ||
    issues.length ||
    metadata.suggestedNextStep ||
    metadata.understandingCheck;

  if (!hasMeta) return null;

  return (
    <div className={styles.meta}>
      {metadata.hintLevel ? (
        <Badge tone="neutral">Hint level {metadata.hintLevel}/5</Badge>
      ) : null}
      {issues.length ? (
        <div className={styles.metaBlock}>
          <p className={styles.metaLabel}>Noticed in your work</p>
          <ul>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {metadata.suggestedNextStep ? (
        <div className={styles.metaBlock}>
          <p className={styles.metaLabel}>Suggested next step</p>
          <p>{metadata.suggestedNextStep}</p>
        </div>
      ) : null}
      {metadata.understandingCheck ? (
        <div className={`${styles.metaBlock} ${styles.check}`}>
          <p className={styles.metaLabel}>Check your understanding</p>
          <p>{metadata.understandingCheck}</p>
        </div>
      ) : null}
    </div>
  );
}

function Message({ message }) {
  const isUser = message.role === "user";
  return (
    <li className={`${styles.message} ${isUser ? styles.userMessage : ""}`}>
      <span className={styles.avatar} aria-hidden="true">
        {isUser ? <UserRound size={13} /> : <Bot size={14} />}
      </span>
      <div className={styles.messageBody}>
        <span className={styles.messageRole}>{isUser ? "You" : "Tutor"}</span>
        <RichText text={message.content} className={styles.messageText} />
        {!isUser ? <MessageMeta metadata={message.metadata} /> : null}
      </div>
    </li>
  );
}

export default function TutorPanel({
  initialByMode,
  preferredMode = "coach",
  lessonId = null,
  exerciseId = null,
  explorationSessionId = null,
  code = "",
  currentQuestion = "",
  aiConfigured = false,
  className = "",
}) {
  const [mode, setMode] = useState(preferredMode === "partner" ? "partner" : "coach");
  const [threads, setThreads] = useState(() => ({
    coach: initialByMode?.coach || { conversation: null, messages: [] },
    partner: initialByMode?.partner || { conversation: null, messages: [] },
  }));
  const [inputs, setInputs] = useState({ coach: "", partner: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const thread = threads[mode];
  const copy = MODE_COPY[mode];
  const value = inputs[mode];

  function selectMode(event, key) {
    setMode(key);
    setError("");
    if (event) {
      const tabs = event.currentTarget.parentElement?.querySelectorAll('[role="tab"]');
      const index = Object.keys(MODE_COPY).indexOf(key);
      tabs?.[index]?.focus();
    }
  }

  function handleModeKeyDown(event) {
    const keys = Object.keys(MODE_COPY);
    const currentIndex = keys.indexOf(mode);
    let nextIndex = null;

    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % keys.length;
    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + keys.length) % keys.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = keys.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    selectMode(event, keys[nextIndex]);
  }

  const modeButtons = Object.entries(MODE_COPY).map(([key, info]) => (
    <button
      key={key}
      type="button"
      role="tab"
      id={`tutor-tab-${key}`}
      aria-selected={mode === key}
      aria-controls="tutor-thread"
      tabIndex={mode === key ? 0 : -1}
      className={`${styles.modeTab} ${mode === key ? styles.modeTabActive : ""}`}
      onClick={(event) => selectMode(event, key)}
      onKeyDown={handleModeKeyDown}
    >
      {info.short}
    </button>
  ));

  async function handleSubmit(event) {
    event.preventDefault();
    const message = value.trim();
    if (!message || sending) return;
    if (!aiConfigured) {
      setError(
        "The tutor provider is not configured on the server. Nothing was sent.",
      );
      return;
    }

    setSending(true);
    setError("");

    try {
      const payload = await postJson("/api/ai/tutor", {
        message,
        mode,
        conversationId: thread.conversation?.id || null,
        lessonId,
        exerciseId,
        explorationSessionId,
        code,
        currentQuestion,
      });

      const userMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content: message,
        metadata: {},
        created_at: new Date().toISOString(),
      };

      setThreads((current) => ({
        ...current,
        [mode]: {
          conversation: {
            ...(current[mode].conversation || {}),
            id: payload.conversationId,
            title: payload.conversationTitle,
            mode,
          },
          messages: [
            ...current[mode].messages,
            userMessage,
            payload.message,
          ],
        },
      }));
      setInputs((current) => ({ ...current, [mode]: "" }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className={`${styles.panel} ${className}`} aria-label="Tutor">
      <div className={styles.head}>
        <div className={styles.headCopy}>
          <p className={styles.eyebrow}>
            <Sparkles size={12} strokeWidth={1.8} aria-hidden="true" />
            {MODE_COPY[mode].label}
          </p>
          <p className={styles.blurb}>{copy.blurb}</p>
        </div>
        <div className={styles.tabs} role="tablist" aria-label="Tutor mode">
          {modeButtons}
        </div>
      </div>

      <div
        className={styles.thread}
        id="tutor-thread"
        role="tabpanel"
        aria-labelledby={`tutor-tab-${mode}`}
      >
        {thread.messages.length ? (
          <ol className={styles.messages} aria-live="polite">
            {thread.messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
            {sending ? (
              <li className={styles.thinking} aria-live="polite">
                <Spinner size={14} label="Tutor is thinking" />
                <span>Thinking with the current code and evidence…</span>
              </li>
            ) : null}
          </ol>
        ) : (
          <div className={styles.empty}>
            <Bot size={18} strokeWidth={1.4} aria-hidden="true" />
            <p>{copy.empty}</p>
            <p className={styles.emptyNote}>
              Each tutor mode keeps its own conversation, so switching modes does
              not blend their approaches.
            </p>
          </div>
        )}
      </div>

      {!aiConfigured ? (
        <Alert tone="warning" title="Tutor unavailable">
          The AI provider is not configured on the server. Messages are not sent
          and no answer is simulated.
        </Alert>
      ) : null}

      {error ? (
        <Alert tone="error" title="Tutor could not answer">
          {error}
        </Alert>
      ) : null}

      <form className={styles.composer} onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="tutor-input">
          Message the {copy.label}
        </label>
        <textarea
          id="tutor-input"
          className={styles.input}
          rows={3}
          value={value}
          maxLength={4000}
          placeholder={
            aiConfigured
              ? `Message the ${copy.short.toLowerCase()}…`
              : "Tutor provider not configured"
          }
          disabled={!aiConfigured || sending}
          onChange={(event) =>
            setInputs((current) => ({ ...current, [mode]: event.target.value }))
          }
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              handleSubmit(event);
            }
          }}
        />
        <div className={styles.composerFoot}>
          <span className={styles.composerHint}>
            <CornerDownLeft size={11} aria-hidden="true" /> Ctrl/⌘ + Enter
          </span>
          <Button
            type="submit"
            size="sm"
            icon={Send}
            disabled={!aiConfigured || sending || !value.trim()}
          >
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </form>

      <p className={styles.disclosure}>
        Tutor responses can be wrong. Execution results shown elsewhere come from
        the isolated runner, not from the tutor.
      </p>
    </section>
  );
}
