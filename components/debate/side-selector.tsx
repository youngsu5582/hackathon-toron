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
        className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade-in-scale"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border/40 bg-card/90 backdrop-blur-2xl p-8 animate-fade-in-scale shadow-2xl shadow-black/40">
        {/* Topic badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--debate-gold)]/5 border border-[var(--debate-gold)]/15 text-xs text-[var(--debate-gold)]/80 font-mono mb-5">
            &#9878; Toron
          </div>
          <h2 className="font-mono text-xl font-bold">{topic.title}</h2>
          <p className="text-sm text-muted-foreground/60 mt-2">
            당신의 진영을 선택하세요
          </p>
        </div>

        {/* Side buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onSelect(topic.sideA.label, topic.sideB.label)}
            className={cn(
              "group rounded-2xl border border-[var(--debate-blue)]/15 p-6 text-center",
              "bg-[var(--debate-blue)]/[0.03]",
              "hover:bg-[var(--debate-blue)]/10 hover:border-[var(--debate-blue)]/30",
              "hover:shadow-lg hover:shadow-[var(--debate-blue)]/5",
              "transition-all duration-300",
              "hover:-translate-y-0.5 active:translate-y-0",
              "focus:outline-none focus:ring-2 focus:ring-[var(--debate-blue)]/40"
            )}
            aria-label={`${topic.sideA.label} 진영 선택`}
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
              {topic.sideA.emoji}
            </div>
            <div className="font-mono text-sm font-bold text-[var(--debate-blue)]">
              {topic.sideA.label}
            </div>
          </button>

          <button
            onClick={() => onSelect(topic.sideB.label, topic.sideA.label)}
            className={cn(
              "group rounded-2xl border border-[var(--debate-red)]/15 p-6 text-center",
              "bg-[var(--debate-red)]/[0.03]",
              "hover:bg-[var(--debate-red)]/10 hover:border-[var(--debate-red)]/30",
              "hover:shadow-lg hover:shadow-[var(--debate-red)]/5",
              "transition-all duration-300",
              "hover:-translate-y-0.5 active:translate-y-0",
              "focus:outline-none focus:ring-2 focus:ring-[var(--debate-red)]/40"
            )}
            aria-label={`${topic.sideB.label} 진영 선택`}
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
              {topic.sideB.emoji}
            </div>
            <div className="font-mono text-sm font-bold text-[var(--debate-red)]">
              {topic.sideB.label}
            </div>
          </button>
        </div>

        {/* Subtitle */}
        <p className="text-center text-xs text-muted-foreground/40 mt-5">
          AI가 반대편에서 토론합니다
        </p>

        {/* Back button */}
        <button
          onClick={onClose}
          className="mt-5 w-full text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors py-2 rounded-lg hover:bg-muted/20"
        >
          &larr; 다른 주제 선택
        </button>
      </div>
    </div>
  );
}
