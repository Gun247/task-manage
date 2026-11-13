"use client";

import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** http(s) URLs, optionally wrapped in <> or ending with punctuation. */
const URL_PATTERN =
  /(?:https?:\/\/|www\.)[^\s<>"'`]+[^\s<>"'`.,;:!?)\]]/gi;

function normalizeHref(raw: string) {
  const trimmed = raw.replace(/[),.;:!?]+$/g, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function looksLikeUrl(value: string) {
  return /^(https?:\/\/|www\.)/i.test(value.trim());
}

export function extractUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(URL_PATTERN) ?? [];
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const match of matches) {
    const href = normalizeHref(match);
    const key = href.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push(href);
  }
  return urls;
}

export function LinkifiedText({
  text,
  className,
  linkClassName,
}: {
  text: string;
  className?: string;
  linkClassName?: string;
}) {
  if (!text) return null;

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const raw = match[0];
    const start = match.index;
    if (start > lastIndex) {
      nodes.push(
        <Fragment key={`t-${lastIndex}`}>
          {text.slice(lastIndex, start)}
        </Fragment>,
      );
    }

    const href = normalizeHref(raw);
    const display = raw.replace(/[),.;:!?]+$/g, "");
    const trailing = raw.slice(display.length);

    nodes.push(
      <a
        key={`a-${start}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "break-all text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent",
          linkClassName,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {display}
      </a>,
    );
    if (trailing) {
      nodes.push(
        <Fragment key={`p-${start}`}>{trailing}</Fragment>,
      );
    }
    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <Fragment key={`t-${lastIndex}`}>{text.slice(lastIndex)}</Fragment>,
    );
  }

  if (nodes.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={cn("whitespace-pre-wrap", className)}>{nodes}</span>
  );
}

/** Compact list of unique links found in text — useful under textareas. */
export function TextLinks({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const urls = extractUrls(text);
  if (urls.length === 0) return null;

  return (
    <ul className={cn("mt-1.5 space-y-1", className)}>
      {urls.map((url) => (
        <li key={url}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-start gap-1 break-all text-caption text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
            title={url}
          >
            {looksLikeUrl(url) ? url : url}
          </a>
        </li>
      ))}
    </ul>
  );
}
