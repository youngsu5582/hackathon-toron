"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ModeratorBriefingProps {
  topic: string;
  briefing: string;
  userSide: string;
  agentSide: string;
  onComplete: () => void;
}

export function ModeratorBriefing({
  topic,
  briefing,
  userSide,
  agentSide,
  onComplete,
}: ModeratorBriefingProps) {
  const [visibleChars, setVisibleChars] = useState(0);
  const [showContinue, setShowContinue] = useState(false);

  // Typewriter effect
  useEffect(() => {
    if (visibleChars < briefing.length) {
      const timer = setTimeout(
        () => setVisibleChars((prev) => Math.min(prev + 2, briefing.length)),
        20
      );
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShowContinue(true), 500);
      return () => clearTimeout(timer);
    }
  }, [visibleChars, briefing.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="max-w-2xl w-full mx-6 animate-fade-in-scale">
        {/* Moderator avatar */}
        <div className="text-center mb-8">
          <div className="inline-block text-7xl mb-4 animate-glow-pulse">
            &#9878;
          </div>
          <div className="font-mono text-sm text-[var(--debate-gold)] tracking-widest uppercase">
            Moderator Briefing
          </div>
        </div>

        {/* Topic */}
        <h2 className="font-mono text-2xl font-bold text-center mb-3 shimmer-gold inline-block w-full">
          {topic}
        </h2>

        {/* Matchup */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className="font-mono text-sm font-semibold text-[var(--debate-blue)]">
            {userSide}
          </span>
          <span className="text-xs text-muted-foreground/50">vs</span>
          <span className="font-mono text-sm font-semibold text-[var(--debate-red)]">
            {agentSide}
          </span>
        </div>

        {/* Briefing text with typewriter */}
        <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-8">
          <p className="text-base text-muted-foreground leading-relaxed font-mono">
            {briefing.slice(0, visibleChars)}
            {visibleChars < briefing.length && (
              <span className="animate-blink text-[var(--debate-gold)]">|</span>
            )}
          </p>
        </div>

        {/* Rules reminder */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-muted/20 px-3 py-3">
            <div className="text-2xl mb-1">5</div>
            <div className="font-mono text-xs text-muted-foreground/60">
              라운드
            </div>
          </div>
          <div className="rounded-lg bg-muted/20 px-3 py-3">
            <div className="text-2xl mb-1">&#9878;</div>
            <div className="font-mono text-xs text-muted-foreground/60">
              판결
            </div>
          </div>
          <div className="rounded-lg bg-muted/20 px-3 py-3">
            <div className="text-2xl mb-1">&#128101;</div>
            <div className="font-mono text-xs text-muted-foreground/60">
              관중 투표
            </div>
          </div>
        </div>

        {/* Continue button */}
        {showContinue && (
          <button
            onClick={onComplete}
            className={cn(
              "mt-8 w-full py-4 rounded-lg font-mono text-base font-semibold",
              "border border-[var(--debate-gold)]/40 bg-[var(--debate-gold)]/10 text-[var(--debate-gold)]",
              "hover:bg-[var(--debate-gold)]/20 active:scale-[0.98]",
              "transition-all duration-200 animate-fade-in-up"
            )}
          >
            토론 시작
          </button>
        )}
      </div>
    </div>
  );
}
