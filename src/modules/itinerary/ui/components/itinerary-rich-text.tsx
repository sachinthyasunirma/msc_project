"use client";

import { Bold, Italic, List, ListOrdered, Quote } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function renderInlineTokens(line: string, keyPrefix: string) {
  const segments: Array<{ type: "text" | "bold" | "italic"; value: string }> = [];
  const tokenPattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;

  for (const match of line.matchAll(tokenPattern)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      segments.push({ type: "text", value: line.slice(lastIndex, matchIndex) });
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      segments.push({ type: "bold", value: token.slice(2, -2) });
    } else if (token.startsWith("*") && token.endsWith("*")) {
      segments.push({ type: "italic", value: token.slice(1, -1) });
    } else {
      segments.push({ type: "text", value: token });
    }
    lastIndex = matchIndex + token.length;
  }

  if (lastIndex < line.length) {
    segments.push({ type: "text", value: line.slice(lastIndex) });
  }

  return segments.map((segment, index) => {
    if (segment.type === "bold") {
      return (
        <strong key={`${keyPrefix}-bold-${index}`} className="font-semibold">
          {segment.value}
        </strong>
      );
    }
    if (segment.type === "italic") {
      return (
        <em key={`${keyPrefix}-italic-${index}`} className="italic">
          {segment.value}
        </em>
      );
    }
    return <span key={`${keyPrefix}-text-${index}`}>{segment.value}</span>;
  });
}

export function RichTextContent({
  value,
  className,
  tone = "light",
}: {
  value: string;
  className?: string;
  tone?: "light" | "dark";
}) {
  const lines = value
    .split("\n")
    .map((line) => line.trimEnd());
  const blocks: Array<{ type: "paragraph" | "ul" | "ol" | "quote"; lines: string[] }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("- ")) {
      const lastBlock = blocks.at(-1);
      if (lastBlock?.type === "ul") {
        lastBlock.lines.push(trimmed.slice(2));
      } else {
        blocks.push({ type: "ul", lines: [trimmed.slice(2)] });
      }
      continue;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      const lastBlock = blocks.at(-1);
      const valueWithoutIndex = trimmed.replace(/^\d+\.\s/, "");
      if (lastBlock?.type === "ol") {
        lastBlock.lines.push(valueWithoutIndex);
      } else {
        blocks.push({ type: "ol", lines: [valueWithoutIndex] });
      }
      continue;
    }
    if (trimmed.startsWith("> ")) {
      blocks.push({ type: "quote", lines: [trimmed.slice(2)] });
      continue;
    }
    blocks.push({ type: "paragraph", lines: [trimmed] });
  }

  return (
    <div
      className={cn(
        "space-y-3 text-sm leading-7",
        tone === "dark" ? "text-white/80" : "text-slate-600",
        className
      )}
    >
      {blocks.map((block, index) => {
        if (block.type === "ul") {
          return (
            <ul key={`ul-${index}`} className="space-y-2 pl-5">
              {block.lines.map((line, lineIndex) => (
                <li key={`ul-${index}-${lineIndex}`} className="list-disc">
                  {renderInlineTokens(line, `ul-${index}-${lineIndex}`)}
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={`ol-${index}`} className="space-y-2 pl-5">
              {block.lines.map((line, lineIndex) => (
                <li key={`ol-${index}-${lineIndex}`} className="list-decimal">
                  {renderInlineTokens(line, `ol-${index}-${lineIndex}`)}
                </li>
              ))}
            </ol>
          );
        }
        if (block.type === "quote") {
          return (
            <blockquote
              key={`quote-${index}`}
              className={cn(
                "rounded-2xl border-l-4 px-4 py-3",
                tone === "dark" ? "border-white/40 bg-white/10 text-white/90" : "border-primary/40 bg-primary/5"
              )}
            >
              {renderInlineTokens(block.lines[0], `quote-${index}`)}
            </blockquote>
          );
        }
        return <p key={`p-${index}`}>{renderInlineTokens(block.lines[0], `p-${index}`)}</p>;
      })}
    </div>
  );
}

function applyWrappedSelection(
  currentValue: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after = before
) {
  const selectedText = currentValue.slice(selectionStart, selectionEnd) || "text";
  return `${currentValue.slice(0, selectionStart)}${before}${selectedText}${after}${currentValue.slice(selectionEnd)}`;
}

function applyLinePrefix(currentValue: string, selectionStart: number, prefixMode: "unordered" | "ordered" | "quote") {
  const lines = currentValue.split("\n");
  let runningIndex = 0;
  return lines
    .map((line) => {
      const lineStart = runningIndex;
      const lineEnd = runningIndex + line.length;
      const overlaps = selectionStart <= lineEnd && selectionStart >= lineStart;
      runningIndex = lineEnd + 1;
      if (!overlaps) return line;
      if (prefixMode === "unordered") return line.startsWith("- ") ? line : `- ${line}`;
      if (prefixMode === "quote") return line.startsWith("> ") ? line : `> ${line}`;
      return /^\d+\.\s/.test(line) ? line : `1. ${line}`;
    })
    .join("\n");
}

export function RichTextEditor({
  value,
  onChange,
  rows = 5,
  placeholder,
  className,
  tone = "light",
}: {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  tone?: "light" | "dark";
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const withSelection = (transform: (selectionStart: number, selectionEnd: number) => string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const next = transform(textarea.selectionStart, textarea.selectionEnd);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
    });
  };

  const buttonClassName =
    tone === "dark"
      ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
      : "border-primary/20 bg-background text-foreground hover:bg-primary/5";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={buttonClassName}
          onClick={(event) => {
            event.stopPropagation();
            withSelection((start, end) => applyWrappedSelection(value, start, end, "**"));
          }}
        >
          <Bold className="size-4" />
          Bold
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={buttonClassName}
          onClick={(event) => {
            event.stopPropagation();
            withSelection((start, end) => applyWrappedSelection(value, start, end, "*"));
          }}
        >
          <Italic className="size-4" />
          Italic
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={buttonClassName}
          onClick={(event) => {
            event.stopPropagation();
            withSelection((start) => applyLinePrefix(value, start, "unordered"));
          }}
        >
          <List className="size-4" />
          Bullets
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={buttonClassName}
          onClick={(event) => {
            event.stopPropagation();
            withSelection((start) => applyLinePrefix(value, start, "ordered"));
          }}
        >
          <ListOrdered className="size-4" />
          Numbers
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={buttonClassName}
          onClick={(event) => {
            event.stopPropagation();
            withSelection((start) => applyLinePrefix(value, start, "quote"));
          }}
        >
          <Quote className="size-4" />
          Callout
        </Button>
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "min-h-[140px] shadow-sm",
          tone === "dark"
            ? "border-white/20 bg-white/10 text-white placeholder:text-white/50"
            : "border-primary/50 bg-background/90",
          className
        )}
      />
    </div>
  );
}
