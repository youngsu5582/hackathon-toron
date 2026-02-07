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
        "group relative text-left rounded-xl border border-border/60 p-5",
        "bg-card/80 backdrop-blur-sm",
        "hover:bg-card hover:border-[var(--debate-blue)]/30",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 active:translate-y-0",
        "topic-card-glow",
        "focus:outline-none focus:ring-2 focus:ring-[var(--debate-blue)]/50",
        "animate-fade-in-up"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
      aria-label={`토론 주제 선택: ${topic.title}`}
    >
      {/* Emoji pair */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-3xl group-hover:scale-110 transition-transform duration-300">
          {topic.sideA.emoji}
        </span>
        <span className="text-[10px] text-muted-foreground/50 font-mono font-bold tracking-widest">
          VS
        </span>
        <span className="text-3xl group-hover:scale-110 transition-transform duration-300">
          {topic.sideB.emoji}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-mono text-sm font-semibold mb-1.5 group-hover:text-[var(--debate-blue)] transition-colors duration-300">
        {topic.title}
      </h3>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {topic.description}
      </p>

      {/* CTA */}
      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground/40 group-hover:text-[var(--debate-blue)]/70 transition-all duration-300">
        <span>토론 입장</span>
        <span className="group-hover:translate-x-0.5 transition-transform duration-300">
          &rarr;
        </span>
      </div>
    </button>
  );
}
