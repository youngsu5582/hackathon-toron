"use client";

import type { DebateTopic } from "@/lib/debate-topics";
import { cn } from "@/lib/utils";

interface SideSelectorProps {
  topic: DebateTopic;
  onSelect: (userSide: string, agentSide: string) => void;
  onClose: () => void;
}

export function SideSelector({ topic, onSelect, onClose }: SideSelectorProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="진영 선택"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in-scale"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl p-7 animate-fade-in-scale">
        {/* Topic badge */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border/50 text-xs text-muted-foreground font-mono mb-4">
            &#9878; 아키텍처 법정
          </div>
          <h2 className="font-mono text-lg font-bold">{topic.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            당신의 진영을 선택하세요
          </p>
        </div>

        {/* Side buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onSelect(topic.sideA.label, topic.sideB.label)}
            className={cn(
              "group rounded-xl border border-[var(--debate-blue)]/20 p-5 text-center",
              "bg-[var(--debate-blue)]/5 hover:bg-[var(--debate-blue)]/15",
              "hover:border-[var(--debate-blue)]/40",
              "transition-all duration-200",
              "active:scale-[0.98]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--debate-blue)]/50"
            )}
            aria-label={`${topic.sideA.label} 진영 선택`}
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">
              {topic.sideA.emoji}
            </div>
            <div className="font-mono text-sm font-semibold text-[var(--debate-blue)]">
              {topic.sideA.label}
            </div>
          </button>

          <button
            onClick={() => onSelect(topic.sideB.label, topic.sideA.label)}
            className={cn(
              "group rounded-xl border border-[var(--debate-red)]/20 p-5 text-center",
              "bg-[var(--debate-red)]/5 hover:bg-[var(--debate-red)]/15",
              "hover:border-[var(--debate-red)]/40",
              "transition-all duration-200",
              "active:scale-[0.98]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--debate-red)]/50"
            )}
            aria-label={`${topic.sideB.label} 진영 선택`}
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">
              {topic.sideB.emoji}
            </div>
            <div className="font-mono text-sm font-semibold text-[var(--debate-red)]">
              {topic.sideB.label}
            </div>
          </button>
        </div>

        {/* Subtitle */}
        <p className="text-center text-[11px] text-muted-foreground/50 mt-4">
          AI가 반대편에서 공격적으로 토론합니다
        </p>

        {/* Back button */}
        <button
          onClick={onClose}
          className="mt-4 w-full text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1"
        >
          &larr; 다른 주제 선택
        </button>
      </div>
    </div>
  );
}
