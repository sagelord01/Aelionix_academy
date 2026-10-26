"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Compass } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { postJson } from "@/lib/client/request";
import styles from "./ExploreCreate.module.css";

const prompts = [
  "Build a tiny command-line quiz",
  "How does a stack solve balanced brackets?",
  "Read and summarize a CSV of expenses",
  "Model a library with classes",
];

export default function ExploreCreate({ aiConfigured }) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = topic.trim();
    if (trimmed.length < 3) {
      setError("Describe what you want to explore in at least a few words.");
      return;
    }

    setPending(true);
    setError("");
    try {
      const payload = await postJson("/api/explore", { topic: trimmed });
      router.push(`/explore/${payload.session.id}`);
    } catch (requestError) {
      setError(requestError.message);
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.head}>
        <span className={styles.icon} aria-hidden="true">
          <Compass size={18} strokeWidth={1.4} />
        </span>
        <div>
          <h2 className={styles.title}>Start from a question, not a unit.</h2>
          <p className={styles.lede}>
            Exploration opens a scratchpad and a partner conversation around one
            topic. Nothing is graded, and nothing pretends to be progress you did
            not make.
          </p>
        </div>
      </div>

      <Field
        label="What do you want to explore?"
        htmlFor="topic"
        hint="A concrete task or question works better than a broad subject."
      >
        <Input
          id="topic"
          name="topic"
          value={topic}
          maxLength={240}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="e.g. Write a function that groups words by their first letter"
          disabled={pending}
          required
        />
      </Field>

      <div className={styles.promptRow}>
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className={styles.prompt}
            onClick={() => setTopic(prompt)}
            disabled={pending}
          >
            {prompt}
          </button>
        ))}
      </div>

      {!aiConfigured ? (
        <Alert tone="warning" title="Tutor provider not configured">
          You can still open a scratchpad and run Python, but the partner cannot
          answer until the AI provider is configured on the server.
        </Alert>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className={styles.actions}>
        <Button type="submit" icon={ArrowRight} disabled={pending || !topic.trim()}>
          {pending ? "Creating…" : "Open exploration"}
        </Button>
        <span className={styles.note}>
          The scratchpad is stored in this browser. The conversation is stored in
          your account.
        </span>
      </div>
    </form>
  );
}
