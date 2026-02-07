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
      <div className="max-w-xl mx-4 animate-fade-in-scale">
        {/* Moderator avatar */}
        <div className="text-center mb-6">
          <div className="inline-block text-5xl mb-3 animate-glow-pulse">
            &#9878;
          </div>
          <div className="font-mono text-xs text-[var(--debate-gold)] tracking-widest uppercase">
            Moderator Briefing
          </div>
        </div>

        {/* Topic */}
        <h2 className="font-mono text-lg font-bold text-center mb-2 shimmer-gold inline-block w-full">
          {topic}
        </h2>

        {/* Matchup */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="font-mono text-xs text-[var(--debate-blue)]">
            {userSide}
          </span>
          <span className="text-[10px] text-muted-foreground/50">vs</span>
          <span className="font-mono text-xs text-[var(--debate-red)]">
            {agentSide}
          </span>
        </div>

        {/* Briefing text with typewriter */}
        <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-6">
          <p className="text-sm text-muted-foreground leading-relaxed font-mono">
            {briefing.slice(0, visibleChars)}
            {visibleChars < briefing.length && (
              <span className="animate-blink text-[var(--debate-gold)]">|</span>
            )}
          </p>
        </div>

        {/* Rules reminder */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/20 px-2 py-2">
            <div className="text-lg mb-1">5</div>
            <div className="font-mono text-[10px] text-muted-foreground/60">
              라운드
            </div>
          </div>
          <div className="rounded-lg bg-muted/20 px-2 py-2">
            <div className="text-lg mb-1">&#9878;</div>
            <div className="font-mono text-[10px] text-muted-foreground/60">
              판결
            </div>
          </div>
          <div className="rounded-lg bg-muted/20 px-2 py-2">
            <div className="text-lg mb-1">&#128101;</div>
            <div className="font-mono text-[10px] text-muted-foreground/60">
              관중 투표
            </div>
          </div>
        </div>

        {/* Continue button */}
        {showContinue && (
          <button
            onClick={onComplete}
            className={cn(
              "mt-6 w-full py-3 rounded-lg font-mono text-sm font-semibold",
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
