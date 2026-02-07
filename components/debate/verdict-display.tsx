"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface VerdictDisplayProps {
  conversationId: string;
}

export function VerdictDisplay({ conversationId }: VerdictDisplayProps) {
  const [verdict, setVerdict] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20;

    const tryFetch = async () => {
      try {
        const res = await fetch(
          `/api/conversations/${conversationId}/files/verdict.md`
        );
        if (res.ok) {
          const text = await res.text();
          if (text.trim()) {
            setVerdict(text);
            setLoading(false);
            return true;
          }
        }
      } catch {
        // File not ready yet
      }
      return false;
    };

    const interval = setInterval(async () => {
      attempts++;
      const found = await tryFetch();
      if (found || attempts >= maxAttempts) {
        clearInterval(interval);
        setLoading(false);
      }
    }, 2000);

    tryFetch();

    return () => clearInterval(interval);
  }, [conversationId]);

  if (loading) {
    return (
      <div className="mx-4 my-4 rounded-xl border border-[var(--debate-gold)]/20 bg-[var(--debate-gold)]/5 p-8 text-center animate-fade-in-scale">
        <div className="text-4xl mb-3 animate-glow-pulse inline-block">
          &#9878;
        </div>
        <p className="font-mono text-sm shimmer-gold font-semibold">
          재판장이 판결문을 작성하고 있습니다...
        </p>
        <p className="text-xs text-muted-foreground/50 mt-2">
          양측의 주장을 면밀히 검토 중
        </p>
      </div>
    );
  }

  if (!verdict) return null;

  return (
    <div className="mx-4 my-4 rounded-xl border border-[var(--debate-gold)]/30 bg-gradient-to-b from-[var(--debate-gold)]/8 to-transparent p-6 verdict-glow animate-fade-in-scale">
      {/* Header */}
      <div className="text-center mb-5">
        <div className="text-4xl mb-2">&#9878;</div>
        <h2 className="font-mono text-lg font-bold shimmer-gold inline-block">
          최 종 판 결
        </h2>
        <div className="w-16 h-px bg-[var(--debate-gold)]/30 mx-auto mt-3" />
      </div>

      {/* Verdict content */}
      <div className="prose prose-invert prose-sm max-w-none [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:text-[var(--debate-gold)]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{verdict}</ReactMarkdown>
      </div>
    </div>
  );
}
