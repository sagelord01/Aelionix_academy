"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        display: "grid",
        placeItems: "center",
        color: "var(--text-faint)",
        fontFamily: "var(--font-mono)",
        fontSize: "0.75rem",
      }}
    >
      Loading editor…
    </div>
  ),
});

const workspaceTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent",
      color: "var(--code-text)",
      fontSize: "0.87rem",
    },
    ".cm-content": {
      fontFamily: "var(--font-mono)",
      padding: "14px 0",
      caretColor: "#f4f4f5",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "var(--editor-gutter)",
      border: "none",
      paddingLeft: "6px",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255,255,255,0.028)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "#9a9aa3",
    },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      backgroundColor: "rgba(255,255,255,0.12) !important",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#f4f4f5",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-mono)",
      lineHeight: "1.65",
    },
    ".cm-tooltip": {
      backgroundColor: "#151517",
      border: "1px solid rgba(255,255,255,0.12)",
    },
    "&.cm-focused": {
      outline: "none",
    },
  },
  { dark: true },
);

const workspaceHighlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.operatorKeyword], color: "var(--code-keyword)" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--code-string)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--code-number)" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "var(--code-comment)", fontStyle: "italic" },
  { tag: [tags.function(tags.variableName), tags.definition(tags.function(tags.variableName))], color: "var(--code-function)" },
  { tag: [tags.className, tags.typeName], color: "#e3d4c2" },
  { tag: [tags.propertyName], color: "#c9c9d4" },
  { tag: [tags.variableName], color: "var(--code-text)" },
  { tag: [tags.punctuation, tags.bracket], color: "#87878f" },
]);

export default function CodeEditor({
  value,
  onChange,
  height = 320,
  readOnly = false,
  ariaLabel = "Python code editor",
}) {
  const extensions = useMemo(
    () => [python(), EditorView.lineWrapping, workspaceTheme, syntaxHighlighting(workspaceHighlight)],
    [],
  );

  return (
    <CodeMirror
      value={value}
      height={`${height}px`}
      theme="none"
      extensions={extensions}
      onChange={onChange}
      readOnly={readOnly}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        autocompletion: false,
        bracketMatching: true,
        closeBrackets: true,
        indentOnInput: true,
      }}
      aria-label={ariaLabel}
    />
  );
}
