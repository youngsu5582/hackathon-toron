"use client";

import type { DebateTopic } from "@/lib/debate-topics";
import { cn } from "@/lib/utils";

interface TopicCardProps {
  topic: DebateTopic;
  onClick: () => void;
  index: number;
}

export function TopicCard({ topic, onClick, index }: TopicCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative text-left rounded-2xl p-6 overflow-hidden",
        "bg-card/40 backdrop-blur-sm",
        "border border-border/40",
        "hover:bg-card/70 hover:border-[var(--debate-gold)]/30",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1.5 hover:shadow-xl hover:shadow-[var(--debate-gold)]/5",
        "active:translate-y-0 active:shadow-none",
        "focus:outline-none focus:ring-2 focus:ring-[var(--debate-gold)]/40",
        "animate-fade-in-up"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
      aria-label={`토론 주제 선택: ${topic.title}`}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--debate-gold)]/0 via-transparent to-[var(--debate-gold)]/0 group-hover:from-[var(--debate-gold)]/[0.03] group-hover:to-[var(--debate-gold)]/[0.06] transition-all duration-500 rounded-2xl" />

      {/* Content */}
      <div className="relative z-10">
        {/* Emoji pair */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-4xl group-hover:scale-110 transition-transform duration-300">
            {topic.sideA.emoji}
          </span>
          <span className="text-xs text-[var(--debate-gold)]/40 font-mono font-black tracking-[0.2em] group-hover:text-[var(--debate-gold)]/60 transition-colors duration-300">
            VS
          </span>
          <span className="text-4xl group-hover:scale-110 transition-transform duration-300">
            {topic.sideB.emoji}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-mono text-base font-bold mb-2.5 text-foreground/90 group-hover:text-[var(--debate-gold)] transition-colors duration-300">
          {topic.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground/60 leading-relaxed line-clamp-2">
          {topic.description}
        </p>

        {/* CTA */}
        <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground/25 group-hover:text-[var(--debate-gold)]/60 transition-all duration-300">
          <span className="font-mono text-xs">토론 입장</span>
          <span className="group-hover:translate-x-1.5 transition-transform duration-300">&rarr;</span>
        </div>
      </div>
    </button>
  );
}
