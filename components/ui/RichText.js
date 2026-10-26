import { Fragment } from "react";

function renderInline(text) {
  const parts = String(text).split(/(`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function renderTextBlock(block, keyPrefix) {
  const lines = block.split("\n");
  const nodes = [];
  let list = null;

  lines.forEach((line, index) => {
    const bullet = line.match(/^\s*[-•]\s+(.*)$/);
    if (bullet) {
      if (!list) {
        list = [];
      }
      list.push(bullet[1]);
      return;
    }

    if (list) {
      nodes.push(
        <ul key={`${keyPrefix}-list-${index}`}>
          {list.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      list = null;
    }

    if (line.trim()) {
      nodes.push(<p key={`${keyPrefix}-p-${index}`}>{renderInline(line)}</p>);
    }
  });

  if (list) {
    nodes.push(
      <ul key={`${keyPrefix}-list-end`}>
        {list.map((item, itemIndex) => (
          <li key={itemIndex}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
  }

  return nodes;
}

export default function RichText({ text, className = "" }) {
  if (!text) return null;
  const chunks = String(text).split(/```(?:python)?\n?/g);

  return (
    <div className={className}>
      {chunks.map((chunk, index) => {
        if (index % 2 === 1) {
          return (
            <pre key={`code-${index}`}>
              <code>{chunk.replace(/\n$/, "")}</code>
            </pre>
          );
        }
        return (
          <Fragment key={`text-${index}`}>
            {chunk
              .split(/\n{2,}/)
              .filter((block) => block.trim())
              .map((block, blockIndex) =>
                renderTextBlock(block, `${index}-${blockIndex}`),
              )}
          </Fragment>
        );
      })}
    </div>
  );
}
